from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from api.metrics import metrics_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('metrics/', metrics_view, name='prometheus-metrics'),
    path('api/', include('api.urls'))
]

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL, document_root=settings.MEDIA_ROOT
    )
