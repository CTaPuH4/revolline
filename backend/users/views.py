from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import permissions, status, views, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import (TokenObtainPairView,
                                            TokenRefreshView)

from api.serializers import CustomTokenObtainPairSerializer
from users.models import CustomUser
from users.permissions import IsAnonymous
from users.serializers import (ChangePasswordSerializer,
                               PasswordResetConfirmSerializer,
                               PasswordResetRequestSerializer,
                               UserRegistrationSerializer, UserSerializer)
from users.utils import set_jwt_cookies


class ActivateUserView(views.APIView):
    '''
    Вью активации пользователя.
    '''
    def get(self, request, uidb64, token):
        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = CustomUser.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, CustomUser.DoesNotExist):
            return Response({'detail': 'Неверная ссылка'},
                            status=status.HTTP_400_BAD_REQUEST)

        if default_token_generator.check_token(user, token):
            if not user.is_active:
                user.is_active = True
                user.save()
            return Response({'detail': 'Аккаунт успешно активирован'},
                            status=status.HTTP_200_OK)
        return Response({'detail': 'Ссылка недействительна или устарела'},
                        status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(views.APIView):
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            try:
                user = CustomUser.objects.get(email=email)
            except CustomUser.DoesNotExist:
                return Response(
                    {'message': 'Письмо восстановления отправленно.'},
                    status=status.HTTP_200_OK
                )

            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            reset_link = (
                f"{settings.FRONTEND_URL}/api/reset/?uid={uid}&token={token}/"
            )

            send_mail(
                subject='Revolline. Восстановление пароля.',
                message=(
                    f'Cсылка для восстановления пароля:\n{reset_link}'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )

            return Response(
                {'message': 'Письмо восстановления отправленно.'},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(views.APIView):
    '''
    Вью восстановления пароля.
    '''
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors, status=status.HTTP_400_BAD_REQUEST
            )

        uidb64 = serializer.validated_data['uid']
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = CustomUser.objects.get(pk=uid)
        except (CustomUser.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response(
                {'error': 'Неверный UID'}, status=status.HTTP_400_BAD_REQUEST
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {'error': 'Неверный или просроченный токен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_password(new_password, user)
        except ValidationError as e:
            return Response(
                {'new_password': list(e.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()

        return Response(
            {'message': 'Пароль успешно изменён'}, status=status.HTTP_200_OK
        )


class UserViewSet(viewsets.GenericViewSet):
    '''
    Вьюсет модели пользователя (CustomUser).
    '''
    queryset = CustomUser.objects.all()

    def get_permissions(self):
        if self.action == 'create':
            return (IsAnonymous(),)
        return (permissions.IsAuthenticated(),)

    def get_serializer_class(self):
        if self.action == 'create':
            return UserRegistrationSerializer
        return UserSerializer

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Пользователь создан. Подтвердите email.'},
                        status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        '''
        Вьюсет для GET и PATCH запросов к текущему пользователю.
        '''
        if request.method == 'GET':
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)

        serializer = self.get_serializer(
            request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class CustomTokenObtainPairView(TokenObtainPairView):
    '''
    Вью для получения токенов в виде HttpOnly cookie.
    '''
    serializer_class = CustomTokenObtainPairSerializer
    authentication_classes = ()
    permission_classes = ()

    def post(self, request: Request, *args, **kwargs) -> Response:
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            access_token = response.data.get('access')
            refresh_token = response.data.get('refresh')

            if access_token and refresh_token:
                response = set_jwt_cookies(
                    response, access_token, refresh_token)
                del response.data['access']
                del response.data['refresh']

        return response


class CustomTokenRefreshView(JWTAuthentication, TokenRefreshView):
    '''
    Вью для обновления токенов.
    '''
    def post(self, request: Request, *args, **kwargs) -> Response:
        raw_refresh_token = request.COOKIES.get(
            settings.SIMPLE_JWT['REFRESH_COOKIE']) or None
        data = {'refresh': raw_refresh_token}

        serializer = self.get_serializer(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        response = Response(
            serializer.validated_data, status=status.HTTP_200_OK)

        access_token = response.data.get('access')
        refresh_token = response.data.get('refresh')

        if access_token and refresh_token:
            response = set_jwt_cookies(response, access_token, refresh_token)
            del response.data['access']
            del response.data['refresh']

        return response


class LogoutView(views.APIView):
    '''
    Вью для добавления рефреш токена в блэклист.
    '''
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        raw_refresh_token = request.COOKIES.get(
            settings.SIMPLE_JWT['REFRESH_COOKIE'])

        if not raw_refresh_token:
            return Response({'detail': 'Refresh token cookie not found.'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            token = RefreshToken(raw_refresh_token)
            token.blacklist()
        except TokenError:
            return Response({'detail': 'Invalid refresh token.'},
                            status=status.HTTP_400_BAD_REQUEST)

        response = Response(status=status.HTTP_205_RESET_CONTENT)

        response.delete_cookie(settings.SIMPLE_JWT['AUTH_COOKIE'])
        response.delete_cookie(settings.SIMPLE_JWT['REFRESH_COOKIE'])
        return response


class ChangePasswordView(views.APIView):
    '''
    Вью для смены пароля.
    '''
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data,
                                              context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors,
                            status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        old_password = serializer.validated_data['password']

        if not user.check_password(old_password):
            return Response(
                {'old_password': 'Старый пароль неверен.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response({'detail': 'Пароль успешно изменён.'},
                        status=status.HTTP_200_OK)
