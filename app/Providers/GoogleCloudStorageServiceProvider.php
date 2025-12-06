<?php

namespace App\Providers;

use Google\Cloud\Storage\StorageClient;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\ServiceProvider;
use League\Flysystem\Filesystem;
use League\Flysystem\GoogleCloudStorage\GoogleCloudStorageAdapter;

class GoogleCloudStorageServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        Storage::extend('gcs', function ($app, $config) {
            $storageClient = new StorageClient([
                'projectId' => $config['project_id'] ?? null,
                // When running on Cloud Run, it will automatically use the service account
                // No need to specify keyFile
            ]);

            $bucket = $storageClient->bucket($config['bucket']);

            $pathPrefix = $config['path_prefix'] ?? '';

            // Create adapter with correct parameters
            // Constructor: __construct(StorageBucket $bucket, string $prefix = '', ?VisibilityHandler $visibilityHandler = null)
            $adapter = new GoogleCloudStorageAdapter(
                $bucket,
                $pathPrefix
            );

            return new FilesystemAdapter(
                new Filesystem($adapter, $config),
                $adapter,
                $config
            );
        });
    }
}
