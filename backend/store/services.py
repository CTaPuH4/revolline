import http.client
import json
import logging
from decimal import ROUND_HALF_UP, Decimal

import requests
from decouple import config

from api.exceptions import ExternalAPIError

logger = logging.getLogger('main')


def get_code():
    conn = http.client.HTTPSConnection("enter.tochka.com")
    token = config('PAYMENT_TOKEN')
    payload = ''
    headers = {
        'Accept': 'application/json',
        'Authorization': f'Bearer {token}'
    }

    conn.request(
        'GET',
        '/uapi/open-banking/v1.0/customers',
        payload,
        headers
    )
    res = conn.getresponse()
    data = json.loads(res.read().decode("utf-8"))

    if res.status == 200:
        try:
            sup_info = data['Data']['Customer'][0]
            code = sup_info['customerCode']
        except KeyError as e:
            logger.error(f'Отсутствует ключ {e} в ответе API: {data}')
            raise ExternalAPIError(f'Missing key {e} in API response')
    else:
        logger.warning(
            f'Ошибка API Tochka ({res.status}): '
            f'{json.dumps(data, ensure_ascii=False)}'
        )
        raise ExternalAPIError()

    conn.request(
        'GET',
        f'/uapi/acquiring/v1.0/retailers?customerCode={code}',
        payload,
        headers
    )
    res = conn.getresponse()
    data = json.loads(res.read().decode("utf-8"))

    if res.status == 200:
        try:
            mer_data = data['Data']['Retailer'][0]
        except KeyError as e:
            logger.error(f'Отсутствует ключ {e} в ответе API: {data}')
            raise ExternalAPIError(f'Missing key {e} in API response')
    else:
        logger.warning(
            f'Ошибка API Tochka ({res.status}): '
            f'{json.dumps(data, ensure_ascii=False)}'
        )
        raise ExternalAPIError()
    return mer_data, sup_info


def create_link(user, cart, promo=None):
    url = (
        'https://enter.tochka.com/uapi/acquiring/v1.0/payments_with_receipt'
    )
    token = config('PAYMENT_TOKEN')

    mer_data, sup_info = get_code()
    full_name = f'{user.first_name} {user.last_name} {user.patronymic}'

    promo_mult = Decimal('1')
    if promo:
        promo_mult = Decimal('1') - (Decimal(
            str(promo.percent)) / Decimal('100'))

    total_price = sum(
        (item.product.discount_price or item.product.price) * item.quantity
        for item in cart
    )
    final_price = (total_price * promo_mult).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP
    )

    products = []
    for item in cart:
        products.append({
            "vatType": "none",
            "name": item.product.title,
            "amount": float(
                ((item.product.discount_price or item.product.price)
                 * promo_mult).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP)
            ),
            "quantity": item.quantity,
            "paymentMethod": "full_payment",
            "paymentObject": "goods"
        })

    payload = json.dumps({
        "Data": {
            "customerCode": sup_info['customerCode'],
            "amount": float(final_price),
            "purpose": "Оплата заказа",
            "redirectUrl": "https://example.com",
            "failRedirectUrl": "https://example.com/fail",
            "paymentMode": mer_data['paymentModes'],
            "merchantId": mer_data['merchantId'],
            "taxSystemCode": "usn_income_outcome",
            "Client": {
                "name": full_name,
                "email": str(user.email),
                "phone": '+' + str(user.phone)
            },
            "Items": products,
            "Supplier": {
                "phone": config('PHONE_NUMBER'),
                "name": sup_info['shortName'],
                "taxCode": sup_info['taxCode']
            }
        }
    })
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': f'Bearer {token}'
    }

    response = requests.request("POST", url, headers=headers, data=payload)
    data = response.json()

    if response.status_code == 200:
        try:
            op_id = data['Data']['operationId']
            link = data['Data']['paymentLink']
        except KeyError as e:
            logger.error(f'Отсутствует ключ {e} в ответе API: {data}')
            raise ExternalAPIError(f'Missing key {e} in API response')
        logger.info(
            'Создана ссылка на оплату. Детали:'
            f'Заказ {op_id}, ссылка: {link}'
        )
        return op_id, link
    else:
        logger.warning(
            f'Ошибка API Tochka ({response.status_code}): '
            f'{json.dumps(data, ensure_ascii=False)}'
        )
        raise ExternalAPIError()


def get_status(id):
    conn = http.client.HTTPSConnection("enter.tochka.com")
    token = config('PAYMENT_TOKEN')
    payload = ''
    headers = {
        'Accept': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    conn.request(
        "GET",
        f"/uapi/acquiring/v1.0/payments/{id}",
        payload,
        headers
    )
    res = conn.getresponse()
    data = json.loads(res.read().decode("utf-8"))
    if res.status != 200:
        raise ExternalAPIError(
            f'Ошибка обновления заказа {id}, {res.status}:'
            f'{json.dumps(data, ensure_ascii=False)}'
        )
    return data['Data']['Operation'][0]['status']
