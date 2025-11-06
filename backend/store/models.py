from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from slugify import slugify

from store.constants import (LONG_CHAR_MAX_LENGTH, MIN_VALUE,
                             PRODUCT_MAX_QUANTITY, SHORT_CHAR_MAX_LENGTH)
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
        ordering = ('title',)


class AbstractSlugModel(AbstractModel):
    slug = models.SlugField(
        'Слаг',
        help_text='Ссылка/Адрес категории',
        unique=True,
        blank=True
    )

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug_candidate = base_slug
            counter = 1

            while Category.objects.filter(
                slug=slug_candidate
            ).exclude(id=self.id).exists():
                slug_candidate = f"{base_slug}-{counter}"
                counter += 1

            self.slug = slug_candidate

        super().save(*args, **kwargs)

    class Meta:
        abstract = True


class Category(AbstractSlugModel):
    '''
    Модель категорий.
    '''

    class Meta:
        verbose_name = 'категория'
        verbose_name_plural = 'Категории'


class Section(AbstractSlugModel):
    '''
    Модель разделов.
    '''
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
    pr_type = models.CharField(
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
        blank=True,
        null=True,
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
        'Вес, г.',
        validators=(MinValueValidator(MIN_VALUE),),
        blank=True,
        null=True
    )
    product_weight = models.FloatField(
        'Вес продукта, г.',
        validators=(MinValueValidator(MIN_VALUE),),
        blank=True,
        null=True,
    )
    volume = models.FloatField(
        'Объём продукта, мл.',
        validators=(MinValueValidator(MIN_VALUE),),
        blank=True,
        null=True,
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
        ordering = ('title',)


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
    file_hash = models.CharField(
        'Хэш',
        max_length=32,
        blank=True,
        null=True
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
        validators=(
            MinValueValidator(1),
            MaxValueValidator(PRODUCT_MAX_QUANTITY),
        )
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


class Promocode(models.Model):
    '''
    Модель промокодов.
    '''
    code = models.SlugField(
        'Код',
        unique=True,
    )
    active = models.BooleanField(
        'Дествителен',
        help_text='Определяет возможно ли использовать данный промокод',
        default=True
    )
    percent = models.IntegerField(
        'Процент',
        help_text='Процент скидки',
        validators=(MinValueValidator(1), MaxValueValidator(90),)
    )
    min_price = models.PositiveIntegerField(
        'Порог активации',
        help_text='Минимальная цена товаров в корзине для активации промокода',
        default=0
    )

    def __str__(self):
        return f'{self.code} - {self.percent}% от {self.min_price}'

    class Meta:
        verbose_name = 'Промокод'
        verbose_name_plural = 'Промокоды'
        ordering = ('percent',)


class Order(models.Model):
    '''
    Модель заказов.
    '''
    class Status(models.TextChoices):
        NEW = 'N', 'Создан'
        PAID = 'P', 'Оплачен'
        SHIPPED = 'S', 'Отправлен'
        CANCELED = 'C', 'Отменён'

    status = models.CharField(
        'Статус',
        max_length=1,
        choices=Status.choices,
        default=Status.NEW
    )
    created_at = models.DateTimeField(
        'Дата создания',
        auto_now_add=True,
        editable=False,
    )
    client = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='orders',
        verbose_name='Клиент',
    )
    total_price = models.PositiveIntegerField(
        'Сумма',
    )
    operation_id = models.CharField(
        'ID операции',
        max_length=LONG_CHAR_MAX_LENGTH,
    )
    payment_link = models.CharField(
        'Сслыка на оплату',
        max_length=LONG_CHAR_MAX_LENGTH,
    )
    promo = models.ForeignKey(
        Promocode,
        on_delete=models.CASCADE,
        related_name='in_orders',
        null=True,
        blank=True,
        verbose_name='Промокод'
    )
    shipping_address = models.TextField(
        'Адрес доставки',
        max_length=LONG_CHAR_MAX_LENGTH,
    )
    tracking_number = models.IntegerField(
        'Трек-номер',
        blank=True,
        null=True,
    )
    items = models.ManyToManyField(
        Product,
        through='store.ProductOrder',
        blank=False,
        verbose_name='Товары',
    )

    def __str__(self):
        return f'Заказ #{self.id} — {self.get_status_display()}'

    class Meta:
        verbose_name = 'Заказ'
        verbose_name_plural = 'Заказы'
        ordering = ('-pk',)


class ProductOrder(models.Model):
    '''
    Many to many для связи продуктов и заказов.
    '''
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='in_orders'
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE
    )
    quantity = models.PositiveIntegerField(
        'Количество',
        validators=(MinValueValidator(1),)
    )

    class Meta:
        unique_together = ('order', 'product')
        verbose_name = 'Продукт в заказе'
        verbose_name_plural = 'Продукты в заказе'
