from django.contrib import admin

from store.models import Category, Product, ProductImage


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0
    min_num = 1


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = (
        'slug',
        'title',
    )
    list_editable = (
        'title',
    )
    search_fields = ('title',)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'title',
        'price',
        'full_weight',
        'product_weight',
    )
    search_fields = ('title', 'description')
    list_filter = ('categories', 'country')
    inlines = (ProductImageInline,)
