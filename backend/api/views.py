from django.db.models import DecimalField, ExpressionWrapper, F, Sum, Value
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import decorators, filters, mixins, status, views, viewsets
from rest_framework.exceptions import MethodNotAllowed, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.exceptions import ExternalAPIError
from api.filters import ProductFilter
from api.serializers import (CartSerializer, CategorySerializer,
                             FavoritesSerializer, OrdersSerializer,
                             ProductSerializer, PromocodeSerializer,
                             SectionSerializer)
from store.models import (Cart, Category, Favorites, Order, Product,
                          ProductOrder, Promocode, Section)
from store.services import create_link


class CategoryViewSet(mixins.RetrieveModelMixin,
                      mixins.ListModelMixin,
                      viewsets.GenericViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_field = 'slug'
    pagination_class = None


class SectionViewSet(mixins.RetrieveModelMixin,
                     mixins.ListModelMixin,
                     viewsets.GenericViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    lookup_field = 'slug'
    pagination_class = None


class ProductViewSet(mixins.RetrieveModelMixin,
                     mixins.ListModelMixin,
                     viewsets.GenericViewSet):
    queryset = Product.objects.prefetch_related('images', 'categories').all()
    serializer_class = ProductSerializer
    filter_backends = (
        DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter
    )
    filterset_class = ProductFilter
    search_fields = ('title', 'description', 'pr_type')
    ordering_fields = ('discount_price',)


class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return self.request.user.cart_items.select_related(
            'product').prefetch_related('product__images')

    def perform_create(self, serializer):
        cart_item, created = Cart.objects.get_or_create(
            user=self.request.user,
            product=serializer.validated_data['product'],
            defaults={'quantity': serializer.validated_data['quantity']}
        )
        if not created:
            cart_item.quantity = serializer.validated_data['quantity']
            cart_item.save()
        return cart_item

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
        return favorite_item

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
    def get(self, request):
        countries = (
            Product.objects
            .exclude(country__isnull=True)
            .exclude(country__exact="")
            .values_list("country", flat=True)
            .distinct()
        )
        countries = sorted(set(map(str.strip, countries)))
        return Response(countries)


class PromoViewSet(mixins.RetrieveModelMixin,
                   viewsets.GenericViewSet):
    queryset = Promocode.objects.all()
    serializer_class = PromocodeSerializer
    lookup_field = 'code'


class OrderViewSet(mixins.ListModelMixin,
                   mixins.CreateModelMixin,
                   viewsets.GenericViewSet):
    serializer_class = OrdersSerializer
    permission_classes = (IsAuthenticated,)
    pagination_class = None

    def get_queryset(self):
        return self.request.user.orders.select_related(
            'promo'
        ).prefetch_related(
            'productorder_set__product'
        ).annotate(
            total_price=Sum(
                F('productorder__quantity') * Coalesce(
                    F('productorder__product__discount_price'),
                    F('productorder__product__price')
                )
            )
        ).annotate(
            final_price=ExpressionWrapper(
                F("total_price")
                * (1 - (F("promo__percent") / Value(100.0))),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            )
        )

    def perform_create(self, serializer):
        user = self.request.user
        promo = serializer.validated_data.get('promo')
        cart = user.cart_items.select_related('product')

        if not cart.exists():
            raise ValidationError(
                {'detail': 'Заказ невозможно оформить - корзина пуста.'}
            )

        total_price = sum(
            (item.product.discount_price or item.product.price) * item.quantity
            for item in cart
        )

        if not (user.first_name and
                user.last_name and
                user.patronymic and
                user.phone):
            raise ValidationError(
                {
                    'detail': ('Отсутствует информация о получателе.')
                }
            )

        if promo and total_price < promo.min_price:
            raise ValidationError(
                {
                    'detail': (
                        f'Минимальная сумма для применения промокода '
                        f'{promo.code} составляет {promo.min_price}.'
                    )
                }
            )

        try:
            op_id, link = create_link(user, cart, promo)
        except Exception as e:
            print(f"Ошибка внешнего API: {e}")
            raise ExternalAPIError()

        order = Order.objects.create(
            client=user,
            operation_id=op_id,
            payment_link=link,
            promo=promo,
            shipping_address=serializer.validated_data['shipping_address']
        )

        items_list = [
            ProductOrder(
                order=order, product=item.product, quantity=item.quantity
            ) for item in cart
        ]
        ProductOrder.objects.bulk_create(items_list)

        self.request.user.cart_items.all().delete()

        return order

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = self.perform_create(serializer)

        return Response(
            {'payment_link': order.payment_link},
            status=status.HTTP_201_CREATED
        )
