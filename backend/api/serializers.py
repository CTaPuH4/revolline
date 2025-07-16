from rest_framework import serializers

from store.models import (Cart, Category, Favorites, Product, ProductImage,
                          Section)


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
        fields = ('id', 'image')


class ShortProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True)

    class Meta:
        model = Product
        fields = ('id', 'title', 'price',
                  'discount_price', 'product_weight', 'images')


class ProductSerializer(serializers.ModelSerializer):
    is_fav = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True)
    categories = CategorySerializer(many=True)

    class Meta:
        model = Product
        fields = ('id', 'title', 'description', 'type', 'price',
                  'discount_price', 'is_new', 'is_fav',
                  'ingredients', 'country', 'size', 'full_weight',
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
        fields = ['id', 'product', 'product_data', 'quantity']

    def validate(self, data):
        if self.instance and 'product' in data:
            raise serializers.ValidationError({
                'product': 'Изменение продукта в корзине запрещено.'
            })
        return data


class FavoritesSerializer(FavCartSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = Favorites
        fields = ['id', 'product', 'product_data']
