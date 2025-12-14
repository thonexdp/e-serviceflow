<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SettingsController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Health check endpoint for Cloud Run
Route::get('/health', function () {
    try {
        // Check database connection
        \Illuminate\Support\Facades\DB::connection()->getPdo();

        return response()->json([
            'status' => 'healthy',
            'timestamp' => now()->toIso8601String(),
            'database' => 'connected'
        ], 200);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'unhealthy',
            'timestamp' => now()->toIso8601String(),
            'database' => 'disconnected',
            'error' => $e->getMessage()
        ], 503);
    }
})->name('api.health');


// Public settings endpoint
Route::get('/public/settings', [SettingsController::class, 'getPublicSettings'])
    ->name('api.public.settings');
