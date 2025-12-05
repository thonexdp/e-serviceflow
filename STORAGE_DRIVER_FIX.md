# Fixed: "This driver does not support retrieving URLs" Error

## Problem

When running the application locally, you encountered the error:

```
This driver does not support retrieving URLs.
```

## Root Cause

The local storage driver (`local` or `public`) doesn't have native support for the `Storage::url()` method in the same way that cloud storage drivers (like GCS) do. The previous implementation tried to use `Storage::url()` universally, which failed for local development.

## Solution

Updated both `TicketFile` and `PaymentDocument` models to detect the storage driver and generate appropriate URLs for each environment.

### Updated Logic

```php
protected function filePath(): Attribute
{
    return Attribute::make(
        get: function ($value) {
            if (!$value) {
                return null;
            }

            $disk = config('filesystems.default');

            // For GCS, generate the full public URL
            if ($disk === 'gcs') {
                $bucket = config('filesystems.disks.gcs.bucket');
                return "https://storage.googleapis.com/{$bucket}/{$value}";
            }

            // For local/public storage, use the /storage/ prefix
            if ($disk === 'public' || $disk === 'local') {
                return "/storage/{$value}";
            }

            // Fallback: try to use Storage::url()
            try {
                return Storage::url($value);
            } catch (\Exception $e) {
                return "/storage/{$value}";
            }
        }
    );
}
```

## How It Works Now

### Local Development (FILESYSTEM_DISK=local or public)

-   **Input:** `tickets/customer/image.jpg`
-   **Output:** `/storage/tickets/customer/image.jpg`
-   ✅ Works with local file system
-   ✅ Requires `php artisan storage:link`

### Cloud Production (FILESYSTEM_DISK=gcs)

-   **Input:** `tickets/customer/image.jpg`
-   **Output:** `https://storage.googleapis.com/rcshoppe-buckets/tickets/customer/image.jpg`
-   ✅ Works with Google Cloud Storage
-   ✅ No storage link needed

## Files Modified

✅ `app/Models/TicketFile.php`
✅ `app/Models/PaymentDocument.php`

## Testing

### Test Locally

1. Make sure you have the storage link:

    ```bash
    php artisan storage:link
    ```

2. Upload a file through the form
3. Check that the image displays correctly
4. No error should appear in the console

### Test on Cloud

1. Deploy to staging
2. Upload a file
3. File should be stored in GCS and display with full URL

## Environment Variables

### Local (.env)

```env
FILESYSTEM_DISK=public
# or
FILESYSTEM_DISK=local
```

### Cloud (deploy-staging.yml)

```env
FILESYSTEM_DISK=gcs
GOOGLE_CLOUD_PROJECT_ID=rcprintshoppe-480111
GOOGLE_CLOUD_STORAGE_BUCKET=rcshoppe-buckets
```

## Troubleshooting

### Images still not showing locally?

1. Create the symbolic link:

    ```bash
    php artisan storage:link
    ```

2. Check the public/storage directory exists

3. Verify .env has correct setting:

    ```env
    FILESYSTEM_DISK=public
    ```

4. Clear cache:
    ```bash
    php artisan config:clear
    php artisan cache:clear
    ```

### Images not showing on cloud?

1. Verify bucket is public (see CLOUD_STORAGE_FIX.md)
2. Check GCS environment variables are set correctly
3. Verify files are actually in the bucket:
    ```bash
    gsutil ls gs://rcshoppe-buckets/tickets/
    ```

## Summary

The accessor now intelligently detects which storage driver is in use and generates the appropriate URL format. This ensures the application works seamlessly in both local development and cloud production environments without any code changes needed when deploying.

✅ **Local Development:** Uses `/storage/` paths
✅ **Cloud Production:** Uses full GCS URLs
✅ **No More Errors:** Graceful fallback for unsupported drivers
