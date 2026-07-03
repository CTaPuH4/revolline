from django.contrib.auth.models import (AbstractBaseUser, BaseUserManager,
                                        PermissionsMixin)
from django.db import models
from phonenumber_field.modelfields import PhoneNumberField

from users.constants import EMAIL_MAX_LENGTH, NAME_MAX_LENGTH


class CustomUserManager(BaseUserManager):
    '''
    Менеджер кастомной модели пользователя.
    '''
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Укажите адресс электронной почты')
        email = self.normalize_email(email)
        if not password:
            raise ValueError('Укажите пароль')

        extra_fields.setdefault('is_active', False)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()

        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)

class CustomUser(AbstractBaseUser, PermissionsMixin):
    '''
    Кастомная модель пользователя.
    '''
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
    patronymic = models.CharField(
        'Отчество',
        max_length=NAME_MAX_LENGTH,
        blank=True,
    )
    phone = PhoneNumberField(
        'Номер телефона',
        null=True,
        blank=True,
        unique=True
    )
    is_active = models.BooleanField(
        'Статус',
        help_text='Если выключено, пользователь не может войти в аккаунт',
        default=False,
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
        verbose_name = ('Пользователь')
        verbose_name_plural = ('Пользователи')


class EmailMessageLog(models.Model):
    class EmailType(models.TextChoices):
        ACTIVATION = 'activation', 'Activation'
        PASSWORD_RESET = 'password_reset', 'Password reset'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SENDING = 'sending', 'Sending'
        SENT = 'sent', 'Sent'
        FAILED = 'failed', 'Failed'

    user = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name='email_logs',
        null=True,
        blank=True,
    )
    email_type = models.CharField(max_length=32, choices=EmailType.choices)
    to_email = models.EmailField(max_length=EMAIL_MAX_LENGTH)
    subject = models.CharField(max_length=255)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
    )
    attempts = models.PositiveSmallIntegerField(default=0)
    last_error = models.TextField(blank=True)
    celery_task_id = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'{self.email_type} -> {self.to_email} ({self.status})'

    class Meta:
        ordering = ('-created_at',)
