from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from rest_framework import permissions, status, views, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from users.models import CustomUser
from users.permissions import IsAnonymous
from users.serializers import UserRegistrationSerializer, UserSerializer


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
    Вьюсет для GET и PATCH запросов к текущему пользователю.
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
        if request.method == 'GET':
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)

        serializer = self.get_serializer(
            request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
