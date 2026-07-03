from django.core.validators import MinValueValidator
from django.db import migrations, models


def migrate_prices_forward(apps, schema_editor):
    Product = apps.get_model('store', 'Product')
    ProductOrder = apps.get_model('store', 'ProductOrder')

    for product in Product.objects.all():
        if product.discount_price is not None:
            original_price = product.price
            product.price = product.discount_price
            product.old_price = original_price
            product.save(update_fields=('price', 'old_price'))

    for item in ProductOrder.objects.select_related('product'):
        product = item.product
        item.product_title = product.title
        if product.discount_price is not None:
            item.unit_price = product.discount_price
            item.old_unit_price = product.old_price
        else:
            item.unit_price = product.price
            item.old_unit_price = None
        item.save(update_fields=(
            'product_title',
            'unit_price',
            'old_unit_price',
        ))


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0012_alter_product_full_weight_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='old_price',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=12,
                null=True,
                validators=[MinValueValidator(0.1)],
                verbose_name='Цена без скидки',
            ),
        ),
        migrations.AlterField(
            model_name='product',
            name='price',
            field=models.DecimalField(
                decimal_places=2,
                max_digits=12,
                validators=[MinValueValidator(0.1)],
                verbose_name='Цена',
            ),
        ),
        migrations.AlterField(
            model_name='order',
            name='total_price',
            field=models.DecimalField(
                decimal_places=2,
                max_digits=12,
                verbose_name='Сумма',
            ),
        ),
        migrations.AddField(
            model_name='productorder',
            name='product_title',
            field=models.CharField(
                blank=True,
                default='',
                max_length=96,
                verbose_name='Название товара на момент заказа',
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='productorder',
            name='unit_price',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                max_digits=12,
                validators=[MinValueValidator(0.1)],
                verbose_name='Цена товара на момент заказа',
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='productorder',
            name='old_unit_price',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=12,
                null=True,
                validators=[MinValueValidator(0.1)],
                verbose_name='Цена без скидки на момент заказа',
            ),
        ),
        migrations.RunPython(migrate_prices_forward, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='product',
            name='discount_price',
        ),
    ]
