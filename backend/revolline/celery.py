import os

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revolline.settings')

app = Celery('revolline')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
