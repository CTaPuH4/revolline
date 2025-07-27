from django_filters import rest_framework as filters

from store.models import Product


class ProductFilter(filters.FilterSet):
    price_min = filters.NumberFilter(field_name="price", lookup_expr='gte')
    price_max = filters.NumberFilter(field_name="price", lookup_expr='lte')
    categories = filters.CharFilter(
        field_name="categories__slug", lookup_expr='exact'
    )
    has_discount = filters.BooleanFilter(method='filter_has_discount')

    class Meta:
        model = Product
        fields = ['is_new', 'country', 'categories', 'price_min', 'price_max']

    def filter_has_discount(self, queryset, name, value):
        if value:
            return queryset.filter(discount_price__isnull=False)
        return queryset
