from django.contrib import admin

from store.models import (Category, Order, Product, ProductImage, ProductOrder,
                          Promocode, Section)


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0
    min_num = 1


class ProductOrderInline(admin.TabularInline):
    model = ProductOrder
    readonly_fields = ('product', 'quantity')
    can_delete = False
    extra = 0


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


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
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
        'pr_type',
        'price',
        'discount_price',
        'full_weight',
        'product_weight',
    )
    list_editable = (
        'price',
        'discount_price',
    )
    search_fields = ('title', 'description', 'pr_type')
    list_filter = ('categories', 'country', 'is_new')
    inlines = (ProductImageInline,)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'status',
        'tracking_number',
        'created_at',
        'client',
    )
    list_editable = ('status', 'tracking_number',)
    readonly_fields = (
        'client',
        'shipping_address',
        'operation_id',
        'payment_link',
        'promo'
    )
    list_filter = ('status',)
    inlines = (ProductOrderInline,)


@admin.register(Promocode)
class PromocodeAdmin(admin.ModelAdmin):
    list_display = (
        'code',
        'active',
        'percent',
        'min_price'
    )
    list_editable = ('percent', 'active', 'min_price')
