# Soketi Deployment Fix

## Problem

The Soketi service was failing to start on Google Cloud Run with the error:

```
The user-provided container failed to start and listen on the port defined provided by the PORT=8080 environment variable within the allocated timeout.
```

## Root Causes Identified

### 1. **Incorrect WebSocket Handler** (Primary Issue)

-   The `soketi.json.template` was configured to use `"socket.io"` as the WebSocket handler
-   This driver requires additional dependencies that weren't installed in the Docker image
-   Soketi couldn't initialize properly, causing startup failures

### 2. **Insufficient Startup Time**

-   Cloud Run's default timeout may have been too short for Soketi to fully initialize
-   No explicit timeout configuration was set

### 3. **Limited Debugging Information**

-   The startup command didn't provide enough verbose output to diagnose issues

## Fixes Applied

### Fix 1: Changed WebSocket Handler (`soketi.json.template`)

**Changed from:**

```json
"wsHandler": {
  "driver": "socket.io"
}
```

**Changed to:**

```json
"wsHandler": {
  "driver": "ws"
}
```

**Why:** The `"ws"` driver is Soketi's native WebSocket handler, requiring no additional dependencies. It's more reliable and lighter-weight.

### Fix 2: Extended Timeout Configuration (`deploy-staging.yml`)

**Added:**

```yaml
--timeout=300 \
--startup-cpu-boost \
```

**Why:**

-   `--timeout=300`: Gives Cloud Run 5 minutes for requests (affects overall service timeout)
-   `--startup-cpu-boost`: Temporarily boosts CPU during startup for faster initialization

### Fix 3: Enhanced Logging (`Dockerfile.soketi`)

**Improved the CMD:**

```dockerfile
CMD sed -e "s/SOKETI_DEFAULT_APP_ID_PLACEHOLDER/$SOKETI_DEFAULT_APP_ID/g" \
        -e "s/SOKETI_DEFAULT_APP_KEY_PLACEHOLDER/$SOKETI_DEFAULT_APP_KEY/g" \
        -e "s/SOKETI_DEFAULT_APP_SECRET_PLACEHOLDER/$SOKETI_DEFAULT_APP_SECRET/g" \
        /srv/soketi.json.template > /srv/config.json && \
    echo "=== Soketi Configuration ===" && \
    cat /srv/config.json && \
    echo "=== Starting Soketi on port $SOKETI_PORT ===" && \
    soketi start --config=/srv/config.json --port=$SOKETI_PORT
```

**Why:** Better visibility into what's happening during startup. You'll be able to:

-   See the generated configuration
-   Confirm the port Soketi is trying to bind to
-   Get better error messages if something fails

## Next Steps

1. **Commit and push** these changes to the `staging` branch
2. **Monitor the deployment** in GitHub Actions
3. **Check Cloud Run logs** if issues persist - the enhanced logging will help

## Expected Outcome

Soketi should now:

-   Start successfully on port 8080
-   Listen for WebSocket connections using the native `ws` driver
-   Pass Cloud Run's health checks
-   Be accessible at the provided Cloud Run URL

## Verification Commands

After deployment, you can verify Soketi is running:

```bash
# Get the Soketi URL
gcloud run services describe e-serviceflow-soketi \
  --region=asia-southeast1 \
  --format='value(status.url)'

# Test WebSocket connection (with the actual URL)
curl -i https://YOUR-SOKETI-URL.run.app/
```

You should see a response indicating the Soketi server is running.
