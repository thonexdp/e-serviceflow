# Quick Setup Script for Google Cloud Storage
# Run this in CMD or PowerShell after editing the variables

# ============================================
# STEP 1: Set Your Variables
# ============================================
$PROJECT_ID = "rcprintshoppe-479314"
$BUCKET_NAME = "rcshoppe-buckets"
$REGION = "us-central1"
$SERVICE_NAME = "e-serviceflow-app"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Google Cloud Storage Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# STEP 2: Get Service Account
# ============================================
Write-Host "Getting Cloud Run service account..." -ForegroundColor Yellow

$SERVICE_ACCOUNT = gcloud run services describe $SERVICE_NAME `
    --region=$REGION `
    --format='value(spec.template.spec.serviceAccountName)'

if ([string]::IsNullOrEmpty($SERVICE_ACCOUNT)) {
    Write-Host "Using default compute service account..." -ForegroundColor Yellow
    $PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format='value(projectNumber)'
    $SERVICE_ACCOUNT = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
}

Write-Host "Service Account: $SERVICE_ACCOUNT" -ForegroundColor Green
Write-Host ""

# ============================================
# STEP 3: Grant Bucket Permissions
# ============================================
Write-Host "Granting Storage Object Admin permission..." -ForegroundColor Yellow

gsutil iam ch serviceAccount:${SERVICE_ACCOUNT}:objectAdmin gs://$BUCKET_NAME

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Permissions granted successfully!" -ForegroundColor Green
}
else {
    Write-Host "❌ Failed to grant permissions" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================
# STEP 4: Make Bucket Public (Optional)
# ============================================
Write-Host "Do you want to make the bucket publicly readable? (Y/N)" -ForegroundColor Yellow
$makePublic = Read-Host

if ($makePublic -eq "Y" -or $makePublic -eq "y") {
    Write-Host "Making bucket public..." -ForegroundColor Yellow
    gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Bucket is now publicly readable!" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Failed to make bucket public" -ForegroundColor Red
    }
}
else {
    Write-Host "⚠️  Bucket remains private. You'll need signed URLs for file access." -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# STEP 5: Update Cloud Run Environment Variables
# ============================================
Write-Host "Updating Cloud Run environment variables..." -ForegroundColor Yellow

gcloud run services update $SERVICE_NAME `
    --region=$REGION `
    --set-env-vars="FILESYSTEM_DISK=gcs,GOOGLE_CLOUD_STORAGE_BUCKET=$BUCKET_NAME,GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Environment variables updated!" -ForegroundColor Green
}
else {
    Write-Host "❌ Failed to update environment variables" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================
# STEP 6: Summary
# ============================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Green
Write-Host "  Bucket: $BUCKET_NAME" -ForegroundColor White
Write-Host "  Service Account: $SERVICE_ACCOUNT" -ForegroundColor White
Write-Host "  Region: $REGION" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Deploy your updated code (with GCS package installed)" -ForegroundColor White
Write-Host "2. Test file uploads at your Cloud Run URL" -ForegroundColor White
Write-Host "3. Check files in bucket: https://console.cloud.google.com/storage/browser/$BUCKET_NAME" -ForegroundColor White
Write-Host ""
Write-Host "File URLs will be:" -ForegroundColor Yellow
Write-Host "  https://storage.googleapis.com/$BUCKET_NAME/path/to/file" -ForegroundColor White
Write-Host ""
