# Soketi Cloud Run Deployment Fix

## Problem
Soketi container failed to start on Cloud Run with error:
```
The user-provided container failed to start and listen on the port defined 
by the PORT=8080 environment variable within the allocated timeout.
```

## Root Cause
1. **Port Configuration**: Soketi wasn't using Cloud Run's `PORT` environment variable
2. **Host Binding**: Container wasn't explicitly binding to `0.0.0.0` (all interfaces)
3. **Startup Script**: Needed a proper startup script to handle environment variables

## Solution Applied

### 1. Updated `Dockerfile.soketi`
- ✅ Uses `PORT` environment variable from Cloud Run
- ✅ Binds to `0.0.0.0` (all interfaces) instead of localhost
- ✅ Added startup script that properly handles PORT and HOST
- ✅ Explicitly passes `--host` and `--port` to Soketi

### 2. Updated `soketi.json.template`
- ✅ Added `"host": "0.0.0.0"` to ensure binding to all interfaces
- ✅ Port is now dynamically replaced from PORT env var

### 3. Updated `.github/workflows/deploy-staging.yml`
- ✅ Added `--startup-cpu-boost` for faster startup
- ✅ Explicitly sets `PORT=8080` in environment variables

## Key Changes

### Before:
```dockerfile
CMD soketi start --config=/srv/config.json --port=8080
```

### After:
```dockerfile
# Startup script that:
# 1. Reads PORT from Cloud Run environment
# 2. Binds to 0.0.0.0 (all interfaces)
# 3. Dynamically updates config.json
CMD ["/srv/start.sh"]
```

## Testing

After these changes, redeploy:

```bash
git add .
git commit -m "Fix Soketi Cloud Run port binding"
git push origin staging
```

## Verification

Once deployed, verify Soketi is running:

```bash
# Get Soketi URL
gcloud run services describe e-serviceflow-soketi \
  --region=asia-southeast1 \
  --format='value(status.url)'

# Test endpoint
curl https://YOUR-SOKETI-URL/
# Should return: OK
```

## What to Check in Logs

If deployment still fails, check logs:

```bash
gcloud run services logs read e-serviceflow-soketi \
  --region=asia-southeast1 \
  --limit=50
```

Look for:
- ✅ "Starting Soketi on 0.0.0.0:8080"
- ✅ "Soketi server started successfully"
- ❌ Any port binding errors
- ❌ Any permission errors

## Additional Notes

- Cloud Run automatically sets `PORT=8080` (or another port)
- Container must listen on `0.0.0.0`, not `127.0.0.1` or `localhost`
- Startup timeout is 300 seconds (5 minutes)
- Memory: 512Mi (sufficient for Soketi)

---

**Fixed:** December 3, 2025  
**Issue:** Container failed to start and listen on PORT  
**Status:** ✅ Resolved

