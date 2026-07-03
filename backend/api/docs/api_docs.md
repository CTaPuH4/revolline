# API Revolline

Базовый URL локального backend:

```text
http://localhost:8000/api/
```

## Авторизация, cookie и CSRF

JWT-токены хранятся в HttpOnly cookie:

- `access_token`;
- `refresh_token`;
- `auth_state`.

Для `POST`, `PATCH`, `PUT`, `DELETE` запросов с cookie-авторизацией нужен
CSRF-токен.

Получить CSRF-cookie:

```http
GET /api/csrf/
```

Ответ:

```json
{
  "csrfToken": "token"
}
```

После этого frontend отправляет:

```http
X-CSRFToken: <token>
```

API ограничивает частоту запросов. Значения по умолчанию:

- гости: `120/min`;
- авторизованные пользователи: `600/min`;
- auth-операции: `20/min`;
- восстановление пароля: `5/min`.

При превышении лимита возвращается `429 Too Many Requests`.

## Публичные справочники

### Разделы

```http
GET /api/sections/
GET /api/sections/{slug}/
```

Ответ содержит разделы и вложенные категории:

```json
[
  {
    "slug": "makeup",
    "title": "Макияж",
    "categories": [
      {
        "slug": "lipstick",
        "title": "Помады"
      }
    ]
  }
]
```

### Категории

```http
GET /api/category/
GET /api/category/{slug}/
```

Ответ:

```json
[
  {
    "slug": "lipstick",
    "title": "Помады"
  }
]
```

### Страны товаров

```http
GET /api/countries/
```

Ответ:

```json
[
  "Россия",
  "Франция"
]
```

### Товары

```http
GET /api/products/
GET /api/products/{id}/
```

Поддерживается:

- пагинация: `?page=2&page_size=24`;
- поиск: `?search=крем`;
- сортировка: `?ordering=price`, `?ordering=-price`, `?ordering=old_price`,
  `?ordering=title`;
- фильтры: `is_new`, `country`, `categories`, `price_min`, `price_max`,
  `has_discount`.

Пример:

```http
GET /api/products/?categories=lipstick&search=matte&ordering=-price
```

Формат товара:

```json
{
  "id": 1,
  "title": "Название",
  "description": "Описание",
  "pr_type": "Тип",
  "price": 1200,
  "old_price": 1500,
  "has_discount": true,
  "is_new": false,
  "is_fav": false,
  "ingredients": "Состав",
  "country": "Франция",
  "size": "10 мл",
  "full_weight": 0.2,
  "color": null,
  "effect": null,
  "collection": null,
  "product_weight": 0.1,
  "volume": 10,
  "categories": [
    {
      "slug": "lipstick",
      "title": "Помады"
    }
  ],
  "images": [
    {
      "image": "http://localhost:8000/images/products/image.jpg"
    }
  ]
}
```

`is_fav` подмешивается отдельно для авторизованного пользователя. Публичный
ответ товаров кэшируется, персональный `is_fav` добавляется поверх кэша.

### Промокод

```http
GET /api/promo/{code}/
```

Промокод регистронезависим.

Ответ:

```json
{
  "code": "sale10",
  "percent": 10,
  "min_price": 1000
}
```

## Пользователи

### Регистрация

```http
POST /api/users/
```

Тело:

```json
{
  "email": "buyer@example.com",
  "password": "StrongPassword123",
  "password2": "StrongPassword123"
}
```

Ответ `201 Created`:

```json
{
  "detail": "Пользователь создан. Подтвердите email."
}
```

После регистрации создаётся email-задача с письмом активации.

### Активация аккаунта

```http
GET /api/activate/{uidb64}/{token}/
```

Успешный ответ:

```json
{
  "detail": "Аккаунт успешно активирован"
}
```

### Логин

```http
POST /api/login/
```

Тело:

```json
{
  "email": "buyer@example.com",
  "password": "StrongPassword123"
}
```

При успехе backend ставит HttpOnly cookie с access/refresh токенами.

### Обновление токенов

```http
POST /api/token/refresh/
```

Refresh token берётся из cookie. Нужен CSRF-заголовок.

### Logout

```http
POST /api/logout/
```

Refresh token добавляется в blacklist, cookie удаляются. Успешный статус:
`205 Reset Content`.

### Текущий пользователь

```http
GET /api/users/me/
PATCH /api/users/me/
```

Ответ:

```json
{
  "id": 1,
  "email": "buyer@example.com",
  "first_name": "Иван",
  "last_name": "Иванов",
  "patronymic": "Иванович",
  "phone": "+79990000000"
}
```

`email` read-only.

### Смена пароля

```http
POST /api/users/me/change_password/
```

Тело:

```json
{
  "password": "OldPassword123",
  "new_password": "NewPassword123",
  "new_password2": "NewPassword123"
}
```

### Восстановление пароля

Запрос письма:

```http
POST /api/reset/request/
```

```json
{
  "email": "buyer@example.com"
}
```

Подтверждение нового пароля:

```http
POST /api/reset/
```

```json
{
  "uid": "uid",
  "token": "token",
  "new_password": "NewPassword123",
  "new_password2": "NewPassword123"
}
```

## Корзина

Все endpoints корзины доступны только авторизованному пользователю.

### Получить корзину

```http
GET /api/cart/
```

Ответ:

```json
{
  "cart_total": 1200,
  "delivery_fee": 300,
  "total_price": 1500,
  "items": [
    {
      "id": 10,
      "product_data": {
        "id": 1,
        "title": "Товар",
        "price": 1200,
        "old_price": 1500,
        "has_discount": true,
        "image": "http://localhost:8000/images/products/image.jpg"
      },
      "quantity": 1
    }
  ]
}
```

### Добавить товар

```http
POST /api/cart/
```

```json
{
  "product": 1,
  "quantity": 2
}
```

Если товар уже есть в корзине, количество обновляется.

### Изменить количество

```http
PATCH /api/cart/{cart_item_id}/
```

```json
{
  "quantity": 3
}
```

### Удалить товар

```http
DELETE /api/cart/{cart_item_id}/
```

Ответ: `204 No Content`.

## Избранное

Все endpoints избранного доступны только авторизованному пользователю.

### Получить избранное

```http
GET /api/favorites/
```

Ответ пагинированный:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "product_data": {
        "id": 1,
        "title": "Товар",
        "price": 1200,
        "old_price": 1500,
        "has_discount": true,
        "image": "http://localhost:8000/images/products/image.jpg"
      }
    }
  ]
}
```

### Добавить в избранное

```http
POST /api/favorites/
```

```json
{
  "product": 1
}
```

### Удалить из избранного по id записи

```http
DELETE /api/favorites/{favorite_id}/
```

### Удалить из избранного по id товара

```http
DELETE /api/favorites/delete/?product={product_id}
```

## Заказы и платежи

Все endpoints заказов доступны только авторизованному пользователю.

### Получить список заказов

```http
GET /api/orders/
```

Ответ:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 42,
      "status": "N",
      "payment_status": "link_created",
      "created_at": "2026-07-03T12:00:00+03:00",
      "payment_link": "https://payment.example/link",
      "total_price": 1500,
      "promo": null,
      "final_price": 1500,
      "shipping_address": "Москва, тестовый адрес",
      "tracking_number": null,
      "items": [
        {
          "product": {
            "id": 1,
            "title": "Товар",
            "price": 1200,
            "old_price": 1500,
            "has_discount": true,
            "image": "http://localhost:8000/images/products/image.jpg"
          },
          "product_title": "Товар",
          "unit_price": 1200,
          "old_unit_price": 1500,
          "quantity": 1
        }
      ]
    }
  ]
}
```

`status` — бизнес-статус заказа:

- `N` — создан;
- `P` — оплачен;
- `S` — отправлен;
- `C` — отменён.

`payment_status` — платёжный статус:

- `pending`;
- `link_created`;
- `paid`;
- `expired`;
- `failed`;
- `unknown`;
- `refunding`;
- `refunded`.

### Создать заказ и платёж

```http
POST /api/orders/
Idempotency-Key: 6f9619ff-8b86-d011-b42d-00cf4fc964ff
```

Тело:

```json
{
  "shipping_address": "Москва, тестовый адрес",
  "promo": "sale10"
}
```

`promo` необязателен.

Успешный ответ `201 Created`:

```json
{
  "order_id": 42,
  "payment_status": "link_created",
  "payment_link": "https://payment.example/link"
}
```

Правила:

- `Idempotency-Key` обязателен и должен быть UUID;
- один ключ используется для всех повторов одной попытки оформления;
- если платёж уже создаётся, повтор вернёт текущее состояние;
- если результат создания платежа неизвестен, заказ переводится в `unknown`,
  а администратору ставится email-уведомление.

### Повторная оплата

```http
POST /api/orders/{order_id}/retry-payment/
Idempotency-Key: 14b0830e-d2bc-4a07-9b4d-23ce39c2b00a
```

Повторная оплата доступна только для заказов с `payment_status`:

- `expired`;
- `failed`.

Успешный ответ:

```json
{
  "order_id": 42,
  "payment_status": "link_created",
  "payment_link": "https://payment.example/retry-link"
}
```

Возможные отказы:

- `400 Bad Request` — нет ключа, ключ не UUID, заказ уже оплачен, у заказа
  есть активная попытка оплаты или статус не `expired`/`failed`;
- `409 Conflict` — состояние платежа требует сверки;
- `503 Service Unavailable` — банк не дал надёжный ответ, заказ переведён в
  `unknown`, администратору ставится email-уведомление.

### Webhook Точки

```http
POST /api/payments/tochka/webhook/
```

Маршрут публичный, но webhook должен быть подписан JWT от Точки. Подпись
проверяется публичным RSA JWK из `PAYMENT_WEBHOOK_PUBLIC_JWK`.

Поддерживаемые форматы передачи JWT:

```http
Authorization: Bearer <jwt>
```

или:

```json
{
  "token": "<jwt>"
}
```

или raw body с самим JWT.

Из payload backend ищет:

- `operationId` или `operation_id`;
- `status`, `paymentStatus` или `payment_status`.

Пример полезной нагрузки внутри JWT:

```json
{
  "Data": {
    "Operation": [
      {
        "operationId": "operation-id",
        "status": "APPROVED"
      }
    ]
  }
}
```

Маппинг статусов Точки:

- `CREATED` -> `link_created`;
- `APPROVED` -> `paid`;
- `EXPIRED` -> `expired`;
- `ON-REFUND` -> `refunding`;
- `REFUNDED` -> `refunded`;
- любой неизвестный статус -> `unknown` и email-уведомление админу.

Успешный ответ для найденного платежа:

```json
{
  "matched": true,
  "updated": true,
  "order_id": 42
}
```

Если `operationId` неизвестен:

```json
{
  "matched": false,
  "updated": false,
  "order_id": null
}
```

Ответ будет `202 Accepted`.

## Фоновые платежные процессы

Celery beat запускает:

```text
store.tasks.sync_pending_order_statuses
```

Задача сверяет с Точкой платежи со статусами:

- `link_created`;
- `unknown`;
- `refunding`.

Для сверки вызывается:

```http
GET /acquiring/v1.0/payments/{operation_id}
```

Webhook и polling используют общую функцию применения статуса, поэтому один и
тот же статус применяется одинаково независимо от источника.

## Email-уведомления

После перехода платежа в `paid` создаётся Celery-задача:

```text
store.tasks.send_order_paid_notification
```

Письмо уходит на `ORDER_NOTIFICATION_EMAIL` и содержит состав заказа, адрес
доставки, сумму и данные клиента.

При аварийных платёжных состояниях создаётся Celery-задача:

```text
store.tasks.send_payment_alert_notification
```

Письмо уходит на `PAYMENT_ALERT_EMAIL` и содержит контекст ошибки для ручной
сверки.
