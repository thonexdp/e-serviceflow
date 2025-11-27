# Stage 1 — build assets
FROM node:18 AS node-builder
WORKDIR /workspace
COPY package*.json package-lock.json ./
RUN npm ci
COPY resources resources
COPY vite.config.js ./
# Copy other necessary files for build if needed (e.g. tailwind, postcss)
COPY tailwind.config.js postcss.config.js ./
COPY public public
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
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

# copy built frontend from node stage
COPY --from=node-builder /workspace/public ./public

# copy rest of app
COPY . ./

# permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# configure nginx
COPY ./.nginx.conf /etc/nginx/sites-available/default
RUN rm /etc/nginx/sites-enabled/default || true

# supervisor to manage php-fpm and nginx
COPY ./supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8080
CMD ["supervisord", "-n"]
