import logging

from celery import shared_task
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from users.models import CustomUser, EmailMessageLog

logger = logging.getLogger(__name__)


def _build_activation_message(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    link = f'{settings.FRONTEND_URL}/activate/{uid}/{token}/'
    return (
        'Revolline. Подтверждение аккаунта.',
        f'Cсылка для подтверждения email:\n{link}',
    )


def _build_password_reset_message(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    link = f'{settings.FRONTEND_URL}/reset/?uid={uid}&token={token}'
    return (
        'Revolline. Восстановление пароля.',
        f'Cсылка для восстановления пароля:\n{link}',
    )


@shared_task(bind=True, max_retries=5)
def send_user_email(self, log_id, user_id):
    log = EmailMessageLog.objects.get(pk=log_id)

    if log.status == EmailMessageLog.Status.SENT:
        return {'status': log.status, 'log_id': log.id}

    try:
        user = CustomUser.objects.get(pk=user_id)
        if log.email_type == EmailMessageLog.EmailType.ACTIVATION:
            subject, message = _build_activation_message(user)
        elif log.email_type == EmailMessageLog.EmailType.PASSWORD_RESET:
            subject, message = _build_password_reset_message(user)
        else:
            raise ValueError(f'Unsupported email type: {log.email_type}')

        log.status = EmailMessageLog.Status.SENDING
        log.attempts = self.request.retries + 1
        log.subject = subject
        log.celery_task_id = self.request.id or ''
        log.last_error = ''
        log.save(update_fields=(
            'status',
            'attempts',
            'subject',
            'celery_task_id',
            'last_error',
            'updated_at',
        ))

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[log.to_email],
            fail_silently=False,
        )

        log.status = EmailMessageLog.Status.SENT
        log.sent_at = timezone.now()
        log.save(update_fields=('status', 'sent_at', 'updated_at'))
        logger.info(
            'Email sent: log_id=%s type=%s to=%s',
            log.id,
            log.email_type,
            log.to_email,
        )
        return {'status': log.status, 'log_id': log.id}

    except Exception as exc:
        logger.warning(
            'Email send failed: log_id=%s retry=%s error=%s',
            log_id,
            self.request.retries,
            exc,
        )
        log.status = EmailMessageLog.Status.FAILED
        log.attempts = self.request.retries + 1
        log.last_error = str(exc)
        log.save(update_fields=(
            'status',
            'attempts',
            'last_error',
            'updated_at',
        ))

        if self.request.retries >= self.max_retries:
            logger.exception('Email retries exhausted: log_id=%s', log_id)
            raise

        countdown = min(300, 2 ** self.request.retries * 30)
        raise self.retry(exc=exc, countdown=countdown)


def enqueue_user_email(user_id, email_type):
    user = CustomUser.objects.get(pk=user_id)
    subject = {
        EmailMessageLog.EmailType.ACTIVATION: (
            'Revolline. Подтверждение аккаунта.'
        ),
        EmailMessageLog.EmailType.PASSWORD_RESET: (
            'Revolline. Восстановление пароля.'
        ),
    }[email_type]

    log = EmailMessageLog.objects.create(
        user=user,
        email_type=email_type,
        to_email=user.email,
        subject=subject,
    )

    try:
        task = send_user_email.delay(log.id, user.id)
        log.celery_task_id = task.id
        log.save(update_fields=('celery_task_id', 'updated_at'))
    except Exception as exc:
        logger.exception('Could not enqueue email task: log_id=%s', log.id)
        log.status = EmailMessageLog.Status.FAILED
        log.last_error = str(exc)
        log.save(update_fields=('status', 'last_error', 'updated_at'))

    return log


def enqueue_user_email_on_commit(user_id, email_type):
    transaction.on_commit(lambda: enqueue_user_email(user_id, email_type))
