# Revolline

## ⚙️ Запуск проекта
### Backend
Клонировать репозиторий и перейти в папку backend в командной строке.

Активировать виртуальное окружение:
```
python -m venv venv
. venv/Scripts/activate
```

Установить сторонние библиотеки:
```
pip install -r requirements.txt
```

Запустить миграции:
```
python manage.py migrate
```

Создать супер-пользователя:
```
python manage.py createsuperuser
```

Запустить проект:
```
python manage.py runserver runserver localhost:8000

```
---
### Frontend

Установить сторонние библиотеки:
```
npm install
```

Запустить проект:
```
npm run dev
```

---

## 📚 Примеры запросов к API

Полный список примеров запросов можно
👉 [посмотреть здесь](backend/api/docs/api_docs.md).

---

### Авторы
- Nizhelskiy Ilya (CTaPuH4) - https://github.com/CTaPuH4
- VanVan26 - https://github.com/VanVan26
- dashhiikk - https://github.com/dashhiikk