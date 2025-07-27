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
    '''
    Модель категорий.
    '''
    slug = models.SlugField(
        'Слаг',
        help_text='Ссылка/Адрес категории',
        unique=True,
    )

    class Meta:
        verbose_name = 'категория'
        verbose_name_plural = 'Категории'


class Section(AbstractModel):
    '''
    Модель разделов.
    '''
    slug = models.SlugField(
        'Слаг',
        help_text='Ссылка/Адрес категории',
        unique=True,
    )
    categories = models.ManyToManyField(
        Category,
        related_name='sections',
        verbose_name='Категории'
    )

    class Meta:
        verbose_name = 'раздел'
        verbose_name_plural = 'Разделы'


class Product(AbstractModel):
    '''
    Модель продуктов.
    '''
    description = models.TextField(
        'Описание',
    )
    type = models.CharField(
        'Тип продукта',
        max_length=LONG_CHAR_MAX_LENGTH
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
    is_new = models.BooleanField(
        'Новинка',
        help_text='Будет ли товар отображаться в блоке \"Новинки\"',
        default=True,
    )
    ingredients = models.TextField(
        'Состав',
    )
    country = models.CharField(
        'Страна производства',
        max_length=SHORT_CHAR_MAX_LENGTH,
        blank=True,
        null=True,
    )
    size = models.CharField(
        'Размеры',
        max_length=SHORT_CHAR_MAX_LENGTH,
        blank=True,
        null=True
    )
    effect = models.CharField(
        'Эффект',
        max_length=SHORT_CHAR_MAX_LENGTH,
        blank=True,
        null=True
    )
    color = models.CharField(
        'Цвет',
        max_length=SHORT_CHAR_MAX_LENGTH,
        blank=True,
        null=True
    )
    collection = models.CharField(
        'Коллекция',
        max_length=SHORT_CHAR_MAX_LENGTH,
        blank=True,
        null=True
    )
    full_weight = models.FloatField(
        'Вес',
        validators=(MinValueValidator(MIN_VALUE),),
        blank=True,
        null=True
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
    '''
    Модель изображений продуктов.
    '''
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
    '''
    Модель корзины.
    '''
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='cart_items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        verbose_name='Продукт',
        related_name='in_cart_by'
    )
    quantity = models.PositiveIntegerField(
        'Количество',
        validators=(MinValueValidator(1),)
    )

    class Meta:
        unique_together = ('user', 'product')
        verbose_name = 'Корзина'
        verbose_name_plural = 'Товары в корзине'
        ordering = ('pk',)


class Favorites(models.Model):
    '''
    Модель избранного.
    '''
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='favorite_products'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        verbose_name='Продукт',
        related_name='favorite_by'
    )

    class Meta:
        unique_together = ('user', 'product')
        verbose_name = 'Избранное'
        verbose_name_plural = 'Избранные товары'
        ordering = ('-pk',)
