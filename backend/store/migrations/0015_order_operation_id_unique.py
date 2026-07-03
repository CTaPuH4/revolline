from django.db import migrations, models


def ensure_operation_ids_are_unique(apps, schema_editor):
    order = apps.get_model('store', 'Order')
    duplicates = (
        order.objects
        .values('operation_id')
        .annotate(row_count=models.Count('id'))
        .filter(row_count__gt=1)
    )
    if duplicates.exists():
        raise RuntimeError(
            'Cannot make Order.operation_id unique: duplicate values exist.'
        )


class Migration(migrations.Migration):
    dependencies = [
        ('store', '0014_promocode_case_insensitive_constraint'),
    ]

    operations = [
        migrations.RunPython(
            ensure_operation_ids_are_unique,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='order',
            name='operation_id',
            field=models.CharField(
                max_length=96,
                unique=True,
                verbose_name='ID операции',
            ),
        ),
    ]
