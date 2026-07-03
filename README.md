# Revolline

Revolline — Django/DRF backend и React/Vite frontend для интернет-магазина.

В проекте есть:

- каталог товаров, разделы, категории, фильтрация, поиск и сортировка;
- корзина и избранное для авторизованных пользователей;
- оформление заказов с идемпотентным созданием платежа;
- интеграция с Точка Банком: платёжная ссылка, webhook, polling статусов, повторная оплата;
- Redis-кэширование публичных сценариев;
- Celery worker и Celery beat для фоновых задач;
- email-уведомления пользователям, оператору заказов и администратору;
- CDEK PHP proxy и frontend-виджет доставки;
- импорт товаров из Excel через админку.

## Быстрый запуск через Docker

Основной способ локального запуска:

```bash
cp .env.example .env
docker compose up -d --build
```

Сервисы:

- frontend: http://localhost:5173
- backend API: http://localhost:8000/api/
- Django admin: http://localhost:8000/admin/
- CDEK PHP proxy: http://localhost:8001/service.php
- PostgreSQL: localhost:5432
- Redis: localhost:6379

Подробная Docker-документация: [DOCKER.md](DOCKER.md).

## Основные команды

```bash
docker compose logs -f backend
docker compose logs -f celery-worker
docker compose logs -f celery-beat
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
docker compose run --rm backend python manage.py test api store users
docker compose run --rm frontend npm run lint
docker compose run --rm frontend npm run build
docker compose down
```

## Ручной запуск без Docker

Docker предпочтительнее, потому что проект зависит от PostgreSQL, Redis,
Celery и PHP proxy для CDEK. Ручной запуск имеет смысл только для локальной
разработки отдельных частей.

Backend:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver localhost:8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

CDEK proxy без Docker:

```bash
cd backend
php -S localhost:8001 service.php
```

## API

Примеры и список основных endpoints: [backend/api/docs/api_docs.md](backend/api/docs/api_docs.md).

Авторизация работает через HttpOnly cookie:

- `access_token`;
- `refresh_token`;
- `auth_state`.

Для небезопасных запросов с cookie-авторизацией (`POST`, `PATCH`, `PUT`,
`DELETE`) frontend должен сначала получить CSRF-cookie через:

```http
GET /api/csrf/
```

Затем нужно отправлять заголовок:

```http
X-CSRFToken: <token>
```

## Платежи

Создание заказа требует заголовок:

```http
Idempotency-Key: <uuid>
```

Платёжный контур:

- создаётся локальный `Order`;
- создаётся `PaymentAttempt`;
- у Точки запрашивается платёжная ссылка;
- webhook Точки проверяется по RSA JWK из `PAYMENT_WEBHOOK_PUBLIC_JWK`;
- Celery beat периодически сверяет незавершённые платежи;
- повторная оплата доступна только для `expired` и `failed`;
- при успешной оплате уходит письмо на `ORDER_NOTIFICATION_EMAIL`;
- при неизвестных/аварийных состояниях уходит письмо на `PAYMENT_ALERT_EMAIL`.

## Переменные окружения

Шаблон лежит в [.env.example](.env.example). Локальный `.env` не должен
попадать в git.

Минимально важные production-настройки:

```env
DJANGO_DEBUG=0
SECRET_KEY=<real-secret>
ALLOWED_HOSTS=<backend-domain>
CORS_ALLOWED_ORIGINS=https://<frontend-domain>
CSRF_TRUSTED_ORIGINS=https://<frontend-domain>
AUTH_COOKIE_SECURE=1
CSRF_COOKIE_SECURE=1

PAYMENT_TOKEN=<tochka-token>
PAYMENT_WEBHOOK_PUBLIC_JWK={"kty":"RSA","e":"AQAB","n":"..."}
PAYMENT_SUCCESS_REDIRECT_URL=https://<frontend-domain>/orders
PAYMENT_FAIL_REDIRECT_URL=https://<frontend-domain>/cart

EMAIL_HOST_USER=<smtp-user>
EMAIL_HOST_PASSWORD=<smtp-password>
ORDER_NOTIFICATION_EMAIL=<orders@example.com>
PAYMENT_ALERT_EMAIL=<admin@example.com>

CDEK_LOGIN=<cdek-login>
CDEK_SECRET=<cdek-secret>
VITE_API_BASE=https://<backend-domain>/api
VITE_YANDEX_API_KEY=<yandex-maps-key>
VITE_CDEK_SERVICE_PATH=https://<backend-domain-or-proxy>/service.php
```

## Проверки перед коммитом

```bash
docker compose run --rm backend python manage.py makemigrations --check --dry-run
docker compose run --rm backend python manage.py test api store users
docker compose run --rm frontend npm run lint
docker compose run --rm frontend npm run build
docker compose config --quiet
```

## Авторы

- Nizhelskiy Ilya (CTaPuH4) — https://github.com/CTaPuH4
- VanVan26 — https://github.com/VanVan26
- dashhiikk — https://github.com/dashhiikk
