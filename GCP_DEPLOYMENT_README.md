# 🚀 GCP Deployment Documentation

**Project:** E-ServiceFlow  
**Project ID:** rcprintshoppe-480111  
**Region:** asia-southeast1 (Singapore)  
**Last Updated:** December 3, 2025

---

## 📚 Documentation Overview

This folder contains comprehensive documentation for deploying your Laravel + Soketi application to Google Cloud Platform (GCP).

### Main Guides

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[GCP_DEPLOYMENT_GUIDE_BEGINNER.md](GCP_DEPLOYMENT_GUIDE_BEGINNER.md)** | Complete step-by-step deployment guide | **START HERE** - Your first deployment |
| **[DEPLOYMENT_QUICK_COMMANDS.md](DEPLOYMENT_QUICK_COMMANDS.md)** | Quick command reference | Day-to-day operations |
| **[GCP_TROUBLESHOOTING.md](GCP_TROUBLESHOOTING.md)** | Problem-solving guide | When things go wrong |
| **[COST_ESTIMATION.md](COST_ESTIMATION.md)** | Detailed cost breakdown | Understanding your budget |

---

## 🎯 Quick Start (5 Minutes)

### If You're a Complete Beginner:

1. **Read this first:** [GCP_DEPLOYMENT_GUIDE_BEGINNER.md](GCP_DEPLOYMENT_GUIDE_BEGINNER.md)
2. **Follow the checklist** at the end of that guide
3. **Keep open:** [DEPLOYMENT_QUICK_COMMANDS.md](DEPLOYMENT_QUICK_COMMANDS.md) for copy-paste commands

### If You're Experienced with Cloud:

1. Enable GCP APIs (see below)
2. Create resources (Cloud SQL, Storage, Artifact Registry)
3. Setup GitHub Actions (workflow in beginner guide)
4. Push to `staging` branch
5. Done! ✅

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────┐
│     Google Cloud Platform (Singapore)           │
├─────────────────────────────────────────────────┤
│                                                 │
│  GitHub Actions (CI/CD)                        │
│         ↓                                       │
│  Cloud Build → Artifact Registry                │
│         ↓                                       │
│  ┌──────────────────┬──────────────────┐      │
│  │ Cloud Run        │ Cloud Run        │      │
│  │ (Laravel App)    │ (Soketi)         │      │
│  │ Port: 8080       │ Port: 8080       │      │
│  └────────┬─────────┴──────────────────┘      │
│           │                                     │
│     ┌─────┼─────────────┐                     │
│     ↓     ↓             ↓                      │
│  Cloud  Cloud       Cloud                      │
│   SQL  Storage    Logging                      │
│  MySQL   (GCS)                                 │
└─────────────────────────────────────────────────┘
```

---

## 🛠️ What Gets Deployed

### Services

1. **Cloud Run (Laravel App)**
   - Your main Laravel application
   - Includes Nginx + PHP-FPM + Supervisor
   - Auto-scales based on traffic
   - **Cost:** ~$3-8/month

2. **Cloud Run (Soketi)**
   - WebSocket server
   - For real-time features
   - Auto-scales based on connections
   - **Cost:** ~$2-5/month

3. **Cloud SQL (MySQL)**
   - Managed MySQL database
   - Automated backups
   - **Cost:** ~$10-12/month

4. **Cloud Storage (GCS)**
   - File storage for uploads
   - Publicly accessible
   - **Cost:** ~$0.50-2/month

### Total Monthly Cost: **$20-30/month**

With $300 free credits, this runs for **10+ months free!** 🎉

---

## ✅ Prerequisites Checklist

Before you start, make sure you have:

- [ ] Google Cloud account (with $300 free credits)
- [ ] Project created: `rcprintshoppe-480111`
- [ ] GitHub repository with your code
- [ ] Credit card added to GCP (won't be charged during free tier)
- [ ] Google Cloud SDK installed on your computer
- [ ] Git installed

**Don't have some of these?** → See [GCP_DEPLOYMENT_GUIDE_BEGINNER.md](GCP_DEPLOYMENT_GUIDE_BEGINNER.md) Part 1

---

## 🚀 Deployment Steps (Summary)

### Phase 1: GCP Setup (30 minutes)

```bash
# 1. Initialize gcloud
gcloud init

# 2. Enable APIs
gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  storage-api.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com

# 3. Create resources
# Cloud Storage
gsutil mb -l asia-southeast1 gs://rcprintshoppe-files/

# Cloud SQL
gcloud sql instances create rcprintshoppe-db \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=asia-southeast1

# Artifact Registry
gcloud artifacts repositories create e-serviceflow-repo \
  --repository-format=docker \
  --location=asia-southeast1

# 4. Create service account for GitHub
gcloud iam service-accounts create github-deployer \
  --display-name="GitHub Actions Deployer"

# Grant permissions (see full guide for all commands)

# 5. Create key
gcloud iam service-accounts keys create github-key.json \
  --iam-account=github-deployer@rcprintshoppe-480111.iam.gserviceaccount.com
```

### Phase 2: GitHub Setup (15 minutes)

1. Create `.github/workflows/deploy-staging.yml` (see beginner guide)
2. Add all secrets to GitHub (11 secrets total)
3. Commit and push

### Phase 3: Deploy (10 minutes)

```bash
# Create staging branch
git checkout -b staging

# Push to trigger deployment
git push origin staging

# Watch deployment in GitHub Actions tab
```

### Phase 4: Verify (5 minutes)

```bash
# Get URLs
gcloud run services describe e-serviceflow-app \
  --region=asia-southeast1 \
  --format='value(status.url)'

# Test in browser
# Check logs
gcloud run services logs read e-serviceflow-app \
  --region=asia-southeast1 \
  --limit=50
```

**Total Time:** ~60 minutes for first deployment

---

## 📖 Documentation Details

### 1. [GCP_DEPLOYMENT_GUIDE_BEGINNER.md](GCP_DEPLOYMENT_GUIDE_BEGINNER.md)

**175+ pages** of detailed, step-by-step instructions.

**Contents:**
- Prerequisites and setup
- GCP resource creation
- GitHub Actions configuration
- Deployment steps
- Verification and testing
- Cost management
- Troubleshooting basics

**Best for:** First-time deployment

### 2. [DEPLOYMENT_QUICK_COMMANDS.md](DEPLOYMENT_QUICK_COMMANDS.md)

**Quick reference** for daily operations.

**Contents:**
- Monitoring commands
- Database management
- Storage operations
- Scaling commands
- Cost management
- Emergency procedures

**Best for:** Daily operations after initial deployment

### 3. [GCP_TROUBLESHOOTING.md](GCP_TROUBLESHOOTING.md)

**Comprehensive troubleshooting** guide.

**Contents:**
- Common deployment errors
- Database connection issues
- WebSocket problems
- File upload issues
- Performance problems
- Debug procedures
- Emergency fixes

**Best for:** When something breaks

### 4. [COST_ESTIMATION.md](COST_ESTIMATION.md)

**Detailed cost analysis**.

**Contents:**
- Service-by-service costs
- Monthly estimates
- Optimization strategies
- Budget alerts setup
- Cost monitoring
- Scaling scenarios

**Best for:** Understanding and controlling costs

---

## 🔥 Most Common Commands

### Deploy
```bash
# Auto-deploy via GitHub
git push origin staging
```

### Monitor
```bash
# View logs
gcloud run services logs read e-serviceflow-app \
  --region=asia-southeast1 \
  --limit=50

# Check status
gcloud run services list --region=asia-southeast1
```

### Database
```bash
# Connect to database
gcloud sql connect rcprintshoppe-db --user=appuser

# Run migrations
# (automatically runs on deployment)
```

### Costs
```bash
# Check billing
open https://console.cloud.google.com/billing/projects/rcprintshoppe-480111
```

---

## 🎓 Learning Path

### Week 1: Basic Deployment
- [ ] Complete initial deployment
- [ ] Test all features work
- [ ] Setup budget alerts
- [ ] Understand logs

### Week 2: Operations
- [ ] Practice viewing logs
- [ ] Update environment variables
- [ ] Test file uploads
- [ ] Monitor costs

### Week 3: Optimization
- [ ] Optimize Cloud Run settings
- [ ] Setup automated backups
- [ ] Implement caching
- [ ] Test scaling

### Week 4: Mastery
- [ ] Setup custom domain
- [ ] Implement monitoring
- [ ] Optimize costs
- [ ] Document your setup

---

## 🆘 Getting Help

### Documentation
1. Check the relevant guide above
2. Search for your error message
3. Follow troubleshooting steps

### Online Resources
- **Google Cloud Docs:** https://cloud.google.com/docs
- **Stack Overflow:** https://stackoverflow.com/questions/tagged/google-cloud-platform
- **GCP Community:** https://gcp-community.slack.com

### Support
- **Community Support:** Free (via Stack Overflow, forums)
- **Basic Support:** Free with billing account
- **Standard Support:** $29/month minimum

---

## 🔒 Security Checklist

- [ ] Never commit `github-key.json` to git
- [ ] Use strong database passwords
- [ ] Keep secrets in GitHub Secrets (not in code)
- [ ] Enable budget alerts
- [ ] Review IAM permissions regularly
- [ ] Use HTTPS for all services (automatic with Cloud Run)
- [ ] Backup database regularly
- [ ] Monitor logs for suspicious activity

---

## 📊 Success Metrics

After deployment, you should have:

✅ **Working Application**
- Laravel app accessible via HTTPS
- Database connected
- File uploads working
- WebSocket real-time features working

✅ **Automated Deployment**
- Push to `staging` branch auto-deploys
- Build completes in 10-15 minutes
- Zero-downtime deployments

✅ **Cost Control**
- Budget alerts configured
- Daily cost monitoring
- Within $30/month budget
- Using free credits

✅ **Reliability**
- Auto-scaling enabled
- Automated backups
- Health checks passing
- 99.9% uptime

---

## 🎯 Next Steps After Deployment

### Immediate (Day 1)
1. Test all application features
2. Verify WebSocket connections
3. Test file uploads
4. Check database

### Short-term (Week 1)
1. Setup custom domain (optional)
2. Configure monitoring
3. Setup alerting
4. Test backup/restore

### Long-term (Month 1)
1. Optimize performance
2. Implement caching
3. Setup staging/production pipelines
4. Document your processes

---

## 💡 Pro Tips

1. **Use Cloud Shell:** Browser-based terminal with gcloud pre-installed  
   → https://shell.cloud.google.com

2. **Bookmark your console:** Quick access to your project  
   → https://console.cloud.google.com/home/dashboard?project=rcprintshoppe-480111

3. **Mobile app:** Monitor on the go  
   → "Google Cloud Console" in App Store/Play Store

4. **Cost alerts:** Set at 50%, 75%, 90%, 100% of budget  
   → https://console.cloud.google.com/billing/budgets

5. **Keep docs handy:** Bookmark this README and quick commands

---

## 📝 Quick Reference Card

**Your Project Info:**
```
Project ID:     rcprintshoppe-480111
Region:         asia-southeast1 (Singapore)
App Service:    e-serviceflow-app
Soketi Service: e-serviceflow-soketi
Database:       rcprintshoppe-db
Bucket:         rcprintshoppe-files
```

**Most Used Commands:**
```bash
# Deploy
git push origin staging

# Logs
gcloud run services logs read e-serviceflow-app --region=asia-southeast1 --limit=50

# Status
gcloud run services list --region=asia-southeast1

# Connect to DB
gcloud sql connect rcprintshoppe-db --user=appuser
```

**Important URLs:**
```
Console: https://console.cloud.google.com/home/dashboard?project=rcprintshoppe-480111
Billing: https://console.cloud.google.com/billing/projects/rcprintshoppe-480111
Cloud Run: https://console.cloud.google.com/run?project=rcprintshoppe-480111
```

---

## ✨ Features of This Deployment

✅ **Fully Automated CI/CD** - Push code, it deploys  
✅ **Auto-scaling** - Handles traffic spikes automatically  
✅ **Managed Database** - Automated backups, no maintenance  
✅ **WebSocket Support** - Real-time features work  
✅ **File Storage** - Unlimited scalable storage  
✅ **Cost-Effective** - Runs ~10 months on free credits  
✅ **Singapore Region** - Low latency for APAC users  
✅ **HTTPS by Default** - Secure connections automatic  
✅ **Zero Downtime** - Deployments don't interrupt service  
✅ **Comprehensive Logs** - Easy debugging and monitoring  

---

## 🎉 You're Ready!

**Start here:** [GCP_DEPLOYMENT_GUIDE_BEGINNER.md](GCP_DEPLOYMENT_GUIDE_BEGINNER.md)

Follow the guide step-by-step, and you'll have your application running in about an hour!

**Questions?** Check the troubleshooting guide or reach out for help.

**Good luck with your deployment!** 🚀

---

**Maintained by:** Your Team  
**Last Updated:** December 3, 2025  
**Version:** 1.0.0

