from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from api.views import (CartViewSet, CategoryViewSet, CountryListView,
                       CustomTokenObtainPairView, FavoritesViewSet, LogoutView,
                       ProductViewSet, SectionViewSet)
from users.views import ActivateUserView, UserViewSet

router = DefaultRouter()
router.register('sections', SectionViewSet, basename='sections')
router.register('category', CategoryViewSet, basename='category')
router.register('products', ProductViewSet, basename='products')
router.register('cart', CartViewSet, basename='cart')
router.register('favorites', FavoritesViewSet, basename='faborites')
router.register('users', UserViewSet, basename='users')


urlpatterns = [
    path('activate/<uidb64>/<token>/',
         ActivateUserView.as_view(), name='activate-user'),
    path('login/',
         CustomTokenObtainPairView.as_view(),
         name='token_obtain_pair'),
    path('token/refresh/',
         TokenRefreshView.as_view(),
         name='token_refresh'),
    path('token/verify/',
         TokenVerifyView.as_view(),
         name='token_verify'),
    path('logout/',
         LogoutView.as_view(),
         name='logout'),
    path('countries/',
         CountryListView.as_view(),
         name='country-list'),
    path('', include(router.urls))
]
