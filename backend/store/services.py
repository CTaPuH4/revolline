import http.client
import json
import requests
from decouple import config
from decimal import Decimal, ROUND_HALF_UP
import logging

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
        '/sandbox/v2/open-banking/v1.0/customers',
        payload,
        headers
    )
    res = conn.getresponse()
    data = json.loads(res.read().decode("utf-8"))
    code = data['Data']['Customer'][0]['customerCode']

    conn.request(
        'GET',
        f'/sandbox/v2/acquiring/v1.0/retailers?customerCode={code}',
        payload,
        headers
    )
    res = conn.getresponse()
    data = json.loads(res.read().decode("utf-8"))
    mer_data = data['Data']['Retailer'][0]

    return mer_data, code


def create_link(user, cart, promo=None):
    url = (
        'https://enter.tochka.com/sandbox/' +
        'v2/acquiring/v1.0/payments_with_receipt'
    )
    token = config('PAYMENT_TOKEN')

    mer_data, code = get_code()
    full_name = f'{user.first_name} {user.last_name} {user.patronymic}'

    promo_mult = Decimal('1')
    if promo:
        promo_mult = Decimal('1') - (Decimal(
            str(promo.percent)) / Decimal('100'))

    total_price = sum(item.product.discount_price * item.quantity
                      for item in cart)
    final_price = (total_price * promo_mult).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP
    )

    products = []
    for item in cart:
        products.append({
            "vatType": "none",
            "name": item.product.title,
            "amount": str(
                (item.product.discount_price * promo_mult).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP)
            ),
            "quantity": item.quantity,
            "paymentMethod": "full_payment",
            "paymentObject": "goods",
            "measure": "шт."
        })

    payload = json.dumps({
        "Data": {
            "customerCode": code,
            "amount": str(final_price),
            "purpose": "Перевод за оказанные услуги",
            "redirectUrl": "https://example.com",
            "failRedirectUrl": "https://example.com/fail",
            "paymentMode": [
                "sbp",
                "card",
                "tinkoff"
            ],
            "saveCard": True,
            "consumerId": "fedac807-078d-45ac-a43b-5c01c57edbf8",
            "merchantId": mer_data['merchantId'],
            "preAuthorization": True,
            "ttl": 10080,
            "taxSystemCode": "osn",
            "Client": {
                "name": full_name,
                "email": str(user.email),
                "phone": str(user.phone)
            },
            "Items": products,
            "Supplier": {
                "phone": "+7666666666",
                "name": "ООО Риволлайн Косметик",
                "taxCode": "660000000000"
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
    logger.info(data)

    return data['Data']['operationId'], data['Data']['paymentLink']
