from django.urls import include, path
from rest_framework.routers import DefaultRouter

from api.views import (CartViewSet, CategoryViewSet, FavoritesViewSet,
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
    path('', include(router.urls))
]
