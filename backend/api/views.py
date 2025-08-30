from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import decorators, filters, mixins, status, views, viewsets
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.filters import ProductFilter
from api.serializers import (CartSerializer, CategorySerializer,
                             FavoritesSerializer, ProductSerializer,
                             SectionSerializer)
from store.models import Cart, Category, Favorites, Product, Section


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
    search_fields = ('title', 'description', 'type')
    ordering_fields = ('price',)


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
