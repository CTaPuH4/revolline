import logging

from django import forms
from django.contrib import admin, messages
from django.db import transaction
from django.http import HttpResponseRedirect
from django.template.response import TemplateResponse

from store.importers.products_excel import import_products_from_excel
from store.models import (Category, Order, PaymentAttempt, Product,
                          ProductImage, ProductOrder, Promocode, Section)
from store.tasks import sync_pending_order_statuses

logger = logging.getLogger(__name__)

PRODUCT_IMAGE_MAX_SIZE = 20 * 1024 * 1024


class ProductImageAdminForm(forms.ModelForm):
    class Meta:
        model = ProductImage
        fields = '__all__'

    def clean_image(self):
        image = self.cleaned_data.get('image')
        if image and image.size > PRODUCT_IMAGE_MAX_SIZE:
            raise forms.ValidationError(
                'Размер изображения не должен превышать 20 МБ. '
                'Уменьшите разрешение или сожмите файл.'
            )
        return image


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    form = ProductImageAdminForm
    extra = 0
    min_num = 1


class ProductOrderInline(admin.TabularInline):
    model = ProductOrder
    readonly_fields = (
        'product',
        'product_title',
        'unit_price',
        'old_unit_price',
        'quantity',
    )
    can_delete = False
    extra = 0


class PaymentAttemptInline(admin.TabularInline):
    model = PaymentAttempt
    readonly_fields = (
        'id',
        'idempotency_key',
        'operation_id',
        'payment_link',
        'status',
        'provider_status',
        'error_message',
        'created_at',
        'updated_at',
    )
    fields = readonly_fields
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


class ExcelImportForm(forms.Form):
    file = forms.FileField(label='Выберите Excel-файл (.xlsx или .xls)')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'title',
        'pr_type',
        'price',
        'old_price',
        'volume',
    )
    list_editable = (
        'price',
        'old_price',
    )
    search_fields = ('title', 'description', 'pr_type')
    list_filter = ('categories', 'country', 'is_new')
    inlines = (ProductImageInline,)
    actions = ('duplicate_products',)
    change_list_template = 'admin/import_products.html'

    @admin.action(description='Дублировать выбранные товары')
    def duplicate_products(self, request, queryset):
        created_count = 0

        with transaction.atomic():
            for product in queryset.prefetch_related('categories', 'images'):
                categories = list(product.categories.all())
                images = list(product.images.all())
                values = {
                    field.name: getattr(product, field.name)
                    for field in Product._meta.concrete_fields
                    if not field.primary_key and field.name != 'title'
                }
                product_copy = Product.objects.create(
                    title=self._get_copy_title(product.title),
                    **values,
                )
                product_copy.categories.set(categories)
                ProductImage.objects.bulk_create([
                    ProductImage(
                        product=product_copy,
                        image=image.image.name,
                        file_hash=image.file_hash,
                    )
                    for image in images
                ])
                created_count += 1

        self.message_user(
            request,
            f'Создано копий товаров: {created_count}.',
            level=messages.SUCCESS,
        )

    @staticmethod
    def _get_copy_title(title):
        max_length = Product._meta.get_field('title').max_length
        copy_number = 1

        while True:
            suffix = (
                ' (копия)'
                if copy_number == 1
                else f' (копия {copy_number})'
            )
            candidate = f'{title[:max_length - len(suffix)]}{suffix}'
            if not Product.objects.filter(title=candidate).exists():
                return candidate
            copy_number += 1

    def get_urls(self):
        from django.urls import path

        urls = super().get_urls()
        custom_urls = [
            path(
                'import-excel/',
                self.admin_site.admin_view(self.import_excel),
            ),
        ]
        return custom_urls + urls

    def import_excel(self, request):
        if request.method == 'POST':
            form = ExcelImportForm(request.POST, request.FILES)
            if form.is_valid():
                result = import_products_from_excel(form.cleaned_data['file'])
                self.message_user(
                    request,
                    ' '.join(result.to_messages()),
                    level=(
                        messages.WARNING
                        if result.has_warnings
                        else messages.SUCCESS
                    ),
                )
                return HttpResponseRedirect('../')
        else:
            form = ExcelImportForm()

        context = {
            'form': form,
            'opts': self.model._meta,
            'title': 'Импорт товаров из Excel',
        }
        return TemplateResponse(request, 'admin/import_form.html', context)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'status',
        'payment_status',
        'provider_status',
        'tracking_number',
        'total_price',
        'created_at',
        'client',
    )
    list_editable = ('status', 'tracking_number')
    readonly_fields = (
        'client',
        'total_price',
        'shipping_address',
        'operation_id',
        'idempotency_key',
        'payment_link',
        'payment_status',
        'provider_status',
        'payment_status_updated_at',
        'promo',
    )
    list_filter = ('status', 'payment_status', 'provider_status')
    inlines = (ProductOrderInline, PaymentAttemptInline)
    actions = ('enqueue_status_sync',)

    def has_delete_permission(self, request, obj=None):
        if obj and obj.is_payment_locked:
            return False
        return super().has_delete_permission(request, obj)

    @admin.action(description='Запустить синхронизацию статусов выбранных заказов')
    def enqueue_status_sync(self, request, queryset):
        order_ids = list(
            queryset.filter(
                payment_attempts__operation_id__isnull=False,
                payment_attempts__status__in=(
                    Order.PaymentStatus.LINK_CREATED,
                    Order.PaymentStatus.UNKNOWN,
                    Order.PaymentStatus.REFUNDING,
                ),
            ).exclude(
                payment_attempts__operation_id='',
            ).distinct().values_list('id', flat=True)
        )
        if not order_ids:
            self.message_user(
                request,
                'Среди выбранных заказов нет платежей для синхронизации.',
                level=messages.WARNING,
            )
            return

        try:
            task = sync_pending_order_statuses.delay(order_ids=order_ids)
        except Exception as exc:
            logger.exception('Could not enqueue order status sync')
            self.message_user(
                request,
                f'Не удалось поставить задачу синхронизации: {exc}',
                level=messages.ERROR,
            )
            return

        self.message_user(
            request,
            f'Задача синхронизации поставлена: {task.id}.',
            level=messages.SUCCESS,
        )


@admin.register(PaymentAttempt)
class PaymentAttemptAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'order',
        'status',
        'provider_status',
        'operation_id',
        'created_at',
        'updated_at',
    )
    readonly_fields = (
        'order',
        'idempotency_key',
        'request_payload',
        'response_payload',
        'created_at',
        'updated_at',
    )
    list_filter = ('status', 'provider_status')
    search_fields = ('operation_id', '=order__id', 'idempotency_key')

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        order = obj.order
        order.operation_id = obj.operation_id
        order.payment_link = obj.payment_link
        order.payment_status = obj.status
        order.provider_status = obj.provider_status
        order.save(update_fields=(
            'operation_id',
            'payment_link',
            'payment_status',
            'provider_status',
            'payment_status_updated_at',
        ))


@admin.register(Promocode)
class PromocodeAdmin(admin.ModelAdmin):
    list_display = (
        'code',
        'active',
        'percent',
        'min_price',
    )
    list_editable = ('percent', 'active', 'min_price')
