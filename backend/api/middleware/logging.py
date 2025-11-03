import json
import logging

from django.http import FileResponse, StreamingHttpResponse
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger('main')

SENSITIVE_FIELDS = (
    'password', 'password2', 'new_password', 'new_password2', 'token', 'uid'
)


class DetailedLoggingMiddleware(MiddlewareMixin):
    '''
    Логируем:
    - успешные запросы коротко (метод, URL, статус)
    - ошибки подробно (метод, URL, тело запроса, статус, тело ответа)
    Исключения:
    - не логируем HTML-страницы и бинарные ответы (картинки, файлы)
    '''

    def process_request(self, request):
        try:
            body = request.body.decode('utf-8')
            try:
                body = json.loads(body)
            except Exception:
                body = str(body)

            if isinstance(body, dict):
                for key in SENSITIVE_FIELDS:
                    if key in body:
                        body[key] = '***'

            request._log_body = body
        except Exception:
            request._log_body = '<cannot decode body>'

    def _is_binary_or_html(self, response):
        '''
        Проверяем, является ли ответ бинарным (картинка, файл) или HTML
        '''
        if isinstance(response, (FileResponse, StreamingHttpResponse)):
            return True

        ctype = response.get('Content-Type', '').lower()
        if any(ctype.startswith(t) for t in
               ['image/', 'application/octet-stream']):
            return True

        if 'text/html' in ctype:
            return True

        return False

    def process_response(self, request, response):
        if self._is_binary_or_html(response):
            logger.info(
                '"%s %s" %s [binary/html response]',
                request.method,
                request.get_full_path(),
                response.status_code,
            )
            return response

        if 200 <= response.status_code < 400:
            size = (
                len(response.content) if hasattr(response, "content") else -1
            )
            logger.info(
                '"%s %s" %s %s',
                request.method,
                request.get_full_path(),
                response.status_code,
                size,
            )
        else:
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
        logger.exception(
            f'Unhandled exception {request.method} {request.get_full_path()} '
            f'RequestBody={getattr(request, "_log_body", "<no body>")}'
        )
        return None
