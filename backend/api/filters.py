from django_filters import rest_framework as filters
from store.models import Product


class ProductFilter(filters.FilterSet):
    price_min = filters.NumberFilter(field_name="price", lookup_expr='gte')
    price_max = filters.NumberFilter(field_name="price", lookup_expr='lte')
    categories = filters.CharFilter(
        field_name="categories__slug", lookup_expr='exact'
    )

    class Meta:
        model = Product
        fields = ['is_new', 'country', 'categories', 'price_min', 'price_max']
