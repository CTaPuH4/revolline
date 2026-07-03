import json
import logging
import time
from uuid import uuid4

from django.conf import settings
from django.http import FileResponse, StreamingHttpResponse
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger('api.request')

SENSITIVE_FIELDS = {
    'access',
    'access_token',
    'authorization',
    'cookie',
    'csrfmiddlewaretoken',
    'email',
    'new_password',
    'new_password2',
    'password',
    'password2',
    'phone',
    'refresh',
    'refresh_token',
    'secret',
    'token',
    'uid',
}


class DetailedLoggingMiddleware(MiddlewareMixin):
    '''
    Production-oriented request logging:
    - adds X-Request-ID to every response;
    - logs method/path/status/duration/size/user/ip;
    - does not log request/response bodies unless explicitly enabled;
    - masks sensitive fields recursively.
    '''

    def process_request(self, request):
        request.request_id = (
            request.headers.get('X-Request-ID')
            or request.headers.get('X-Correlation-ID')
            or uuid4().hex
        )
        request._log_started_at = time.monotonic()

    def process_response(self, request, response):
        request_id = getattr(request, 'request_id', uuid4().hex)
        response['X-Request-ID'] = request_id

        status_code = response.status_code
        duration_ms = self._duration_ms(request)
        size = self._response_size(response)
        user_id = self._user_id(request)
        remote_addr = self._remote_addr(request)

        extra = ''
        if status_code >= 500 and settings.LOG_RESPONSE_BODY:
            extra = f' response_body={self._response_body(response)}'
        elif status_code >= 400 and settings.LOG_REQUEST_BODY:
            extra = f' request_body={self._request_body(request)}'

        message = (
            'request_id=%s method=%s path="%s" status=%s duration_ms=%s '
            'size=%s user_id=%s remote_addr=%s%s'
        )
        args = (
            request_id,
            request.method,
            request.get_full_path(),
            status_code,
            duration_ms,
            size,
            user_id,
            remote_addr,
            extra,
        )

        if status_code >= 500:
            logger.error(message, *args)
        elif status_code in (400, 408, 409, 422, 429):
            logger.warning(message, *args)
        else:
            logger.info(message, *args)

        return response

    def process_exception(self, request, exception):
        logger.exception(
            'request_id=%s method=%s path="%s" user_id=%s remote_addr=%s '
            'unhandled_exception=%s request_body=%s',
            getattr(request, 'request_id', '<missing>'),
            request.method,
            request.get_full_path(),
            self._user_id(request),
            self._remote_addr(request),
            exception.__class__.__name__,
            self._request_body(request) if settings.LOG_REQUEST_BODY else '<disabled>',
        )
        return None

    def _duration_ms(self, request):
        started_at = getattr(request, '_log_started_at', None)
        if started_at is None:
            return -1
        return round((time.monotonic() - started_at) * 1000, 2)

    def _response_size(self, response):
        if isinstance(response, (FileResponse, StreamingHttpResponse)):
            return -1
        if hasattr(response, 'content'):
            return len(response.content)
        return -1

    def _user_id(self, request):
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            return user.pk
        return '-'

    def _remote_addr(self, request):
        forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '-')

    def _request_body(self, request):
        ctype = request.META.get('CONTENT_TYPE', '').lower()
        if ctype.startswith('multipart/form-data'):
            return '<multipart>'

        try:
            raw_body = request.body.decode('utf-8')
        except Exception:
            return '<cannot decode body>'

        if not raw_body:
            return ''

        try:
            return self._mask_sensitive_fields(json.loads(raw_body))
        except Exception:
            return '<non-json body>'

    def _response_body(self, response):
        if isinstance(response, (FileResponse, StreamingHttpResponse)):
            return '<streaming>'
        ctype = response.get('Content-Type', '').lower()
        if 'json' not in ctype:
            return '<non-json response>'

        try:
            body = response.content.decode('utf-8')
            return self._mask_sensitive_fields(json.loads(body))
        except Exception:
            return '<cannot decode response>'

    def _mask_sensitive_fields(self, data):
        if isinstance(data, dict):
            return {
                key: (
                    '***'
                    if key.lower() in SENSITIVE_FIELDS
                    else self._mask_sensitive_fields(value)
                )
                for key, value in data.items()
            }
        if isinstance(data, list):
            return [self._mask_sensitive_fields(item) for item in data]
        return data
