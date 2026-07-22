from uuid import uuid4

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models.functions import Lower
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

            while self.__class__.objects.filter(
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
    how_to_use = models.TextField(
        'Описание',
    )
    pr_type = models.CharField(
        'Тип продукта',
        max_length=LONG_CHAR_MAX_LENGTH
    )
    price = models.DecimalField(
        'Цена',
        max_digits=12,
        decimal_places=2,
        validators=(
            MinValueValidator(MIN_VALUE),
        )
    )
    old_price = models.DecimalField(
        'Цена без скидки',
        max_digits=12,
        decimal_places=2,
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
        if self.old_price is not None and self.price is not None:
            if self.old_price <= self.price:
                raise ValidationError({
                    'old_price':
                    'Цена без скидки должна быть больше актуальной цены.'
                })

    @property
    def has_discount(self):
        return self.old_price is not None and self.old_price > self.price

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

    def clean(self):
        super().clean()

        if self.code:
            self.code = self.code.strip().lower()

    def save(self, *args, **kwargs):
        if self.code:
            self.code = self.code.strip().lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.code} - {self.percent}% от {self.min_price}'

    class Meta:
        verbose_name = 'Промокод'
        verbose_name_plural = 'Промокоды'
        ordering = ('percent',)
        constraints = [
            models.UniqueConstraint(
                Lower('code'),
                name='store_promocode_code_ci_unique',
            ),
        ]


class Order(models.Model):
    '''
    Модель заказов.
    '''
    class Status(models.TextChoices):
        NEW = 'N', 'Создан'
        PAID = 'P', 'Оплачен'
        SHIPPED = 'S', 'Отправлен'
        CANCELED = 'C', 'Отменён'

    class PaymentStatus(models.TextChoices):
        PENDING = 'pending', 'Создание платежа'
        LINK_CREATED = 'link_created', 'Ссылка создана'
        PAID = 'paid', 'Оплачен'
        EXPIRED = 'expired', 'Истёк'
        FAILED = 'failed', 'Ошибка создания'
        UNKNOWN = 'unknown', 'Требует сверки'
        REFUNDING = 'refunding', 'Возврат выполняется'
        REFUNDED = 'refunded', 'Возвращён'

    PAYMENT_LOCKED_STATUSES = (
        PaymentStatus.PAID,
        PaymentStatus.REFUNDING,
        PaymentStatus.REFUNDED,
    )
    LOCKED_PROTECTED_FIELDS = (
        'client_id',
        'total_price',
        'promo_id',
        'shipping_address',
        'idempotency_key',
    )

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
    idempotency_key = models.UUIDField(
        'Ключ идемпотентности',
        default=uuid4,
        editable=False,
        unique=True,
    )
    client = models.ForeignKey(
        CustomUser,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name='orders',
        verbose_name='Клиент',
    )
    total_price = models.DecimalField(
        'Сумма',
        max_digits=12,
        decimal_places=2,
    )
    operation_id = models.CharField(
        'ID операции',
        blank=True,
        max_length=LONG_CHAR_MAX_LENGTH,
        null=True,
        unique=True,
    )
    payment_link = models.URLField(
        'Ссылка на оплату',
        blank=True,
        max_length=512,
    )
    payment_status = models.CharField(
        'Статус платежа',
        choices=PaymentStatus.choices,
        db_index=True,
        default=PaymentStatus.PENDING,
        max_length=16,
    )
    provider_status = models.CharField(
        'Статус платёжного провайдера',
        blank=True,
        max_length=32,
    )
    payment_status_updated_at = models.DateTimeField(
        'Статус платежа обновлён',
        auto_now=True,
    )
    promo = models.ForeignKey(
        Promocode,
        on_delete=models.SET_NULL,
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

    @property
    def is_payment_locked(self):
        return self.payment_status in self.PAYMENT_LOCKED_STATUSES

    def _validate_locked_order_changes(self):
        if not self.pk:
            return

        old_order = (
            type(self).objects
            .filter(pk=self.pk)
            .only(
                'payment_status',
                'status',
                *self.LOCKED_PROTECTED_FIELDS,
            )
            .first()
        )
        if old_order is None or not old_order.is_payment_locked:
            return

        changed_fields = [
            field
            for field in self.LOCKED_PROTECTED_FIELDS
            if getattr(old_order, field) != getattr(self, field)
        ]
        if changed_fields:
            raise ValidationError(
                'Оплаченный заказ нельзя менять по бизнес-полям: '
                f'{", ".join(changed_fields)}.'
            )

        if old_order.status != self.Status.NEW and self.status == self.Status.NEW:
            raise ValidationError(
                'Оплаченный заказ нельзя вернуть в статус "Создан".'
            )

    def save(self, *args, **kwargs):
        self._validate_locked_order_changes()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.is_payment_locked:
            raise ValidationError('Оплаченный заказ нельзя удалить.')
        return super().delete(*args, **kwargs)

    class Meta:
        verbose_name = 'Заказ'
        verbose_name_plural = 'Заказы'
        ordering = ('-pk',)


class PaymentAttempt(models.Model):
    '''
    Попытка создания/оплаты платежа по заказу.
    '''
    ACTIVE_STATUSES = (
        Order.PaymentStatus.PENDING,
        Order.PaymentStatus.LINK_CREATED,
        Order.PaymentStatus.UNKNOWN,
        Order.PaymentStatus.REFUNDING,
    )

    order = models.ForeignKey(
        Order,
        on_delete=models.PROTECT,
        related_name='payment_attempts',
        verbose_name='Заказ',
    )
    idempotency_key = models.UUIDField(
        'Ключ идемпотентности',
        editable=False,
        unique=True,
    )
    operation_id = models.CharField(
        'ID операции',
        blank=True,
        max_length=LONG_CHAR_MAX_LENGTH,
        null=True,
        unique=True,
    )
    payment_link = models.URLField(
        'Ссылка на оплату',
        blank=True,
        max_length=512,
    )
    status = models.CharField(
        'Статус попытки',
        choices=Order.PaymentStatus.choices,
        db_index=True,
        default=Order.PaymentStatus.PENDING,
        max_length=16,
    )
    provider_status = models.CharField(
        'Статус платёжного провайдера',
        blank=True,
        max_length=32,
    )
    request_payload = models.JSONField(
        'Запрос к провайдеру',
        blank=True,
        default=dict,
    )
    response_payload = models.JSONField(
        'Ответ провайдера',
        blank=True,
        default=dict,
    )
    error_message = models.TextField(
        'Ошибка',
        blank=True,
    )
    created_at = models.DateTimeField(
        'Дата создания',
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        'Дата обновления',
        auto_now=True,
    )

    @property
    def is_active(self):
        return self.status in self.ACTIVE_STATUSES

    def __str__(self):
        return f'PaymentAttempt #{self.id} for order #{self.order_id}'

    class Meta:
        verbose_name = 'Попытка оплаты'
        verbose_name_plural = 'Попытки оплаты'
        ordering = ('-pk',)
        indexes = (
            models.Index(fields=('order', 'status')),
        )
        constraints = (
            models.UniqueConstraint(
                fields=('order',),
                condition=models.Q(status__in=(
                    Order.PaymentStatus.PENDING,
                    Order.PaymentStatus.LINK_CREATED,
                    Order.PaymentStatus.UNKNOWN,
                    Order.PaymentStatus.REFUNDING,
                )),
                name='store_one_active_payment_attempt_per_order',
            ),
        )


class ProductOrder(models.Model):
    '''
    Many to many для связи продуктов и заказов.
    '''
    product = models.ForeignKey(
        Product,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name='in_orders'
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE
    )
    product_title = models.CharField(
        'Название товара на момент заказа',
        max_length=LONG_CHAR_MAX_LENGTH,
        blank=True,
    )
    unit_price = models.DecimalField(
        'Цена товара на момент заказа',
        max_digits=12,
        decimal_places=2,
        validators=(MinValueValidator(MIN_VALUE),),
    )
    old_unit_price = models.DecimalField(
        'Цена без скидки на момент заказа',
        max_digits=12,
        decimal_places=2,
        validators=(MinValueValidator(MIN_VALUE),),
        blank=True,
        null=True,
    )
    quantity = models.PositiveIntegerField(
        'Количество',
        validators=(MinValueValidator(1),)
    )

    def _validate_order_is_mutable(self):
        if self.order_id and self.order.is_payment_locked:
            raise ValidationError(
                'Состав оплаченного заказа нельзя менять.'
            )

    def save(self, *args, **kwargs):
        self._validate_order_is_mutable()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        self._validate_order_is_mutable()
        return super().delete(*args, **kwargs)

    class Meta:
        unique_together = ('order', 'product')
        verbose_name = 'Продукт в заказе'
        verbose_name_plural = 'Продукты в заказе'
