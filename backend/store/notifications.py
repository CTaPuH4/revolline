import logging
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from store.models import Order, PaymentAttempt

logger = logging.getLogger(__name__)


def get_email_recipients(value):
    return [
        item.strip()
        for item in str(value or '').split(',')
        if item.strip()
    ]


def money(value):
    if value is None:
        return '—'
    return f'{Decimal(value):.2f} ₽'


def build_order_paid_email(order):
    client = order.client
    client_name = '—'
    client_email = '—'
    client_phone = '—'
    if client:
        client_name = ' '.join(filter(None, (
            client.last_name,
            client.first_name,
            client.patronymic,
        ))) or client.email
        client_email = client.email
        client_phone = str(client.phone or '—')

    paid_at = timezone.localtime(order.payment_status_updated_at)
    lines = [
        f'Оплачен заказ #{order.id}.',
        '',
        f'Дата оплаты: {paid_at:%d.%m.%Y %H:%M}',
        f'Сумма: {money(order.total_price)}',
        f'Адрес доставки: {order.shipping_address}',
        f'Промокод: {order.promo.code if order.promo else "—"}',
        '',
        'Клиент:',
        f'  ФИО: {client_name}',
        f'  Email: {client_email}',
        f'  Телефон: {client_phone}',
        '',
        'Состав заказа:',
    ]

    items = list(order.productorder_set.all())
    if not items:
        lines.append('  — товаров в заказе нет')
    for index, item in enumerate(items, start=1):
        line_total = item.unit_price * item.quantity
        lines.append(
            f'  {index}. {item.product_title} — '
            f'{item.quantity} × {money(item.unit_price)} = {money(line_total)}'
        )

    lines.extend((
        '',
        'Нужно начать комплектацию и подготовить отправку.',
    ))
    return (
        f'Revolline: оплачен заказ #{order.id}',
        '\n'.join(lines),
    )


def build_payment_alert_email(
    order=None,
    payment_attempt=None,
    reason='',
    provider_status='',
):
    order_id = order.id if order else None
    subject = (
        f'Revolline: проблема с оплатой заказа #{order_id}'
        if order_id
        else 'Revolline: проблема с оплатой'
    )

    lines = [
        'Платёж требует ручной проверки.',
        '',
        f'Причина: {reason or "не указана"}',
        f'Статус провайдера: {provider_status or "—"}',
    ]

    if order:
        lines.extend((
            '',
            f'Заказ: #{order.id}',
            f'Бизнес-статус заказа: {order.status}',
            f'Платёжный статус заказа: {order.payment_status}',
            f'Operation ID заказа: {order.operation_id or "—"}',
            f'Сумма: {money(order.total_price)}',
            f'Адрес доставки: {order.shipping_address}',
        ))

    if payment_attempt:
        lines.extend((
            '',
            f'PaymentAttempt: #{payment_attempt.id}',
            f'Статус попытки: {payment_attempt.status}',
            f'Operation ID попытки: {payment_attempt.operation_id or "—"}',
            f'Последняя ошибка: {payment_attempt.error_message or "—"}',
        ))

    lines.extend((
        '',
        'Нужно зайти в админку, сверить платёж с банком и вручную привести '
        'заказ в корректное состояние.',
    ))
    return subject, '\n'.join(lines)


def enqueue_order_paid_notification(order_id):
    def callback():
        try:
            from store.tasks import send_order_paid_notification

            send_order_paid_notification.delay(order_id)
        except Exception:
            logger.exception(
                'Could not enqueue order paid notification: order_id=%s',
                order_id,
            )

    transaction.on_commit(callback)


def enqueue_payment_alert_notification(
    order_id=None,
    payment_attempt_id=None,
    reason='',
    provider_status='',
):
    def callback():
        try:
            from store.tasks import send_payment_alert_notification

            send_payment_alert_notification.delay(
                order_id=order_id,
                payment_attempt_id=payment_attempt_id,
                reason=reason,
                provider_status=provider_status,
            )
        except Exception:
            logger.exception(
                'Could not enqueue payment alert notification: order_id=%s',
                order_id,
            )

    transaction.on_commit(callback)


def get_order_for_notification(order_id):
    return (
        Order.objects
        .select_related('client', 'promo')
        .prefetch_related('productorder_set')
        .get(pk=order_id)
    )


def get_payment_attempt_for_notification(payment_attempt_id):
    return (
        PaymentAttempt.objects
        .select_related('order', 'order__client', 'order__promo')
        .get(pk=payment_attempt_id)
    )
