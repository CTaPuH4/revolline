import logging
import re
from dataclasses import dataclass, field
from hashlib import md5

import pandas as pd

from store.constants import (
    EXCEL_IMPORT_FALSE_VALUES,
    EXCEL_IMPORT_FIELD_ALIASES,
    EXCEL_IMPORT_FULL_WEIGHT_COLUMN,
    EXCEL_IMPORT_HEADER_HINTS,
    EXCEL_IMPORT_PACKAGED_WEIGHT_KG_COLUMN,
    EXCEL_IMPORT_SERVICE_ROW_MARKERS,
    EXCEL_IMPORT_TRUE_VALUES,
    MIN_VALUE,
)
from store.models import Category, Product, ProductImage
from store.services import clean_value, image_download

logger = logging.getLogger(__name__)


@dataclass
class ProductImportResult:
    imported: int = 0
    placeholder_price_rows: int = 0
    skipped_rows: int = 0
    failed_images: int = 0
    failed_rows: int = 0
    trimmed_fields: dict[str, int] = field(default_factory=dict)

    @property
    def has_warnings(self):
        return any((
            self.placeholder_price_rows,
            self.skipped_rows,
            self.failed_images,
            self.failed_rows,
        ))

    def to_messages(self):
        summary = [
            f'Импортировано {self.imported} записей из Excel.'
        ]
        if self.placeholder_price_rows:
            summary.append(
                f'Для {self.placeholder_price_rows} новых товаров не была '
                f'найдена цена, поэтому временно установлено минимальное '
                f'значение {MIN_VALUE}.'
            )
        if self.skipped_rows:
            summary.append(
                f'Пропущено строк без названия: {self.skipped_rows}.'
            )
        if self.failed_images:
            summary.append(
                f'Не удалось скачать изображений: {self.failed_images}.'
            )
        if self.failed_rows:
            summary.append(
                f'Не удалось импортировать строк: {self.failed_rows}.'
            )
        if self.trimmed_fields:
            trim_summary = ', '.join(
                f'{field_name}: {count}'
                for field_name, count in sorted(self.trimmed_fields.items())
            )
            summary.append(
                'Под лимиты полей обрезано значений: '
                f'{trim_summary}.'
            )
        return summary


def normalize_header(value):
    if pd.isna(value):
        return ''
    return str(value).strip()


def find_header_row(raw_df):
    for index in range(min(len(raw_df.index), 10)):
        normalized_values = {
            normalize_header(value).lower()
            for value in raw_df.iloc[index].tolist()
            if normalize_header(value)
        }
        if (
            normalized_values & EXCEL_IMPORT_HEADER_HINTS['title']
            and normalized_values & EXCEL_IMPORT_HEADER_HINTS['photos']
        ):
            return index
    return 0


def is_service_row(row):
    values = [
        normalize_header(value).lower()
        for value in row.tolist()
        if normalize_header(value)
    ]
    return any(
        marker in value
        for marker in EXCEL_IMPORT_SERVICE_ROW_MARKERS
        for value in values
    )


def load_products_dataframe(file):
    raw_df = pd.read_excel(file, header=None)
    header_row = find_header_row(raw_df)
    data_start_row = header_row + 1

    if (
        data_start_row < len(raw_df.index)
        and is_service_row(raw_df.iloc[data_start_row])
    ):
        data_start_row += 1

    headers = [
        normalize_header(value)
        for value in raw_df.iloc[header_row].tolist()
    ]
    data_df = raw_df.iloc[data_start_row:].copy()
    data_df.columns = headers
    data_df = data_df.loc[:, [column for column in data_df.columns if column]]
    data_df = data_df.dropna(how='all')
    return data_df


def get_row_value(row, aliases, default=None):
    for alias in aliases:
        if alias not in row.index:
            continue
        value = clean_value(row.get(alias))
        if value not in (None, ''):
            return value
    return default


def parse_bool(value, default=True):
    if pd.isna(value):
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0

    normalized = str(value).strip().lower()
    if normalized in EXCEL_IMPORT_TRUE_VALUES:
        return True
    if normalized in EXCEL_IMPORT_FALSE_VALUES:
        return False
    return default


def parse_weight_in_grams(row):
    grams = get_row_value(row, (EXCEL_IMPORT_FULL_WEIGHT_COLUMN,))
    if grams is not None:
        return grams

    kilograms = get_row_value(row, (EXCEL_IMPORT_PACKAGED_WEIGHT_KG_COLUMN,))
    if kilograms is None:
        return None
    return round(float(kilograms) * 1000, 3)


def split_multi_value(value):
    if value in (None, ''):
        return []
    return [
        part.strip()
        for part in re.split(r'[;,]', str(value))
        if part and part.strip()
    ]


def split_photo_links(value):
    if value in (None, ''):
        return []
    separator = ';' if ';' in str(value) else ','
    return [
        link.strip()
        for link in str(value).split(separator)
        if link and link.strip()
    ]


def fit_model_char_value(
    model,
    field_name,
    value,
    *,
    row_index=None,
    title=None,
    trimmed_stats=None,
):
    if value in (None, ''):
        return value

    normalized = str(value).strip()
    max_length = model._meta.get_field(field_name).max_length
    if field_name in {'effect', 'color'} and ';' in normalized:
        normalized = normalized.split(';', 1)[0].strip()

    if max_length and len(normalized) > max_length:
        if trimmed_stats is not None:
            trimmed_stats[field_name] = trimmed_stats.get(field_name, 0) + 1
        logger.debug(
            'Trimmed field "%s" for product "%s" on Excel row %s: %s -> %s chars',
            field_name,
            title or '<unknown>',
            row_index,
            len(normalized),
            max_length,
        )
        return normalized[:max_length]
    return normalized


def get_existing_value(existing_product, field_name, default=None):
    if existing_product is None:
        return default
    return getattr(existing_product, field_name)


def build_product_defaults(row, existing_product, full_weight, row_index, title,
                           trimmed_fields):
    return {
        'description': get_row_value(
            row,
            EXCEL_IMPORT_FIELD_ALIASES['description'],
            default=get_existing_value(existing_product, 'description', ''),
        ),
        'pr_type': fit_model_char_value(
            Product,
            'pr_type',
            get_row_value(
                row,
                EXCEL_IMPORT_FIELD_ALIASES['pr_type'],
                default=get_existing_value(existing_product, 'pr_type', ''),
            ),
            row_index=row_index,
            title=title,
            trimmed_stats=trimmed_fields,
        ),
        'is_new': parse_bool(
            get_row_value(row, EXCEL_IMPORT_FIELD_ALIASES['is_new']),
            default=get_existing_value(existing_product, 'is_new', True),
        ),
        'ingredients': get_row_value(
            row,
            EXCEL_IMPORT_FIELD_ALIASES['ingredients'],
            default=get_existing_value(existing_product, 'ingredients'),
        ),
        'country': fit_model_char_value(
            Product,
            'country',
            get_row_value(
                row,
                EXCEL_IMPORT_FIELD_ALIASES['country'],
                default=get_existing_value(existing_product, 'country'),
            ),
            row_index=row_index,
            title=title,
            trimmed_stats=trimmed_fields,
        ),
        'size': fit_model_char_value(
            Product,
            'size',
            get_row_value(
                row,
                EXCEL_IMPORT_FIELD_ALIASES['size'],
                default=get_existing_value(existing_product, 'size'),
            ),
            row_index=row_index,
            title=title,
            trimmed_stats=trimmed_fields,
        ),
        'effect': fit_model_char_value(
            Product,
            'effect',
            get_row_value(
                row,
                EXCEL_IMPORT_FIELD_ALIASES['effect'],
                default=get_existing_value(existing_product, 'effect'),
            ),
            row_index=row_index,
            title=title,
            trimmed_stats=trimmed_fields,
        ),
        'color': fit_model_char_value(
            Product,
            'color',
            get_row_value(
                row,
                EXCEL_IMPORT_FIELD_ALIASES['color'],
                default=get_existing_value(existing_product, 'color'),
            ),
            row_index=row_index,
            title=title,
            trimmed_stats=trimmed_fields,
        ),
        'collection': fit_model_char_value(
            Product,
            'collection',
            get_row_value(
                row,
                EXCEL_IMPORT_FIELD_ALIASES['collection'],
                default=get_existing_value(existing_product, 'collection'),
            ),
            row_index=row_index,
            title=title,
            trimmed_stats=trimmed_fields,
        ),
        'full_weight': (
            full_weight
            if full_weight is not None
            else get_existing_value(existing_product, 'full_weight')
        ),
        'product_weight': get_row_value(
            row,
            EXCEL_IMPORT_FIELD_ALIASES['product_weight'],
            default=get_existing_value(existing_product, 'product_weight'),
        ),
        'volume': get_row_value(
            row,
            EXCEL_IMPORT_FIELD_ALIASES['volume'],
            default=get_existing_value(existing_product, 'volume'),
        ),
    }


def import_categories(row, row_index, normalized_title, trimmed_fields):
    category_titles = split_multi_value(
        get_row_value(row, EXCEL_IMPORT_FIELD_ALIASES['categories'])
    )
    categories = [
        Category.objects.get_or_create(
            title=fit_model_char_value(
                Category,
                'title',
                category_title,
                row_index=row_index,
                title=normalized_title,
                trimmed_stats=trimmed_fields,
            ),
        )[0]
        for category_title in category_titles
    ]
    logger.debug('Imported product categories: %s', categories)
    return categories


def import_product_images(row, product):
    failed_images = 0
    photo_links = split_photo_links(
        get_row_value(row, EXCEL_IMPORT_FIELD_ALIASES['photos'])
    )
    for link in photo_links:
        image_file = image_download(link)
        if image_file is None:
            failed_images += 1
            logger.warning(
                'Could not download image for product "%s": %s',
                product.title,
                link,
            )
            continue

        file_hash = md5(image_file.read()).hexdigest()
        image_file.seek(0)

        if not product.images.filter(file_hash=file_hash).exists():
            ProductImage.objects.create(
                product=product,
                image=image_file,
                file_hash=file_hash,
            )

    return failed_images


def import_products_from_excel(file):
    df = load_products_dataframe(file)
    result = ProductImportResult()

    for row_index, row in df.iterrows():
        excel_row_number = row_index + 1
        title = get_row_value(row, EXCEL_IMPORT_FIELD_ALIASES['title'])
        if not title:
            result.skipped_rows += 1
            logger.warning(
                'Skipped Excel row %s: empty title after normalization',
                excel_row_number,
            )
            continue

        normalized_title = fit_model_char_value(
            Product,
            'title',
            title,
            row_index=excel_row_number,
            title=title,
            trimmed_stats=result.trimmed_fields,
        )
        existing_product = Product.objects.filter(
            title=normalized_title,
        ).first()

        price = get_row_value(row, EXCEL_IMPORT_FIELD_ALIASES['price'])
        if price is None:
            if existing_product:
                price = existing_product.price
            else:
                price = MIN_VALUE
                result.placeholder_price_rows += 1

        old_price = get_row_value(
            row,
            EXCEL_IMPORT_FIELD_ALIASES['old_price'],
            default=get_existing_value(existing_product, 'old_price'),
        )
        full_weight = parse_weight_in_grams(row)

        try:
            product, _ = Product.objects.update_or_create(
                title=normalized_title,
                defaults={
                    **build_product_defaults(
                        row,
                        existing_product,
                        full_weight,
                        excel_row_number,
                        title,
                        result.trimmed_fields,
                    ),
                    'price': price,
                    'old_price': old_price,
                },
            )
        except Exception:
            result.failed_rows += 1
            logger.exception(
                'Could not import Excel row %s for product "%s"',
                excel_row_number,
                title,
            )
            continue

        categories = import_categories(
            row,
            excel_row_number,
            normalized_title,
            result.trimmed_fields,
        )
        if categories:
            product.categories.set(categories)

        result.failed_images += import_product_images(row, product)
        result.imported += 1

    return result
