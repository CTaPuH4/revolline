import logging
from decimal import ROUND_HALF_UP, Decimal
from urllib.parse import urlparse

import pandas as pd
import requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.db import transaction

from api.exceptions import ExternalAPIError
from store.constants import DELIVERY_FEE, FREE_DELIVERY_TRESHOLD
from store.models import Order, PaymentAttempt

logger = logging.getLogger(__name__)

MONEY_QUANT = Decimal('0.01')
PAYMENT_STATUS_CREATED = 'CREATED'
PAYMENT_STATUS_APPROVED = 'APPROVED'
PAYMENT_STATUS_ON_REFUND = 'ON-REFUND'
PAYMENT_STATUS_REFUNDED = 'REFUNDED'
PAYMENT_STATUS_EXPIRED = 'EXPIRED'


def _enqueue_order_paid_notification(order_id):
    from store.notifications import enqueue_order_paid_notification

    enqueue_order_paid_notification(order_id)


def _enqueue_payment_alert_notification(
    order_id=None,
    payment_attempt_id=None,
    reason='',
    provider_status='',
):
    from store.notifications import enqueue_payment_alert_notification

    enqueue_payment_alert_notification(
        order_id=order_id,
        payment_attempt_id=payment_attempt_id,
        reason=reason,
        provider_status=provider_status,
    )


def _payment_api_request(method, path, **kwargs):
    if not settings.PAYMENT_TOKEN:
        logger.error('Payment API token is not configured')
        raise ExternalAPIError()

    url = f"{settings.PAYMENT_BASE_URL.rstrip('/')}/{path.lstrip('/')}"
    headers = {
        'Accept': 'application/json',
        'Authorization': f'Bearer {settings.PAYMENT_TOKEN}',
        **kwargs.pop('headers', {}),
    }

    try:
        response = requests.request(
            method,
            url,
            headers=headers,
            timeout=(
                settings.PAYMENT_CONNECT_TIMEOUT,
                settings.PAYMENT_READ_TIMEOUT,
            ),
            **kwargs,
        )
    except requests.RequestException as exc:
        logger.warning(
            'Payment API request failed: method=%s path=%s error=%s',
            method,
            path,
            exc.__class__.__name__,
        )
        raise ExternalAPIError() from exc

    if response.status_code != 200:
        logger.warning(
            'Payment API returned an error: method=%s path=%s status=%s',
            method,
            path,
            response.status_code,
        )
        raise ExternalAPIError()

    try:
        data = response.json()
    except requests.exceptions.JSONDecodeError as exc:
        logger.warning(
            'Payment API returned invalid JSON: method=%s path=%s',
            method,
            path,
        )
        raise ExternalAPIError() from exc

    if not isinstance(data, dict):
        logger.warning(
            'Payment API returned an unexpected payload: method=%s path=%s',
            method,
            path,
        )
        raise ExternalAPIError()

    return data


def _first_item(data, *path):
    try:
        value = data
        for key in path:
            value = value[key]
        return value[0]
    except (KeyError, IndexError, TypeError) as exc:
        logger.warning('Payment API response has an unexpected structure')
        raise ExternalAPIError() from exc


def get_code():
    customers = _payment_api_request(
        'GET',
        '/open-banking/v1.0/customers',
    )
    sup_info = _first_item(customers, 'Data', 'Customer')

    try:
        customer_code = sup_info['customerCode']
    except (KeyError, TypeError) as exc:
        logger.warning('Customer code is missing in Payment API response')
        raise ExternalAPIError() from exc

    retailers = _payment_api_request(
        'GET',
        '/acquiring/v1.0/retailers',
        params={'customerCode': customer_code},
    )
    mer_data = _first_item(retailers, 'Data', 'Retailer')

    return mer_data, sup_info


def prepare_payment(cart, promo=None):
    promo_mult = Decimal('1')
    if promo:
        promo_mult = Decimal('1') - (Decimal(
            str(promo.percent)) / Decimal('100'))

    subtotal = sum(
        item.product.price * item.quantity
        for item in cart
    )

    products = []
    final_price = Decimal('0.00')
    for item in cart:
        unit_price = (item.product.price * promo_mult).quantize(
            MONEY_QUANT,
            rounding=ROUND_HALF_UP,
        )
        products.append({
            'vatType': 'none',
            'name': item.product.title,
            'amount': float(unit_price),
            'quantity': item.quantity,
            'paymentMethod': 'full_payment',
            'paymentObject': 'goods'
        })
        final_price += unit_price * item.quantity

    if subtotal < FREE_DELIVERY_TRESHOLD:
        delivery_fee = Decimal(str(DELIVERY_FEE)).quantize(MONEY_QUANT)
        products.append({
            'vatType': 'none',
            'name': 'Доставка',
            'amount': float(delivery_fee),
            'quantity': 1,
            'paymentMethod': 'full_payment',
            'paymentObject': 'service'
        })
        final_price += delivery_fee

    return final_price, products


def create_link(user, final_price, products, order_reference):
    mer_data, sup_info = get_code()
    full_name = f'{user.first_name} {user.last_name} {user.patronymic}'
    phone = str(user.phone)
    if not phone.startswith('+'):
        phone = f'+{phone}'

    payload = {
        'Data': {
            'customerCode': sup_info['customerCode'],
            'amount': float(final_price),
            'purpose': f'Оплата заказа №{order_reference}',
            'redirectUrl': settings.PAYMENT_SUCCESS_REDIRECT_URL,
            'failRedirectUrl': settings.PAYMENT_FAIL_REDIRECT_URL,
            'paymentMode': mer_data['paymentModes'],
            'merchantId': mer_data['merchantId'],
            'taxSystemCode': 'usn_income_outcome',
            'Client': {
                'name': full_name,
                'email': str(user.email),
                'phone': phone,
            },
            'Items': products,
            'Supplier': {
                'phone': settings.PAYMENT_SUPPLIER_PHONE,
                'name': sup_info['shortName'],
                'taxCode': sup_info['taxCode']
            }
        }
    }

    data = _payment_api_request(
        'POST',
        '/acquiring/v1.0/payments_with_receipt',
        headers={'Content-Type': 'application/json'},
        json=payload,
    )

    try:
        op_id = data['Data']['operationId']
        link = data['Data']['paymentLink']
    except (KeyError, TypeError) as exc:
        logger.warning('Payment link data is missing in Payment API response')
        raise ExternalAPIError() from exc

    parsed_link = urlparse(link) if isinstance(link, str) else None
    if (
        not isinstance(op_id, str)
        or not op_id
        or parsed_link is None
        or parsed_link.scheme != 'https'
        or not parsed_link.netloc
    ):
        logger.warning('Payment API returned invalid operation data')
        raise ExternalAPIError()

    logger.info(
        'Payment link created: operation_id=%s amount=%s',
        op_id,
        final_price,
    )
    return op_id, final_price, link


def get_status(operation_id):
    data = _payment_api_request(
        'GET',
        f'/acquiring/v1.0/payments/{operation_id}',
    )
    operation = _first_item(data, 'Data', 'Operation')

    try:
        return operation['status']
    except (KeyError, TypeError) as exc:
        logger.warning(
            'Payment status is missing: operation_id=%s',
            operation_id,
        )
        raise ExternalAPIError() from exc


def _set_payment_state(payment_attempt, payment_status, provider_status):
    order = payment_attempt.order
    order.payment_status = payment_status
    order.provider_status = provider_status
    payment_attempt.status = payment_status
    payment_attempt.provider_status = provider_status


def _save_payment_attempt(payment_attempt, update_fields):
    payment_attempt.save(update_fields=tuple(update_fields) + ('updated_at',))


def apply_payment_status(payment_attempt, provider_status):
    order = payment_attempt.order

    if provider_status == PAYMENT_STATUS_APPROVED:
        if (
            order.status == Order.Status.PAID
            and payment_attempt.status == Order.PaymentStatus.PAID
            and payment_attempt.provider_status == provider_status
        ):
            return False
        order.status = Order.Status.PAID
        _set_payment_state(
            payment_attempt,
            Order.PaymentStatus.PAID,
            provider_status,
        )
        order.save(update_fields=(
            'status',
            'payment_status',
            'provider_status',
            'payment_status_updated_at',
        ))
        _save_payment_attempt(payment_attempt, (
            'status',
            'provider_status',
        ))
        logger.info('Order marked as paid: order_id=%s', order.id)
        _enqueue_order_paid_notification(order.id)
        return True

    if provider_status == PAYMENT_STATUS_EXPIRED:
        if (
            order.status == Order.Status.CANCELED
            and payment_attempt.status == Order.PaymentStatus.EXPIRED
            and payment_attempt.provider_status == provider_status
        ):
            return False
        order.status = Order.Status.CANCELED
        _set_payment_state(
            payment_attempt,
            Order.PaymentStatus.EXPIRED,
            provider_status,
        )
        order.save(update_fields=(
            'status',
            'payment_status',
            'provider_status',
            'payment_status_updated_at',
        ))
        _save_payment_attempt(payment_attempt, (
            'status',
            'provider_status',
        ))
        logger.info('Order marked as canceled: order_id=%s', order.id)
        return True

    if provider_status == PAYMENT_STATUS_ON_REFUND:
        if (
            payment_attempt.status == Order.PaymentStatus.REFUNDING
            and payment_attempt.provider_status == provider_status
        ):
            return False
        _set_payment_state(
            payment_attempt,
            Order.PaymentStatus.REFUNDING,
            provider_status,
        )
        order.save(update_fields=(
            'payment_status',
            'provider_status',
            'payment_status_updated_at',
        ))
        _save_payment_attempt(payment_attempt, (
            'status',
            'provider_status',
        ))
        return True

    if provider_status == PAYMENT_STATUS_REFUNDED:
        if (
            payment_attempt.status == Order.PaymentStatus.REFUNDED
            and payment_attempt.provider_status == provider_status
        ):
            return False
        _set_payment_state(
            payment_attempt,
            Order.PaymentStatus.REFUNDED,
            provider_status,
        )
        order.save(update_fields=(
            'payment_status',
            'provider_status',
            'payment_status_updated_at',
        ))
        _save_payment_attempt(payment_attempt, (
            'status',
            'provider_status',
        ))
        return True

    if provider_status == PAYMENT_STATUS_CREATED:
        if (
            payment_attempt.status != Order.PaymentStatus.LINK_CREATED
            or payment_attempt.provider_status != provider_status
        ):
            _set_payment_state(
                payment_attempt,
                Order.PaymentStatus.LINK_CREATED,
                provider_status,
            )
            order.save(update_fields=(
                'payment_status',
                'provider_status',
                'payment_status_updated_at',
            ))
            _save_payment_attempt(payment_attempt, (
                'status',
                'provider_status',
            ))
            return True
        return False

    _set_payment_state(
        payment_attempt,
        Order.PaymentStatus.UNKNOWN,
        provider_status,
    )
    order.save(update_fields=(
        'payment_status',
        'provider_status',
        'payment_status_updated_at',
    ))
    _save_payment_attempt(payment_attempt, (
        'status',
        'provider_status',
    ))
    logger.warning(
        'Payment status requires manual handling: '
        'order_id=%s operation_id=%s status=%s',
        order.id,
        payment_attempt.operation_id,
        provider_status,
    )
    _enqueue_payment_alert_notification(
        order_id=order.id,
        payment_attempt_id=payment_attempt.id,
        reason='unsupported_provider_status',
        provider_status=provider_status,
    )
    return True


def apply_payment_status_by_operation(
    operation_id,
    provider_status,
    response_payload=None,
):
    with transaction.atomic():
        payment_attempt = (
            PaymentAttempt.objects
            .select_for_update()
            .select_related('order')
            .filter(operation_id=operation_id)
            .first()
        )
        if payment_attempt is None:
            logger.warning(
                'Payment webhook refers to unknown operation: operation_id=%s',
                operation_id,
            )
            return {
                'matched': False,
                'updated': False,
                'order_id': None,
            }

        updated = apply_payment_status(payment_attempt, provider_status)
        if response_payload is not None:
            payment_attempt.response_payload = response_payload
            payment_attempt.save(update_fields=(
                'response_payload',
                'updated_at',
            ))
        return {
            'matched': True,
            'updated': updated,
            'order_id': payment_attempt.order_id,
        }


def status_update(payment_attempts):
    result = {
        'checked': 0,
        'updated': 0,
        'failed_order_ids': [],
        'unsupported_statuses': {},
    }

    for payment_attempt in payment_attempts:
        order = payment_attempt.order
        result['checked'] += 1
        try:
            new_status = get_status(payment_attempt.operation_id)
            updated = apply_payment_status(payment_attempt, new_status)
            if updated:
                result['updated'] += 1
            if new_status not in (
                PAYMENT_STATUS_APPROVED,
                PAYMENT_STATUS_EXPIRED,
                PAYMENT_STATUS_ON_REFUND,
                PAYMENT_STATUS_REFUNDED,
                PAYMENT_STATUS_CREATED,
            ):
                result['unsupported_statuses'][order.id] = new_status
        except ExternalAPIError:
            result['failed_order_ids'].append(order.id)
            logger.warning(
                'Could not update payment status: order_id=%s operation_id=%s',
                order.id,
                payment_attempt.operation_id,
            )

    return result


def image_download(link, name=None):
    '''
    Скачивает изображение по URL.
    '''
    try:
        response = requests.get(
            link,
            timeout=20,
            headers={'User-Agent': 'revolline-import/1.0'},
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.warning('Image download failed for %s: %s', link, exc)
        return None

    if not name:
        name = link.split('/')[-1]

    return ContentFile(response.content, name=name)


def clean_value(value, default=None):
    if pd.isna(value):
        return default
    if isinstance(value, str):
        return value.strip()
    return value
