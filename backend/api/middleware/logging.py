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

    def _mask_sensitive_fields(self, data):
        if isinstance(data, dict):
            for key in SENSITIVE_FIELDS:
                if key in data:
                    data[key] = '***'
        return data

    def _parse_body(self, request):
        ctype = request.META.get('CONTENT_TYPE', '').lower()
        if ctype.startswith('multipart/form-data'):
            return dict(request.POST)
        try:
            body = request.body.decode('utf-8')
            try:
                return json.loads(body)
            except Exception:
                return str(body)
        except Exception:
            return '<cannot decode body>'

    def process_request(self, request):
        body = self._parse_body(request)
        body = self._mask_sensitive_fields(body)
        request._log_body = body

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
