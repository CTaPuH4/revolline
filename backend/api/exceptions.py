from rest_framework.exceptions import APIException


class ExternalAPIError(APIException):
    status_code = 503
    default_detail = "Сервис временно недоступен"
    default_code = "service_unavailable"
