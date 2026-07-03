from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion

import users.constants


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_customuser_patronymic_alter_customuser_first_name_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='is_active',
            field=models.BooleanField(
                default=False,
                help_text='Если выключено, пользователь не может войти в аккаунт',
                verbose_name='Статус',
            ),
        ),
        migrations.CreateModel(
            name='EmailMessageLog',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                (
                    'email_type',
                    models.CharField(
                        choices=[
                            ('activation', 'Activation'),
                            ('password_reset', 'Password reset'),
                        ],
                        max_length=32,
                    ),
                ),
                (
                    'to_email',
                    models.EmailField(
                        max_length=users.constants.EMAIL_MAX_LENGTH,
                    ),
                ),
                ('subject', models.CharField(max_length=255)),
                (
                    'status',
                    models.CharField(
                        choices=[
                            ('pending', 'Pending'),
                            ('sending', 'Sending'),
                            ('sent', 'Sent'),
                            ('failed', 'Failed'),
                        ],
                        default='pending',
                        max_length=16,
                    ),
                ),
                ('attempts', models.PositiveSmallIntegerField(default=0)),
                ('last_error', models.TextField(blank=True)),
                ('celery_task_id', models.CharField(blank=True, max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                (
                    'user',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='email_logs',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'ordering': ('-created_at',),
            },
        ),
    ]
