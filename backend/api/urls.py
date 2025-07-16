from django.urls import include, path
from rest_framework.routers import DefaultRouter

from api.views import (CartViewSet, CategoryViewSet, FavoritesViewSet,
                       ProductViewSet, SectionViewSet)

router = DefaultRouter()
router.register('sections', SectionViewSet, basename='sections')
router.register('category', CategoryViewSet, basename='category')
router.register('products', ProductViewSet, basename='products')
router.register('cart', CartViewSet, basename='cart')
router.register('favorites', FavoritesViewSet, basename='faborites')


urlpatterns = [
    path('', include(router.urls))
]
