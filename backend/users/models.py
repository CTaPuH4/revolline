from django.contrib.auth.models import (AbstractBaseUser, BaseUserManager,
                                        PermissionsMixin)
from django.db import models

from users.constants import EMAIL_MAX_LENGTH, NAME_MAX_LENGTH, PHONE_MAX_LENGTH


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Укажите адресс электронной почты')
        email = self.normalize_email(email)
        if not password:
            raise ValueError('Укажите пароль')

        # extra_fields.setdefault('is_active', False)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()

        # self.send_confirmation_email(user)

        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(
        'Email',
        max_length=EMAIL_MAX_LENGTH,
        unique=True,
    )
    first_name = models.CharField(
        'Имя',
        max_length=NAME_MAX_LENGTH,
        blank=True,
    )
    last_name = models.CharField(
        'Фамилия',
        max_length=NAME_MAX_LENGTH,
        blank=True,
    )
    phone = models.CharField(
        'Номер телефона',
        max_length=PHONE_MAX_LENGTH,
        blank=True,
    )
    is_active = models.BooleanField(
        'Статус',
        help_text='Если выключено, пользователь не может войти в аккаунт',
        default=True,
    )
    is_staff = models.BooleanField(
        'Статус администратора',
        default=False,
        help_text='Если включено, пользователь может войти в админ-панель'
    )
    fav = models.ManyToManyField(
        'store.Product',
        through='store.Favorites',
        related_name='fav_by',
        verbose_name='Избранное',
        blank=True,
    )
    cart = models.ManyToManyField(
        'store.Product',
        through='store.Cart',
        related_name='in_cart_of',
        verbose_name='Корзина',
        blank=True,
    )

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email

    class Meta:
        ordering = ('pk',)
        verbose_name = ('пользователь')
        verbose_name_plural = ('Пользователи')
