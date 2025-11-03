# Примеры запросов

## Sections

### Просмотр разделов
Возвращает все разделы и их категории. Возможен запрос к конкретному разделу по слагу.
#### Пример запроса: **GET** `http://127.0.0.1:8000/api/sections/`
#### Пример ответа: **200 OK**
```
[
    {
        "slug": "first_section link",
        "title": "Первый раздел",
        "categories": [
            {
                "slug": "first",
                "title": "Первая категория"
            },
            {
                "slug": "second",
                "title": "Вторая категория"
            }
        ]
    }
]
```

---

## Category

### Просмотр категорий
Возвращает все категории. Возможен запрос к конкретной категории по слагу.
#### Пример запроса: **GET** `http://127.0.0.1:8000/api/category/`
#### Пример ответа: **200 OK**
```
[
    {
        "slug": "first",
        "title": "Первая категория"
    },
    {
        "slug": "second",
        "title": "Вторая категория"
    },
    {
        "slug": "third",
        "title": "Третья категория"
    }
]
```

---

## Products

### Просмотр продуктов
Возвращает все продукты. Возможен запрос к конкретному продукту по id.
- Фильтрация по полям ['is_new', 'country', 'categories', 'price_min', 'has_discount', 'price_max'].
- Поиск (?search) по полям ('title', 'description', 'pr_type').
- Сортировка (?ordering) по полю price.
- Изменение размера страницы (page_size) пагинатора.

Полный список стран для фильтрации можно получить с помощью `http://127.0.0.1:8000/api/countries/`.
#### Пример запроса: **GET** `http://127.0.0.1:8000/api/products/?is_new=&country=&categories=second&search=Описание&ordering=-price/`
#### Пример ответа: **200 OK**
```
{
    "count": 2,
    "next": null,
    "previous": null,
    "results": [
        {
            "id": 3,
            "title": "Третий",
            "description": "Описание третьего",
            "pr_type": "Тип продукта 3",
            "price": 333,
            "discount_price": 30,
            "is_new": true,
            "is_fav": false,
            "ingredients": "Состав третьего",
            "country": "Страна 3",
            "size": "333х0.3",
            "full_weight": 3.0,
            "color": null,
            "effect": null,
            "collection": null,
            "product_weight": 0.33,
            "categories": [
                {
                    "slug": "first",
                    "title": "Первая категория"
                },
                {
                    "slug": "second",
                    "title": "Вторая категория"
                }
            ],
            "images": [
                {
                    "id": 3,
                    "image": "http://127.0.0.1:8000/images/products/Prefs.jpg"
                }
            ]
        },
        {
            "id": 2,
            "title": "Второй",
            "description": "Описание второго",
            "pr_type": "Тип продукта 2",
            "price": 222,
            "discount_price": 22,
            "is_new": true,
            "is_fav": false,
            "ingredients": "Состав второго",
            "country": "Страна 2",
            "size": "2х200",
            "full_weight": 200.0,
            "color": null,
            "effect": null,
            "collection": null,
            "product_weight": 22.0,
            "categories": [
                {
                    "slug": "first",
                    "title": "Первая категория"
                },
                {
                    "slug": "second",
                    "title": "Вторая категория"
                }
            ],
            "images": [
                {
                    "id": 2,
                    "image": "http://127.0.0.1:8000/images/products/minion_zxQh7Tg.png"
                }
            ]
        }
    ]
}
```

---

## Users

### Регистрация нового пользователя
#### Пример запроса: **POST** `http://127.0.0.1:8000/api/users/`
```
{
    "email": "Email",
    "password": "Password",
    "password2": "Password"
}
```
#### Пример ответа: **201 Created**
```
{
    "detail": "Пользователь создан. Подтвердите email."
}
```

---

### Активация пользователя
Активация пользователя по зашифрованным UserID и token из письма активации.
#### Пример запроса: **GET** `http://127.0.0.1:8000/api/activate/uidb64/token/`
#### Пример ответа: **200 ОК**
```
{
    "detail": "Аккаунт успешно активирован"
}
```

---

### Запрос на восстановление пароля
Запрос письма со ссылкой восстановления на почту.
#### Пример запроса: **POST** `http://127.0.0.01:8000/api/reset/request/`
```
{
    "email": "Email"
}
```
#### Пример ответа: **200 ОК**
```
{
    "message": "Письмо восстановления отправленно."
}
```

---

### Восстановление пароля
Изменение пароля по UserID и token из письма восстановления.
#### Пример запроса: **POST** `http://127.0.0.1:8000/api/reset/`
```
{
    "uid": "uid",
    "token": "token",
    "new_password": "Password",
    "new_password2": "Password"
}
```
#### Пример ответа: **200 OK**
```
{
    "message": "Пароль успешно изменён"
}
```

---

### Получение JWT-токенов
#### Пример запроса: **POST** `http://127.0.0.1:8000/api/login/`
```
{
    "email": "Email",
    "password": "Password"
}
```
#### Пример ответа: **200 OK**
Токены устанавливаются в HttpOnly cookie 'access_token' и 'refresh_token'.

---

### Удаление JWT-токена
*Доступно только авторизованным пользователям.*

Отправляет refresh-токен из cookie в blacklist, удаляет токены из cookie.
#### Пример запроса: **POST** `http://127.0.0.1:8000/api/logout/`

#### Пример ответа: **205 Reset Content**

---

### Обновление JWT-токенов
#### Пример запроса: **POST** `http://127.0.0.1:8000/api/token/refresh/`

#### Пример ответа: **200 OK**
Токены обновляются и устанавливаются в HttpOnly cookie 'access_token' и 'refresh_token'.

---

### Получение информации для текущего пользователя
*Доступно только авторизованным пользователям.*
#### Пример запроса: **GET** `http://127.0.0.1:8000/api/users/me/`
#### Пример ответа: **200 OK**
```
{
    "id": 1,
    "email": "email",
    "first_name": "first_name",
    "last_name": "last_name",
    "patronymic": "patronymic",
    "phone": null
}
```

---

### Изменение информации для текущего пользователя
*Доступно только авторизованным пользователям.*
#### Пример запроса: **PATCH** `http://127.0.0.1:8000/api/users/me/`
```
{
    "first_name": "new_first_name",
    "last_name": "new_last_name",
    "phone": "+79876543210"
}
```
#### Пример ответа: **200 OK**
```
{
    "id": 1,
    "email": "email",
    "first_name": "new_first_name",
    "last_name": "new_last_name",
    "phone": "+79876543210"
}
```
---

### Смена пароля
*Доступно только авторизованным пользователям.*
#### Пример запроса: **POST** `http://127.0.0.1:8000/api/users/me/change_password/`
```
{
    "password": "OldPassword",
    "new_password": "Password",
    "new_password2": "Password"
}
```
#### Пример ответа: **200 ОК**
```
{
    "detail": "Пароль успешно изменён."
}
```
---

## Cart

### Просмотр корзины
*Доступно только авторизированным пользователям.*
Возвращает все продукты в корзине текущего пользователя. Возможен запрос к конкретному товару в корзине по id
#### Пример запроса: **GET** `http://127.0.0.1:8000/api/cart/`
#### Пример ответа: **200 OK**
```
{
    "cart_total": 132,
    "delivery_fee": 300,
    "total_price": 432,
    "items": [
        {
            "id": 44,
            "product_data": {
                "id": 1,
                "title": "Test1",
                "price": 500,
                "discount_price": 110,
                "product_weight": 11.0,
                "images": [
                    {
                        "image": "http://localhost:8000/images/products/%D0%91%D0%B5%D0%B7%D1%8B%D0%BC%D1%8F%D0%BD%D0%BD%D1%8B%D0%B9.png"
                    },
                    {
                        "image": "http://localhost:8000/images/products/AnomalyDX11AVX_2025-09-01_22-30-43.png"
                    }
                ]
            },
            "quantity": 1
        },
        {
            "id": 45,
            "product_data": {
                "id": 2,
                "title": "test2",
                "price": 2222,
                "discount_price": 22,
                "product_weight": 2.0,
                "images": [
                    {
                        "image": "http://localhost:8000/images/products/%D0%91%D0%B5%D1%81%D0%BA%D0%BE%D0%BD%D0%B5%D1%87%D0%BD%D0%BE%D0%B5-%D0%BB%D0%B5%D1%82%D0%BE-Soviet-Games-Ru-VN-%D0%98%D0%B3%D1%80%D1%8B-2233727.jpeg"
                    }
                ]
            },
            "quantity": 1
        }
    ]
}
```

---

### Добавление товара в корзину
*Доступно только авторизированным пользователям.*
#### Пример запроса: **POST** `http://127.0.0.1:8000/api/cart/`
```
{
    "product": 2,
    "quantity": 2
}
```
#### Пример ответа: **201 Created**
```
{
    "product_data": {
        "id": 2,
        "title": "Второй",
        "price": 222,
        "discount_price": 22,
        "product_weight": 22.0,
        "images": [
            {
                "id": 2,
                "image": "http://localhost:8000/images/products/minion_zxQh7Tg.png"
            }
        ]
    },
    "quantity": 2
}
```

---

### Изменение количества товаров в корзине
*Доступно только авторизированным пользователям.*
#### Пример запроса: **PATCH** `http://127.0.0.1:8000/api/cart/2/`
```
{
    "quantity": 22
}
```
#### Пример ответа: **200 OK**
```
{
    "id": 2,
    "product_data": {
        "id": 1,
        "title": "Первый",
        "price": 10,
        "discount_price": 5,
        "product_weight": 11.0,
        "images": [
            {
                "id": 1,
                "image": "http://localhost:8000/images/products/binds_90P5gOF.jpg"
            }
        ]
    },
    "quantity": 22
}
```

---

### Удаление товара из корзины
*Доступно только авторизированным пользователям.*
#### Пример запроса: **DELETE** `http://127.0.0.1:8000/api/cart/2/`
#### Пример ответа: **204 No Content**

---

## Favorites

### Просмотр избранного
*Доступно только авторизированным пользователям.*

Возвращает все избранные товары текущего пользователя. Возможен запрос к конкретному товару в избранном по id.
#### Пример запроса: **GET** `http://127.0.0.1:8000/api/favorites/`
#### Пример ответа: **200 OK**
```
{
    "count": 1,
    "next": null,
    "previous": null,
    "results": [
        {
            "id",
            "product_data": {
                "id": 1,
                "title": "Первый",
                "price": 10,
                "discount_price": 5,
                "product_weight": 11.0,
                "images": [
                    {
                        "id": 1,
                        "image": "http://localhost:8000/images/products/binds_90P5gOF.jpg"
                    }
                ]
            }
        }
    ]
}
```

---

### Добавление товара в избранное
*Доступно только авторизированным пользователям.*
#### Пример запроса: **POST** `http://127.0.0.1:8000/api/favorites/`
```
{
    "product": 2
}
```
#### Пример ответа: **201 Created**
```
{
    "product_data": {
        "id": 2,
        "title": "Второй",
        "price": 222,
        "discount_price": 22,
        "product_weight": 22.0,
        "images": [
            {
                "id": 2,
                "image": "http://localhost:8000/images/products/minion_zxQh7Tg.png"
            }
        ]
    }
}
```

---

### Удаление товара из избранного
*Доступно только авторизированным пользователям.*

Удаление по id избранного:
#### Пример запроса: **DELETE** `http://127.0.0.1:8000/api/favorites/2/`
#### Пример ответа: **204 No Content**

---

Удаление по id продукта:
#### Пример запроса: **DELETE** `http://127.0.0.1:8000/api/favorites/delete/?product=2`
#### Пример ответа: **204 No Content**
---

## Promocode

### Проверка промокода

#### Прмер запроса: **GET** `http://127.0.0.1:8000/api/promo/{promo_name}/`
#### Пример ответа: **200 ОК**
```
{
    "code": "promo_name",
    "percent": 25,
    "min_price": 0,
}
```
---

## Order

### Получения списка заказов
*Доступно только авторизированным пользователям.*

Возвращает список заказов текущего пользователя.
#### Пример запроса: **GET** `http://127.0.0.1:8000/api/orders/`
#### Пример ответа: **200 OK**
```
{
    "count": 1,
    "next": null,
    "previous": null,
    "results": [
        {
            "id": 5,
            "status": "N",
            "created_at": "2025-09-07T23:09:15.179933+03:00",
            "payment_link": "somelink",
            "total_price": "1111.00",
            "promo": "BRFF",
            "shipping_address": "aboba",
            "items": [
                {
                    "product": {
                        "id": 1,
                        "title": "Test1",
                        "price": 1111,
                        "discount_price": 111,
                        "product_weight": 11.0,
                        "images": [
                            {
                                "image": "http://localhost:8000/images/products/image"
                            },
                        ]
                    },
                    "quantity": 1
                }
            ]
        },
    ]
}
```
---
### Создание заказа
*Доступно только авторизированным пользователям.*

Создаёт заказ для текущего пользователя из товаров корзины, возвращает ссылку для оплаты заказа.
#### Пример запроса: **POST** `http://127.0.0.1:8000/api/orders/`
```
{
    "shipping_address": "someadress",
    "promo": "somepromo"
}
```
#### Пример ответа: **201 Created**
```
{
    "payment_link": "somelink"
}
```
---