from django.conf import settings
from rest_framework import response


def set_jwt_cookies(response: response.Response,
                    access_token: str,
                    refresh_token: str) -> response.Response:
    response.set_cookie(
        settings.SIMPLE_JWT['AUTH_COOKIE'],
        access_token,
        max_age=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'],
        httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
        secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
        samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
    )
    response.set_cookie(
        settings.SIMPLE_JWT['REFRESH_COOKIE'],
        refresh_token,
        max_age=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'],
        httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
        secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
        samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
    )
    return response
