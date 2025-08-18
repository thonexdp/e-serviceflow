# 🚀 Laravel Dockerized Environment

This project provides a complete Docker setup for running a **Laravel application** with:

- **PHP-FPM** (via custom `Dockerfile`)
- **Nginx** (serving Laravel app)
- **MySQL 8.0** (database)
- **Node.js (v18)** (for frontend build & Vite dev server)

---

## 📦 Services

- **app** → PHP-FPM container running Laravel  
- **nginx** → Serves Laravel app on port **8000**  
- **mysql** → MySQL 8.0 on port **3307** (mapped to host)  
- **node** → Node.js container for running `npm install` & `npm run dev` (Vite on **5173**)  

---

## ⚙️ Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed  
- [Docker Compose](https://docs.docker.com/compose/) installed  
- `.env` file configured (copy from `.env.example` if not existing)

Make sure your `.env` matches MySQL service credentials:

```env
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=laravel
DB_USERNAME=laravel
DB_PASSWORD=secret
DB_ROOT_PASSWORD=rootsecret


## 🚀 Getting Started

Follow these steps to set up and run the Laravel application:

```bash
# Step 1 — Clone the repository
git clone https://github.com/your-username/your-laravel-app.git
cd your-laravel-app

# Step 2 — Build and start containers
docker compose up -d --build

# Step 3 — Install Laravel dependencies
docker exec -it laravel_app composer install

# Step 4 — Generate application key
docker exec -it laravel_app php artisan key:generate

# Step 5 — Run migrations
docker exec -it laravel_app php artisan migrate

# Step 6 — Access the application
# Laravel app → http://localhost:8000
# Vite dev server → http://localhost:5173

