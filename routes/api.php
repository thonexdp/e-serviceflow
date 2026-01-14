<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SettingsController;
use App\Models\StockItem;

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

// Stock items endpoint for job type recipe management
Route::get('/stock-items', function (Request $request) {
    $query = StockItem::query();
    
    // Search filter
    if ($request->has('search') && $request->search) {
        $search = $request->search;
        $query->where(function($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
              ->orWhere('sku', 'like', "%{$search}%")
              ->orWhere('description', 'like', "%{$search}%");
        });
    }
    
    // Pagination
    $perPage = $request->get('per_page', 50);
    $page = $request->get('page', 1);
    
    $stockItems = $query
        ->orderBy('name')
        ->paginate($perPage, [
            'id',
            'sku',
            'name',
            'base_unit_of_measure',
            'measurement_type',
            'is_area_based',
            'length',
            'width',
            'is_active'
        ], 'page', $page);
    
    return response()->json([
        'stockItems' => $stockItems->items(),
        'pagination' => [
            'current_page' => $stockItems->currentPage(),
            'last_page' => $stockItems->lastPage(),
            'per_page' => $stockItems->perPage(),
            'total' => $stockItems->total(),
            'has_more' => $stockItems->hasMorePages()
        ]
    ]);
});
