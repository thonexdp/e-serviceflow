<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Storage;

class AppServiceProvider extends ServiceProvider
{
    
    public function register(): void
    {
        // Register storage helper functions early in register() method
        if (!function_exists('storage_disk')) {
            /**
             * Get the storage disk name based on environment
             * Returns 's3' for production, 'public' for local/development
             *
             * @return string
             */
            function storage_disk(): string
            {
                return app()->environment('production') ? 's3' : 'public';
            }
        }

        if (!function_exists('storage')) {
            /**
             * Get a storage disk instance based on environment
             * Returns S3 disk for production, public disk for local/development
             *
             * @param string|null $disk
             * @return \Illuminate\Contracts\Filesystem\Filesystem
             */
            function storage($disk = null)
            {
                $disk = $disk ?? storage_disk();
                return Storage::disk($disk);
            }
        }
    }

    
    public function boot(): void
    {
        
        if ($this->app->environment('production', 'staging')) {
            \Illuminate\Support\Facades\URL::forceScheme('https');
        }

        // Register storage helper functions
        if (!function_exists('storage_disk')) {
            /**
             * Get the storage disk name based on environment
             * Returns 's3' for production, 'public' for local/development
             *
             * @return string
             */
            function storage_disk(): string
            {
                return app()->environment('production') ? 's3' : 'public';
            }
        }

        if (!function_exists('storage')) {
            /**
             * Get a storage disk instance based on environment
             * Returns S3 disk for production, public disk for local/development
             *
             * @param string|null $disk
             * @return \Illuminate\Contracts\Filesystem\Filesystem
             */
            function storage($disk = null)
            {
                $disk = $disk ?? \storage_disk();
                return Storage::disk($disk);
            }
        }
    }
}
