from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from store.models import (Cart, Category, Favorites, Order, Product,
                          ProductImage, ProductOrder, Promocode, Section)

User = get_user_model()


class LowerSlugRelatedField(serializers.SlugRelatedField):
    def to_internal_value(self, data):
        if isinstance(data, str):
            data = data.strip().lower()
            if data == '' and self.allow_null:
                return None
        return super().to_internal_value(data)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('slug', 'title')


class SectionSerializer(serializers.ModelSerializer):
    categories = CategorySerializer(many=True)

    class Meta:
        model = Section
        fields = ('slug', 'title', 'categories')


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ('image',)


class PromocodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promocode
        fields = ('code', 'percent', 'min_price')


class ShortProductSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=False,
    )
    old_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=False,
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Product
        fields = ('id', 'title', 'price', 'old_price', 'has_discount', 'image')

    def get_image(self, obj):
        request = self.context.get('request')
        first_image = obj.images.first()
        if not first_image:
            return None
        if request:
            return request.build_absolute_uri(first_image.image.url)
        return first_image.image.url


class ProductSerializer(serializers.ModelSerializer):
    is_fav = serializers.BooleanField(read_only=True, default=False)
    images = ProductImageSerializer(many=True)
    categories = CategorySerializer(many=True)
    price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=False,
    )
    old_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=False,
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Product
        fields = ('id', 'title', 'description', 'pr_type', 'price', 'old_price',
                  'is_new', 'is_fav', 'ingredients', 'country', 'size', 'full_weight',
                  'color', 'effect', 'collection', 'product_weight', 'volume',
                  'categories', 'images', 'has_discount')


class FavCartSerializerMixin(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), write_only=True,
    )
    product_data = ShortProductSerializer(source='product', read_only=True)


class CartSerializer(FavCartSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = Cart
        fields = ('id', 'product', 'product_data', 'quantity')

    def validate(self, attrs):
        if self.instance and 'product' in attrs:
            raise serializers.ValidationError(
                {'product': 'Изменение продукта в корзине запрещено.'}
            )
        return attrs


class FavoritesSerializer(FavCartSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = Favorites
        fields = ('id', 'product', 'product_data')


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username_field = self.username_field
        credentials = {
            username_field: attrs.get(username_field),
            'password': attrs.get('password'),
        }

        user = authenticate(**credentials)

        if user is None:
            try:
                existing_user = User.objects.get(
                    **{username_field: attrs.get(username_field)}
                )
                if not existing_user.is_active:
                    raise AuthenticationFailed(
                        'Аккаунт неактивен. Подтвердите почту.', code='user_inactive'
                    )
            except User.DoesNotExist:
                pass
            raise AuthenticationFailed(
                'Неверные учетные данные.', code='invalid_credentials'
            )

        return super().validate(attrs)


class FavDeleteSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), required=True
    )


class ProductOrderSerializer(serializers.ModelSerializer):
    product = ShortProductSerializer(read_only=True, allow_null=True)
    unit_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=False,
    )
    old_unit_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=False,
        allow_null=True,
    )

    class Meta:
        model = ProductOrder
        fields = (
            'product',
            'product_title',
            'unit_price',
            'old_unit_price',
            'quantity',
        )


class OrdersSerializer(serializers.ModelSerializer):
    promo = LowerSlugRelatedField(
        slug_field='code',
        queryset=Promocode.objects.filter(active=True),
        allow_null=True,
        required=False
    )
    items = ProductOrderSerializer(
        source='productorder_set', many=True, read_only=True
    )
    total_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
        coerce_to_string=False,
    )
    final_price = serializers.DecimalField(
        source='total_price',
        max_digits=12,
        decimal_places=2,
        read_only=True,
        coerce_to_string=False,
    )

    class Meta:
        model = Order
        fields = (
            'id',
            'status',
            'payment_status',
            'created_at',
            'payment_link',
            'total_price',
            'promo',
            'final_price',
            'shipping_address',
            'tracking_number',
            'items',
        )
        read_only_fields = (
            'id',
            'status',
            'payment_status',
            'payment_link',
            'created_at',
            'tracking_number',
        )
