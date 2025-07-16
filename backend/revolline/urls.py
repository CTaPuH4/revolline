from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import (TokenRefreshView, TokenVerifyView)

from api.views import CustomTokenObtainPairView, LogoutView

urlpatterns = [
    path('api/login/',
         CustomTokenObtainPairView.as_view(),
         name='token_obtain_pair'),
    path('api/token/refresh/',
         TokenRefreshView.as_view(),
         name='token_refresh'),
    path('api/token/verify/',
         TokenVerifyView.as_view(),
         name='token_verify'),
    path('api/logout/',
         LogoutView.as_view(),
         name='logout'),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls'))
]

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL, document_root=settings.MEDIA_ROOT
    )
