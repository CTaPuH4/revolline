from rest_framework import permissions


class IsAnonymous(permissions.BasePermission):
    '''
    Доступ разрешён только анонимным (незалогиненным) пользователям.
    '''

    def has_permission(self, request, view):
        return not request.user or not request.user.is_authenticated
