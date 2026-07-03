from django.db import migrations, models
from django.db.models.functions import Lower


def normalize_promocode_codes(apps, schema_editor):
    Promocode = apps.get_model('store', 'Promocode')

    normalized_codes = {}
    for promo in Promocode.objects.all().order_by('id'):
        normalized = (promo.code or '').strip().lower()

        if normalized in normalized_codes:
            first_id, first_code = normalized_codes[normalized]
            raise RuntimeError(
                'Duplicate promocodes after normalization: '
                f'{first_code!r} (id={first_id}) and '
                f'{promo.code!r} (id={promo.id}) both become {normalized!r}.'
            )

        normalized_codes[normalized] = (promo.id, promo.code)

        if promo.code != normalized:
            promo.code = normalized
            promo.save(update_fields=('code',))


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0013_rework_prices_and_order_snapshots'),
    ]

    operations = [
        migrations.RunPython(
            normalize_promocode_codes,
            migrations.RunPython.noop,
        ),
        migrations.AddConstraint(
            model_name='promocode',
            constraint=models.UniqueConstraint(
                Lower('code'),
                name='store_promocode_code_ci_unique',
            ),
        ),
    ]
