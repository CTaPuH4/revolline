from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import Mock, patch
from uuid import uuid4

from django.core import mail
from django.core.exceptions import ValidationError
from django.test import SimpleTestCase, TestCase, override_settings

from api.exceptions import ExternalAPIError
from store.models import Order, PaymentAttempt, Product, ProductOrder, Promocode
from store.services import (
    PAYMENT_STATUS_APPROVED,
    PAYMENT_STATUS_EXPIRED,
    PAYMENT_STATUS_REFUNDED,
    _payment_api_request,
    apply_payment_status,
    prepare_payment,
    status_update,
)
from store.tasks import (
    send_order_paid_notification,
    send_payment_alert_notification,
)
from users.models import CustomUser


@override_settings(
    PAYMENT_BASE_URL='https://payments.example.test/uapi',
    PAYMENT_TOKEN='test-token',
    PAYMENT_CONNECT_TIMEOUT=2,
    PAYMENT_READ_TIMEOUT=7,
)
class PaymentApiRequestTests(SimpleTestCase):
    @patch('store.services.requests.request')
    def test_request_uses_configured_timeouts(self, request_mock):
        response = Mock(status_code=200)
        response.json.return_value = {'Data': {'value': 'ok'}}
        request_mock.return_value = response

        result = _payment_api_request('GET', '/resource')

        self.assertEqual(result, {'Data': {'value': 'ok'}})
        request_mock.assert_called_once_with(
            'GET',
            'https://payments.example.test/uapi/resource',
            headers={
                'Accept': 'application/json',
                'Authorization': 'Bearer test-token',
            },
            timeout=(2, 7),
        )

    def test_payment_total_matches_rounded_receipt_items(self):
        cart = [SimpleNamespace(
            product=SimpleNamespace(
                title='Товар',
                price=Decimal('10000.00'),
            ),
            quantity=3,
        )]
        promo = SimpleNamespace(percent=33)

        total, items = prepare_payment(cart, promo)

        receipt_total = sum(
            Decimal(str(item['amount'])) * item['quantity']
            for item in items
        )
        self.assertEqual(total, receipt_total)


class PaymentStatusUpdateTests(SimpleTestCase):
    def make_payment_attempt(self):
        order = SimpleNamespace(
            id=10,
            status=Order.Status.NEW,
            payment_status=Order.PaymentStatus.LINK_CREATED,
            provider_status='CREATED',
            save=Mock(),
        )
        return SimpleNamespace(
            id=100,
            order=order,
            operation_id='operation-10',
            status=Order.PaymentStatus.LINK_CREATED,
            provider_status='CREATED',
            save=Mock(),
        )

    @patch('store.services._enqueue_order_paid_notification')
    @patch('store.services.get_status', return_value=PAYMENT_STATUS_APPROVED)
    def test_approved_payment_marks_order_as_paid(
        self,
        _get_status,
        enqueue_notification,
    ):
        payment_attempt = self.make_payment_attempt()
        order = payment_attempt.order

        result = status_update([payment_attempt])

        self.assertEqual(order.status, Order.Status.PAID)
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(payment_attempt.status, Order.PaymentStatus.PAID)
        order.save.assert_called_once_with(update_fields=(
            'status',
            'payment_status',
            'provider_status',
            'payment_status_updated_at',
        ))
        payment_attempt.save.assert_called_once_with(update_fields=(
            'status',
            'provider_status',
            'updated_at',
        ))
        self.assertEqual(result['updated'], 1)
        enqueue_notification.assert_called_once_with(order.id)

    @patch('store.services.get_status', return_value=PAYMENT_STATUS_EXPIRED)
    def test_expired_payment_marks_order_as_canceled(self, _get_status):
        payment_attempt = self.make_payment_attempt()
        order = payment_attempt.order

        status_update([payment_attempt])

        self.assertEqual(order.status, Order.Status.CANCELED)
        self.assertEqual(order.payment_status, Order.PaymentStatus.EXPIRED)
        self.assertEqual(payment_attempt.status, Order.PaymentStatus.EXPIRED)
        order.save.assert_called_once_with(update_fields=(
            'status',
            'payment_status',
            'provider_status',
            'payment_status_updated_at',
        ))

    @patch('store.services.get_status', return_value=PAYMENT_STATUS_REFUNDED)
    def test_refunded_payment_updates_only_payment_status(self, _get_status):
        payment_attempt = self.make_payment_attempt()
        order = payment_attempt.order

        result = status_update([payment_attempt])

        self.assertEqual(order.status, Order.Status.NEW)
        self.assertEqual(order.payment_status, Order.PaymentStatus.REFUNDED)
        self.assertEqual(payment_attempt.status, Order.PaymentStatus.REFUNDED)
        self.assertEqual(result['updated'], 1)

    @patch('store.services.get_status', side_effect=ExternalAPIError())
    def test_provider_error_is_reported_for_retry(self, _get_status):
        payment_attempt = self.make_payment_attempt()
        order = payment_attempt.order

        result = status_update([payment_attempt])

        order.save.assert_not_called()
        payment_attempt.save.assert_not_called()
        self.assertEqual(result['failed_order_ids'], [order.id])

    @patch('store.services._enqueue_payment_alert_notification')
    def test_unknown_provider_status_schedules_alert(self, enqueue_alert):
        payment_attempt = self.make_payment_attempt()
        order = payment_attempt.order

        result = apply_payment_status(payment_attempt, 'SOMETHING_NEW')

        self.assertTrue(result)
        self.assertEqual(order.payment_status, Order.PaymentStatus.UNKNOWN)
        self.assertEqual(payment_attempt.status, Order.PaymentStatus.UNKNOWN)
        enqueue_alert.assert_called_once_with(
            order_id=order.id,
            payment_attempt_id=payment_attempt.id,
            reason='unsupported_provider_status',
            provider_status='SOMETHING_NEW',
        )


class OrderDataIntegrityTests(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email='order-history@example.com',
            password='strong-test-password',
            first_name='Иван',
            last_name='Иванов',
            patronymic='Иванович',
            phone='+79990000003',
        )
        self.product = Product.objects.create(
            title='Исторический товар',
            description='Описание',
            pr_type='Тип',
            price=Decimal('1000.00'),
            old_price=Decimal('1200.00'),
        )
        self.promo = Promocode.objects.create(
            code='history',
            percent=10,
            min_price=0,
        )
        self.order = Order.objects.create(
            client=self.user,
            total_price=Decimal('1000.00'),
            promo=self.promo,
            shipping_address='Москва, тестовый адрес',
            payment_status=Order.PaymentStatus.LINK_CREATED,
        )
        self.product_order = ProductOrder.objects.create(
            order=self.order,
            product=self.product,
            product_title=self.product.title,
            unit_price=self.product.price,
            old_unit_price=self.product.old_price,
            quantity=1,
        )
        self.order.status = Order.Status.PAID
        self.order.payment_status = Order.PaymentStatus.PAID
        self.order.save(update_fields=(
            'status',
            'payment_status',
            'payment_status_updated_at',
        ))

    def test_deleting_user_preserves_paid_order_history(self):
        order_id = self.order.id

        self.user.delete()

        order = Order.objects.get(id=order_id)
        self.assertIsNone(order.client)
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)

    def test_deleting_promo_preserves_paid_order_history(self):
        self.promo.delete()

        self.order.refresh_from_db()
        self.assertIsNone(self.order.promo)
        self.assertEqual(self.order.payment_status, Order.PaymentStatus.PAID)

    def test_deleting_product_preserves_order_item_snapshot(self):
        self.product.delete()

        self.product_order.refresh_from_db()
        self.assertIsNone(self.product_order.product)
        self.assertEqual(
            self.product_order.product_title,
            'Исторический товар',
        )
        self.assertEqual(self.product_order.unit_price, Decimal('1000.00'))

    def test_paid_order_business_fields_are_immutable(self):
        self.order.total_price = Decimal('2000.00')

        with self.assertRaises(ValidationError):
            self.order.save()

        self.order.refresh_from_db()
        self.assertEqual(self.order.total_price, Decimal('1000.00'))

    def test_paid_order_items_are_immutable(self):
        self.product_order.quantity = 2

        with self.assertRaises(ValidationError):
            self.product_order.save()

        with self.assertRaises(ValidationError):
            self.product_order.delete()

        self.product_order.refresh_from_db()
        self.assertEqual(self.product_order.quantity, 1)

    def test_paid_order_cannot_be_deleted(self):
        order_id = self.order.id

        with self.assertRaises(ValidationError):
            self.order.delete()

        self.assertTrue(Order.objects.filter(id=order_id).exists())


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    DEFAULT_FROM_EMAIL='noreply@example.com',
    ORDER_NOTIFICATION_EMAIL='kitchen@example.com',
    PAYMENT_ALERT_EMAIL='admin@example.com',
)
class PaymentNotificationTests(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email='paid-buyer@example.com',
            password='strong-test-password',
            first_name='Иван',
            last_name='Иванов',
            patronymic='Иванович',
            phone='+79990000004',
        )
        self.product = Product.objects.create(
            title='Уведомляемый товар',
            description='Описание',
            pr_type='Тип',
            price=Decimal('1500.00'),
        )
        self.order = Order.objects.create(
            client=self.user,
            total_price=Decimal('1500.00'),
            operation_id='operation-notify-1',
            payment_link='https://payments.example.test/operation-notify-1',
            payment_status=Order.PaymentStatus.LINK_CREATED,
            provider_status='CREATED',
            shipping_address='Москва, адрес для уведомления',
        )
        ProductOrder.objects.create(
            order=self.order,
            product=self.product,
            product_title=self.product.title,
            unit_price=self.product.price,
            quantity=1,
        )
        self.order.status = Order.Status.PAID
        self.order.payment_status = Order.PaymentStatus.PAID
        self.order.provider_status = 'APPROVED'
        self.order.save(update_fields=(
            'status',
            'payment_status',
            'provider_status',
            'payment_status_updated_at',
        ))
        self.payment_attempt = PaymentAttempt.objects.create(
            order=self.order,
            idempotency_key=uuid4(),
            operation_id='operation-notify-1',
            payment_link='https://payments.example.test/operation-notify-1',
            status=Order.PaymentStatus.PAID,
            provider_status='APPROVED',
        )

    def test_order_paid_notification_contains_order_details(self):
        result = send_order_paid_notification(self.order.id)

        self.assertTrue(result['sent'])
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertEqual(email.to, ['kitchen@example.com'])
        self.assertIn(f'заказ #{self.order.id}', email.subject.lower())
        self.assertIn('Москва, адрес для уведомления', email.body)
        self.assertIn('Уведомляемый товар', email.body)
        self.assertIn('paid-buyer@example.com', email.body)

    def test_payment_alert_notification_contains_failure_context(self):
        self.payment_attempt.status = Order.PaymentStatus.UNKNOWN
        self.payment_attempt.error_message = 'ExternalAPIError'
        self.payment_attempt.save(update_fields=(
            'status',
            'error_message',
            'updated_at',
        ))
        self.order.payment_status = Order.PaymentStatus.UNKNOWN
        self.order.save(update_fields=(
            'payment_status',
            'payment_status_updated_at',
        ))

        result = send_payment_alert_notification(
            order_id=self.order.id,
            payment_attempt_id=self.payment_attempt.id,
            reason='payment_creation_unknown',
            provider_status='ExternalAPIError',
        )

        self.assertTrue(result['sent'])
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertEqual(email.to, ['admin@example.com'])
        self.assertIn('проблема с оплатой', email.subject.lower())
        self.assertIn('payment_creation_unknown', email.body)
        self.assertIn('ExternalAPIError', email.body)
        self.assertIn(f'Заказ: #{self.order.id}', email.body)
