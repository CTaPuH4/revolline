from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from store.constants import (LONG_CHAR_MAX_LENGTH, MIN_VALUE,
                             SHORT_CHAR_MAX_LENGTH)
from users.models import CustomUser


class AbstractModel(models.Model):
    title = models.CharField(
        'Название',
        max_length=LONG_CHAR_MAX_LENGTH,
        unique=True,
    )

    def __str__(self):
        return self.title

    class Meta:
        abstract = True
        ordering = ('pk',)


class Category(AbstractModel):
    slug = models.SlugField(
        'Слаг(ссылка)',
        unique=True,
    )

    class Meta:
        verbose_name = 'категория'
        verbose_name_plural = 'Категории'


class Product(AbstractModel):
    description = models.TextField(
        'Описание',
    )
    price = models.IntegerField(
        'Цена',
        validators=(
            MinValueValidator(MIN_VALUE),
        )
    )
    discount_price = models.IntegerField(
        'Цена по скидке',
        validators=(
            MinValueValidator(MIN_VALUE),
        ),
        blank=True,
        null=True
    )
    ingridients = models.TextField(
        'Состав',
    )
    country = models.CharField(
        'Страна производства',
        max_length=SHORT_CHAR_MAX_LENGTH
    )
    size = models.CharField(
        'Размеры',
        max_length=SHORT_CHAR_MAX_LENGTH
    )
    full_weight = models.FloatField(
        'Вес',
        validators=(MinValueValidator(MIN_VALUE),)
    )
    product_weight = models.FloatField(
        'Вес/объём продукта',
        validators=(MinValueValidator(MIN_VALUE),)
    )
    categories = models.ManyToManyField(
        Category,
        related_name='products',
        verbose_name='Категории'
    )

    def clean(self):
        super().clean()
        if self.discount_price is not None and self.price is not None:
            if self.discount_price > self.price:
                raise ValidationError({
                    'discount_price':
                    'Цена по скидке не может быть больше основной цены.'
                })

    class Meta:
        verbose_name = 'продукт'
        verbose_name_plural = 'Продукты'


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        related_name='images',
        on_delete=models.CASCADE
    )
    image = models.ImageField(
        'Изображение',
        upload_to='products/',
    )

    class Meta:
        verbose_name = 'изображение'
        verbose_name_plural = 'Изображения'


class Cart(models.Model):
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='cart_items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        verbose_name='Продукт'
    )
    quantity = models.PositiveIntegerField(
        'Количество',
        default=1
    )

    class Meta:
        unique_together = ('user', 'product')
        verbose_name = 'Корзина'
        verbose_name_plural = 'Товары в корзине'
