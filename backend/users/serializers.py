from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers

from users.models import CustomUser


class UserSerializer(serializers.ModelSerializer):
    '''
    Сериализатор модели пользователя (CustomUser).
    '''
    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'first_name', 'last_name', 'phone']
        read_only_fields = ['id', 'email']


class UserRegistrationSerializer(serializers.ModelSerializer):
    '''
    Сериализатор POST запросов к CustomUser (Регистрации пользователя).
    '''
    password = serializers.CharField(write_only=True, required=True)
    password2 = serializers.CharField(write_only=True, required=True,
                                      label="Повторите пароль")

    class Meta:
        model = CustomUser
        fields = ['email', 'password', 'password2']

    def validate_password(self, value):
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(e.messages)
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError(
                {'password2': 'Пароли не совпадают'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = CustomUser.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
        )
        return user


class ChangePasswordSerializer(serializers.Serializer):
    password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)
    new_password2 = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError("Новые пароли не совпадают.")

        try:
            validate_password(attrs['new_password'],
                              self.context['request'].user)
        except ValidationError as e:
            raise serializers.ValidationError(
                {'new_password': list(e.messages)})
        return attrs
