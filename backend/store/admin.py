from django.contrib import admin

from store.models import Category, Product, ProductImage


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0
    min_num = 1


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'title'
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
        'description'
    )
    search_fields = ('title',)
    list_filter = ('categories',)
    inlines = (ProductImageInline,)
