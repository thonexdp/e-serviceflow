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
