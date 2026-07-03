import uuid

from django.db import migrations, models


def populate_order_payment_state(apps, schema_editor):
    order_model = apps.get_model('store', 'Order')

    for order in order_model.objects.all().iterator():
        order.idempotency_key = uuid.uuid4()
        if order.status in ('P', 'S'):
            order.payment_status = 'paid'
            order.provider_status = 'APPROVED'
        elif order.status == 'C':
            order.payment_status = 'unknown'
        elif order.payment_link:
            order.payment_status = 'link_created'
            order.provider_status = 'CREATED'
        else:
            order.payment_status = 'unknown'

        order.save(update_fields=(
            'idempotency_key',
            'payment_status',
            'provider_status',
        ))


class Migration(migrations.Migration):
    dependencies = [
        ('store', '0015_order_operation_id_unique'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='idempotency_key',
            field=models.UUIDField(editable=False, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='payment_status',
            field=models.CharField(
                choices=[
                    ('pending', 'Создание платежа'),
                    ('link_created', 'Ссылка создана'),
                    ('paid', 'Оплачен'),
                    ('expired', 'Истёк'),
                    ('failed', 'Ошибка создания'),
                    ('unknown', 'Требует сверки'),
                    ('refunding', 'Возврат выполняется'),
                    ('refunded', 'Возвращён'),
                ],
                db_index=True,
                default='pending',
                max_length=16,
                verbose_name='Статус платежа',
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='provider_status',
            field=models.CharField(
                blank=True,
                default='',
                max_length=32,
                verbose_name='Статус платёжного провайдера',
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='order',
            name='payment_status_updated_at',
            field=models.DateTimeField(
                auto_now=True,
                verbose_name='Статус платежа обновлён',
            ),
        ),
        migrations.RunPython(
            populate_order_payment_state,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='order',
            name='idempotency_key',
            field=models.UUIDField(
                default=uuid.uuid4,
                editable=False,
                unique=True,
                verbose_name='Ключ идемпотентности',
            ),
        ),
        migrations.AlterField(
            model_name='order',
            name='operation_id',
            field=models.CharField(
                blank=True,
                max_length=96,
                null=True,
                unique=True,
                verbose_name='ID операции',
            ),
        ),
        migrations.AlterField(
            model_name='order',
            name='payment_link',
            field=models.URLField(
                blank=True,
                max_length=512,
                verbose_name='Ссылка на оплату',
            ),
        ),
    ]
