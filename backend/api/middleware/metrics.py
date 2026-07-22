import time

from prometheus_client import Counter, Histogram


REQUESTS = Counter(
    'revolline_http_requests_total',
    'HTTP requests handled by Django.',
    ('method', 'route', 'status'),
)
REQUEST_DURATION = Histogram(
    'revolline_http_request_duration_seconds',
    'Time spent handling HTTP requests in Django.',
    ('method', 'route'),
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
)


class PrometheusMetricsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        started_at = time.perf_counter()
        response = self.get_response(request)

        match = request.resolver_match
        route = match.route if match and match.route else 'unmatched'
        if route != 'metrics/':
            method = request.method
            REQUESTS.labels(method, route, response.status_code).inc()
            REQUEST_DURATION.labels(method, route).observe(
                time.perf_counter() - started_at
            )
        return response
