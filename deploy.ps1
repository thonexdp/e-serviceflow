# PowerShell Deploy Script for Cloud Run
# This deploys your app with VITE environment variables

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Deploy to Cloud Run with Soketi" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$SOKETI_VM_IP = "34.142.242.81"
$PUSHER_APP_KEY = "staging-key"
$PUSHER_APP_SECRET = "staging-secret"

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Soketi VM IP: $SOKETI_VM_IP"
Write-Host "  Pusher Key: $PUSHER_APP_KEY"
Write-Host "  Pusher Secret: $PUSHER_APP_SECRET"
Write-Host ""

Write-Host "Starting deployment..." -ForegroundColor Green
Write-Host ""

# Deploy using Cloud Build
Write-Host "Running: gcloud builds submit --config cloudbuild.yaml" -ForegroundColor Cyan
gcloud builds submit --config cloudbuild.yaml

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   ✅ Deployment Successful!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Open your Cloud Run URL in a browser"
    Write-Host "2. Open browser console (F12)"
    Write-Host "3. Look for: '✅ WebSocket connected to Soketi'"
    Write-Host ""
    Write-Host "If you see errors:" -ForegroundColor Yellow
    Write-Host "1. Check Soketi is running on VM: pm2 status"
    Write-Host "2. Check firewall allows port 6001"
    Write-Host "3. Check Cloud Run logs: gcloud run services logs read e-serviceflow --region asia-southeast1 --limit 50"
}
else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "   ❌ Deployment Failed" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check the error messages above." -ForegroundColor Yellow
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "1. gcloud not authenticated: Run 'gcloud auth login'"
    Write-Host "2. Project not set: Run 'gcloud config set project YOUR-PROJECT-ID'"
    Write-Host "3. API not enabled: Enable Cloud Build and Cloud Run APIs"
}
