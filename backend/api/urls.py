from django.urls import include, path
from rest_framework.routers import DefaultRouter

from api.views import (CartViewSet, CategoryViewSet, CountryListView,
                       FavoritesViewSet, OrderViewSet, ProductViewSet,
                       PromoViewSet, SectionViewSet)
from users.views import (ActivateUserView, ChangePasswordView,
                         CustomTokenObtainPairView, CustomTokenRefreshView,
                         LogoutView, PasswordResetConfirmView,
                         PasswordResetRequestView, UserViewSet)

router = DefaultRouter()
router.register('sections', SectionViewSet, basename='sections')
router.register('category', CategoryViewSet, basename='category')
router.register('products', ProductViewSet, basename='products')
router.register('cart', CartViewSet, basename='cart')
router.register('favorites', FavoritesViewSet, basename='faborites')
router.register('users', UserViewSet, basename='users')
router.register('orders', OrderViewSet, basename='orders')
router.register('promo', PromoViewSet, basename='promo')


urlpatterns = [
    path('activate/<uidb64>/<token>/',
         ActivateUserView.as_view(), name='activate-user'),
    path('reset/request/',
         PasswordResetRequestView.as_view(), name='reset-request'),
    path('reset/', PasswordResetConfirmView.as_view(), name='reset-confirm'),
    path('login/',
         CustomTokenObtainPairView.as_view(),
         name='token_obtain_pair'),
    path('token/refresh/',
         CustomTokenRefreshView.as_view(),
         name='token_refresh'),
    path('logout/',
         LogoutView.as_view(),
         name='logout'),
    path('users/me/change_password/',
         ChangePasswordView.as_view(),
         name='change_password'),
    path('countries/',
         CountryListView.as_view(),
         name='country-list'),
    path('', include(router.urls))
]
