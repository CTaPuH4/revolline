FROM php:8.3-cli

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libcurl4-openssl-dev \
    && docker-php-ext-install curl \
    && rm -rf /var/lib/apt/lists/*

COPY service.php /app/service.php

EXPOSE 8001

CMD ["php", "-S", "0.0.0.0:8001", "-t", "/app"]
