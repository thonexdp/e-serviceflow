# Quick Command Reference for GCP Deployment

**Project:** rcprintshoppe-480111  
**Region:** asia-southeast1 (Singapore)

---

## 🚀 Quick Start Commands

### Initial Setup (One Time Only)
```bash
# Login and set project
gcloud auth login
gcloud config set project rcprintshoppe-480111
gcloud config set run/region asia-southeast1
```

---

## 📦 Deployment Commands

### Automatic Deployment (Recommended)
```bash
# Just push to staging branch
git checkout staging
git add .
git commit -m "Your changes"
git push origin staging

# GitHub Actions will automatically deploy!
```

### Manual Deployment (if needed)
```bash
# Build and deploy Laravel app
gcloud builds submit --config cloudbuild.yaml

# Or deploy directly
gcloud run deploy e-serviceflow-app \
  --source . \
  --region asia-southeast1
```

---

## 🔍 Monitoring & Logs

### View Application Logs
```bash
# Laravel App logs (last 100 lines)
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

### Check Service Status
```bash
# List all Cloud Run services
gcloud run services list --region=asia-southeast1

# Describe specific service
gcloud run services describe e-serviceflow-app --region=asia-southeast1

# Get service URL
gcloud run services describe e-serviceflow-app \
  --region=asia-southeast1 \
  --format='value(status.url)'
```

---

## 🗄️ Database Management

### Connect to Cloud SQL
```bash
# Connect via gcloud
gcloud sql connect rcprintshoppe-db --user=appuser

# Or get connection info
gcloud sql instances describe rcprintshoppe-db
```

### Run Migrations
```bash
# Create and execute migration job
gcloud run jobs create migrate-db \
  --image=asia-southeast1-docker.pkg.dev/rcprintshoppe-480111/e-serviceflow-repo/e-serviceflow-app:latest \
  --region=asia-southeast1 \
  --command=php \
  --args=artisan,migrate,--force \
  --set-cloudsql-instances=rcprintshoppe-480111:asia-southeast1:rcprintshoppe-db \
  --set-env-vars="DB_SOCKET=/cloudsql/rcprintshoppe-480111:asia-southeast1:rcprintshoppe-db,DB_DATABASE=eserviceflow,DB_USERNAME=appuser,DB_PASSWORD=YOUR_PASSWORD"

# Execute the job
gcloud run jobs execute migrate-db --region=asia-southeast1
```

### Database Backup
```bash
# Create on-demand backup
gcloud sql backups create \
  --instance=rcprintshoppe-db

# List backups
gcloud sql backups list \
  --instance=rcprintshoppe-db

# Restore from backup
gcloud sql backups restore BACKUP_ID \
  --backup-instance=rcprintshoppe-db \
  --backup-id=BACKUP_ID
```

---

## 💾 Storage Management

### List Files in Bucket
```bash
# List all files
gsutil ls gs://rcprintshoppe-files/

# List with details
gsutil ls -lh gs://rcprintshoppe-files/

# Check storage usage
gsutil du -sh gs://rcprintshoppe-files/
```

### Upload/Download Files
```bash
# Upload file
gsutil cp localfile.jpg gs://rcprintshoppe-files/

# Download file
gsutil cp gs://rcprintshoppe-files/file.jpg ./

# Sync directory
gsutil rsync -r ./local-dir gs://rcprintshoppe-files/remote-dir
```

---

## ⚙️ Update Environment Variables

### Update Cloud Run Environment Variables
```bash
# Update single variable
gcloud run services update e-serviceflow-app \
  --region=asia-southeast1 \
  --update-env-vars="APP_DEBUG=false"

# Update multiple variables
gcloud run services update e-serviceflow-app \
  --region=asia-southeast1 \
  --update-env-vars="APP_DEBUG=false,LOG_LEVEL=info"

# View current environment variables
gcloud run services describe e-serviceflow-app \
  --region=asia-southeast1 \
  --format='value(spec.template.spec.containers[0].env)'
```

---

## 🔧 Scaling & Performance

### Update Cloud Run Configuration
```bash
# Scale instances
gcloud run services update e-serviceflow-app \
  --region=asia-southeast1 \
  --min-instances=0 \
  --max-instances=10

# Update memory/CPU
gcloud run services update e-serviceflow-app \
  --region=asia-southeast1 \
  --memory=1Gi \
  --cpu=2

# Set timeout
gcloud run services update e-serviceflow-app \
  --region=asia-southeast1 \
  --timeout=300
```

### Scale Database
```bash
# Upgrade database tier
gcloud sql instances patch rcprintshoppe-db \
  --tier=db-g1-small

# Available tiers:
# db-f1-micro (cheapest)
# db-g1-small
# db-n1-standard-1
```

---

## 💰 Cost Management

### Pause Services (Save Money)
```bash
# Pause Cloud SQL (when not testing)
gcloud sql instances patch rcprintshoppe-db \
  --activation-policy=NEVER

# Resume Cloud SQL
gcloud sql instances patch rcprintshoppe-db \
  --activation-policy=ALWAYS

# Scale Cloud Run to zero
gcloud run services update e-serviceflow-app \
  --region=asia-southeast1 \
  --min-instances=0 \
  --max-instances=1
```

### Check Current Costs
```bash
# View billing account
gcloud beta billing accounts list

# View project info
gcloud projects describe rcprintshoppe-480111
```

**Better:** Check costs in the console:  
https://console.cloud.google.com/billing/projects/rcprintshoppe-480111

---

## 🧹 Cleanup Commands

### Delete Everything (After Testing)
```bash
# Delete Cloud Run services
gcloud run services delete e-serviceflow-app --region=asia-southeast1 --quiet
gcloud run services delete e-serviceflow-soketi --region=asia-southeast1 --quiet

# Delete Cloud SQL
gcloud sql instances delete rcprintshoppe-db --quiet

# Delete storage bucket (WARNING: deletes all files!)
gsutil rm -r gs://rcprintshoppe-files/

# Delete artifact registry
gcloud artifacts repositories delete e-serviceflow-repo \
  --location=asia-southeast1 \
  --quiet

# Delete service account
gcloud iam service-accounts delete \
  github-deployer@rcprintshoppe-480111.iam.gserviceaccount.com \
  --quiet
```

---

## 🐛 Troubleshooting Commands

### Check Service Health
```bash
# Test if service is responding
curl -I https://e-serviceflow-app-xxxxx.a.run.app

# Check Cloud Run revisions
gcloud run revisions list \
  --service=e-serviceflow-app \
  --region=asia-southeast1
```

### Debug Build Issues
```bash
# List recent Cloud Build runs
gcloud builds list --limit=10

# View specific build logs
gcloud builds log BUILD_ID

# Cancel stuck build
gcloud builds cancel BUILD_ID
```

### Test Database Connection
```bash
# Connect to database
gcloud sql connect rcprintshoppe-db --user=appuser

# In MySQL shell:
SHOW DATABASES;
USE eserviceflow;
SHOW TABLES;
```

---

## 📊 Useful Information Commands

### Get All Important URLs
```bash
# Laravel App
echo "Laravel App:"
gcloud run services describe e-serviceflow-app \
  --region=asia-southeast1 \
  --format='value(status.url)'

# Soketi WebSocket
echo "Soketi:"
gcloud run services describe e-serviceflow-soketi \
  --region=asia-southeast1 \
  --format='value(status.url)'

# Database connection name
echo "DB Connection:"
gcloud sql instances describe rcprintshoppe-db \
  --format='value(connectionName)'
```

### Check Resource Usage
```bash
# Cloud Run requests (last 24h)
gcloud monitoring time-series list \
  --filter='resource.type="cloud_run_revision"' \
  --format='table(resource.labels.service_name, metric.type)'

# Storage usage
gsutil du -sh gs://rcprintshoppe-files/

# Database size
gcloud sql instances describe rcprintshoppe-db \
  --format='value(currentDiskSize)'
```

---

## 🔐 Security Commands

### Update Database Password
```bash
# Change database user password
gcloud sql users set-password appuser \
  --instance=rcprintshoppe-db \
  --password=NEW_PASSWORD
```

### Restrict Access (Production)
```bash
# Only allow authenticated access to Cloud Run
gcloud run services update e-serviceflow-app \
  --region=asia-southeast1 \
  --no-allow-unauthenticated

# Restrict to specific IPs (via Cloud Armor)
# See: https://cloud.google.com/armor/docs/configure-security-policies
```

---

## 📱 Mobile Commands (Quick Access)

These are short commands for quick checks:

```bash
# Quick status check
gcloud run services list --region=asia-southeast1

# Quick log check
gcloud run services logs read e-serviceflow-app --region=asia-southeast1 --limit=20

# Quick URL
gcloud run services describe e-serviceflow-app --region=asia-southeast1 --format='value(status.url)'
```

---

## 🆘 Emergency Commands

### Rollback to Previous Version
```bash
# List revisions
gcloud run revisions list \
  --service=e-serviceflow-app \
  --region=asia-southeast1

# Rollback to specific revision
gcloud run services update-traffic e-serviceflow-app \
  --region=asia-southeast1 \
  --to-revisions=REVISION_NAME=100
```

### Force Restart Service
```bash
# Update with same config (forces restart)
gcloud run services update e-serviceflow-app \
  --region=asia-southeast1 \
  --update-env-vars="RESTART=$(date +%s)"
```

---

## 📚 Helpful Links

- **Project Console:** https://console.cloud.google.com/home/dashboard?project=rcprintshoppe-480111
- **Cloud Run Console:** https://console.cloud.google.com/run?project=rcprintshoppe-480111
- **Cloud SQL Console:** https://console.cloud.google.com/sql?project=rcprintshoppe-480111
- **Cloud Storage:** https://console.cloud.google.com/storage/browser?project=rcprintshoppe-480111
- **Billing:** https://console.cloud.google.com/billing/projects/rcprintshoppe-480111
- **Logs:** https://console.cloud.google.com/logs?project=rcprintshoppe-480111

---

## 💡 Pro Tips

1. **Create aliases for common commands:**
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   alias gcp-logs='gcloud run services logs read e-serviceflow-app --region=asia-southeast1 --limit=50'
   alias gcp-status='gcloud run services list --region=asia-southeast1'
   alias gcp-url='gcloud run services describe e-serviceflow-app --region=asia-southeast1 --format="value(status.url)"'
   ```

2. **Set default region permanently:**
   ```bash
   gcloud config set run/region asia-southeast1
   gcloud config set compute/region asia-southeast1
   ```

3. **Use Cloud Shell:** 
   Access from browser: https://shell.cloud.google.com  
   Already has gcloud CLI installed!

---

**Last Updated:** December 3, 2025  
**Project:** rcprintshoppe-480111

