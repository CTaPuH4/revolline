from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('store', '0019_alter_order_client_alter_order_promo_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='how_to_use',
            field=models.TextField(
                blank=True,
                null=True,
                verbose_name='Применение',
            ),
        ),
    ]
