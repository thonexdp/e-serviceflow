# Stage 1 — build assets
FROM node:18 AS node-builder

# Accept build arguments for VITE environment variables
ARG VITE_PUSHER_APP_KEY
ARG VITE_PUSHER_HOST
ARG VITE_PUSHER_PORT
ARG VITE_PUSHER_SCHEME
ARG VITE_PUSHER_APP_CLUSTER

# Make them available as environment variables during build
ENV VITE_PUSHER_APP_KEY=$VITE_PUSHER_APP_KEY
ENV VITE_PUSHER_HOST=$VITE_PUSHER_HOST
ENV VITE_PUSHER_PORT=$VITE_PUSHER_PORT
ENV VITE_PUSHER_SCHEME=$VITE_PUSHER_SCHEME
ENV VITE_PUSHER_APP_CLUSTER=$VITE_PUSHER_APP_CLUSTER

WORKDIR /workspace
COPY package*.json package-lock.json ./
RUN npm ci
COPY resources resources
COPY vite.config.js jsconfig.json ./
# Copy other necessary files for build if needed (e.g. tailwind, postcss)
COPY tailwind.config.js postcss.config.js ./
COPY public public

# Build with VITE_ env vars available
RUN npm run build

# Stage 2 — PHP + app
FROM php:8.2-fpm

# install system deps
RUN apt-get update && apt-get install -y \
    git curl unzip libzip-dev libonig-dev libpng-dev libjpeg-dev libxml2-dev \
    nginx supervisor ca-certificates libicu-dev \
    && docker-php-ext-configure gd --with-jpeg \
    && docker-php-ext-install pdo_mysql mbstring zip exif pcntl bcmath gd intl

# install composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

# copy rest of app FIRST (before built assets)
COPY . ./

# copy built frontend from node stage (this will overwrite public folder with built assets)
COPY --from=node-builder /workspace/public/build ./public/build

# permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# configure nginx
COPY ./.nginx.conf /etc/nginx/conf.d/default.conf
# Remove default nginx config if exists
RUN rm -f /etc/nginx/sites-enabled/default

# supervisor to manage php-fpm and nginx
COPY ./supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create startup script with database retry logic
RUN echo '#!/bin/bash\n\
set -e\n\
cd /var/www/html\n\
\n\
# Wait for database to be ready\n\
echo "Waiting for database connection..."\n\
max_attempts=30\n\
attempt=0\n\
until php artisan db:show 2>/dev/null || [ $attempt -eq $max_attempts ]; do\n\
  attempt=$((attempt+1))\n\
  echo "Database not ready, attempt $attempt/$max_attempts..."\n\
  sleep 2\n\
done\n\
\n\
if [ $attempt -eq $max_attempts ]; then\n\
  echo "Failed to connect to database after $max_attempts attempts"\n\
  exit 1\n\
fi\n\
\n\
echo "Database connected, running migrations..."\n\
php artisan migrate --force\n\
\n\
echo "Starting services..."\n\
exec supervisord -n' > /start.sh && chmod +x /start.sh

EXPOSE 8080
CMD ["/start.sh"]
