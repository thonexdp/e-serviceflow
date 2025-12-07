# GCP Cost Estimation for E-ServiceFlow

**Project ID:** rcprintshoppe-480111  
**Region:** asia-southeast1 (Singapore)  
**Duration:** 2 months testing  
**Free Credits:** $300 USD

---

## 💰 Monthly Cost Breakdown

### Singapore Region (asia-southeast1) Pricing

| Service | Configuration | Monthly Cost (USD) | 2 Months Total |
|---------|--------------|-------------------|----------------|
| **Cloud Run - Laravel App** | 512 MB RAM, 1 vCPU | $3 - $8 | $6 - $16 |
| **Cloud Run - Soketi** | 512 MB RAM, 1 vCPU | $2 - $5 | $4 - $10 |
| **Cloud SQL MySQL** | db-f1-micro, 10GB HDD | $10 - $12 | $20 - $24 |
| **Cloud Storage** | 10GB storage + traffic | $0.50 - $2 | $1 - $4 |
| **Networking** | Data transfer | $2 - $5 | $4 - $10 |
| **Cloud Build** | CI/CD builds | $1 - $3 | $2 - $6 |
| **Artifact Registry** | Docker image storage | $0.50 - $1 | $1 - $2 |
| **Logging** | Cloud Logging | $0.50 - $2 | $1 - $4 |
| **Other** | Misc services | $0 - $2 | $0 - $4 |
| **TOTAL** | | **$20 - $40/month** | **$40 - $80** |

---

## ✅ You're Well Within Budget!

- **Your Budget:** $200 for 2 months
- **Estimated Cost:** $40-80 for 2 months
- **Remaining:** ~$120-160
- **Plus:** You have $300 free credits!

---

## 📊 Detailed Service Costs

### 1. Cloud Run (Laravel App)

**Pricing Model:**
- **CPU:** $0.00002400 per vCPU-second
- **Memory:** $0.00000250 per GiB-second
- **Requests:** $0.40 per million requests

**Example Calculation (Light Usage):**
- 100 requests/day × 30 days = 3,000 requests
- Average response time: 500ms
- Instance idle 99% of time
- **Cost:** ~$3-5/month

**Example Calculation (Moderate Usage):**
- 1,000 requests/day × 30 days = 30,000 requests
- Average response time: 500ms
- Instance idle 95% of time
- **Cost:** ~$5-8/month

### 2. Cloud Run (Soketi WebSocket)

**Pricing Model:** Same as Laravel App

**Example Calculation:**
- WebSocket connections: 10-20 concurrent
- Running 12 hours/day (business hours)
- **Cost:** ~$2-5/month

**Cost Saving Tip:**
- Set `--min-instances=0` (automatically scales to zero)
- Only pay when someone connects

### 3. Cloud SQL MySQL

**Pricing (db-f1-micro in Singapore):**
- **Instance:** $7.67/month (if running 24/7)
- **Storage:** $0.17/GB/month (10GB = $1.70)
- **Backups:** $0.09/GB/month
- **Total:** ~$10-12/month

**Pricing (db-g1-small):** ~$25/month (if you need to upgrade)

**Cost Saving Tips:**
```bash
# Pause when not testing
gcloud sql instances patch rcprintshoppe-db --activation-policy=NEVER

# Resume when needed
gcloud sql instances patch rcprintshoppe-db --activation-policy=ALWAYS
```

**Alternative (Free):**
- Use free tier PostgreSQL from Supabase or Railway
- Update Laravel config to use external database
- **Savings:** $10-12/month

### 4. Cloud Storage

**Pricing (Singapore):**
- **Storage:** $0.020 per GB/month
- **Class A Operations:** $0.05 per 10,000 ops (uploads)
- **Class B Operations:** $0.004 per 10,000 ops (downloads)
- **Network Egress:** $0.12 per GB (to internet)

**Example Calculation:**
- 10GB files stored
- 1,000 uploads/month
- 5,000 downloads/month
- 2GB traffic/month
- **Cost:** ~$0.50-2/month

### 5. Cloud Build (CI/CD)

**Free Tier:**
- First 120 build-minutes/day: **FREE**
- After: $0.003/build-minute

**Your Usage:**
- ~10 builds/day × 5 minutes = 50 minutes/day
- **Cost:** $0/month (within free tier) ✅

### 6. Artifact Registry

**Pricing:**
- **Storage:** $0.10 per GB/month
- Docker images: ~5GB total
- **Cost:** ~$0.50-1/month

### 7. Networking

**Data Transfer Pricing:**
- **Within same zone:** FREE
- **Within Asia (same region):** $0.01/GB
- **To internet (egress):** $0.12/GB (first 1GB free/month)

**Example:**
- 5GB internet traffic/month
- **Cost:** ~$0.60/month

**To users in Singapore:** ~$0.12/GB × 10GB = $1.20

---

## 💡 Cost Optimization Strategies

### Strategy 1: Pause When Not Testing

**Save: ~$10-15/month**

```bash
# Every evening or weekend
gcloud sql instances patch rcprintshoppe-db --activation-policy=NEVER

# When you start testing
gcloud sql instances patch rcprintshoppe-db --activation-policy=ALWAYS
```

### Strategy 2: Use External Free Services

**Save: ~$10-15/month**

Instead of Cloud SQL, use:
- **Supabase** (Free tier: 500MB database)
- **PlanetScale** (Free tier: 5GB storage)
- **Railway** (Free tier with trial credits)

Update your `.env`:
```env
DB_HOST=external-db-host.com
DB_PORT=3306
DB_DATABASE=yourdb
DB_USERNAME=user
DB_PASSWORD=pass
```

### Strategy 3: Optimize Cloud Run

**Save: ~$2-5/month**

```bash
# Set aggressive scaling
gcloud run services update e-serviceflow-app \
  --region=asia-southeast1 \
  --min-instances=0 \
  --max-instances=2 \
  --cpu-throttling \
  --timeout=60
```

### Strategy 4: Use Cloud Storage from Free Providers

**Save: ~$1-2/month**

Use instead:
- **Cloudflare R2** (10GB free)
- **Backblaze B2** (10GB free)

### Strategy 5: Reduce Logging

**Save: ~$1-2/month**

```bash
# Reduce log retention
gcloud logging sinks update _Default --log-filter='severity>=WARNING'
```

---

## 🎯 Optimized Configuration ($10-15/month)

For absolute minimum cost:

**Option A: Keep Cloud SQL**
```
Cloud Run (both):     $5-8
Cloud SQL (paused):   $3-4  (only run 8hrs/day)
Storage:              $0.50
Networking:           $1
CI/CD:                $0
Total:                ~$10-13/month
```

**Option B: Use External DB (Cheapest)**
```
Cloud Run (both):     $5-8
External DB:          $0  (free tier)
Storage:              $0.50
Networking:           $1
CI/CD:                $0
Total:                ~$7-10/month
```

---

## 📈 Scaling Costs (If You Go to Production)

### Light Traffic (100 users/day)
- Cloud Run: $15-20/month
- Cloud SQL: $15-20/month (db-g1-small)
- Storage: $3-5/month
- **Total:** ~$35-45/month

### Medium Traffic (1,000 users/day)
- Cloud Run: $30-50/month
- Cloud SQL: $40-60/month (db-n1-standard-1)
- Storage: $10-15/month
- **Total:** ~$80-125/month

### High Traffic (10,000 users/day)
- Cloud Run: $100-200/month
- Cloud SQL: $200-300/month (db-n1-standard-2)
- Storage: $30-50/month
- CDN: $20-40/month
- **Total:** ~$350-590/month

---

## 🔔 Cost Alerts Setup

### Step 1: Create Budget Alert

Go to: https://console.cloud.google.com/billing/budgets

Or via command:
```bash
gcloud billing budgets create \
  --billing-account=$(gcloud beta billing accounts list --format='value(name)') \
  --display-name="Monthly Budget Alert" \
  --budget-amount=50USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=75 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

### Step 2: Set Up Email Notifications

1. Go to Billing → **Budgets & alerts**
2. Click your budget
3. Click **Manage notifications**
4. Add your email
5. Select alert thresholds: 50%, 75%, 90%, 100%

### Step 3: Create Cost Dashboard

```bash
# Install Cloud Console mobile app
# iOS: https://apps.apple.com/app/google-cloud/id1005120455
# Android: https://play.google.com/store/apps/details?id=com.google.android.apps.cloudconsole
```

Check costs daily on your phone! 📱

---

## 📊 Cost Monitoring Commands

### Daily Cost Check
```bash
# View current month spending (via web console)
open https://console.cloud.google.com/billing/projects/rcprintshoppe-480111

# Or use gcloud
gcloud beta billing accounts list
```

### Resource Usage Check
```bash
# Check Cloud Run metrics
gcloud run services describe e-serviceflow-app \
  --region=asia-southeast1 \
  --format='value(status.traffic)'

# Check database usage
gcloud sql instances describe rcprintshoppe-db \
  --format='value(currentDiskSize)'

# Check storage usage
gsutil du -sh gs://rcprintshoppe-files/
```

---

## 🧮 Cost Calculator

Use Google's official calculator:  
https://cloud.google.com/products/calculator

**Pre-filled for your setup:**
- Region: asia-southeast1
- Cloud Run: 2 services, 512MB each
- Cloud SQL: db-f1-micro
- Storage: 10GB

---

## 🎓 Free Tier Benefits

### Always Free (After $300 credits expire)

- **Cloud Functions:** 2M invocations/month
- **Cloud Pub/Sub:** 10GB messages/month
- **Cloud Build:** 120 build-minutes/day
- **Cloud Storage:** 5GB/month (US regions only)
- **BigQuery:** 1TB queries/month

**Unfortunately, Cloud Run and Cloud SQL are NOT in Always Free tier.**

---

## 💸 Estimated Timeline with $300 Credits

**Scenario 1: Minimal optimization ($30/month)**
- Month 1-2: Use $60 from credits
- Month 3-10: Continue using credits
- **Credits last:** ~10 months ✅

**Scenario 2: With Cloud SQL ($40/month)**
- Month 1-2: Use $80 from credits
- Month 3-7: Continue using credits
- **Credits last:** ~7 months ✅

**Scenario 3: Production-like ($80/month)**
- Month 1-2: Use $160 from credits
- Month 3-3.5: Use remaining credits
- **Credits last:** ~3.5 months

**Your $200 budget + $300 credits = $500 total = 12+ months at $40/month!**

---

## ⚠️ Hidden Costs to Watch

### 1. API Calls
- Excessive API calls cost money
- Use caching when possible

### 2. Data Egress
- Serving large files costs more
- Use CDN for static assets (Cloudflare is free)

### 3. Log Storage
- Logs can grow large
- Set retention to 30 days: 
  ```bash
  gcloud logging sinks update _Default --log-filter='timestamp>"2025-01-01"'
  ```

### 4. Failed Requests
- Failed requests still cost money
- Monitor error rates

### 5. Long-running Processes
- Cloud Run charges by CPU time
- Optimize slow queries
- Use background jobs efficiently

---

## 📞 Cost Support

If costs are unexpectedly high:

1. **Check detailed billing:**
   https://console.cloud.google.com/billing/projects/rcprintshoppe-480111/reports

2. **Export billing data:**
   ```bash
   gcloud beta billing accounts list
   ```

3. **Contact Google Cloud Support:**
   - Free tier: Community support only
   - For billing issues: Always available

4. **Use Cost Breakdown:**
   - Go to Billing → Reports
   - Group by: Service, SKU, Location
   - Filter by: Date range

---

## ✅ Final Recommendation

**For your 2-month testing with $200 budget:**

**✅ SAFE configuration ($20-30/month):**
- Cloud Run: Both services (Laravel + Soketi)
- Cloud SQL: db-f1-micro (smallest)
- Cloud Storage: 10GB
- Standard logging
- **Total for 2 months:** $40-60
- **Well within $200 budget!** ✅

**You'll have plenty of budget left over!** 🎉

**With $300 free credits, you won't pay anything for ~7-10 months!**

---

**Last Updated:** December 3, 2025  
**Project:** rcprintshoppe-480111  
**Region:** asia-southeast1

