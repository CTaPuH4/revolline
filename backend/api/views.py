import logging
import json
from uuid import UUID

import jwt
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import F, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import decorators, filters, mixins, status, views, viewsets
from rest_framework.exceptions import MethodNotAllowed, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from api.exceptions import ExternalAPIError
from api.filters import ProductFilter
from api.mixins import PublicCacheViewSetMixin
from api.serializers import (CartSerializer, CategorySerializer,
                             FavoritesSerializer, OrdersSerializer,
                             ProductSerializer, PromocodeSerializer,
                             SectionSerializer)
from store.constants import DELIVERY_FEE, FREE_DELIVERY_TRESHOLD
from store.models import (Cart, Category, Favorites, Order, PaymentAttempt,
                          Product, ProductOrder, Promocode, Section)
from store.notifications import enqueue_payment_alert_notification
from store.services import (apply_payment_status_by_operation, create_link,
                            prepare_payment)

logger = logging.getLogger(__name__)


class CategoryViewSet(PublicCacheViewSetMixin,
                      mixins.RetrieveModelMixin,
                      mixins.ListModelMixin,
                      viewsets.GenericViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_field = 'slug'
    pagination_class = None


class SectionViewSet(PublicCacheViewSetMixin,
                     mixins.RetrieveModelMixin,
                     mixins.ListModelMixin,
                     viewsets.GenericViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    lookup_field = 'slug'
    pagination_class = None


class ProductViewSet(PublicCacheViewSetMixin,
                     mixins.RetrieveModelMixin,
                     mixins.ListModelMixin,
                     viewsets.GenericViewSet):
    queryset = Product.objects.prefetch_related('images', 'categories').all()
    serializer_class = ProductSerializer
    filter_backends = (
        DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter
    )
    filterset_class = ProductFilter
    search_fields = ('title', 'description', 'pr_type')
    ordering_fields = ('price', 'old_price', 'title')

    def enrich_response_data(self, data):
        if self.action == 'retrieve':
            products = [data]
        elif isinstance(data, dict) and 'results' in data:
            products = data['results']
        else:
            products = data

        product_ids = {product['id'] for product in products}
        favorite_ids = set()

        if self.request.user.is_authenticated and product_ids:
            favorite_ids = set(
                Favorites.objects.filter(
                    user=self.request.user,
                    product_id__in=product_ids,
                ).values_list('product_id', flat=True)
            )

        for product in products:
            product['is_fav'] = product['id'] in favorite_ids

        return data


class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = (IsAuthenticated,)
    pagination_class = None

    def get_queryset(self):
        return self.request.user.cart_items.select_related(
            'product').prefetch_related('product__images')

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)

        cart_total = self.get_queryset().aggregate(
            total=Sum(F('product__price') * F('quantity'))
        )['total'] or Decimal('0.00')

        if cart_total >= FREE_DELIVERY_TRESHOLD:
            delivery_fee = 0
        else:
            delivery_fee = DELIVERY_FEE

        response.data = {
            'cart_total': cart_total,
            'delivery_fee': delivery_fee,
            'total_price': cart_total + delivery_fee,
            'items': response.data
        }

        return response

    def perform_create(self, serializer):
        cart_item, created = Cart.objects.get_or_create(
            user=self.request.user,
            product=serializer.validated_data['product'],
            defaults={'quantity': serializer.validated_data['quantity']}
        )
        if not created:
            cart_item.quantity = serializer.validated_data['quantity']
            cart_item.save()

        serializer.instance = cart_item

    def update(self, request, *args, **kwargs):
        if request.method == 'PUT':
            raise MethodNotAllowed('PUT')
        return super().update(request, *args, **kwargs)


class FavoritesViewSet(mixins.RetrieveModelMixin,
                       mixins.ListModelMixin,
                       mixins.CreateModelMixin,
                       mixins.DestroyModelMixin,
                       viewsets.GenericViewSet):
    serializer_class = FavoritesSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return self.request.user.favorite_products.select_related(
            'product').prefetch_related('product__images')

    def perform_create(self, serializer):
        favorite_item, created = Favorites.objects.get_or_create(
            user=self.request.user,
            product=serializer.validated_data['product'],
        )
        serializer.instance = favorite_item

    @decorators.action(detail=False, methods=('delete',))
    def delete(self, request):
        user = request.user
        product_id = request.query_params.get('product')

        if not product_id:
            return Response(
                {'product': ['Обязательное поле.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        product = get_object_or_404(Product, id=product_id)
        favorite = get_object_or_404(Favorites, user=user, product=product)

        favorite.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CountryListView(views.APIView):
    '''
    Возвращает список всех стран, указанных в продуктах.
    '''
    @method_decorator(cache_page(60 * 10))
    def get(self, request):
        countries = (
            Product.objects
            .exclude(country__isnull=True)
            .exclude(country__exact='')
            .values_list('country', flat=True)
            .distinct()
        )
        countries = sorted(set(map(str.strip, countries)))
        return Response(countries)


class PromoViewSet(PublicCacheViewSetMixin,
                   mixins.RetrieveModelMixin,
                   viewsets.GenericViewSet):
    queryset = Promocode.objects.filter(active=True)
    serializer_class = PromocodeSerializer
    lookup_field = 'code'

    def get_object(self):
        code = self.kwargs.get(self.lookup_field)
        queryset = self.filter_queryset(self.get_queryset())

        obj = get_object_or_404(
            queryset,
            code=code.strip().lower()
        )

        self.check_object_permissions(self.request, obj)
        return obj


class PaymentWebhookView(views.APIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)

    def post(self, request):
        public_key = self._get_public_key()
        if public_key is None:
            return Response(
                {'detail': 'Payment webhook is not configured.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        token = self._extract_token(request)
        if not token:
            return Response(
                {'detail': 'Webhook JWT is missing.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payload = jwt.decode(
                token,
                public_key,
                algorithms=('RS256',),
                options={'verify_aud': False},
            )
        except jwt.InvalidTokenError:
            logger.warning('Invalid payment webhook JWT')
            return Response(
                {'detail': 'Invalid webhook signature.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        operation_id = self._find_first(
            payload,
            ('operationId', 'operation_id'),
        )
        provider_status = self._find_first(
            payload,
            ('status', 'paymentStatus', 'payment_status'),
        )

        if not operation_id or not provider_status:
            logger.warning('Payment webhook payload is missing required data')
            return Response(
                {'detail': 'Webhook payload is missing operation or status.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = apply_payment_status_by_operation(
            str(operation_id),
            str(provider_status),
            response_payload=payload,
        )
        return Response(
            {
                'matched': result['matched'],
                'updated': result['updated'],
                'order_id': result['order_id'],
            },
            status=(
                status.HTTP_200_OK
                if result['matched']
                else status.HTTP_202_ACCEPTED
            ),
        )

    def _extract_token(self, request):
        auth_header = request.headers.get('Authorization', '')
        if auth_header.lower().startswith('bearer '):
            return auth_header.split(' ', 1)[1].strip()

        raw_body = request.body.decode('utf-8').strip()
        if (
            raw_body
            and raw_body.count('.') == 2
            and not raw_body.startswith(('{', '['))
        ):
            return raw_body

        data = request.data if isinstance(request.data, dict) else {}
        for key in ('token', 'jwt'):
            token = data.get(key)
            if isinstance(token, str) and token:
                return token

        return None

    def _get_public_key(self):
        if not settings.PAYMENT_WEBHOOK_PUBLIC_JWK:
            logger.error('Payment webhook public JWK is not configured')
            return None

        try:
            key_data = json.loads(settings.PAYMENT_WEBHOOK_PUBLIC_JWK)
            return jwt.PyJWK.from_dict(key_data).key
        except (json.JSONDecodeError, jwt.PyJWKError, TypeError, ValueError):
            logger.error('Payment webhook public JWK is invalid')
            return None

    def _find_first(self, value, keys):
        normalized_keys = {
            key.replace('_', '').lower()
            for key in keys
        }
        if isinstance(value, dict):
            for key, item in value.items():
                if key.replace('_', '').lower() in normalized_keys:
                    return item
            for item in value.values():
                found = self._find_first(item, keys)
                if found:
                    return found
        elif isinstance(value, list):
            for item in value:
                found = self._find_first(item, keys)
                if found:
                    return found
        return None


class OrderViewSet(mixins.ListModelMixin,
                   mixins.CreateModelMixin,
                   viewsets.GenericViewSet):
    serializer_class = OrdersSerializer
    permission_classes = (IsAuthenticated,)
    retryable_payment_statuses = (
        Order.PaymentStatus.EXPIRED,
        Order.PaymentStatus.FAILED,
    )

    def get_queryset(self):
        return self.request.user.orders.select_related(
            'promo'
        ).prefetch_related(
            'productorder_set__product'
        ).order_by('-pk')

    def create(self, request, *args, **kwargs):
        idempotency_key = self._get_idempotency_key(request)
        existing_order = self._get_order_by_idempotency_key(
            request.user,
            idempotency_key,
        )
        if existing_order:
            return self._payment_response(existing_order)

        blocking_order = self._get_blocking_payment_order(request.user)
        if blocking_order:
            return self._payment_response(blocking_order)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            (
                order,
                payment_attempt,
                cart_item_ids,
                payment_items,
            ) = self._create_local_order(
                request.user,
                idempotency_key,
                serializer.validated_data,
            )
        except IntegrityError:
            existing_order = self._get_order_by_idempotency_key(
                request.user,
                idempotency_key,
            )
            if existing_order:
                return self._payment_response(existing_order)
            raise ValidationError({
                'idempotency_key': 'Этот Idempotency-Key уже используется.',
            })

        try:
            operation_id, _, payment_link = create_link(
                request.user,
                order.total_price,
                payment_items,
                order.pk,
            )
        except Exception as exc:
            logger.warning(
                'Payment creation result is unknown: order_id=%s error=%s',
                order.pk,
                exc.__class__.__name__,
            )
            order.payment_status = Order.PaymentStatus.UNKNOWN
            order.save(update_fields=(
                'payment_status',
                'payment_status_updated_at',
            ))
            payment_attempt.status = Order.PaymentStatus.UNKNOWN
            payment_attempt.error_message = exc.__class__.__name__
            payment_attempt.save(update_fields=(
                'status',
                'error_message',
                'updated_at',
            ))
            enqueue_payment_alert_notification(
                order_id=order.pk,
                payment_attempt_id=payment_attempt.pk,
                reason='payment_creation_unknown',
                provider_status=exc.__class__.__name__,
            )
            return Response(
                {
                    'detail': (
                        'Результат создания платежа требует сверки. '
                        'Повторный платёж не создавался.'
                    ),
                    'order_id': order.pk,
                    'payment_status': order.payment_status,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            with transaction.atomic():
                order = Order.objects.select_for_update().get(pk=order.pk)
                payment_attempt = (
                    PaymentAttempt.objects
                    .select_for_update()
                    .get(pk=payment_attempt.pk)
                )
                order.operation_id = operation_id
                order.payment_link = payment_link
                order.payment_status = Order.PaymentStatus.LINK_CREATED
                order.provider_status = 'CREATED'
                payment_attempt.operation_id = operation_id
                payment_attempt.payment_link = payment_link
                payment_attempt.status = Order.PaymentStatus.LINK_CREATED
                payment_attempt.provider_status = 'CREATED'
                order.save(update_fields=(
                    'operation_id',
                    'payment_link',
                    'payment_status',
                    'provider_status',
                    'payment_status_updated_at',
                ))
                payment_attempt.save(update_fields=(
                    'operation_id',
                    'payment_link',
                    'status',
                    'provider_status',
                    'updated_at',
                ))
                Cart.objects.filter(
                    user=request.user,
                    id__in=cart_item_ids,
                ).delete()
        except Exception as exc:
            logger.exception(
                'Could not persist created payment: order_id=%s',
                order.pk,
            )
            try:
                Order.objects.filter(pk=order.pk).update(
                    operation_id=operation_id,
                    payment_link=payment_link,
                    payment_status=Order.PaymentStatus.UNKNOWN,
                    provider_status='CREATED',
                    payment_status_updated_at=timezone.now(),
                )
                PaymentAttempt.objects.filter(pk=payment_attempt.pk).update(
                    operation_id=operation_id,
                    payment_link=payment_link,
                    status=Order.PaymentStatus.UNKNOWN,
                    provider_status='CREATED',
                    error_message=exc.__class__.__name__,
                    updated_at=timezone.now(),
                )
            except IntegrityError:
                Order.objects.filter(pk=order.pk).update(
                    payment_status=Order.PaymentStatus.UNKNOWN,
                    payment_status_updated_at=timezone.now(),
                )
                PaymentAttempt.objects.filter(pk=payment_attempt.pk).update(
                    status=Order.PaymentStatus.UNKNOWN,
                    error_message=exc.__class__.__name__,
                    updated_at=timezone.now(),
                )
            enqueue_payment_alert_notification(
                order_id=order.pk,
                payment_attempt_id=payment_attempt.pk,
                reason='payment_persist_unknown',
                provider_status=exc.__class__.__name__,
            )
            raise ExternalAPIError() from exc

        return Response(
            {
                'order_id': order.pk,
                'payment_status': order.payment_status,
                'payment_link': order.payment_link,
            },
            status=status.HTTP_201_CREATED
        )

    @decorators.action(
        detail=True,
        methods=('post',),
        url_path='retry-payment',
    )
    def retry_payment(self, request, pk=None):
        idempotency_key = self._get_idempotency_key(request)
        order = self.get_object()

        existing_attempt = self._get_payment_attempt_by_idempotency_key(
            order,
            idempotency_key,
        )
        if existing_attempt:
            return self._payment_attempt_response(existing_attempt)

        if PaymentAttempt.objects.filter(
            idempotency_key=idempotency_key,
        ).exclude(order=order).exists():
            raise ValidationError({
                'idempotency_key': 'Этот Idempotency-Key уже используется.',
            })

        self._validate_retry_payment_allowed(order)
        payment_items = self._get_retry_payment_items(order)

        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=order.pk)
            self._validate_retry_payment_allowed(order)
            payment_attempt = PaymentAttempt.objects.create(
                order=order,
                idempotency_key=idempotency_key,
                status=Order.PaymentStatus.PENDING,
                request_payload={
                    'amount': str(order.total_price),
                    'items': payment_items,
                    'retry': True,
                },
            )
            order.payment_status = Order.PaymentStatus.PENDING
            order.provider_status = ''
            order.operation_id = None
            order.payment_link = ''
            order.save(update_fields=(
                'operation_id',
                'payment_link',
                'payment_status',
                'provider_status',
                'payment_status_updated_at',
            ))

        try:
            operation_id, _, payment_link = create_link(
                request.user,
                order.total_price,
                payment_items,
                order.pk,
            )
        except Exception as exc:
            logger.warning(
                'Retry payment creation result is unknown: '
                'order_id=%s attempt_id=%s error=%s',
                order.pk,
                payment_attempt.pk,
                exc.__class__.__name__,
            )
            PaymentAttempt.objects.filter(pk=payment_attempt.pk).update(
                status=Order.PaymentStatus.UNKNOWN,
                error_message=exc.__class__.__name__,
                updated_at=timezone.now(),
            )
            Order.objects.filter(pk=order.pk).update(
                payment_status=Order.PaymentStatus.UNKNOWN,
                payment_status_updated_at=timezone.now(),
            )
            enqueue_payment_alert_notification(
                order_id=order.pk,
                payment_attempt_id=payment_attempt.pk,
                reason='retry_payment_creation_unknown',
                provider_status=exc.__class__.__name__,
            )
            return Response(
                {
                    'detail': (
                        'Результат повторного создания платежа требует '
                        'сверки. Новый повторный платёж не создавался.'
                    ),
                    'order_id': order.pk,
                    'payment_status': Order.PaymentStatus.UNKNOWN,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=order.pk)
            payment_attempt = (
                PaymentAttempt.objects
                .select_for_update()
                .get(pk=payment_attempt.pk)
            )
            order.status = Order.Status.NEW
            order.operation_id = operation_id
            order.payment_link = payment_link
            order.payment_status = Order.PaymentStatus.LINK_CREATED
            order.provider_status = 'CREATED'
            payment_attempt.operation_id = operation_id
            payment_attempt.payment_link = payment_link
            payment_attempt.status = Order.PaymentStatus.LINK_CREATED
            payment_attempt.provider_status = 'CREATED'
            order.save(update_fields=(
                'status',
                'operation_id',
                'payment_link',
                'payment_status',
                'provider_status',
                'payment_status_updated_at',
            ))
            payment_attempt.save(update_fields=(
                'operation_id',
                'payment_link',
                'status',
                'provider_status',
                'updated_at',
            ))

        return Response(
            {
                'order_id': order.pk,
                'payment_status': order.payment_status,
                'payment_link': order.payment_link,
            },
            status=status.HTTP_201_CREATED,
        )

    def _get_idempotency_key(self, request):
        raw_key = request.headers.get('Idempotency-Key')
        if not raw_key:
            raise ValidationError({
                'idempotency_key': 'Передайте заголовок Idempotency-Key.',
            })

        try:
            return UUID(raw_key)
        except (TypeError, ValueError, AttributeError):
            raise ValidationError({
                'idempotency_key': 'Idempotency-Key должен быть UUID.',
            })

    def _get_order_by_idempotency_key(self, user, idempotency_key):
        return Order.objects.filter(
            client=user,
            idempotency_key=idempotency_key,
        ).first()

    def _get_payment_attempt_by_idempotency_key(self, order, idempotency_key):
        return order.payment_attempts.filter(
            idempotency_key=idempotency_key,
        ).first()

    def _get_blocking_payment_order(self, user):
        return (
            Order.objects
            .filter(
                client=user,
                payment_attempts__status__in=(
                    Order.PaymentStatus.PENDING,
                    Order.PaymentStatus.LINK_CREATED,
                    Order.PaymentStatus.UNKNOWN,
                ),
            )
            .order_by('-payment_attempts__pk')
            .first()
        )

    def _payment_response(self, order):
        payment_attempt = order.payment_attempts.order_by('-pk').first()
        payment_status = (
            payment_attempt.status
            if payment_attempt
            else order.payment_status
        )
        payment_link = (
            payment_attempt.payment_link
            if payment_attempt
            else order.payment_link
        )
        data = {
            'order_id': order.pk,
            'payment_status': payment_status,
            'payment_link': (
                payment_link
                if payment_status == Order.PaymentStatus.LINK_CREATED
                else None
            ),
        }

        if payment_status == Order.PaymentStatus.PENDING:
            data['detail'] = 'Платёж уже создаётся.'
            return Response(data, status=status.HTTP_202_ACCEPTED)

        if payment_status in (
            Order.PaymentStatus.UNKNOWN,
            Order.PaymentStatus.FAILED,
        ):
            data['detail'] = 'Состояние платежа требует сверки.'
            return Response(data, status=status.HTTP_409_CONFLICT)

        return Response(data, status=status.HTTP_200_OK)

    def _payment_attempt_response(self, payment_attempt):
        data = {
            'order_id': payment_attempt.order_id,
            'payment_status': payment_attempt.status,
            'payment_link': (
                payment_attempt.payment_link
                if payment_attempt.status == Order.PaymentStatus.LINK_CREATED
                else None
            ),
        }

        if payment_attempt.status == Order.PaymentStatus.PENDING:
            data['detail'] = 'Платёж уже создаётся.'
            return Response(data, status=status.HTTP_202_ACCEPTED)

        if payment_attempt.status in (
            Order.PaymentStatus.UNKNOWN,
            Order.PaymentStatus.FAILED,
        ):
            data['detail'] = 'Состояние платежа требует сверки.'
            return Response(data, status=status.HTTP_409_CONFLICT)

        return Response(data, status=status.HTTP_200_OK)

    def _validate_retry_payment_allowed(self, order):
        if order.status == Order.Status.PAID:
            raise ValidationError({
                'detail': 'Оплаченный заказ нельзя оплатить повторно.',
            })

        if order.payment_status not in self.retryable_payment_statuses:
            raise ValidationError({
                'detail': (
                    'Повторная оплата доступна только для платежей '
                    'в статусе expired или failed.'
                ),
            })

        if order.payment_attempts.filter(
            status__in=PaymentAttempt.ACTIVE_STATUSES,
        ).exists():
            raise ValidationError({
                'detail': 'У заказа уже есть активная попытка оплаты.',
            })

    def _get_retry_payment_items(self, order):
        for payment_attempt in order.payment_attempts.order_by('-pk'):
            payload = payment_attempt.request_payload or {}
            items = payload.get('items')
            amount = payload.get('amount')
            try:
                amount_matches = (
                    amount is not None
                    and Decimal(str(amount)) == order.total_price
                )
            except (InvalidOperation, TypeError, ValueError):
                amount_matches = False
            if (
                isinstance(items, list)
                and items
                and amount_matches
            ):
                return items

        product_orders = list(order.productorder_set.all())
        items_total = sum(
            item.unit_price * item.quantity
            for item in product_orders
        )
        if items_total != order.total_price:
            raise ValidationError({
                'detail': (
                    'Не удалось восстановить чек для повторной оплаты. '
                    'Нужна ручная проверка заказа.'
                ),
            })

        return [
            {
                'vatType': 'none',
                'name': item.product_title,
                'amount': float(item.unit_price),
                'quantity': item.quantity,
                'paymentMethod': 'full_payment',
                'paymentObject': 'goods',
            }
            for item in product_orders
        ]

    def _create_local_order(self, user, idempotency_key, validated_data):
        with transaction.atomic():
            existing_order = (
                Order.objects
                .select_for_update()
                .filter(
                    client=user,
                    idempotency_key=idempotency_key,
                )
                .first()
            )
            if existing_order:
                raise IntegrityError('Idempotency key already exists')

            cart = list(
                user.cart_items
                .select_for_update()
                .select_related('product')
            )
            if not cart:
                raise ValidationError({
                    'detail': 'Заказ невозможно оформить - корзина пуста.',
                })

            if not all((
                user.first_name,
                user.last_name,
                user.patronymic,
                user.phone,
            )):
                raise ValidationError({
                    'detail': 'Отсутствует информация о получателе.',
                })

            promo = validated_data.get('promo')
            cart_sum = sum(
                item.product.price * item.quantity
                for item in cart
            )
            if promo and cart_sum < promo.min_price:
                raise ValidationError({
                    'detail': (
                        'Минимальная сумма для применения промокода '
                        f'{promo.code} составляет {promo.min_price}.'
                    ),
                })

            total_price, payment_items = prepare_payment(cart, promo)
            order = Order.objects.create(
                client=user,
                idempotency_key=idempotency_key,
                total_price=total_price,
                promo=promo,
                shipping_address=validated_data['shipping_address'],
            )
            payment_attempt = PaymentAttempt.objects.create(
                order=order,
                idempotency_key=idempotency_key,
                status=Order.PaymentStatus.PENDING,
                request_payload={
                    'amount': str(total_price),
                    'items': payment_items,
                },
            )
            ProductOrder.objects.bulk_create([
                ProductOrder(
                    order=order,
                    product=item.product,
                    product_title=item.product.title,
                    unit_price=item.product.price,
                    old_unit_price=item.product.old_price,
                    quantity=item.quantity,
                )
                for item in cart
            ])

            return (
                order,
                payment_attempt,
                [item.pk for item in cart],
                payment_items,
            )
