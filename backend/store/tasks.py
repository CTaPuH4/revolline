import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from store.models import Order, PaymentAttempt
from store.notifications import (
    build_order_paid_email,
    build_payment_alert_email,
    get_email_recipients,
    get_order_for_notification,
    get_payment_attempt_for_notification,
)
from store.services import status_update

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def sync_pending_order_statuses(self, order_ids=None):
    queryset = PaymentAttempt.objects.select_related('order').filter(
        operation_id__isnull=False,
        status__in=(
            Order.PaymentStatus.LINK_CREATED,
            Order.PaymentStatus.UNKNOWN,
            Order.PaymentStatus.REFUNDING,
        ),
    ).exclude(operation_id='')
    if order_ids is not None:
        queryset = queryset.filter(order_id__in=order_ids)

    order_ids_for_log = list(queryset.values_list('order_id', flat=True))
    if not order_ids_for_log:
        return {
            'checked': 0,
            'updated': 0,
            'failed_order_ids': [],
            'unsupported_statuses': {},
        }

    try:
        result = status_update(queryset)
    except Exception as exc:
        logger.warning(
            'Order status sync failed: order_ids=%s error=%s',
            order_ids_for_log,
            exc,
        )
        raise self.retry(exc=exc, countdown=60)

    if result['failed_order_ids']:
        error = RuntimeError(
            'Payment status sync failed for orders: '
            f"{result['failed_order_ids']}"
        )
        logger.warning(
            'Order status sync will be retried: failed_order_ids=%s',
            result['failed_order_ids'],
        )
        raise self.retry(exc=error, countdown=60)

    logger.info(
        'Order status sync completed: checked=%s order_ids=%s',
        result['checked'],
        order_ids_for_log,
    )
    return result


@shared_task(bind=True, max_retries=5)
def send_order_paid_notification(self, order_id):
    recipients = get_email_recipients(settings.ORDER_NOTIFICATION_EMAIL)
    if not recipients:
        logger.warning(
            'Order notification email is not configured: order_id=%s',
            order_id,
        )
        return {'sent': False, 'reason': 'missing_recipients'}

    try:
        order = get_order_for_notification(order_id)
        subject, message = build_order_paid_email(order)
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipients,
            fail_silently=False,
        )
        logger.info(
            'Order paid notification sent: order_id=%s recipients=%s',
            order_id,
            recipients,
        )
        return {
            'sent': True,
            'order_id': order_id,
            'sent_at': timezone.now().isoformat(),
        }
    except Exception as exc:
        logger.warning(
            'Order paid notification failed: order_id=%s retry=%s error=%s',
            order_id,
            self.request.retries,
            exc,
        )
        if self.request.retries >= self.max_retries:
            logger.exception(
                'Order paid notification retries exhausted: order_id=%s',
                order_id,
            )
            raise
        countdown = min(300, 2 ** self.request.retries * 30)
        raise self.retry(exc=exc, countdown=countdown)


@shared_task(bind=True, max_retries=5)
def send_payment_alert_notification(
    self,
    order_id=None,
    payment_attempt_id=None,
    reason='',
    provider_status='',
):
    recipients = get_email_recipients(settings.PAYMENT_ALERT_EMAIL)
    if not recipients:
        logger.warning(
            'Payment alert email is not configured: order_id=%s reason=%s',
            order_id,
            reason,
        )
        return {'sent': False, 'reason': 'missing_recipients'}

    try:
        payment_attempt = None
        order = None
        if payment_attempt_id:
            payment_attempt = get_payment_attempt_for_notification(
                payment_attempt_id,
            )
            order = payment_attempt.order
        elif order_id:
            order = get_order_for_notification(order_id)

        subject, message = build_payment_alert_email(
            order=order,
            payment_attempt=payment_attempt,
            reason=reason,
            provider_status=provider_status,
        )
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipients,
            fail_silently=False,
        )
        logger.warning(
            'Payment alert notification sent: order_id=%s recipients=%s',
            order_id,
            recipients,
        )
        return {
            'sent': True,
            'order_id': order.id if order else order_id,
            'sent_at': timezone.now().isoformat(),
        }
    except Exception as exc:
        logger.warning(
            'Payment alert notification failed: order_id=%s retry=%s error=%s',
            order_id,
            self.request.retries,
            exc,
        )
        if self.request.retries >= self.max_retries:
            logger.exception(
                'Payment alert notification retries exhausted: order_id=%s',
                order_id,
            )
            raise
        countdown = min(300, 2 ** self.request.retries * 30)
        raise self.retry(exc=exc, countdown=countdown)
