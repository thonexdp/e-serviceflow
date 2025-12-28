<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    
    public function register(): void
    {
        // Storage helper functions are loaded via composer autoload from app/Helpers/StorageHelper.php
    }

    
    public function boot(): void
    {
        // Force HTTPS in production/staging
        if ($this->app->environment('production', 'staging')) {
            \Illuminate\Support\Facades\URL::forceScheme('https');
        }

        // Storage helper functions are loaded via composer autoload from app/Helpers/StorageHelper.php
    }
}
