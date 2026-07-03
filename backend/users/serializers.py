from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from phonenumber_field.serializerfields import PhoneNumberField
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from users.models import CustomUser


class UserSerializer(serializers.ModelSerializer):
    '''
    Сериализатор модели пользователя (CustomUser).
    '''
    phone = PhoneNumberField(
        validators=[
            UniqueValidator(
                queryset=CustomUser.objects.all(),
                message='Номер телефона уже используется.'
            )
        ],
        error_messages={
            'invalid': 'Некорректный номер телефона.',
        }
    )

    class Meta:
        model = CustomUser
        fields = (
            'id', 'email', 'first_name', 'last_name', 'patronymic', 'phone',
        )
        read_only_fields = ('id', 'email',)


class UserRegistrationSerializer(serializers.ModelSerializer):
    '''
    Сериализатор POST запросов к CustomUser (Регистрации пользователя).
    '''
    password = serializers.CharField(write_only=True, required=True)
    password2 = serializers.CharField(write_only=True, required=True,
                                      label='Повторите пароль')

    class Meta:
        model = CustomUser
        fields = ('email', 'password', 'password2',)

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
            raise serializers.ValidationError('Новые пароли не совпадают.')

        try:
            validate_password(attrs['new_password'],
                              self.context['request'].user)
        except ValidationError as e:
            raise serializers.ValidationError(
                {'new_password': list(e.messages)})
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    '''
    Сериализатор запроса на восстановление пароля.
    '''
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    '''
    Сериализатор нового пароля.
    '''
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)
    new_password2 = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError('Новые пароли не совпадают.')

        try:
            validate_password(attrs['new_password'])
        except ValidationError as e:
            raise serializers.ValidationError(
                {'new_password': list(e.messages)})
        return attrs
