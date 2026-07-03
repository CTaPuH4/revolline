from decimal import Decimal
from unittest.mock import patch
from uuid import uuid4

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from django.test import override_settings
from django.urls import reverse
from jwt.algorithms import RSAAlgorithm
from rest_framework import status
from rest_framework.test import APITestCase

from api.exceptions import ExternalAPIError
from store.models import Cart, Order, PaymentAttempt, Product
from users.models import CustomUser


class OrderIdempotencyTests(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email='buyer@example.com',
            password='strong-test-password',
            first_name='Иван',
            last_name='Иванов',
            patronymic='Иванович',
            phone='+79990000001',
        )
        self.product = Product.objects.create(
            title='Тестовый товар',
            description='Описание',
            pr_type='Тип',
            price=Decimal('1000.00'),
        )
        Cart.objects.create(
            user=self.user,
            product=self.product,
            quantity=1,
        )
        self.client.force_authenticate(self.user)
        self.url = reverse('orders-list')
        self.idempotency_key = str(uuid4())

    def post_order(self):
        return self.client.post(
            self.url,
            {'shipping_address': 'Москва, тестовый адрес'},
            format='json',
            HTTP_IDEMPOTENCY_KEY=self.idempotency_key,
        )

    def retry_payment(self, order, idempotency_key=None):
        return self.client.post(
            reverse('orders-retry-payment', args=(order.pk,)),
            {},
            format='json',
            HTTP_IDEMPOTENCY_KEY=idempotency_key or str(uuid4()),
        )

    def expire_order_payment(self, order):
        payment_attempt = order.payment_attempts.latest('pk')
        payment_attempt.status = Order.PaymentStatus.EXPIRED
        payment_attempt.provider_status = 'EXPIRED'
        payment_attempt.save(update_fields=(
            'status',
            'provider_status',
            'updated_at',
        ))

        order.status = Order.Status.CANCELED
        order.payment_status = Order.PaymentStatus.EXPIRED
        order.provider_status = 'EXPIRED'
        order.save(update_fields=(
            'status',
            'payment_status',
            'provider_status',
            'payment_status_updated_at',
        ))

    @patch('api.views.create_link')
    def test_repeated_request_returns_same_payment(self, create_link_mock):
        create_link_mock.return_value = (
            'operation-1',
            Decimal('1200.00'),
            'https://payments.example.test/operation-1',
        )

        first_response = self.post_order()
        second_response = self.post_order()

        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(PaymentAttempt.objects.count(), 1)
        payment_attempt = PaymentAttempt.objects.get()
        self.assertEqual(
            payment_attempt.status,
            Order.PaymentStatus.LINK_CREATED,
        )
        self.assertEqual(payment_attempt.operation_id, 'operation-1')
        self.assertEqual(create_link_mock.call_count, 1)
        self.assertEqual(
            first_response.data['payment_link'],
            second_response.data['payment_link'],
        )

    @patch('api.views.create_link')
    def test_new_key_returns_existing_active_payment(self, create_link_mock):
        create_link_mock.return_value = (
            'operation-1',
            Decimal('1200.00'),
            'https://payments.example.test/operation-1',
        )

        first_response = self.post_order()
        Cart.objects.create(
            user=self.user,
            product=self.product,
            quantity=1,
        )
        self.idempotency_key = str(uuid4())
        second_response = self.post_order()

        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(PaymentAttempt.objects.count(), 1)
        self.assertEqual(create_link_mock.call_count, 1)
        self.assertEqual(
            second_response.data['payment_link'],
            'https://payments.example.test/operation-1',
        )

    @patch('api.views.create_link', side_effect=ExternalAPIError())
    def test_unknown_result_is_not_retried(self, create_link_mock):
        first_response = self.post_order()
        second_response = self.post_order()

        order = Order.objects.get()
        self.assertEqual(
            first_response.status_code,
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )
        self.assertEqual(second_response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(order.payment_status, Order.PaymentStatus.UNKNOWN)
        payment_attempt = PaymentAttempt.objects.get(order=order)
        self.assertEqual(
            payment_attempt.status,
            Order.PaymentStatus.UNKNOWN,
        )
        self.assertFalse(payment_attempt.operation_id)
        self.assertEqual(create_link_mock.call_count, 1)
        self.assertTrue(Cart.objects.filter(user=self.user).exists())

    @patch('api.views.create_link', side_effect=ExternalAPIError())
    def test_unknown_result_blocks_new_key(self, create_link_mock):
        first_response = self.post_order()
        self.idempotency_key = str(uuid4())
        second_response = self.post_order()

        self.assertEqual(
            first_response.status_code,
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )
        self.assertEqual(second_response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(PaymentAttempt.objects.count(), 1)
        self.assertEqual(create_link_mock.call_count, 1)

    @patch('api.views.create_link')
    def test_retry_payment_creates_new_attempt(self, create_link_mock):
        create_link_mock.side_effect = (
            (
                'operation-1',
                Decimal('1200.00'),
                'https://payments.example.test/operation-1',
            ),
            (
                'operation-2',
                Decimal('1200.00'),
                'https://payments.example.test/operation-2',
            ),
        )

        create_response = self.post_order()
        order = Order.objects.get()
        self.expire_order_payment(order)

        retry_response = self.retry_payment(order)
        order.refresh_from_db()

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(retry_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(PaymentAttempt.objects.count(), 2)
        self.assertEqual(order.status, Order.Status.NEW)
        self.assertEqual(
            order.payment_status,
            Order.PaymentStatus.LINK_CREATED,
        )
        self.assertEqual(order.operation_id, 'operation-2')
        self.assertEqual(
            retry_response.data['payment_link'],
            'https://payments.example.test/operation-2',
        )
        self.assertEqual(create_link_mock.call_count, 2)

    @patch('api.views.create_link')
    def test_repeated_retry_request_returns_same_payment(
        self,
        create_link_mock,
    ):
        create_link_mock.side_effect = (
            (
                'operation-1',
                Decimal('1200.00'),
                'https://payments.example.test/operation-1',
            ),
            (
                'operation-2',
                Decimal('1200.00'),
                'https://payments.example.test/operation-2',
            ),
        )
        retry_key = str(uuid4())

        self.post_order()
        order = Order.objects.get()
        self.expire_order_payment(order)

        first_response = self.retry_payment(order, retry_key)
        second_response = self.retry_payment(order, retry_key)

        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertEqual(PaymentAttempt.objects.count(), 2)
        self.assertEqual(create_link_mock.call_count, 2)
        self.assertEqual(
            first_response.data['payment_link'],
            second_response.data['payment_link'],
        )

    @patch('api.views.create_link')
    def test_retry_payment_rejects_active_attempt(self, create_link_mock):
        create_link_mock.return_value = (
            'operation-1',
            Decimal('1200.00'),
            'https://payments.example.test/operation-1',
        )

        self.post_order()
        order = Order.objects.get()
        retry_response = self.retry_payment(order)

        self.assertEqual(retry_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(PaymentAttempt.objects.count(), 1)
        self.assertEqual(create_link_mock.call_count, 1)

    def test_retry_payment_requires_idempotency_key(self):
        response = self.client.post(
            reverse('orders-retry-payment', args=(1,)),
            {},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('api.views.create_link')
    def test_retry_payment_unknown_result_blocks_same_key(
        self,
        create_link_mock,
    ):
        create_link_mock.side_effect = (
            (
                'operation-1',
                Decimal('1200.00'),
                'https://payments.example.test/operation-1',
            ),
            ExternalAPIError(),
        )
        retry_key = str(uuid4())

        self.post_order()
        order = Order.objects.get()
        self.expire_order_payment(order)

        first_response = self.retry_payment(order, retry_key)
        second_response = self.retry_payment(order, retry_key)
        order.refresh_from_db()
        latest_attempt = order.payment_attempts.latest('pk')

        self.assertEqual(
            first_response.status_code,
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )
        self.assertEqual(second_response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(order.payment_status, Order.PaymentStatus.UNKNOWN)
        self.assertEqual(latest_attempt.status, Order.PaymentStatus.UNKNOWN)
        self.assertEqual(PaymentAttempt.objects.count(), 2)
        self.assertEqual(create_link_mock.call_count, 2)


class PaymentWebhookTests(APITestCase):
    def setUp(self):
        self.private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        self.public_jwk = RSAAlgorithm.to_jwk(self.private_key.public_key())
        self.settings_override = override_settings(
            PAYMENT_WEBHOOK_PUBLIC_JWK=self.public_jwk,
        )
        self.settings_override.enable()

        self.user = CustomUser.objects.create_user(
            email='buyer-webhook@example.com',
            password='strong-test-password',
            first_name='Иван',
            last_name='Иванов',
            patronymic='Иванович',
            phone='+79990000002',
        )
        self.order = Order.objects.create(
            client=self.user,
            idempotency_key=uuid4(),
            total_price=Decimal('1000.00'),
            operation_id='operation-webhook-1',
            payment_link='https://payments.example.test/operation-webhook-1',
            payment_status=Order.PaymentStatus.LINK_CREATED,
            provider_status='CREATED',
            shipping_address='Москва, тестовый адрес',
        )
        self.payment_attempt = PaymentAttempt.objects.create(
            order=self.order,
            idempotency_key=uuid4(),
            operation_id='operation-webhook-1',
            payment_link='https://payments.example.test/operation-webhook-1',
            status=Order.PaymentStatus.LINK_CREATED,
            provider_status='CREATED',
        )
        self.url = reverse('payment-webhook')

    def tearDown(self):
        self.settings_override.disable()

    def make_token(self, payload):
        return jwt.encode(
            payload,
            self.private_key,
            algorithm='RS256',
        )

    def post_webhook(self, payload):
        token = self.make_token(payload)
        return self.client.post(
            self.url,
            {},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )

    def test_webhook_marks_order_as_paid(self):
        response = self.post_webhook({
            'Data': {
                'Operation': [{
                    'operationId': 'operation-webhook-1',
                    'status': 'APPROVED',
                }]
            }
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.payment_attempt.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.PAID)
        self.assertEqual(self.order.payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(
            self.payment_attempt.status,
            Order.PaymentStatus.PAID,
        )
        operation_payload = (
            self.payment_attempt.response_payload['Data']['Operation'][0]
        )
        self.assertEqual(operation_payload['operationId'], 'operation-webhook-1')

    def test_webhook_is_idempotent(self):
        payload = {
            'operationId': 'operation-webhook-1',
            'status': 'APPROVED',
        }

        first_response = self.post_webhook(payload)
        second_response = self.post_webhook(payload)

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertTrue(first_response.data['matched'])
        self.assertTrue(first_response.data['updated'])
        self.assertFalse(second_response.data['updated'])

    def test_invalid_webhook_signature_is_rejected(self):
        wrong_private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        token = jwt.encode(
            {
                'operationId': 'operation-webhook-1',
                'status': 'APPROVED',
            },
            wrong_private_key,
            algorithm='RS256',
        )

        response = self.client.post(
            self.url,
            {},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalid_webhook_public_key_configuration_returns_503(self):
        with override_settings(PAYMENT_WEBHOOK_PUBLIC_JWK='not-json'):
            response = self.post_webhook({
                'operationId': 'operation-webhook-1',
                'status': 'APPROVED',
            })

        self.assertEqual(
            response.status_code,
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    def test_unknown_operation_is_accepted_but_not_matched(self):
        response = self.post_webhook({
            'operationId': 'unknown-operation',
            'status': 'APPROVED',
        })

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertFalse(response.data['matched'])
