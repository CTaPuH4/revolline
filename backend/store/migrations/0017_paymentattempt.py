from django.db import migrations, models
import django.db.models.deletion


def create_payment_attempts(apps, schema_editor):
    Order = apps.get_model('store', 'Order')
    PaymentAttempt = apps.get_model('store', 'PaymentAttempt')

    attempts = []
    for order in Order.objects.all().iterator():
        attempts.append(PaymentAttempt(
            order_id=order.id,
            idempotency_key=order.idempotency_key,
            operation_id=order.operation_id,
            payment_link=order.payment_link or '',
            status=order.payment_status or 'unknown',
            provider_status=order.provider_status or '',
            request_payload={},
            response_payload={},
        ))

    PaymentAttempt.objects.bulk_create(attempts, batch_size=500)


def delete_payment_attempts(apps, schema_editor):
    PaymentAttempt = apps.get_model('store', 'PaymentAttempt')
    PaymentAttempt.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0016_order_payment_state'),
    ]

    operations = [
        migrations.CreateModel(
            name='PaymentAttempt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('idempotency_key', models.UUIDField(editable=False, unique=True, verbose_name='Ключ идемпотентности')),
                ('operation_id', models.CharField(blank=True, max_length=96, null=True, unique=True, verbose_name='ID операции')),
                ('payment_link', models.URLField(blank=True, max_length=512, verbose_name='Ссылка на оплату')),
                ('status', models.CharField(choices=[('pending', 'Создание платежа'), ('link_created', 'Ссылка создана'), ('paid', 'Оплачен'), ('expired', 'Истёк'), ('failed', 'Ошибка создания'), ('unknown', 'Требует сверки'), ('refunding', 'Возврат выполняется'), ('refunded', 'Возвращён')], db_index=True, default='pending', max_length=16, verbose_name='Статус попытки')),
                ('provider_status', models.CharField(blank=True, max_length=32, verbose_name='Статус платёжного провайдера')),
                ('request_payload', models.JSONField(blank=True, default=dict, verbose_name='Запрос к провайдеру')),
                ('response_payload', models.JSONField(blank=True, default=dict, verbose_name='Ответ провайдера')),
                ('error_message', models.TextField(blank=True, verbose_name='Ошибка')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Дата обновления')),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='payment_attempts', to='store.order', verbose_name='Заказ')),
            ],
            options={
                'verbose_name': 'Попытка оплаты',
                'verbose_name_plural': 'Попытки оплаты',
                'ordering': ('-pk',),
            },
        ),
        migrations.RunPython(
            create_payment_attempts,
            delete_payment_attempts,
        ),
        migrations.AddIndex(
            model_name='paymentattempt',
            index=models.Index(fields=['order', 'status'], name='store_payme_order_i_1af546_idx'),
        ),
        migrations.AddConstraint(
            model_name='paymentattempt',
            constraint=models.UniqueConstraint(condition=models.Q(('status__in', ('pending', 'link_created', 'unknown', 'refunding'))), fields=('order',), name='store_one_active_payment_attempt_per_order'),
        ),
    ]
