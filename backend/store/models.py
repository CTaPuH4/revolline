from django.core.validators import MinValueValidator
from django.db import models

from store.constants import MIN_VALUE, TITLE_MAX_LENGTH


class AbstractModel(models.Model):
    title = models.CharField(
        'Название',
        max_length=TITLE_MAX_LENGTH,
        unique=True,
    )

    def __str__(self):
        return self.title

    class Meta:
        abstract = True
        ordering = ('pk',)


class Category(AbstractModel):
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
    categories = models.ManyToManyField(
        Category,
        related_name='products',
        verbose_name='Категории'
    )

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
