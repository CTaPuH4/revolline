from rest_framework import permissions


class IsAnonymous(permissions.BasePermission):
    '''
    Доступ разрешён только анонимным (незалогиненным) пользователям.
    '''
    def has_permission(self, request, view) -> bool:  # type: ignore[override]
        return not request.user or not request.user.is_authenticated
