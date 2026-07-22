from django.http import HttpResponse
from prometheus_client import CONTENT_TYPE_LATEST, CollectorRegistry, generate_latest
from prometheus_client.multiprocess import MultiProcessCollector


def metrics_view(request):
    """Expose metrics to Prometheus on the internal backend network."""
    registry = CollectorRegistry()
    MultiProcessCollector(registry)
    return HttpResponse(generate_latest(registry), content_type=CONTENT_TYPE_LATEST)
