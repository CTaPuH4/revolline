import logging
from hashlib import md5

import pandas as pd
from django import forms
from django.contrib import admin, messages
from django.http import HttpResponseRedirect
from django.template.response import TemplateResponse

from store.models import (Category, Order, Product, ProductImage, ProductOrder,
                          Promocode, Section)
from store.services import clean_value, image_download, status_update

from .models import Category, Product

logger = logging.getLogger('main')


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


class ExcelImportForm(forms.Form):
    file = forms.FileField(label='Выберите Excel-файл (.xlsx или .xls)')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'title',
        'pr_type',
        'price',
        'discount_price',
        'volume',
    )
    list_editable = (
        'price',
        'discount_price',
    )
    search_fields = ('title', 'description', 'pr_type')
    list_filter = ('categories', 'country', 'is_new')
    inlines = (ProductImageInline,)
    change_list_template = 'admin/import_products.html'

    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path(
                'import-excel/',
                self.admin_site.admin_view(self.import_excel)
            ),
        ]
        return custom_urls + urls

    def import_excel(self, request):
        '''Обработчик формы импорта'''
        if request.method == 'POST':
            form = ExcelImportForm(request.POST, request.FILES)
            if form.is_valid():
                file = form.cleaned_data['file']
                df = pd.read_excel(file)

                imported = 0
                for _, row in df.iterrows():
                    product, _ = Product.objects.update_or_create(
                        title=row['Название'],
                        defaults={
                            'description': clean_value(row['Описание']),
                            'pr_type': clean_value(row['Тип']),
                            'price': clean_value(row['Цена']),
                            'discount_price': clean_value(
                                row['Цена по скидке']
                            ),
                            'is_new': clean_value(
                                bool(row['Новинка']),
                                default=True
                            ),
                            'ingredients': clean_value(row['Состав']),
                            'country': clean_value(row['Страна']),
                            'size': clean_value(row['Размеры']),
                            'effect': clean_value(row['Эффект']),
                            'color': clean_value(row['Цвет']),
                            'collection': clean_value(row['Коллекция']),
                            'full_weight': clean_value(row['Вес полный']),
                            'product_weight': clean_value(row['Вес продукта']),
                            'volume': clean_value(row['Объём']),
                        },
                    )

                    cat_titles = [
                        x.strip().capitalize()
                        for x in row['Категории'].split(',')
                        if x.strip()
                    ]
                    categories = [
                        Category.objects.get_or_create(
                            title=title
                        )[0] for title in cat_titles
                    ]
                    print(categories)
                    product.categories.set(categories)

                    links = [
                        x.strip() for x in row['Фото'].split(',')
                    ]
                    for link in links:
                        image_file = image_download(link)
                        file_hash = md5(image_file.read()).hexdigest()
                        image_file.seek(0)

                        if not product.images.filter(
                            file_hash=file_hash
                        ).exists():
                            ProductImage.objects.create(
                                product=product,
                                image=image_file,
                                file_hash=file_hash
                            )
                    imported += 1

                self.message_user(
                    request,
                    f'Импортировано {imported} записей из Excel.',
                    level=messages.SUCCESS,
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
        'tracking_number',
        'total_price',
        'created_at',
        'client',
    )
    list_editable = ('status', 'tracking_number',)
    readonly_fields = (
        'client',
        'total_price',
        'shipping_address',
        'operation_id',
        'payment_link',
        'promo'
    )
    list_filter = ('status',)
    inlines = (ProductOrderInline,)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        status_update(qs.filter(status=Order.Status.NEW))
        return qs


@admin.register(Promocode)
class PromocodeAdmin(admin.ModelAdmin):
    list_display = (
        'code',
        'active',
        'percent',
        'min_price'
    )
    list_editable = ('percent', 'active', 'min_price')
