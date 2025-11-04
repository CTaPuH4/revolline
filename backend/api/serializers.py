from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from store.models import (Cart, Category, Favorites, Order, Product,
                          ProductImage, ProductOrder, Promocode, Section)

User = get_user_model()


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

    class Meta:
        model = Product
        fields = ('id', 'title', 'price',
                  'discount_price', 'image')

    def get_image(self, obj):
        request = self.context.get('request')
        first_image = obj.images.first().image
        if request:
            return request.build_absolute_uri(first_image.url)
        return first_image.url


class ProductSerializer(serializers.ModelSerializer):
    is_fav = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True)
    categories = CategorySerializer(many=True)

    class Meta:
        model = Product
        fields = ('id', 'title', 'description', 'pr_type', 'price',
                  'discount_price', 'is_new', 'is_fav',
                  'ingredients', 'country', 'size', 'full_weight',
                  'color', 'effect', 'collection',
                  'product_weight', 'categories', 'images')

    def get_is_fav(self, obj):
        user = self.context['request'].user
        if user.is_authenticated:
            return user.fav.filter(id=obj.id).exists()
        return False


class FavCartSerializerMixin(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        write_only=True,
    )
    product_data = ShortProductSerializer(source='product', read_only=True)


class CartSerializer(FavCartSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = Cart
        fields = ('id', 'product', 'product_data', 'quantity')

    def validate(self, data):
        if self.instance and 'product' in data:
            raise serializers.ValidationError({
                'product': 'Изменение продукта в корзине запрещено.'
            })
        return data


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
                        'Аккаунт неактивен. Подтвердите почту.',
                        code='user_inactive'
                    )
            except User.DoesNotExist:
                pass
            raise AuthenticationFailed(
                'Неверные учетные данные.',
                code='invalid_credentials'
            )

        return super().validate(attrs)


class FavDeleteSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        required=True
    )


class ProductOrderSerializer(serializers.ModelSerializer):
    product = ShortProductSerializer()

    class Meta:
        model = ProductOrder
        fields = ('product', 'quantity')


class OrdersSerializer(serializers.ModelSerializer):
    promo = serializers.SlugRelatedField(
        slug_field='code',
        queryset=Promocode.objects.all(),
        allow_null=True,
        required=False
    )
    items = ProductOrderSerializer(
        source='productorder_set', many=True, read_only=True
    )
    total_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    final_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = Order
        fields = (
            'id',
            'status',
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
            'payment_link',
            'created_at',
            'tracking_number',
        )
