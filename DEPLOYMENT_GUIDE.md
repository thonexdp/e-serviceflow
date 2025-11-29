# Deployment Guide for Google Cloud Platform (Cloud Run)

This guide will help you deploy your Laravel application (with Inertia.js) and Soketi (WebSocket server) to Google Cloud Run using GitHub Actions for CI/CD.

## Prerequisites

1.  **Google Cloud Project**: You need an active GCP project with billing enabled.
2.  **GitHub Repository**: Your code must be hosted on GitHub.
3.  **GCloud CLI**: Installed on your local machine (optional, but recommended for initial setup).

---

## Step 1: Google Cloud Setup

Run these commands in your local terminal or Google Cloud Shell (https://shell.cloud.google.com).

### 1. Enable Required Services

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  redis.googleapis.com \
  cloudbuild.googleapis.com \
  iamcredentials.googleapis.com
```

### 2. Create Artifact Registry

This is where your Docker images will be stored.

```bash
gcloud artifacts repositories create e-serviceflow-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker repository for e-serviceflow"
```

### 3. Create Database (Cloud SQL)

_Note: This consumes your credits. Cost is approx $10-15/mo for micro instance._

```bash
# Create the instance
gcloud sql instances create e-serviceflow-db \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=YOUR_STRONG_ROOT_PASSWORD

# Create database and user
gcloud sql databases create eserviceflow_staging --instance=e-serviceflow-db
gcloud sql users create eserviceflow_user \
  --instance=e-serviceflow-db \
  --password=YOUR_DB_USER_PASSWORD
```

### 4. Create Redis (Optional but Recommended for Soketi)

_Note: Memorystore is expensive (~$30/mo). If you want to save credits, you can skip this and use a free external Redis (like Upstash) or run Redis in a VM._

```bash
gcloud redis instances create e-serviceflow-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_6_x
```

_Note down the **Host IP** and **Port** of your Redis instance._

### 5. Create Service Account for GitHub Actions

This allows GitHub to deploy to your project.

```bash
# Create Service Account
gcloud iam service-accounts create ci-cd-deployer \
  --display-name="CI/CD Deployer"

# Grant Permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:ci-cd-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:ci-cd-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:ci-cd-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:ci-cd-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Generate Key File (Save this!)
gcloud iam service-accounts keys create key.json \
  --iam-account=ci-cd-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

---

## Step 2: GitHub Secrets Configuration

Go to your GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions**.
Add the following **Repository secrets**:

| Secret Name                   | Value                     | Description                                                                  |
| :---------------------------- | :------------------------ | :--------------------------------------------------------------------------- |
| `GCP_PROJECT_ID`              | `your-project-id`         | Your Google Cloud Project ID                                                 |
| `GCP_SA_KEY`                  | `{ ... }`                 | The content of the `key.json` file you downloaded                            |
| `DB_INSTANCE_CONNECTION_NAME` | `project:region:instance` | Find in Cloud SQL Overview (e.g., `my-project:us-central1:e-serviceflow-db`) |
| `DB_DATABASE`                 | `eserviceflow_staging`    | Database name                                                                |
| `DB_USERNAME`                 | `eserviceflow_user`       | Database user                                                                |
| `DB_PASSWORD`                 | `...`                     | Database password                                                            |
| `REDIS_HOST`                  | `10.x.x.x`                | IP of your Redis instance                                                    |
| `PUSHER_APP_ID`               | `app-id`                  | Arbitrary ID (e.g., `staging`)                                               |
| `PUSHER_APP_KEY`              | `app-key`                 | Arbitrary Key (e.g., `staging-key`)                                          |
| `PUSHER_APP_SECRET`           | `app-secret`              | Arbitrary Secret (e.g., `staging-secret`)                                    |

---

## Step 3: Deployment

1.  **Push to Staging**:
    The deployment is configured to run automatically when you push to the `staging` branch.

    ```bash
    git checkout -b staging
    git add .
    git commit -m "Configure deployment"
    git push origin staging
    ```

2.  **Monitor Action**:
    Go to the **Actions** tab in GitHub to see the build and deploy process.

---

## Step 4: Final Configuration

Once the GitHub Action completes successfully:

1.  **Get Soketi URL**:

    -   Go to [Google Cloud Run Console](https://console.cloud.google.com/run).
    -   Find the `e-serviceflow-soketi` service.
    -   Copy the URL (e.g., `https://e-serviceflow-soketi-xyz.a.run.app`).

2.  **Update App Configuration**:

    -   Click on `e-serviceflow-app` in Cloud Run.
    -   Click **Edit & Deploy New Revision**.
    -   Go to **Variables & Secrets**.
    -   Add/Update the `PUSHER_HOST` variable:
        -   Name: `PUSHER_HOST`
        -   Value: `e-serviceflow-soketi-xyz.a.run.app` (Paste the URL **without** `https://`)
    -   Ensure `PUSHER_SCHEME` is `https` and `PUSHER_PORT` is `443`.
    -   Click **Deploy**.

3.  **Run Migrations**:
    Since Cloud Run is stateless, you need to run migrations against the Cloud SQL database. You can do this by creating a temporary job.

    **Option A: Using Cloud Run Jobs (Recommended)**

    1. Go to Cloud Run -> **Jobs** -> **Create Job**.
    2. Select the `e-serviceflow-app` image.
    3. Command: `php`
    4. Arguments: `artisan`, `migrate`, `--force`
    5. Set the same Environment Variables and Cloud SQL connection as the service.
    6. Click **Create** and then **Execute**.

    **Option B: One-off Command via CLI**

    ```bash
    gcloud run jobs create migrate-db \
      --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/e-serviceflow-repo/e-serviceflow-app:latest \
      --region=us-central1 \
      --command=php \
      --args=artisan,migrate,--force \
      --set-cloudsql-instances=YOUR_CONNECTION_NAME \
      --set-env-vars=DB_SOCKET=/cloudsql/YOUR_CONNECTION_NAME,DB_DATABASE=...,DB_USERNAME=...,DB_PASSWORD=...

    gcloud run jobs execute migrate-db --region=us-central1
    ```

# Deployment Guide for Google Cloud Platform (Cloud Run)

This guide will help you deploy your Laravel application (with Inertia.js) and Soketi (WebSocket server) to Google Cloud Run using GitHub Actions for CI/CD.

## Prerequisites

1.  **Google Cloud Project**: You need an active GCP project with billing enabled.
2.  **GitHub Repository**: Your code must be hosted on GitHub.
3.  **GCloud CLI**: Installed on your local machine (optional, but recommended for initial setup).

---

## Step 1: Google Cloud Setup

Run these commands in your local terminal or Google Cloud Shell (https://shell.cloud.google.com).

### 1. Enable Required Services

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  redis.googleapis.com \
  cloudbuild.googleapis.com \
  iamcredentials.googleapis.com
```

### 2. Create Artifact Registry

This is where your Docker images will be stored.

```bash
gcloud artifacts repositories create e-serviceflow-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker repository for e-serviceflow"
```

### 3. Create Database (Cloud SQL)

_Note: This consumes your credits. Cost is approx $10-15/mo for micro instance._

```bash
# Create the instance
gcloud sql instances create e-serviceflow-db \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=YOUR_STRONG_ROOT_PASSWORD

# Create database and user
gcloud sql databases create eserviceflow_staging --instance=e-serviceflow-db
gcloud sql users create eserviceflow_user \
  --instance=e-serviceflow-db \
  --password=YOUR_DB_USER_PASSWORD
```

### 4. Create Redis (Optional but Recommended for Soketi)

_Note: Memorystore is expensive (~$30/mo). If you want to save credits, you can skip this and use a free external Redis (like Upstash) or run Redis in a VM._

```bash
gcloud redis instances create e-serviceflow-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_6_x
```

_Note down the **Host IP** and **Port** of your Redis instance._

### 5. Create Service Account for GitHub Actions

This allows GitHub to deploy to your project.

```bash
# Create Service Account
gcloud iam service-accounts create ci-cd-deployer \
  --display-name="CI/CD Deployer"

# Grant Permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:ci-cd-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:ci-cd-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:ci-cd-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:ci-cd-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Generate Key File (Save this!)
gcloud iam service-accounts keys create key.json \
  --iam-account=ci-cd-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

---

## Step 2: GitHub Secrets Configuration

Go to your GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions**.
Add the following **Repository secrets**:

| Secret Name                   | Value                     | Description                                                                  |
| :---------------------------- | :------------------------ | :--------------------------------------------------------------------------- |
| `GCP_PROJECT_ID`              | `your-project-id`         | Your Google Cloud Project ID                                                 |
| `GCP_SA_KEY`                  | `{ ... }`                 | The content of the `key.json` file you downloaded                            |
| `DB_INSTANCE_CONNECTION_NAME` | `project:region:instance` | Find in Cloud SQL Overview (e.g., `my-project:us-central1:e-serviceflow-db`) |
| `DB_DATABASE`                 | `eserviceflow_staging`    | Database name                                                                |
| `DB_USERNAME`                 | `eserviceflow_user`       | Database user                                                                |
| `DB_PASSWORD`                 | `...`                     | Database password                                                            |
| `REDIS_HOST`                  | `10.x.x.x`                | IP of your Redis instance                                                    |
| `PUSHER_APP_ID`               | `app-id`                  | Arbitrary ID (e.g., `staging`)                                               |
| `PUSHER_APP_KEY`              | `app-key`                 | Arbitrary Key (e.g., `staging-key`)                                          |
| `PUSHER_APP_SECRET`           | `app-secret`              | Arbitrary Secret (e.g., `staging-secret`)                                    |

---

## Step 3: Deployment

1.  **Push to Staging**:
    The deployment is configured to run automatically when you push to the `staging` branch.

    ```bash
    git checkout -b staging
    git add .
    git commit -m "Configure deployment"
    git push origin staging
    ```

2.  **Monitor Action**:
    Go to the **Actions** tab in GitHub to see the build and deploy process.

---

## Step 4: Final Configuration

Once the GitHub Action completes successfully:

1.  **Get Soketi URL**:

    -   Go to [Google Cloud Run Console](https://console.cloud.google.com/run).
    -   Find the `e-serviceflow-soketi` service.
    -   Copy the URL (e.g., `https://e-serviceflow-soketi-xyz.a.run.app`).

2.  **Update App Configuration**:

    -   Click on `e-serviceflow-app` in Cloud Run.
    -   Click **Edit & Deploy New Revision**.
    -   Go to **Variables & Secrets**.
    -   Add/Update the `PUSHER_HOST` variable:
        -   Name: `PUSHER_HOST`
        -   Value: `e-serviceflow-soketi-xyz.a.run.app` (Paste the URL **without** `https://`)
    -   Ensure `PUSHER_SCHEME` is `https` and `PUSHER_PORT` is `443`.
    -   Click **Deploy**.

3.  **Run Migrations**:
    Since Cloud Run is stateless, you need to run migrations against the Cloud SQL database. You can do this by creating a temporary job.

    **Option A: Using Cloud Run Jobs (Recommended)**

    1. Go to Cloud Run -> **Jobs** -> **Create Job**.
    2. Select the `e-serviceflow-app` image.
    3. Command: `php`
    4. Arguments: `artisan`, `migrate`, `--force`
    5. Set the same Environment Variables and Cloud SQL connection as the service.
    6. Click **Create** and then **Execute**.

    **Option B: One-off Command via CLI**

    ```bash
    gcloud run jobs create migrate-db \
      --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/e-serviceflow-repo/e-serviceflow-app:latest \
      --region=us-central1 \
      --command=php \
      --args=artisan,migrate,--force \
      --set-cloudsql-instances=YOUR_CONNECTION_NAME \
      --set-env-vars=DB_SOCKET=/cloudsql/YOUR_CONNECTION_NAME,DB_DATABASE=...,DB_USERNAME=...,DB_PASSWORD=...

    gcloud run jobs execute migrate-db --region=us-central1
    ```

---

## Troubleshooting

-   **502 Bad Gateway**: Check `supervisord` logs in Cloud Run -> Logs. It usually means PHP-FPM or Nginx failed to start.
-   **Database Connection Error**: Ensure the `DB_SOCKET` env var is correct and the Cloud SQL API is enabled.
-   **WebSocket Connection Failed**: Check the browser console. Ensure `PUSHER_HOST` matches the Soketi Cloud Run URL and `PUSHER_SCHEME` is `https`.

---

## Post-Deployment: Running Migrations

After your first successful deployment, you need to run database migrations.

### Method 1: Using gcloud CLI (Fastest)

**Important:** Make sure you've pushed your latest code to GitHub and the GitHub Action has completed successfully before running migrations.

```bash
# Create and execute migration job in one command
gcloud run jobs create migrate-staging \
  --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/e-serviceflow-repo/e-serviceflow-app:LATEST_COMMIT_SHA \
  --region=us-central1 \
  --set-cloudsql-instances=YOUR_DB_INSTANCE_CONNECTION_NAME \
  --set-env-vars="APP_KEY=YOUR_APP_KEY,APP_ENV=production,DB_CONNECTION=mysql,DB_HOST=localhost,DB_SOCKET=/cloudsql/YOUR_DB_INSTANCE_CONNECTION_NAME,DB_DATABASE=YOUR_DB_NAME,DB_USERNAME=YOUR_DB_USER,DB_PASSWORD=YOUR_DB_PASSWORD" \
  --command=php \
  --args=artisan,migrate:fresh,--seed,--force \
  --execute-now
```

**To get the latest commit SHA:**

```bash
git rev-parse HEAD
```

**Or use the commit SHA from your latest GitHub Actions run.**

### Method 2: Using Cloud Console

1. Go to: https://console.cloud.google.com/run/jobs
2. Click **CREATE JOB**
3. **Container image**: Select `e-serviceflow-app` with the **latest commit SHA tag** (not `latest`)
4. **Command**: `php`
5. **Arguments**: `artisan`, `migrate:fresh`, `--seed`, `--force`
6. **Environment variables**: Same as your app service
7. **Cloud SQL connection**: Add `e-serviceflow-db`
8. Click **CREATE** then **EXECUTE**

### Verifying Migrations

After running migrations, verify the tables:

```bash
# Visit your app URL
https://YOUR_APP_URL/testdb
```

You should see all your tables listed, including:

-   users
-   customers
-   tickets
-   job_categories
-   job_types
-   permissions
-   user_permissions
-   etc.

---

## Updating Migrations

When you add new migration files:

1. **Commit and push to GitHub:**

    ```bash
    git add database/migrations/
    git commit -m "Add new migrations"
    git push origin staging
    ```

2. **Wait for GitHub Actions to complete** (builds new Docker image)

3. **Get the new commit SHA:**

    ```bash
    git rev-parse HEAD
    ```

4. **Run migrations with the NEW image:**

    ```bash
    gcloud run jobs execute migrate-staging --region=us-central1 \
      --update-env-vars="IMAGE_TAG=NEW_COMMIT_SHA"
    ```

    Or delete and recreate the job with the new image tag.

---

## Common Issues

### "Tables not updating after migration"

**Cause:** The migration job is using an old Docker image that doesn't have your latest migration files.

**Solution:**

1. Verify GitHub Actions completed successfully
2. Use the exact commit SHA from the successful build (not `latest`)
3. Delete the old job and create a new one with the correct image tag

### "White page / 500 error"

**Cause:** Missing environment variables or database not migrated.

**Solution:**

1. Check logs: `gcloud run services logs read e-serviceflow-app --region=us-central1 --limit=100`
2. Visit `/testdb` to verify database connection
3. Ensure all environment variables are set correctly

### "Mixed content errors"

**Cause:** Assets loading over HTTP instead of HTTPS.

**Solution:** Already fixed in `AppServiceProvider.php` - ensure `APP_ENV=production` is set.
