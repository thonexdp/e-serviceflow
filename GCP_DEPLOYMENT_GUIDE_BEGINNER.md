# Complete GCP Deployment Guide for Beginners
## E-ServiceFlow Laravel Application

**Project ID:** `rcprintshoppe-480111`  
**Region:** Singapore (`asia-southeast1`)  
**Budget:** ~$200 for 2 months testing  
**CI/CD:** GitHub Actions (staging branch)

---

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [What We'll Deploy](#what-well-deploy)
3. [Part 1: Initial GCP Setup](#part-1-initial-gcp-setup)
4. [Part 2: Create GCP Resources](#part-2-create-gcp-resources)
5. [Part 3: Setup GitHub Actions CI/CD](#part-3-setup-github-actions-cicd)
6. [Part 4: Deploy Application](#part-4-deploy-application)
7. [Part 5: Verify & Test](#part-5-verify--test)
8. [Part 6: Cost Management](#part-6-cost-management)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### What You Need Before Starting:

1. **Google Cloud Account** 
   - Go to https://cloud.google.com
   - Sign up (you get $300 free credits for 90 days)
   - **Project ID:** `rcprintshoppe-480111` (already created)

2. **GitHub Account**
   - Your code repository on GitHub

3. **Local Computer with:**
   - Git installed
   - Google Cloud SDK installed (we'll guide you)
   - A code editor (VS Code, etc.)

4. **Basic Terminal Knowledge**
   - We'll provide all commands, just copy and paste!

---

## What We'll Deploy

```
┌─────────────────────────────────────────────────┐
│           Google Cloud Platform                 │
│  Region: asia-southeast1 (Singapore)            │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐      ┌──────────────┐       │
│  │  Cloud Run   │      │  Cloud Run   │       │
│  │  (Laravel    │◄─────┤  (Soketi     │       │
│  │   App)       │      │   WebSocket) │       │
│  └──────┬───────┘      └──────────────┘       │
│         │                                       │
│         ├──► Cloud SQL (MySQL Database)        │
│         │                                       │
│         └──► Cloud Storage (File Buckets)      │
│                                                 │
│  ┌──────────────────────────────────┐         │
│  │  Cloud Build (CI/CD)             │         │
│  │  Triggered by GitHub Push        │         │
│  └──────────────────────────────────┘         │
└─────────────────────────────────────────────────┘
```

**Components:**
- **Cloud Run**: Serverless container platform for your Laravel app and Soketi
- **Cloud SQL**: Managed MySQL database
- **Cloud Storage**: File storage buckets
- **Cloud Build**: Automated deployment from GitHub

---

## Part 1: Initial GCP Setup

### Step 1.1: Install Google Cloud SDK

**For Windows:**
1. Download: https://cloud.google.com/sdk/docs/install#windows
2. Run the installer
3. Follow the installation wizard
4. When done, open **Command Prompt** or **PowerShell**

**For Mac:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

**For Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### Step 1.2: Initialize gcloud CLI

Open your terminal (Command Prompt, PowerShell, or Terminal) and run:

```bash
gcloud init
```

**Follow the prompts:**
1. Login with your Google account (browser will open)
2. Select your project: `rcprintshoppe-480111`
3. Set default region: `asia-southeast1`

### Step 1.3: Verify Your Setup

```bash
# Check if you're logged in
gcloud auth list

# Check your project
gcloud config get-value project

# Should show: rcprintshoppe-480111
```

### Step 1.4: Enable Required APIs

This enables all Google Cloud services you'll need:

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  storage-api.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  compute.googleapis.com \
  sql-component.googleapis.com \
  cloudresourcemanager.googleapis.com
```

**Wait 2-3 minutes** for APIs to be enabled. You'll see "Operation finished successfully."

---

## Part 2: Create GCP Resources

### Step 2.1: Create Cloud Storage Bucket

This is where your uploaded files (images, documents) will be stored.

```bash
# Create bucket
gsutil mb -l asia-southeast1 gs://rcprintshoppe-files/

# Make it publicly readable (for images, documents)
gsutil iam ch allUsers:objectViewer gs://rcprintshoppe-files/
```

**Note:** Your bucket name is now: `rcprintshoppe-files`

### Step 2.2: Create Cloud SQL Database (MySQL)

**⚠️ IMPORTANT:** This costs approximately **$10-15/month** (smallest instance).

```bash
# Create MySQL instance (this takes 5-10 minutes)
gcloud sql instances create rcprintshoppe-db \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=asia-southeast1 \
  --root-password=YourStrongRootPassword123! \
  --storage-size=10GB \
  --storage-type=HDD \
  --backup-start-time=02:00
```

**Replace `YourStrongRootPassword123!` with a strong password and SAVE IT!**

**Wait for it to finish** (5-10 minutes). You'll see "Created [instance]".

```bash
# Create the database
gcloud sql databases create eserviceflow \
  --instance=rcprintshoppe-db

# Create database user
gcloud sql users create appuser \
  --instance=rcprintshoppe-db \
  --password=YourAppUserPassword123!
```

**Replace `YourAppUserPassword123!` with another strong password and SAVE IT!**

**Save these details:**
```
Database Instance: rcprintshoppe-db
Database Name: eserviceflow
Database User: appuser
Database Password: YourAppUserPassword123!
Connection Name: rcprintshoppe-480111:asia-southeast1:rcprintshoppe-db
```

### Step 2.3: Create Artifact Registry

This stores your Docker images.

```bash
gcloud artifacts repositories create e-serviceflow-repo \
  --repository-format=docker \
  --location=asia-southeast1 \
  --description="Docker images for e-serviceflow"
```

### Step 2.4: Create Service Account for CI/CD

This allows GitHub to deploy to your GCP project.

```bash
# Create service account
gcloud iam service-accounts create github-deployer \
  --display-name="GitHub Actions Deployer"

# Grant necessary permissions
gcloud projects add-iam-policy-binding rcprintshoppe-480111 \
  --member="serviceAccount:github-deployer@rcprintshoppe-480111.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding rcprintshoppe-480111 \
  --member="serviceAccount:github-deployer@rcprintshoppe-480111.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding rcprintshoppe-480111 \
  --member="serviceAccount:github-deployer@rcprintshoppe-480111.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding rcprintshoppe-480111 \
  --member="serviceAccount:github-deployer@rcprintshoppe-480111.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"

gcloud projects add-iam-policy-binding rcprintshoppe-480111 \
  --member="serviceAccount:github-deployer@rcprintshoppe-480111.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding rcprintshoppe-480111 \
  --member="serviceAccount:github-deployer@rcprintshoppe-480111.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

```bash
# Create and download key file (VERY IMPORTANT!)
gcloud iam service-accounts keys create github-key.json \
  --iam-account=github-deployer@rcprintshoppe-480111.iam.gserviceaccount.com
```

**📥 This downloads `github-key.json` to your current folder. KEEP THIS FILE SAFE!**

---

## Part 3: Setup GitHub Actions CI/CD

### Step 3.1: Create Required Files

Navigate to your project folder and create these files:

#### File 1: `.github/workflows/deploy-staging.yml`

Create the folder structure first:
```bash
mkdir -p .github/workflows
```

Then create the file `.github/workflows/deploy-staging.yml` with this content:

```yaml
name: Deploy to GCP (Staging)

on:
  push:
    branches:
      - staging

env:
  PROJECT_ID: rcprintshoppe-480111
  REGION: asia-southeast1
  APP_SERVICE_NAME: e-serviceflow-app
  SOKETI_SERVICE_NAME: e-serviceflow-soketi
  REPOSITORY: e-serviceflow-repo

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Configure Docker for Artifact Registry
        run: |
          gcloud auth configure-docker asia-southeast1-docker.pkg.dev

      - name: Get Soketi Service URL (or use default if not exists)
        id: get-soketi-url
        run: |
          SOKETI_URL=$(gcloud run services describe ${{ env.SOKETI_SERVICE_NAME }} \
            --region=${{ env.REGION }} \
            --format='value(status.url)' 2>/dev/null || echo "")
          
          if [ -z "$SOKETI_URL" ]; then
            echo "SOKETI_HOST=e-serviceflow-soketi-temp.run.app" >> $GITHUB_OUTPUT
          else
            # Remove https:// prefix
            SOKETI_HOST=$(echo $SOKETI_URL | sed 's|https://||')
            echo "SOKETI_HOST=$SOKETI_HOST" >> $GITHUB_OUTPUT
          fi

      - name: Build and Push Laravel App Image
        run: |
          docker build \
            -f Dockerfile.app \
            --build-arg VITE_PUSHER_APP_KEY=${{ secrets.PUSHER_APP_KEY }} \
            --build-arg VITE_PUSHER_HOST=${{ steps.get-soketi-url.outputs.SOKETI_HOST }} \
            --build-arg VITE_PUSHER_PORT=443 \
            --build-arg VITE_PUSHER_SCHEME=https \
            --build-arg VITE_PUSHER_APP_CLUSTER=mt1 \
            -t asia-southeast1-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/${{ env.APP_SERVICE_NAME }}:${{ github.sha }} \
            -t asia-southeast1-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/${{ env.APP_SERVICE_NAME }}:latest \
            .
          
          docker push asia-southeast1-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/${{ env.APP_SERVICE_NAME }}:${{ github.sha }}
          docker push asia-southeast1-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/${{ env.APP_SERVICE_NAME }}:latest

      - name: Build and Push Soketi Image
        run: |
          docker build \
            -f Dockerfile.soketi \
            -t asia-southeast1-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/${{ env.SOKETI_SERVICE_NAME }}:${{ github.sha }} \
            -t asia-southeast1-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/${{ env.SOKETI_SERVICE_NAME }}:latest \
            .
          
          docker push asia-southeast1-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/${{ env.SOKETI_SERVICE_NAME }}:${{ github.sha }}
          docker push asia-southeast1-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/${{ env.SOKETI_SERVICE_NAME }}:latest

      - name: Deploy Soketi to Cloud Run
        run: |
          gcloud run deploy ${{ env.SOKETI_SERVICE_NAME }} \
            --image=asia-southeast1-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/${{ env.SOKETI_SERVICE_NAME }}:${{ github.sha }} \
            --region=${{ env.REGION }} \
            --platform=managed \
            --allow-unauthenticated \
            --port=8080 \
            --memory=512Mi \
            --cpu=1 \
            --min-instances=0 \
            --max-instances=2 \
            --set-env-vars="SOKETI_DEFAULT_APP_ID=${{ secrets.PUSHER_APP_ID }},SOKETI_DEFAULT_APP_KEY=${{ secrets.PUSHER_APP_KEY }},SOKETI_DEFAULT_APP_SECRET=${{ secrets.PUSHER_APP_SECRET }}"

      - name: Get Actual Soketi URL
        id: soketi-url
        run: |
          SOKETI_URL=$(gcloud run services describe ${{ env.SOKETI_SERVICE_NAME }} \
            --region=${{ env.REGION }} \
            --format='value(status.url)')
          SOKETI_HOST=$(echo $SOKETI_URL | sed 's|https://||')
          echo "SOKETI_HOST=$SOKETI_HOST" >> $GITHUB_OUTPUT
          echo "Soketi deployed at: $SOKETI_URL"

      - name: Deploy Laravel App to Cloud Run
        run: |
          gcloud run deploy ${{ env.APP_SERVICE_NAME }} \
            --image=asia-southeast1-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/${{ env.APP_SERVICE_NAME }}:${{ github.sha }} \
            --region=${{ env.REGION }} \
            --platform=managed \
            --allow-unauthenticated \
            --port=8080 \
            --memory=512Mi \
            --cpu=1 \
            --min-instances=0 \
            --max-instances=5 \
            --set-cloudsql-instances=${{ secrets.DB_INSTANCE_CONNECTION_NAME }} \
            --set-env-vars="APP_ENV=staging,APP_DEBUG=false,APP_KEY=${{ secrets.APP_KEY }},APP_URL=${{ secrets.APP_URL }},DB_CONNECTION=mysql,DB_HOST=localhost,DB_PORT=3306,DB_DATABASE=${{ secrets.DB_DATABASE }},DB_USERNAME=${{ secrets.DB_USERNAME }},DB_PASSWORD=${{ secrets.DB_PASSWORD }},DB_SOCKET=/cloudsql/${{ secrets.DB_INSTANCE_CONNECTION_NAME }},BROADCAST_DRIVER=pusher,CACHE_DRIVER=file,QUEUE_CONNECTION=database,SESSION_DRIVER=file,FILESYSTEM_DISK=gcs,GOOGLE_CLOUD_PROJECT_ID=${{ env.PROJECT_ID }},GOOGLE_CLOUD_STORAGE_BUCKET=${{ secrets.GCS_BUCKET }},PUSHER_APP_ID=${{ secrets.PUSHER_APP_ID }},PUSHER_APP_KEY=${{ secrets.PUSHER_APP_KEY }},PUSHER_APP_SECRET=${{ secrets.PUSHER_APP_SECRET }},PUSHER_HOST=${{ steps.soketi-url.outputs.SOKETI_HOST }},PUSHER_PORT=443,PUSHER_SCHEME=https,PUSHER_APP_CLUSTER=mt1"

      - name: Output URLs
        run: |
          echo "🚀 Deployment Complete!"
          echo "----------------------------------------"
          echo "Laravel App URL:"
          gcloud run services describe ${{ env.APP_SERVICE_NAME }} --region=${{ env.REGION }} --format='value(status.url)'
          echo ""
          echo "Soketi WebSocket URL:"
          gcloud run services describe ${{ env.SOKETI_SERVICE_NAME }} --region=${{ env.REGION }} --format='value(status.url)'
```

#### File 2: Update `Dockerfile.production` (or create if empty)

Create/update your `Dockerfile.production`:

```dockerfile
# Production Dockerfile - Simple build
FROM php:8.2-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git curl unzip libzip-dev libonig-dev libpng-dev libjpeg-dev \
    libxml2-dev nginx supervisor ca-certificates libicu-dev \
    && docker-php-ext-configure gd --with-jpeg \
    && docker-php-ext-install pdo_mysql mbstring zip exif pcntl bcmath gd intl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy application files
COPY . .

# Install PHP dependencies
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

# Set permissions
RUN chown -R www-data:www-data storage bootstrap/cache

EXPOSE 8080

CMD ["php-fpm"]
```

#### File 3: Create `.nginx.conf`

Create a file named `.nginx.conf` in your project root:

```nginx
server {
    listen 8080;
    server_name _;
    root /var/www/html/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

### Step 3.2: Setup GitHub Secrets

Now we need to add secrets to GitHub so the CI/CD can access your GCP resources.

**Go to your GitHub repository:**

1. Click **Settings** (top menu)
2. Click **Secrets and variables** → **Actions** (left sidebar)
3. Click **New repository secret**

**Add these secrets one by one:**

| Secret Name | Value | Where to get it |
|------------|-------|-----------------|
| `GCP_SA_KEY` | Content of `github-key.json` file | Open `github-key.json`, copy everything |
| `APP_KEY` | Your Laravel app key | Run: `php artisan key:generate --show` |
| `APP_URL` | Your app URL | Leave as `https://e-serviceflow-app-xxxxx.a.run.app` (we'll update later) |
| `DB_INSTANCE_CONNECTION_NAME` | `rcprintshoppe-480111:asia-southeast1:rcprintshoppe-db` | From Step 2.2 |
| `DB_DATABASE` | `eserviceflow` | From Step 2.2 |
| `DB_USERNAME` | `appuser` | From Step 2.2 |
| `DB_PASSWORD` | Your database password | From Step 2.2 |
| `GCS_BUCKET` | `rcprintshoppe-files` | From Step 2.1 |
| `PUSHER_APP_ID` | `e-serviceflow` | Any name you want |
| `PUSHER_APP_KEY` | `staging-key-12345` | Generate a random string |
| `PUSHER_APP_SECRET` | `staging-secret-67890` | Generate a random string |

**Tips for generating PUSHER keys:**
- Use random strings, like: `sk-prod-abc123xyz789`
- Or run: `openssl rand -base64 32` in terminal

---

## Part 4: Deploy Application

### Step 4.1: Create `.gitignore` Updates

Make sure these are in your `.gitignore`:

```
github-key.json
*.key
*.pem
.env
```

### Step 4.2: Commit and Push to Staging Branch

```bash
# Make sure you're in your project directory
cd /path/to/your/project

# Add all files
git add .

# Commit
git commit -m "Setup GCP deployment with CI/CD"

# Create staging branch if it doesn't exist
git checkout -b staging

# Push to GitHub
git push origin staging
```

### Step 4.3: Watch the Deployment

**On GitHub:**
1. Go to your repository
2. Click **Actions** tab
3. You should see "Deploy to GCP (Staging)" running
4. Click on it to watch the progress

**This will take 10-15 minutes** for the first deployment.

### Step 4.4: Get Your Application URLs

Once deployment is complete, get your URLs:

```bash
# Get Laravel App URL
gcloud run services describe e-serviceflow-app \
  --region=asia-southeast1 \
  --format='value(status.url)'

# Get Soketi WebSocket URL
gcloud run services describe e-serviceflow-soketi \
  --region=asia-southeast1 \
  --format='value(status.url)'
```

**Save these URLs!**

Example:
```
Laravel App: https://e-serviceflow-app-xxxxx.a.run.app
Soketi: https://e-serviceflow-soketi-xxxxx.a.run.app
```

### Step 4.5: Update APP_URL Secret

Now that you have your actual URL:

1. Go to GitHub → Your Repo → **Settings** → **Secrets and variables** → **Actions**
2. Click on `APP_URL` secret
3. Update value to your actual Laravel App URL
4. Save

### Step 4.6: Redeploy (Optional)

To apply the APP_URL change:

```bash
# Make a small change to trigger redeployment
git commit --allow-empty -m "Update APP_URL"
git push origin staging
```

---

## Part 5: Verify & Test

### Step 5.1: Visit Your Application

Open your Laravel App URL in a browser:
```
https://e-serviceflow-app-xxxxx.a.run.app
```

You should see your application!

### Step 5.2: Test WebSocket Connection

Open browser console (F12) and check for:
```
Pusher: Connected
```

### Step 5.3: Test File Upload

Try uploading a file in your app. Check Cloud Storage:

```bash
gsutil ls gs://rcprintshoppe-files/
```

You should see your uploaded files!

### Step 5.4: Check Database

You can connect to your Cloud SQL database using Cloud Shell:

```bash
gcloud sql connect rcprintshoppe-db --user=appuser
```

Enter your database password when prompted.

```sql
USE eserviceflow;
SHOW TABLES;
```

---

## Part 6: Cost Management

### Understanding Costs

**Monthly Estimated Costs (Singapore Region):**

| Service | Configuration | Estimated Cost |
|---------|--------------|----------------|
| Cloud SQL (db-f1-micro) | MySQL 8.0, 10GB HDD | ~$10-12/month |
| Cloud Run (App) | 512Mi RAM, minimal traffic | ~$5-10/month |
| Cloud Run (Soketi) | 512Mi RAM, minimal traffic | ~$3-5/month |
| Cloud Storage | 10GB storage, low traffic | ~$0.50-1/month |
| Networking | Moderate traffic | ~$2-5/month |
| **TOTAL** | | **~$20-33/month** |

**For 2 months:** ~$40-66

**Good news! You have $300 free credits,** so you're well within budget!

### Cost-Saving Tips

#### 1. Scale Down When Not Testing

```bash
# Pause Cloud SQL when not in use
gcloud sql instances patch rcprintshoppe-db --activation-policy=NEVER

# Resume when needed
gcloud sql instances patch rcprintshoppe-db --activation-policy=ALWAYS
```

#### 2. Set Budget Alerts

Go to: https://console.cloud.google.com/billing/budgets

1. Click **Create Budget**
2. Set amount: $100/month
3. Set alerts at: 50%, 75%, 90%, 100%
4. Enter your email

#### 3. Monitor Usage

```bash
# Check current costs
gcloud billing accounts list
```

Or visit: https://console.cloud.google.com/billing

#### 4. Delete Resources After Testing

When you're done testing (after 2 months):

```bash
# Delete Cloud Run services
gcloud run services delete e-serviceflow-app --region=asia-southeast1
gcloud run services delete e-serviceflow-soketi --region=asia-southeast1

# Delete Cloud SQL
gcloud sql instances delete rcprintshoppe-db

# Delete bucket (WARNING: deletes all files!)
gsutil rm -r gs://rcprintshoppe-files/

# Delete artifact registry
gcloud artifacts repositories delete e-serviceflow-repo --location=asia-southeast1
```

---

## Troubleshooting

### Problem: "Permission denied" during deployment

**Solution:**
```bash
# Re-authenticate
gcloud auth login
gcloud config set project rcprintshoppe-480111
```

### Problem: "Cannot connect to Cloud SQL"

**Solution:**
1. Check if Cloud SQL instance is running:
   ```bash
   gcloud sql instances describe rcprintshoppe-db
   ```
2. Verify DB credentials in GitHub Secrets
3. Check Cloud Run logs:
   ```bash
   gcloud run services logs read e-serviceflow-app --region=asia-southeast1 --limit=50
   ```

### Problem: "WebSocket connection failed"

**Solution:**
1. Check Soketi is running:
   ```bash
   gcloud run services describe e-serviceflow-soketi --region=asia-southeast1
   ```
2. Verify PUSHER credentials match in both services
3. Check browser console for error messages

### Problem: "File upload fails"

**Solution:**
1. Check bucket exists:
   ```bash
   gsutil ls gs://rcprintshoppe-files/
   ```
2. Verify `GOOGLE_CLOUD_STORAGE_BUCKET` env var in Cloud Run
3. Check Laravel logs

### Problem: GitHub Actions fails

**Solution:**
1. Check if `GCP_SA_KEY` secret is correctly set
2. Verify all required secrets are present
3. Check Actions logs for specific error
4. Ensure all APIs are enabled (Step 1.4)

### Problem: "502 Bad Gateway"

**Solution:**
1. Check Cloud Run logs:
   ```bash
   gcloud run services logs read e-serviceflow-app --region=asia-southeast1 --limit=50
   ```
2. Common causes:
   - App crashed during startup
   - Migrations failed
   - Port mismatch (should be 8080)

### Viewing Logs

```bash
# Laravel App logs
gcloud run services logs read e-serviceflow-app \
  --region=asia-southeast1 \
  --limit=100

# Soketi logs
gcloud run services logs read e-serviceflow-soketi \
  --region=asia-southeast1 \
  --limit=100

# Follow logs in real-time
gcloud run services logs tail e-serviceflow-app --region=asia-southeast1
```

---

## Making Changes & Redeploying

Whenever you make code changes:

```bash
# Commit your changes
git add .
git commit -m "Your change description"

# Push to staging branch
git push origin staging
```

GitHub Actions will **automatically:**
1. Build new Docker images
2. Push to Artifact Registry
3. Deploy to Cloud Run

**No manual deployment needed!** 🎉

---

## Useful Commands Cheat Sheet

```bash
# Check what's running
gcloud run services list --region=asia-southeast1

# View Cloud SQL instances
gcloud sql instances list

# Check storage usage
gsutil du -sh gs://rcprintshoppe-files/

# Get app URL
gcloud run services describe e-serviceflow-app --region=asia-southeast1 --format='value(status.url)'

# Update Cloud Run environment variables
gcloud run services update e-serviceflow-app \
  --region=asia-southeast1 \
  --update-env-vars="APP_DEBUG=true"

# Check project billing
gcloud beta billing accounts list

# View all resources in project
gcloud asset search-all-resources --scope='projects/rcprintshoppe-480111'
```

---

## Next Steps After Deployment

### 1. Setup Custom Domain (Optional)

1. Go to Cloud Run → Select your service
2. Click "Manage Custom Domains"
3. Follow the wizard
4. Add DNS records to your domain provider

### 2. Setup SSL (Automatic with Cloud Run!)

Cloud Run automatically provides SSL certificates. Nothing to do! ✅

### 3. Setup Monitoring

1. Go to: https://console.cloud.google.com/monitoring
2. Create dashboards for:
   - Cloud Run requests
   - Database connections
   - Error rates

### 4. Setup Automated Backups

```bash
# Cloud SQL automatic backups (already enabled)
gcloud sql instances patch rcprintshoppe-db \
  --backup-start-time=02:00 \
  --enable-bin-log
```

---

## Support & Resources

**Google Cloud Documentation:**
- Cloud Run: https://cloud.google.com/run/docs
- Cloud SQL: https://cloud.google.com/sql/docs
- Cloud Storage: https://cloud.google.com/storage/docs

**Community:**
- Google Cloud Slack: https://gcp-community.slack.com
- Stack Overflow: https://stackoverflow.com/questions/tagged/google-cloud-platform

**Your Project Console:**
- Direct link: https://console.cloud.google.com/home/dashboard?project=rcprintshoppe-480111

---

## Checklist

Use this to track your progress:

- [ ] Google Cloud SDK installed
- [ ] gcloud CLI initialized
- [ ] All APIs enabled
- [ ] Cloud Storage bucket created
- [ ] Cloud SQL database created
- [ ] Artifact Registry created
- [ ] Service account created
- [ ] GitHub secrets configured
- [ ] GitHub Actions workflow created
- [ ] Nginx config created
- [ ] First deployment successful
- [ ] Application accessible via URL
- [ ] WebSocket working
- [ ] File upload working
- [ ] Database connected
- [ ] Budget alerts configured

---

**Congratulations! 🎉** 

You've successfully deployed your Laravel application to Google Cloud Platform with:
- ✅ Auto-scaling Cloud Run containers
- ✅ Managed MySQL database
- ✅ Cloud Storage for files
- ✅ WebSocket support with Soketi
- ✅ Automated CI/CD from GitHub
- ✅ Singapore region (low latency)
- ✅ Within budget (~$20-33/month)

**Last Updated:** December 3, 2025  
**Author:** For rcprintshoppe-480111 project  
**Region:** asia-southeast1 (Singapore)

