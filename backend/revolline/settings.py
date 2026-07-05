import os
from datetime import timedelta
from pathlib import Path

from corsheaders.defaults import default_headers
from decouple import Csv, config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='django-insecure-dev-only-change-me')

# ТОЛЬКО ДЛЯ ОТЛАДКИ!!! В ПРОДЕ ПРОПИСАТЬ КОНКРЕТНЫЕ ДОМЕНЫ!!!
DEBUG = config('DJANGO_DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='localhost,127.0.0.1,0.0.0.0,backend',
    cast=Csv(),
)

CORS_ALLOW_ALL_ORIGINS = config(
    'CORS_ALLOW_ALL_ORIGINS',
    default=False,
    cast=bool,
)
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:5173,http://127.0.0.1:5173',
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = (
    *default_headers,
    'idempotency-key',
)

CSRF_TRUSTED_ORIGINS = config(
    'CSRF_TRUSTED_ORIGINS',
    default='http://localhost:5173,http://127.0.0.1:5173',
    cast=Csv(),
)
CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', default=False, cast=bool)
CSRF_COOKIE_SAMESITE = config('CSRF_COOKIE_SAMESITE', default='Lax')
SESSION_COOKIE_SECURE = config(
    'SESSION_COOKIE_SECURE',
    default=not DEBUG,
    cast=bool,
)
SECURE_SSL_REDIRECT = config(
    'SECURE_SSL_REDIRECT',
    default=False,
    cast=bool,
)
SECURE_PROXY_SSL_HEADER = (
    ('HTTP_X_FORWARDED_PROTO', 'https')
    if config('SECURE_PROXY_SSL_HEADER', default=True, cast=bool)
    else None
)
SECURE_HSTS_SECONDS = config(
    'SECURE_HSTS_SECONDS',
    default=0,
    cast=int,
)
SECURE_HSTS_INCLUDE_SUBDOMAINS = config(
    'SECURE_HSTS_INCLUDE_SUBDOMAINS',
    default=False,
    cast=bool,
)
SECURE_HSTS_PRELOAD = config(
    'SECURE_HSTS_PRELOAD',
    default=False,
    cast=bool,
)


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'api.apps.ApiConfig',
    'store.apps.StoreConfig',
    'users.apps.UsersConfig',
    'corsheaders',
    'rest_framework',
    'django_filters',
    'rest_framework_simplejwt.token_blacklist',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'api.middleware.logging.DetailedLoggingMiddleware',
]

ROOT_URLCONF = 'revolline.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'revolline.wsgi.application'


DB_ENGINE = config('DB_ENGINE', default='sqlite')

if DB_ENGINE == 'postgres':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('POSTGRES_DB', default='revolline'),
            'USER': config('POSTGRES_USER', default='revolline'),
            'PASSWORD': config('POSTGRES_PASSWORD', default='revolline'),
            'HOST': config('POSTGRES_HOST', default='db'),
            'PORT': config('POSTGRES_PORT', default='5432'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_USER_MODEL = 'users.CustomUser'

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LOG_LEVEL = config('LOG_LEVEL', default='INFO')
LOG_TO_FILE = config('LOG_TO_FILE', default=False, cast=bool)
LOG_REQUEST_BODY = config('LOG_REQUEST_BODY', default=False, cast=bool)
LOG_RESPONSE_BODY = config('LOG_RESPONSE_BODY', default=False, cast=bool)

LOGS_DIR = os.path.join(BASE_DIR, 'logs/')
if LOG_TO_FILE:
    os.makedirs(LOGS_DIR, exist_ok=True)

LOG_HANDLERS = ['console']
if LOG_TO_FILE:
    LOG_HANDLERS.append('file')

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': (
                '[%(asctime)s] [%(levelname)s] [%(name)s] '
                '%(message)s'
            ),
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(LOGS_DIR, 'project.log'),
            'formatter': 'verbose',
            'maxBytes': 5 * 1024 * 1024,
            'backupCount': 5,
            'encoding': 'utf-8',
        },
        'console': {
            'class': 'logging.StreamHandler',
            'stream': 'ext://sys.stdout',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'main': {
            'handlers': LOG_HANDLERS,
            'level': LOG_LEVEL,
            'propagate': False,
        },
        'api': {
            'handlers': LOG_HANDLERS,
            'level': LOG_LEVEL,
            'propagate': False,
        },
        'store': {
            'handlers': LOG_HANDLERS,
            'level': LOG_LEVEL,
            'propagate': False,
        },
        'users': {
            'handlers': LOG_HANDLERS,
            'level': LOG_LEVEL,
            'propagate': False,
        },
        'django': {
            'handlers': LOG_HANDLERS,
            'level': config('DJANGO_LOG_LEVEL', default='INFO'),
            'propagate': False,
        },
        'django.request': {
            'handlers': LOG_HANDLERS,
            'level': config('DJANGO_REQUEST_LOG_LEVEL', default='ERROR'),
            'propagate': False,
        },
        'django.server': {
            'handlers': LOG_HANDLERS,
            'level': config('DJANGO_SERVER_LOG_LEVEL', default='ERROR'),
            'propagate': False,
        },
        'celery': {
            'handlers': LOG_HANDLERS,
            'level': config('CELERY_LOG_LEVEL', default='INFO'),
            'propagate': False,
        },
    },
    'root': {
        'handlers': LOG_HANDLERS,
        'level': LOG_LEVEL,
    },
}

if not LOG_TO_FILE:
    LOGGING['handlers'].pop('file', None)


LANGUAGE_CODE = 'ru-ru'

TIME_ZONE = 'Europe/Moscow'

USE_I18N = True

USE_TZ = True


STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

MEDIA_URL = '/images/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'images')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

EMAIL_BACKEND = config(
    'EMAIL_BACKEND',
    default='django.core.mail.backends.smtp.EmailBackend',
)
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')
ORDER_NOTIFICATION_EMAIL = config('ORDER_NOTIFICATION_EMAIL', default='')
PAYMENT_ALERT_EMAIL = config('PAYMENT_ALERT_EMAIL', default='')

PAYMENT_BASE_URL = config(
    'PAYMENT_BASE_URL',
    default='https://enter.tochka.com/uapi',
)
PAYMENT_TOKEN = config('PAYMENT_TOKEN', default='')
PAYMENT_SUPPLIER_PHONE = config('PHONE_NUMBER', default='')
PAYMENT_SUCCESS_REDIRECT_URL = config(
    'PAYMENT_SUCCESS_REDIRECT_URL',
    default=f'{FRONTEND_URL}/orders',
)
PAYMENT_FAIL_REDIRECT_URL = config(
    'PAYMENT_FAIL_REDIRECT_URL',
    default=f'{FRONTEND_URL}/cart',
)
PAYMENT_CONNECT_TIMEOUT = config(
    'PAYMENT_CONNECT_TIMEOUT',
    default=5,
    cast=float,
)
PAYMENT_READ_TIMEOUT = config(
    'PAYMENT_READ_TIMEOUT',
    default=20,
    cast=float,
)
PAYMENT_WEBHOOK_PUBLIC_JWK = config('PAYMENT_WEBHOOK_PUBLIC_JWK', default='')

CELERY_BROKER_URL = config(
    'CELERY_BROKER_URL',
    default='redis://redis:6379/0',
)
CELERY_RESULT_BACKEND = config(
    'CELERY_RESULT_BACKEND',
    default='redis://redis:6379/1',
)
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 60
CELERY_TASK_SOFT_TIME_LIMIT = 45
ORDER_STATUS_SYNC_INTERVAL_SECONDS = config(
    'ORDER_STATUS_SYNC_INTERVAL_SECONDS',
    default=300,
    cast=int,
)
CELERY_BEAT_SCHEDULE = {
    'sync-pending-order-statuses': {
        'task': 'store.tasks.sync_pending_order_statuses',
        'schedule': ORDER_STATUS_SYNC_INTERVAL_SECONDS,
    },
}

CACHE_URL = config('CACHE_URL', default='')
if CACHE_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': CACHE_URL,
        }
    }

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'users.auth.CookieJWTAuthentication',
    ),
    'DEFAULT_PAGINATION_CLASS': 'store.pagination.CustomPageNumberPagination',
    'PAGE_SIZE': 12,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': config('THROTTLE_ANON_RATE', default='120/min'),
        'user': config('THROTTLE_USER_RATE', default='600/min'),
        'auth': config('THROTTLE_AUTH_RATE', default='20/min'),
        'password_reset': config(
            'THROTTLE_PASSWORD_RESET_RATE',
            default='5/min',
        ),
    }
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=14),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'REFRESH_COOKIE': 'refresh_token',
    'AUTH_COOKIE': 'access_token',
    'AUTH_STATE_COOKIE': 'auth_state',
    'AUTH_COOKIE_SECURE': config('AUTH_COOKIE_SECURE', default=False, cast=bool),
    'AUTH_COOKIE_HTTP_ONLY': True,
    'AUTH_COOKIE_SAMESITE': config('AUTH_COOKIE_SAMESITE', default='Lax'),
}
