from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from rest_framework import permissions, status, views, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework_simplejwt.views import TokenObtainPairView

from api.serializers import CustomTokenObtainPairSerializer
from users.models import CustomUser
from users.permissions import IsAnonymous
from users.serializers import (ChangePasswordSerializer,
                               UserRegistrationSerializer, UserSerializer)


class ActivateUserView(views.APIView):
    '''
    Вьюсет активации пользователя
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


class UserViewSet(viewsets.GenericViewSet):
    '''
    Вьюсет модели пользователя (CustomUser)
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
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(views.APIView):
    '''
    Вью для добавления рефреш токена в блэклист.
    '''
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response(status=status.HTTP_205_RESET_CONTENT)
        except (KeyError, TokenError):
            return Response({"detail": "Invalid refresh token."},
                            status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(views.APIView):
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
                {"old_password": "Старый пароль неверен."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response({"detail": "Пароль успешно изменён."},
                        status=status.HTTP_200_OK)
