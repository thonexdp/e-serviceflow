@echo off
REM Deploy Script for Cloud Run with VITE Build Args
REM Run this in Command Prompt (CMD)

echo ========================================
echo   Deploying to Cloud Run with VITE Vars
echo ========================================
echo.

echo Starting Cloud Build...
echo This will take 5-10 minutes
echo.

gcloud builds submit --config cloudbuild.yaml

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   SUCCESS! Deployment Complete
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Open your Cloud Run URL/test-env-json
    echo 2. Check that VITE_PUSHER_APP_KEY is set
    echo 3. Open your app and check browser console
    echo.
) else (
    echo.
    echo ========================================
    echo   FAILED! Check error above
    echo ========================================
    echo.
    echo Common issues:
    echo 1. Not authenticated: Run gcloud auth login
    echo 2. Wrong project: Run gcloud config set project YOUR-PROJECT-ID
    echo 3. APIs not enabled: Enable Cloud Build API
    echo.
)

pause
