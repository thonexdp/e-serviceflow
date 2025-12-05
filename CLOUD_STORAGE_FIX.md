# Cloud Storage Image Display Fix

## Problem

Images were successfully uploading to Google Cloud Storage buckets, but were not displaying in the application because the URLs were incorrectly formatted for local storage instead of cloud storage.

## Solution Implemented

### 1. Backend Changes

#### A. Model Accessors (TicketFile & PaymentDocument)

Added Laravel Attribute accessors to automatically convert stored file paths into full Cloud Storage URLs:

**Files Modified:**

-   `app/Models/TicketFile.php`
-   `app/Models/PaymentDocument.php`

**What it does:**

-   Intercepts the `file_path` attribute when retrieved from database
-   Automatically calls `Storage::url($value)` to generate the full public URL
-   Returns URLs in format: `https://storage.googleapis.com/{bucket}/{path}`

```php
protected function filePath(): Attribute
{
    return Attribute::make(
        get: fn ($value) => $value ? Storage::url($value) : null
    );
}
```

#### B. Filesystem Configuration

Updated `config/filesystems.php` to include URL configuration for GCS disk:

```php
'gcs' => [
    // ... existing config
    'url' => env('GCS_URL', 'https://storage.googleapis.com/' . env('GOOGLE_CLOUD_STORAGE_BUCKET', 'rcshoppe-buckets')),
],
```

### 2. Frontend Changes

#### Updated TicketForm.jsx

Removed local storage path prefixes since the backend now returns full URLs:

**Before:**

```javascript
preview: `/storage/${doc.file_path}`; // ❌ Wrong for Cloud Storage
```

**After:**

```javascript
preview: doc.file_path; // ✅ Uses full URL from backend
```

**Files Modified:**

-   `resources/js/Components/Tickets/TicketForm.jsx`
    -   Line 212: Ticket attachments preview
    -   Line 232: Payment proofs preview

## How It Works

### Upload Flow:

1. User uploads image file
2. Laravel stores file to GCS: `tickets/customer/abc123.jpg`
3. Database stores relative path: `tickets/customer/abc123.jpg`

### Retrieval Flow:

1. Database returns: `tickets/customer/abc123.jpg`
2. Model accessor transforms it to: `https://storage.googleapis.com/rcshoppe-buckets/tickets/customer/abc123.jpg`
3. Frontend uses this URL directly
4. Browser fetches image from Google Cloud Storage

## Bucket Permissions

For images to display publicly, your GCS bucket needs to be configured with public access:

### Make Bucket Public (If Not Already)

**Via Google Cloud Console:**

1. Go to Cloud Storage → Buckets
2. Click on your bucket (`rcshoppe-buckets`)
3. Go to **Permissions** tab
4. Click **Add Principal**
5. Enter: `allUsers`
6. Select role: **Storage Object Viewer**
7. Click **Save**

**Via gcloud CLI:**

```bash
gsutil iam ch allUsers:objectViewer gs://rcshoppe-buckets
```

### Security Note

If you want to keep files private and use signed URLs instead:

-   Set bucket to private
-   Update the accessor to generate signed URLs:

```php
protected function filePath(): Attribute
{
    return Attribute::make(
        get: fn ($value) => $value ? Storage::temporaryUrl($value, now()->addHours(1)) : null
    );
}
```

## Testing

### Local Development

-   Uses `local` or `public` disk (file system)
-   Images stored in `storage/app/public/`
-   URL: `http://localhost/storage/tickets/...`

### Staging/Production (GCS)

-   Uses `gcs` disk
-   Images stored in Cloud Storage bucket
-   URL: `https://storage.googleapis.com/rcshoppe-buckets/tickets/...`

## Environment Variables

Make sure these are set in your deployment:

```env
FILESYSTEM_DISK=gcs
GOOGLE_CLOUD_PROJECT_ID=rcprintshoppe-480111
GOOGLE_CLOUD_STORAGE_BUCKET=rcshoppe-buckets
```

Already configured in `.github/workflows/deploy-staging.yml` ✅

## Troubleshooting

### Images Still Not Showing?

1. **Check the browser console** (F12 → Network tab)

    - Look for failed image requests
    - Check the actual URL being requested

2. **Verify bucket is public:**

    ```bash
    gsutil iam get gs://rcshoppe-buckets
    ```

    Should show `allUsers` with `roles/storage.objectViewer`

3. **Check file actually exists in bucket:**

    ```bash
    gsutil ls gs://rcshoppe-buckets/tickets/customer/
    ```

4. **Test direct URL access:**

    - Copy an image URL from the database
    - Run it through the accessor manually
    - Try opening the URL in a browser

5. **Clear cache:**
    - Browser cache
    - Laravel cache: `php artisan cache:clear`
    - Config cache: `php artisan config:clear`

### CORS Issues

If you see CORS errors, configure bucket CORS:

Create `cors.json`:

```json
[
    {
        "origin": ["*"],
        "method": ["GET", "HEAD"],
        "responseHeader": ["Content-Type"],
        "maxAgeSeconds": 3600
    }
]
```

Apply:

```bash
gsutil cors set cors.json gs://rcshoppe-buckets
```

## Files Changed Summary

### Backend

✅ `app/Models/TicketFile.php` - Added file_path accessor
✅ `app/Models/PaymentDocument.php` - Added file_path accessor  
✅ `config/filesystems.php` - Added GCS URL configuration
✅ `app/Providers/AppServiceProvider.php` - Force HTTPS in staging

### Frontend

✅ `resources/js/Components/Tickets/TicketForm.jsx` - Use URLs directly

### Infrastructure

✅ `.github/workflows/deploy-staging.yml` - Updated service name and removed WebSockets
✅ `.github/workflows/deployyml` - Updated service name

## Next Deployment

When you push to `staging` branch, the changes will be deployed automatically with:

-   Images loading from Cloud Storage ✅
-   Mixed-content errors fixed ✅
-   New service name: `rcprintshoppe` ✅
