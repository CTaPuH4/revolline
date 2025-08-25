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
- Поиск (?search) по полям ('title', 'description', 'type').
- Сортировка (?ordering) по полю price.

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
            "type": "Тип продукта 3",
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
            "type": "Тип продукта 2",
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
#### Пример запроса: **DELETE** `http://127.0.0.1:8000/api/favorites/2/`
#### Пример ответа: **204 No Content**

---

