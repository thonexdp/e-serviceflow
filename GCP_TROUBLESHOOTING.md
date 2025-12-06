# GCP Deployment Troubleshooting Guide

**Project:** rcprintshoppe-480111  
**Region:** asia-southeast1 (Singapore)

This guide helps you solve common deployment problems.

---

## 🔴 Common Problems & Solutions

### 1. GitHub Actions Fails to Deploy

#### Problem: "Permission denied" or "Unauthorized"

**Symptoms:**
```
Error: Authenticating to Google Cloud failed
or
Error: Permission denied on project
```

**Solution:**

1. Check if `GCP_SA_KEY` secret is correctly set:
   ```bash
   # Go to GitHub → Settings → Secrets → Actions
   # Verify GCP_SA_KEY exists and is valid JSON
   ```

2. Re-create service account key:
   ```bash
   cd /path/to/your/project
   
   # Delete old key
   rm github-key.json
   
   # Create new key
   gcloud iam service-accounts keys create github-key.json \
     --iam-account=github-deployer@rcprintshoppe-480111.iam.gserviceaccount.com
   
   # Copy content to GitHub secret
   # Mac/Linux:
   cat github-key.json | pbcopy
   # Windows:
   type github-key.json | clip
   ```

3. Update GitHub secret with new key content

#### Problem: "API not enabled"

**Symptoms:**
```
Error: Cloud Run API has not been used
or
Error: artifactregistry.googleapis.com is not enabled
```

**Solution:**
```bash
# Enable all required APIs
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  storage-api.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  compute.googleapis.com

# Wait 2-3 minutes, then retry deployment
```

#### Problem: Build timeout

**Symptoms:**
```
Error: Build timed out
or
Error: Exceeded build time limit
```

**Solution:**

Edit `.github/workflows/deploy-staging.yml`, add timeout:
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 30  # Add this line
```

---

### 2. Cloud Run Service Won't Start

#### Problem: "502 Bad Gateway"

**Symptoms:**
- Page shows "502 Bad Gateway"
- Service keeps restarting
- Health checks fail

**Solution 1: Check logs**
```bash
# View logs
gcloud run services logs read e-serviceflow-app \
  --region=asia-southeast1 \
  --limit=100

# Look for errors like:
# - "port 8080 not found"
# - "PHP Fatal error"
# - "Database connection failed"
```

**Solution 2: Check port configuration**

Verify `Dockerfile.app` has:
```dockerfile
EXPOSE 8080
```

And startup command binds to port 8080.

**Solution 3: Check health endpoint**
```bash
# Test locally
curl https://your-service-url.run.app/

# Should return 200 OK
```

#### Problem: "Container failed to start"

**Symptoms:**
```
Error: Container failed to start. Failed to start and then listen on the port defined by the PORT environment variable
```

**Solution:**

1. Check if nginx/supervisor is starting:
   ```bash
   gcloud run services logs read e-serviceflow-app \
     --region=asia-southeast1 \
     --limit=50 \
     | grep -i "error"
   ```

2. Test Docker image locally:
   ```bash
   docker build -f Dockerfile.app -t test-app .
   docker run -p 8080:8080 test-app
   
   # In another terminal:
   curl http://localhost:8080
   ```

3. Common fixes:
   - Ensure supervisor starts both nginx and php-fpm
   - Verify nginx listens on port 8080, not 80
   - Check file permissions on storage/ and bootstrap/cache/

---

### 3. Database Connection Issues

#### Problem: "Cannot connect to database"

**Symptoms:**
```
SQLSTATE[HY000] [2002] Connection refused
or
SQLSTATE[HY000] [2002] No such file or directory
```

**Solution 1: Verify Cloud SQL instance is running**
```bash
gcloud sql instances describe rcprintshoppe-db

# Check state: should be "RUNNABLE"
```

**Solution 2: Check environment variables**
```bash
gcloud run services describe e-serviceflow-app \
  --region=asia-southeast1 \
  --format='value(spec.template.spec.containers[0].env)'

# Verify these exist:
# - DB_SOCKET=/cloudsql/rcprintshoppe-480111:asia-southeast1:rcprintshoppe-db
# - DB_CONNECTION=mysql
# - DB_DATABASE=eserviceflow
# - DB_USERNAME=appuser
# - DB_PASSWORD=xxx
```

**Solution 3: Check Cloud SQL connection**
```bash
# Cloud Run must have Cloud SQL connection configured
gcloud run services describe e-serviceflow-app \
  --region=asia-southeast1 \
  --format='value(spec.template.spec.containers[0].cloudsqlInstances)'

# Should show: rcprintshoppe-480111:asia-southeast1:rcprintshoppe-db
```

**Solution 4: Test database connection manually**
```bash
# Connect via Cloud SQL Proxy
gcloud sql connect rcprintshoppe-db --user=appuser

# Enter password when prompted
# Try to select database:
USE eserviceflow;
SHOW TABLES;
```

**Solution 5: Check Laravel config**

In `config/database.php`, ensure:
```php
'mysql' => [
    'driver' => 'mysql',
    'host' => env('DB_HOST', '127.0.0.1'),
    'port' => env('DB_PORT', '3306'),
    'database' => env('DB_DATABASE', 'forge'),
    'username' => env('DB_USERNAME', 'forge'),
    'password' => env('DB_PASSWORD', ''),
    'unix_socket' => env('DB_SOCKET', ''),  // Important for Cloud SQL
    // ...
],
```

#### Problem: "Too many connections"

**Symptoms:**
```
SQLSTATE[HY000] [1040] Too many connections
```

**Solution:**
```bash
# Increase max connections
gcloud sql instances patch rcprintshoppe-db \
  --database-flags max_connections=100

# Or reduce Cloud Run max instances
gcloud run services update e-serviceflow-app \
  --region=asia-southeast1 \
  --max-instances=3
```

---

### 4. File Upload / Storage Issues

#### Problem: "Failed to write file"

**Symptoms:**
```
Error: Unable to write file to disk
or
Error: Storage is not writable
```

**Solution 1: Check permissions**

In `Dockerfile.app`:
```dockerfile
RUN chown -R www-data:www-data \
    /var/www/html/storage \
    /var/www/html/bootstrap/cache
```

**Solution 2: Use Cloud Storage (GCS)**

Update `.env`:
```env
FILESYSTEM_DISK=gcs
GOOGLE_CLOUD_PROJECT_ID=rcprintshoppe-480111
GOOGLE_CLOUD_STORAGE_BUCKET=rcprintshoppe-files
```

#### Problem: "Access denied" when uploading to GCS

**Symptoms:**
```
Error: Access denied to Cloud Storage bucket
```

**Solution:**

1. Check bucket exists:
   ```bash
   gsutil ls gs://rcprintshoppe-files/
   ```

2. Check permissions:
   ```bash
   # Cloud Run service account needs access
   gsutil iam ch \
     serviceAccount:$(gcloud projects describe rcprintshoppe-480111 --format='value(projectNumber)')-compute@developer.gserviceaccount.com:objectAdmin \
     gs://rcprintshoppe-files
   ```

3. Verify env vars:
   ```bash
   gcloud run services describe e-serviceflow-app \
     --region=asia-southeast1 \
     | grep -A 5 "GOOGLE_CLOUD"
   ```

#### Problem: Files upload but can't be accessed

**Symptoms:**
- Upload succeeds
- URL returns 403 Forbidden

**Solution:**

Make bucket public:
```bash
# Make bucket publicly readable
gsutil iam ch allUsers:objectViewer gs://rcprintshoppe-files/

# Or set public ACL per file
gsutil acl ch -u AllUsers:R gs://rcprintshoppe-files/**
```

---

### 5. WebSocket / Soketi Issues

#### Problem: "WebSocket connection failed"

**Symptoms:**
```javascript
// Browser console:
WebSocket connection to 'wss://...' failed
Pusher : Error : {"type":"WebSocketError"}
```

**Solution 1: Verify Soketi is running**
```bash
# Check Soketi service
gcloud run services describe e-serviceflow-soketi \
  --region=asia-southeast1

# Get URL
gcloud run services describe e-serviceflow-soketi \
  --region=asia-southeast1 \
  --format='value(status.url)'

# Test endpoint
curl https://e-serviceflow-soketi-xxxxx.a.run.app/
# Should return: OK
```

**Solution 2: Check Pusher configuration**

Browser console:
```javascript
// Check these match
console.log({
  key: import.meta.env.VITE_PUSHER_APP_KEY,
  host: import.meta.env.VITE_PUSHER_HOST,
  port: import.meta.env.VITE_PUSHER_PORT,
  scheme: import.meta.env.VITE_PUSHER_SCHEME
});
```

**Solution 3: Verify CORS**

Soketi logs should show successful connections:
```bash
gcloud run services logs read e-serviceflow-soketi \
  --region=asia-southeast1 \
  --limit=50
```

**Solution 4: Check environment variables match**

Laravel backend:
```bash
gcloud run services describe e-serviceflow-app \
  --region=asia-southeast1 \
  | grep PUSHER
```

Soketi:
```bash
gcloud run services describe e-serviceflow-soketi \
  --region=asia-southeast1 \
  | grep SOKETI
```

Keys must match!

#### Problem: WebSocket connects but events don't arrive

**Symptoms:**
- Connection shows as "connected"
- Events not received in frontend

**Solution:**

1. Check Laravel broadcasting config:
   ```php
   // config/broadcasting.php
   'pusher' => [
       'driver' => 'pusher',
       'key' => env('PUSHER_APP_KEY'),
       'secret' => env('PUSHER_APP_SECRET'),
       'app_id' => env('PUSHER_APP_ID'),
       'options' => [
           'host' => env('PUSHER_HOST'),
           'port' => env('PUSHER_PORT', 443),
           'scheme' => env('PUSHER_SCHEME', 'https'),
           'encrypted' => true,
           'useTLS' => env('PUSHER_SCHEME') === 'https',
       ],
   ],
   ```

2. Check event is being broadcast:
   ```bash
   # Laravel logs
   gcloud run services logs read e-serviceflow-app \
     --region=asia-southeast1 \
     | grep -i "broadcast"
   ```

3. Test broadcasting manually:
   ```bash
   # SSH into container or use Cloud Shell
   php artisan tinker
   
   # Broadcast test event
   broadcast(new \App\Events\TestEvent());
   ```

---

### 6. Build / Docker Issues

#### Problem: "npm install fails"

**Symptoms:**
```
Error: npm ERR! network timeout
or
Error: gyp ERR! build error
```

**Solution:**

In `Dockerfile.app`, add retries:
```dockerfile
RUN npm ci --legacy-peer-deps || npm ci --legacy-peer-deps || npm install
```

#### Problem: "Composer install fails"

**Symptoms:**
```
Error: Your requirements could not be resolved
```

**Solution:**

1. Delete composer.lock locally and regenerate:
   ```bash
   rm composer.lock
   composer install
   git add composer.lock
   git commit -m "Update composer.lock"
   ```

2. Or use platform flag:
   ```dockerfile
   RUN composer install --no-dev --no-interaction --ignore-platform-reqs
   ```

#### Problem: "Out of memory during build"

**Symptoms:**
```
Error: JavaScript heap out of memory
or
Killed
```

**Solution:**

Increase Node memory in `Dockerfile.app`:
```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build
```

---

### 7. Performance Issues

#### Problem: "App is slow"

**Solution 1: Enable caching**
```bash
# Add to your start script in Dockerfile
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

**Solution 2: Increase resources**
```bash
gcloud run services update e-serviceflow-app \
  --region=asia-southeast1 \
  --memory=1Gi \
  --cpu=2
```

**Solution 3: Keep instance warm**
```bash
# Set minimum instances
gcloud run services update e-serviceflow-app \
  --region=asia-southeast1 \
  --min-instances=1
```

**Note:** Keeping 1 instance warm costs ~$10-15/month extra

#### Problem: "Cold start takes too long"

**Solution:**

1. Optimize Docker image size:
   ```dockerfile
   # Use alpine images
   FROM php:8.2-fpm-alpine
   
   # Multi-stage build
   # Remove dev dependencies
   RUN composer install --no-dev
   ```

2. Use Cloud Run minimum instances:
   ```bash
   gcloud run services update e-serviceflow-app \
     --region=asia-southeast1 \
     --min-instances=1
   ```

---

### 8. GitHub Secrets Issues

#### Problem: Can't find GitHub Secrets

**Solution:**

Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`

Required secrets:
- `GCP_SA_KEY`
- `APP_KEY`
- `APP_URL`
- `DB_INSTANCE_CONNECTION_NAME`
- `DB_DATABASE`
- `DB_USERNAME`
- `DB_PASSWORD`
- `GCS_BUCKET`
- `PUSHER_APP_ID`
- `PUSHER_APP_KEY`
- `PUSHER_APP_SECRET`

#### Problem: "Secret not found" in workflow

**Symptoms:**
```
Error: Secret 'PUSHER_APP_KEY' not found
```

**Solution:**

Ensure secret name in workflow matches GitHub:
```yaml
# In .github/workflows/deploy-staging.yml
--build-arg VITE_PUSHER_APP_KEY=${{ secrets.PUSHER_APP_KEY }}
#                                              ^^^^^^^^^^^^^^
#                                              Must match secret name in GitHub
```

---

### 9. Migration Issues

#### Problem: "Migrations don't run"

**Solution:**

Migrations run automatically on startup in `Dockerfile.app`:
```dockerfile
RUN echo '#!/bin/bash\n\
php artisan migrate --force\n\
exec supervisord -n' > /start.sh && chmod +x /start.sh
```

Or run manually:
```bash
# Create migration job
gcloud run jobs create migrate-db \
  --image=asia-southeast1-docker.pkg.dev/rcprintshoppe-480111/e-serviceflow-repo/e-serviceflow-app:latest \
  --region=asia-southeast1 \
  --command=php \
  --args=artisan,migrate,--force \
  --set-cloudsql-instances=rcprintshoppe-480111:asia-southeast1:rcprintshoppe-db \
  --set-env-vars="DB_SOCKET=/cloudsql/rcprintshoppe-480111:asia-southeast1:rcprintshoppe-db,DB_DATABASE=eserviceflow,DB_USERNAME=appuser,DB_PASSWORD=YOUR_PASSWORD"

# Run it
gcloud run jobs execute migrate-db --region=asia-southeast1
```

---

## 🛠️ General Debugging Steps

### 1. Check All Logs
```bash
# Application logs
gcloud run services logs read e-serviceflow-app --region=asia-southeast1 --limit=100

# Soketi logs
gcloud run services logs read e-serviceflow-soketi --region=asia-southeast1 --limit=100

# Cloud Build logs
gcloud builds list --limit=5
gcloud builds log BUILD_ID
```

### 2. Verify All Environment Variables
```bash
# List all env vars
gcloud run services describe e-serviceflow-app \
  --region=asia-southeast1 \
  --format='value(spec.template.spec.containers[0].env)'
```

### 3. Test Service Locally
```bash
# Build and test Docker image
docker build -f Dockerfile.app -t test-app .
docker run -p 8080:8080 -e APP_KEY=base64:xxx test-app

# Access at http://localhost:8080
```

### 4. Check Service Status
```bash
# Service status
gcloud run services describe e-serviceflow-app --region=asia-southeast1

# Recent revisions
gcloud run revisions list \
  --service=e-serviceflow-app \
  --region=asia-southeast1
```

### 5. Compare Working vs Broken
```bash
# List all revisions
gcloud run revisions list \
  --service=e-serviceflow-app \
  --region=asia-southeast1

# Compare two revisions
gcloud run revisions describe REVISION_1 --region=asia-southeast1 > rev1.txt
gcloud run revisions describe REVISION_2 --region=asia-southeast1 > rev2.txt
diff rev1.txt rev2.txt
```

---

## 🆘 Emergency Fixes

### Rollback to Previous Version
```bash
# List revisions
gcloud run revisions list \
  --service=e-serviceflow-app \
  --region=asia-southeast1

# Rollback
gcloud run services update-traffic e-serviceflow-app \
  --region=asia-southeast1 \
  --to-revisions=PREVIOUS_REVISION=100
```

### Force Restart Service
```bash
gcloud run services update e-serviceflow-app \
  --region=asia-southeast1 \
  --update-env-vars="RESTART=$(date +%s)"
```

### Delete and Recreate Service
```bash
# Export current config first!
gcloud run services describe e-serviceflow-app \
  --region=asia-southeast1 > service-backup.yaml

# Delete
gcloud run services delete e-serviceflow-app \
  --region=asia-southeast1

# Redeploy via GitHub Actions
git commit --allow-empty -m "Redeploy"
git push origin staging
```

---

## 📞 Get Help

### Check Official Docs
- Cloud Run: https://cloud.google.com/run/docs/troubleshooting
- Cloud SQL: https://cloud.google.com/sql/docs/mysql/troubleshooting
- Cloud Storage: https://cloud.google.com/storage/docs/troubleshooting

### Community Support
- Stack Overflow: https://stackoverflow.com/questions/tagged/google-cloud-run
- Google Cloud Slack: https://gcp-community.slack.com

### Contact Support
If you have billing enabled, you get basic support:
- Go to: https://console.cloud.google.com/support
- Create a case

---

## ✅ Troubleshooting Checklist

When something goes wrong, check these in order:

- [ ] Check logs (Cloud Run, Cloud Build, Cloud SQL)
- [ ] Verify all GitHub secrets are set correctly
- [ ] Confirm all GCP APIs are enabled
- [ ] Test service account permissions
- [ ] Check environment variables in Cloud Run
- [ ] Verify database connection
- [ ] Test WebSocket endpoint manually
- [ ] Check Cloud Storage bucket permissions
- [ ] Review recent code changes
- [ ] Test Docker image locally
- [ ] Compare with last working revision
- [ ] Check billing/quotas (if deployment blocked)

---

**Last Updated:** December 3, 2025  
**Project:** rcprintshoppe-480111

