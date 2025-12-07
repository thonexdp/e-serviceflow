# 📋 GCP Deployment Checklist

**Project:** rcprintshoppe-480111 | **Region:** asia-southeast1 (Singapore)

Print this and check off items as you complete them! ✅

---

## 🔧 Phase 1: Pre-Deployment Setup

### Local Computer Setup

-   [ ] Google Cloud SDK installed
-   [ ] Git installed
-   [ ] GitHub account ready
-   [ ] GCP account created (with $300 free credits)
-   [ ] Project `rcprintshoppe-480111` exists

### Initialize gcloud

```bash
gcloud init
gcloud auth login
gcloud config set project rcprintshoppe-480111
gcloud config set run/region asia-southeast1
```

-   [ ] gcloud initialized and logged in
-   [ ] Project set to rcprintshoppe-480111

---

## 🌐 Phase 2: Enable GCP Services

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  storage-api.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  compute.googleapis.com
```

-   [ ] All APIs enabled (wait 2-3 minutes)

---

## 💾 Phase 3: Create GCP Resources

### Cloud Storage Bucket

```bash
gsutil mb -l asia-southeast1 gs://rcprintshoppe-files/
gsutil iam ch allUsers:objectViewer gs://rcprintshoppe-files/
```

-   [ ] Bucket `rcprintshoppe-files` created
-   [ ] Bucket made public

### Cloud SQL Database

```bash
gcloud sql instances create rcprintshoppe-db \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=asia-southeast1 \
  --root-password=YOUR_ROOT_PASSWORD \
  --storage-size=10GB \
  --storage-type=HDD
```

-   [ ] Database instance created (wait 5-10 minutes)
-   [ ] Root password saved: `_________________`

```bash
gcloud sql databases create eserviceflow --instance=rcprintshoppe-db
gcloud sql users create appuser \
  --instance=rcprintshoppe-db \
  --password=YOUR_APP_PASSWORD
```

-   [ ] Database `eserviceflow` created
-   [ ] User `appuser` created
-   [ ] App password saved: `___P@ssw0rd______________`
-   [ ] Connection name: `rcprintshoppe-480111:asia-southeast1:rcprintshoppe-db`

### Artifact Registry

```bash
gcloud artifacts repositories create e-serviceflow-repo \
  --repository-format=docker \
  --location=asia-southeast1 \
  --description="Docker images for e-serviceflow"
```

-   [ ] Artifact registry created

---

## 🔐 Phase 4: Service Account Setup

```bash
# Create service account
gcloud iam service-accounts create github-deployer \
  --display-name="GitHub Actions Deployer"
```

-   [ ] Service account created

```bash
# Grant permissions (copy entire command)
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

-   [ ] All 6 permissions granted

```bash
# Create key file
gcloud iam service-accounts keys create github-key.json \
  --iam-account=github-deployer@rcprintshoppe-480111.iam.gserviceaccount.com
```

-   [ ] Key file `github-key.json` downloaded : a145fbae961d69f3a5f493a40f1b5dc18b56296d
-   [ ] Key file saved securely

---

## 🔑 Phase 5: Generate App Keys

```bash
# In your project directory
php artisan key:generate --show
```

-   [ ] Laravel APP_KEY generated: `base64:qvLGNniWpM3MDzomPzxFOlfuDt75RFOiTcu5+olkT8w=`

```bash
# Generate Pusher keys (or use these examples)
# PUSHER_APP_KEY: sk-staging-key-abc123xyz
# PUSHER_APP_SECRET: sk-staging-secret-def456uvw
```

-   [ ] PUSHER_APP_KEY generated: `sk-staging-key-abc123xyz`
-   [ ] PUSHER_APP_SECRET generated: `sk-staging-secret-def456uvw`

---

## 🐙 Phase 6: GitHub Setup

### Create Workflow File

-   [ ] Create folder: `.github/workflows/`
-   [ ] Create file: `.github/workflows/deploy-staging.yml`
-   [ ] Copy workflow content from beginner guide
-   [ ] File committed to repository

### Add GitHub Secrets

Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`

Add these 11 secrets:

| Secret Name                   | Value                                                   | ✓   |
| ----------------------------- | ------------------------------------------------------- | --- |
| `GCP_SA_KEY`                  | Content of `github-key.json`                            | [ ] |
| `APP_KEY`                     | From `php artisan key:generate --show`                  | [ ] |
| `APP_URL`                     | `https://e-serviceflow-app-temp.run.app` (update later) | [ ] |
| `DB_INSTANCE_CONNECTION_NAME` | `rcprintshoppe-480111:asia-southeast1:rcprintshoppe-db` | [ ] |
| `DB_DATABASE`                 | `eserviceflow`                                          | [ ] |
| `DB_USERNAME`                 | `appuser`                                               | [ ] |
| `DB_PASSWORD`                 | Your database password                                  | [ ] |
| `GCS_BUCKET`                  | `rcprintshoppe-files`                                   | [ ] |
| `PUSHER_APP_ID`               | `e-serviceflow`                                         | [ ] |
| `PUSHER_APP_KEY`              | Your generated key                                      | [ ] |
| `PUSHER_APP_SECRET`           | Your generated secret                                   | [ ] |

-   [ ] All 11 secrets added to GitHub

---

## 📁 Phase 7: Project Files

### Check These Files Exist

-   [ ] `.github/workflows/deploy-staging.yml` ✓
-   [ ] `Dockerfile.app` ✓
-   [ ] `Dockerfile.soketi` ✓
-   [ ] `.nginx.conf` ✓
-   [ ] `supervisord.conf` ✓
-   [ ] `soketi.json.template` ✓

### Update .gitignore

-   [ ] Add `github-key.json` to `.gitignore`
-   [ ] Add `*.key` to `.gitignore`
-   [ ] Add `*.pem` to `.gitignore`

---

## 🚀 Phase 8: Deploy!

```bash
# Commit everything
git add .
git commit -m "Setup GCP deployment"

# Create staging branch
git checkout -b staging

# Push to trigger deployment
git push origin staging
```

-   [ ] Code committed
-   [ ] Staging branch created
-   [ ] Code pushed to GitHub

### Watch Deployment

-   [ ] Go to GitHub repository
-   [ ] Click "Actions" tab
-   [ ] See "Deploy to GCP (Staging)" running
-   [ ] Wait 10-15 minutes for first deployment
-   [ ] Deployment successful (green checkmark)

---

## ✅ Phase 9: Verification

### Get URLs

```bash
# Laravel App URL
gcloud run services describe e-serviceflow-app \
  --region=asia-southeast1 \
  --format='value(status.url)'
```

-   [ ] Laravel URL copied: `_________________`

```bash
# Soketi URL
gcloud run services describe e-serviceflow-soketi \
  --region=asia-southeast1 \
  --format='value(status.url)'
```

-   [ ] Soketi URL copied: `_________________`

### Test Application

-   [ ] Open Laravel URL in browser
-   [ ] Application loads successfully
-   [ ] No 502/503 errors

### Test WebSocket

-   [ ] Open browser console (F12)
-   [ ] Look for "Pusher: Connected"
-   [ ] WebSocket working

### Test Database

```bash
gcloud sql connect rcprintshoppe-db --user=appuser
# Enter password, then:
USE eserviceflow;
SHOW TABLES;
```

-   [ ] Can connect to database
-   [ ] Tables created from migrations

### Test File Upload

-   [ ] Upload a file in the app
-   [ ] File appears in Cloud Storage:

```bash
gsutil ls gs://rcprintshoppe-files/
```

-   [ ] File upload working

---

## 🔄 Phase 10: Update APP_URL

Now that you have the real URL:

1. Go to GitHub → Repo → Settings → Secrets → Actions
2. Edit `APP_URL` secret
3. Set to your actual Laravel URL

-   [ ] APP_URL updated in GitHub

```bash
# Redeploy
git commit --allow-empty -m "Update APP_URL"
git push origin staging
```

-   [ ] Redeployed with correct APP_URL

---

## 💰 Phase 11: Setup Cost Controls

### Create Budget Alert

```bash
# Go to: https://console.cloud.google.com/billing/budgets
```

-   [ ] Budget created: $100/month
-   [ ] Alerts set at: 50%, 75%, 90%, 100%
-   [ ] Email notifications enabled

### Bookmark Billing Page

-   [ ] Bookmark: https://console.cloud.google.com/billing/projects/rcprintshoppe-480111

---

## 📊 Phase 12: Monitoring Setup

### Bookmark Important Pages

-   [ ] Project Console: https://console.cloud.google.com/home/dashboard?project=rcprintshoppe-480111
-   [ ] Cloud Run: https://console.cloud.google.com/run?project=rcprintshoppe-480111
-   [ ] Cloud SQL: https://console.cloud.google.com/sql?project=rcprintshoppe-480111
-   [ ] Logs: https://console.cloud.google.com/logs?project=rcprintshoppe-480111

### Install Mobile App (Optional)

-   [ ] Download "Google Cloud Console" app
-   [ ] Login with your account
-   [ ] Add widget to home screen

---

## 📚 Phase 13: Learn Common Commands

### Test These Commands

```bash
# View logs
gcloud run services logs read e-serviceflow-app \
  --region=asia-southeast1 \
  --limit=50
```

-   [ ] Can view logs

```bash
# List services
gcloud run services list --region=asia-southeast1
```

-   [ ] Can list services

```bash
# Check costs (in console)
open https://console.cloud.google.com/billing/projects/rcprintshoppe-480111
```

-   [ ] Can check costs

---

## 🎉 DEPLOYMENT COMPLETE!

### Success Criteria

-   [x] Application accessible via HTTPS
-   [x] Database connected and working
-   [x] File uploads working
-   [x] WebSocket real-time features working
-   [x] CI/CD pipeline working (auto-deploy on push)
-   [x] Budget alerts configured
-   [x] All monitoring in place

---

## 📝 Post-Deployment Notes

**Your Live URLs:**

```
Laravel App: _________________________________
Soketi:      _________________________________
Database:    rcprintshoppe-480111:asia-southeast1:rcprintshoppe-db
Bucket:      gs://rcprintshoppe-files/
```

**Important Passwords (KEEP SECRET!):**

```
DB Root Password: _________________
DB App Password:  _________________
Pusher App Key:   _________________
Pusher Secret:    _________________
```

**Costs:**

```
Expected Monthly: $20-30
Budget Limit:     $100
Free Credits:     $300 (lasts 10+ months)
```

---

## 🔄 Next Deployment

For future deployments, you only need:

```bash
git checkout staging
git add .
git commit -m "Your changes"
git push origin staging
```

That's it! Everything is automated. ✨

---

## 🆘 If Something Goes Wrong

1. Check GitHub Actions log
2. Check Cloud Run logs:
    ```bash
    gcloud run services logs read e-serviceflow-app \
      --region=asia-southeast1 \
      --limit=100
    ```
3. Refer to: [GCP_TROUBLESHOOTING.md](GCP_TROUBLESHOOTING.md)

---

## 📞 Help Resources

-   **Beginner Guide:** [GCP_DEPLOYMENT_GUIDE_BEGINNER.md](GCP_DEPLOYMENT_GUIDE_BEGINNER.md)
-   **Quick Commands:** [DEPLOYMENT_QUICK_COMMANDS.md](DEPLOYMENT_QUICK_COMMANDS.md)
-   **Troubleshooting:** [GCP_TROUBLESHOOTING.md](GCP_TROUBLESHOOTING.md)
-   **Cost Info:** [COST_ESTIMATION.md](COST_ESTIMATION.md)

---

**Congratulations on your successful deployment! 🎊**

**Completed on:** ******\_\_\_******  
**Deployed by:** ******\_\_\_******  
**Total time:** ******\_\_\_******

---

**Last Updated:** December 3, 2025
