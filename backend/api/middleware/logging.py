import logging
import json
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger('main')


class DetailedLoggingMiddleware(MiddlewareMixin):
    '''
    Логируем:
    - успешные запросы коротко (метод, URL, статус)
    - ошибки подробно (метод, URL, тело запроса, статус, тело ответа)
    '''

    def process_request(self, request):
        # Сохраняем тело запроса для последующего логирования
        try:
            body = request.body.decode('utf-8')
            try:
                body = json.loads(body)
            except Exception:
                body = str(body)
            # Убираем пароли
            if isinstance(body, dict) and 'password' in body:
                body['password'] = '***'
            request._log_body = body
        except Exception:
            request._log_body = '<cannot decode body>'

    def process_response(self, request, response):
        # Если статус успешный (2xx, 3xx), логируем коротко
        if 200 <= response.status_code < 400:
            logger.info(
                f'"{request.method} {request.get_full_path()}" '
                f'{response.status_code} {len(response.content)}'
            )
        else:
            # Ошибочный запрос — логируем подробно
            try:
                content = response.content.decode('utf-8')
                try:
                    content = json.loads(content)
                except Exception:
                    pass
            except Exception:
                content = '<cannot decode response>'

            logger.error(
                f'ERROR {request.method} {request.get_full_path()} '
                f'Status={response.status_code} '
                f'RequestBody={getattr(request, "_log_body", "<no body>")} '
                f'ResponseBody={content}'
            )
        return response

    def process_exception(self, request, exception):
        # Необработанное исключение → логируем с полным стеком
        logger.exception(
            f'Unhandled exception {request.method} {request.get_full_path()} '
            f'RequestBody={getattr(request, "_log_body", "<no body>")}'
        )
        # Не подавляем исключение, пусть DRF дальше формирует стандартный 500
        return None
