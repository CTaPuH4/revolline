import hashlib
from copy import deepcopy

from django.core.cache import cache
from rest_framework.response import Response


class PublicCacheViewSetMixin:
    cache_timeouts = {
        "list": 60,
        "retrieve": 300,
    }

    def should_cache(self, request):
        return (
            request.method == "GET"
            and self.action in self.cache_timeouts
        )

    def get_cache_key(self, action):
        path = self.request.get_full_path()
        digest = hashlib.sha256(path.encode()).hexdigest()

        return (
            f"api:{self.__class__.__name__}:"
            f"{action}:{digest}"
        )

    def enrich_response_data(self, data):
        return data

    def get_cached_response(self, action, callback):
        if not self.should_cache(self.request):
            response = callback()
            if response.status_code == 200:
                response.data = self.enrich_response_data(
                    deepcopy(response.data)
                )
            return response

        key = self.get_cache_key(action)
        cached = cache.get(key)

        if cached is not None:
            data = self.enrich_response_data(deepcopy(cached))
            return Response(data)

        response = callback()

        if response.status_code == 200:
            shared_data = deepcopy(response.data)
            cache.set(
                key,
                shared_data,
                timeout=self.cache_timeouts[action],
            )
            response.data = self.enrich_response_data(
                deepcopy(shared_data)
            )

        return response

    def list(self, request, *args, **kwargs):
        return self.get_cached_response(
            "list",
            lambda: super(PublicCacheViewSetMixin, self).list(
                request, *args, **kwargs
            ),
        )

    def retrieve(self, request, *args, **kwargs):
        return self.get_cached_response(
            "retrieve",
            lambda: super(PublicCacheViewSetMixin, self).retrieve(
                request, *args, **kwargs
            ),
        )
