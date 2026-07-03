# Docker-разработка Revolline

Документ описывает актуальный локальный запуск через `docker compose`.

## Первый запуск

```bash
cp .env.example .env
docker compose up -d --build
```

После запуска доступны:

- frontend: http://localhost:5173
- backend API: http://localhost:8000/api/
- Django admin: http://localhost:8000/admin/
- CDEK PHP proxy: http://localhost:8001/service.php
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Сервисы compose

- `db` — PostgreSQL 16.
- `redis` — broker/result backend/cache.
- `backend` — Django backend, выполняет миграции и запускает dev-сервер.
- `celery-worker` — Celery worker для email-уведомлений и фоновых задач.
- `celery-beat` — периодическая сверка статусов платежей.
- `frontend` — Vite dev server.
- `php-cdek` — PHP proxy для CDEK API.

## Частые команды

```bash
docker compose logs -f backend
docker compose logs -f celery-worker
docker compose logs -f celery-beat
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
docker compose run --rm backend python manage.py test api store users
docker compose run --rm frontend npm run lint
docker compose run --rm frontend npm run build
docker compose config --quiet
docker compose down
```

Пересоздать сервисы после изменения `.env`:

```bash
docker compose up -d --force-recreate backend celery-worker celery-beat frontend php-cdek
```

## Переменные окружения

Шаблон: [.env.example](.env.example).

Локальный `.env` игнорируется git. Не коммить реальные токены, пароли и JWK.

### Django и безопасность

```env
SECRET_KEY=change-me
DJANGO_DEBUG=1
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,backend
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CSRF_COOKIE_SECURE=0
CSRF_COOKIE_SAMESITE=Lax
FRONTEND_URL=http://localhost:5173
AUTH_COOKIE_SECURE=0
```

Для production:

```env
DJANGO_DEBUG=0
SECRET_KEY=<real-secret>
ALLOWED_HOSTS=<backend-domain>
CORS_ALLOWED_ORIGINS=https://<frontend-domain>
CSRF_TRUSTED_ORIGINS=https://<frontend-domain>
CSRF_COOKIE_SECURE=1
AUTH_COOKIE_SECURE=1
```

## PostgreSQL, Redis, Celery и кэш

```env
POSTGRES_DB=revolline
POSTGRES_USER=revolline
POSTGRES_PASSWORD=revolline
POSTGRES_PORT_PUBLIC=5432

CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1
CACHE_URL=redis://redis:6379/2
ORDER_STATUS_SYNC_INTERVAL_SECONDS=300
```

`celery-beat` запускает задачу `store.tasks.sync_pending_order_statuses`.
Она сверяет платежи со статусами `link_created`, `unknown`, `refunding`.

## Email

По умолчанию используется SMTP Gmail:

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
```

Для локальной отладки без SMTP:

```env
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

Операционные уведомления:

```env
ORDER_NOTIFICATION_EMAIL=kitchen@example.com
PAYMENT_ALERT_EMAIL=admin@example.com
```

- `ORDER_NOTIFICATION_EMAIL` получает письмо после успешной оплаты заказа:
  состав заказа, адрес доставки, клиент.
- `PAYMENT_ALERT_EMAIL` получает аварийные письма по платежам, которые требуют
  ручной сверки.
- Несколько получателей можно указать через запятую.

## Платежи Точка Банка

```env
PAYMENT_TOKEN=
PHONE_NUMBER=
PAYMENT_BASE_URL=https://enter.tochka.com/uapi
PAYMENT_SUCCESS_REDIRECT_URL=http://localhost:5173/orders
PAYMENT_FAIL_REDIRECT_URL=http://localhost:5173/cart
PAYMENT_CONNECT_TIMEOUT=5
PAYMENT_READ_TIMEOUT=20
PAYMENT_WEBHOOK_PUBLIC_JWK=
```

`PAYMENT_WEBHOOK_PUBLIC_JWK` — публичный RSA JWK Точки. Он нужен для проверки
подписи webhook JWT.

Ключ можно получить из официального endpoint Точки:

```text
https://enter.tochka.com/doc/openapi/static/keys/public
```

Webhook URL backend:

```text
http://localhost:8000/api/payments/tochka/webhook/
```

В production URL должен быть HTTPS.

## CDEK и карта пунктов выдачи

Backend proxy:

```env
CDEK_LOGIN=
CDEK_SECRET=
CDEK_BASE_URL=https://api.edu.cdek.ru/v2
```

Frontend:

```env
VITE_YANDEX_API_KEY=
VITE_CDEK_SERVICE_PATH=http://localhost:8001/service.php
```

Для Yandex Maps API key в локальной разработке разреши HTTP referrer:

- `http://localhost:5173/*`
- `http://127.0.0.1:5173/*`

## Логи и rate limit

```env
LOG_LEVEL=INFO
LOG_TO_FILE=0
LOG_REQUEST_BODY=0
LOG_RESPONSE_BODY=0

THROTTLE_ANON_RATE=120/min
THROTTLE_USER_RATE=600/min
THROTTLE_AUTH_RATE=20/min
THROTTLE_PASSWORD_RESET_RATE=5/min
```

По умолчанию логи идут в stdout/stderr. Тело request/response не логируется,
чтобы случайно не записывать персональные данные и токены.

## Проверки

Перед финальным коммитом:

```bash
docker compose run --rm backend python manage.py makemigrations --check --dry-run
docker compose run --rm backend python manage.py test api store users
docker compose run --rm frontend npm run lint
docker compose run --rm frontend npm run build
docker compose config --quiet
```

## Локальный мусор

Эти файлы и папки игнорируются и не должны попадать в git:

- `.env`;
- `backend/venv/`;
- `backend/db.sqlite3`;
- `backend/logs/`;
- `__pycache__/`;
- `frontend/node_modules/`;
- `frontend/dist/`;
- загруженные media-файлы `images/`.
