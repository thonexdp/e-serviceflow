<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\TicketController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\JobCategoryController;
use App\Http\Controllers\JobTypeController;
use App\Http\Controllers\MockupsController;
use App\Http\Controllers\ProductionQueueController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\PurchaseOrderController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PublicTicketController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|-----------------------------  ---------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

/*
|--------------------------------------------------------------------------
| Public Routes (No Authentication Required)
|--------------------------------------------------------------------------
*/

// Customer view (public homepage)
Route::get('/', function () {
    // TODO: Implement customer-facing homepage
    return Inertia::render('Public/Home');
})->name('home');

// Debug route to test database connection
Route::get('/testdb', function () {
    try {
        $dbConfig = [
            'DB_CONNECTION' => config('database.default'),
            'DB_HOST' => config('database.connections.mysql.host'),
            'DB_PORT' => config('database.connections.mysql.port'),
            'DB_DATABASE' => config('database.connections.mysql.database'),
            'DB_USERNAME' => config('database.connections.mysql.username'),
            'DB_SOCKET' => config('database.connections.mysql.unix_socket'),
            'APP_ENV' => config('app.env'),
        ];

        // Test connection
        \DB::connection()->getPdo();
        $tables = \DB::select('SHOW TABLES');

        // Get users if table exists
        $users = [];
        try {
            $users = \DB::table('users')->select('id', 'name', 'email', 'role', 'created_at')->get();
        } catch (\Exception $e) {
            $users = ['error' => 'Users table not found or empty'];
        }

        return response()->json([
            'status' => 'Connected successfully!',
            'config' => $dbConfig,
            'tables' => $tables,
            'users' => $users,
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'Connection failed',
            'error' => $e->getMessage(),
            'config' => $dbConfig ?? [],
        ], 500);
    }
});

// Order tracking (public)
Route::get('/track', function () {
    return view('tracking');
})->name('track');

// Public API for ticket search
Route::post('/api/public/tickets/search', [PublicTicketController::class, 'search'])
    ->middleware('throttle:api')
    ->name('public.tickets.search');

// About page (public)
Route::get('/about', function () {
    // TODO: Implement about page
    return Inertia::render('Public/About');
})->name('about');


// // Notifications
// Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
// Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unread-count');
// Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.mark-read');
// Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');
// Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy');

Route::prefix('admin')->middleware(['auth', 'role:admin'])->name('admin.')->group(function () {
    // Admin Dashboard
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    // Tickets Management
    Route::get('/tickets', [TicketController::class, 'index'])->name('tickets.index');
    Route::post('/tickets', [TicketController::class, 'store'])->name('tickets.store');
    Route::get('/tickets/{ticket}', [TicketController::class, 'show'])->name('tickets.show');
    Route::put('/tickets/{ticket}', [TicketController::class, 'update'])->name('tickets.update');
    Route::delete('/tickets/{ticket}', [TicketController::class, 'destroy'])->name('tickets.destroy');
    Route::patch('/tickets/{ticket}/update-status', [TicketController::class, 'updateStatus'])->name('tickets.update-status');
    Route::patch('/tickets/{ticket}/update-payment', [TicketController::class, 'updatePayment'])->name('tickets.update-payment');

    // Customer Management
    Route::resource('customers', CustomerController::class)->except(['create', 'show', 'edit']);
    Route::get('/customers/search', [CustomerController::class, 'search'])->name('customers.search');

    // Job Categories Management
    Route::resource('job-categories', JobCategoryController::class)->except(['create', 'show', 'edit']);

    // Job Types Management
    Route::resource('job-types', JobTypeController::class)->except(['create', 'show', 'edit']);

    // Finance Hub
    Route::get('/finance', [FinanceController::class, 'index'])->name('finance.index');
    Route::post('/payments', [PaymentController::class, 'store'])->name('payments.store');
    Route::get('/payments/documents/{document}', [PaymentController::class, 'downloadDocument'])->name('payments.documents.download');
    Route::post('/expenses', [ExpenseController::class, 'store'])->name('expenses.store');

    // Inventory Management
    Route::get('/inventory', [InventoryController::class, 'index'])->name('inventory.index');
    Route::post('/inventory', [InventoryController::class, 'store'])->name('inventory.store');
    Route::put('/inventory/{id}', [InventoryController::class, 'update'])->name('inventory.update');
    Route::delete('/inventory/{id}', [InventoryController::class, 'destroy'])->name('inventory.destroy');
    Route::post('/inventory/{id}/adjust', [InventoryController::class, 'adjustStock'])->name('inventory.adjust');
    Route::get('/inventory/{id}/movements', [InventoryController::class, 'movements'])->name('inventory.movements');
    Route::get('/inventory/low-stock', [InventoryController::class, 'lowStock'])->name('inventory.low-stock');

    // Purchase Orders
    Route::get('/purchase-orders', [PurchaseOrderController::class, 'index'])->name('purchase-orders.index');
    Route::get('/purchase-orders/create', [PurchaseOrderController::class, 'create'])->name('purchase-orders.create');
    Route::post('/purchase-orders', [PurchaseOrderController::class, 'store'])->name('purchase-orders.store');
    Route::get('/purchase-orders/{id}', [PurchaseOrderController::class, 'show'])->name('purchase-orders.show');
    Route::put('/purchase-orders/{id}', [PurchaseOrderController::class, 'update'])->name('purchase-orders.update');
    Route::delete('/purchase-orders/{id}', [PurchaseOrderController::class, 'destroy'])->name('purchase-orders.destroy');
    Route::post('/purchase-orders/{id}/approve', [PurchaseOrderController::class, 'approve'])->name('purchase-orders.approve');
    Route::post('/purchase-orders/{id}/mark-ordered', [PurchaseOrderController::class, 'markOrdered'])->name('purchase-orders.mark-ordered');
    Route::post('/purchase-orders/{id}/receive', [PurchaseOrderController::class, 'receive'])->name('purchase-orders.receive');
    Route::post('/purchase-orders/{id}/cancel', [PurchaseOrderController::class, 'cancel'])->name('purchase-orders.cancel');

    // Mock-ups (Admin can access)
    Route::get('/mock-ups', [MockupsController::class, 'index'])->name('mockups.index');
    Route::get('/mock-ups/{id}', [MockupsController::class, 'show'])->name('mockups.show');
    Route::post('/mock-ups/{id}/upload', [MockupsController::class, 'uploadMockup'])->name('mockups.upload');
    Route::post('/mock-ups/{id}/approve', [MockupsController::class, 'approve'])->name('mockups.approve');
    Route::post('/mock-ups/{id}/revision', [MockupsController::class, 'requestRevision'])->name('mockups.revision');
    Route::get('/mock-ups/files/{id}/download', [MockupsController::class, 'downloadFile'])->name('mockups.download');

    // Production Queue (Admin can access)
    Route::get('/production', [ProductionQueueController::class, 'index'])->name('production.index');
    Route::post('/production/{id}/start', [ProductionQueueController::class, 'startProduction'])->name('production.start');
    Route::post('/production/{id}/update', [ProductionQueueController::class, 'updateProgress'])->name('production.update');
    Route::post('/production/{id}/complete', [ProductionQueueController::class, 'markCompleted'])->name('production.complete');
    Route::post('/production/{id}/record-stock', [ProductionQueueController::class, 'recordStockConsumption'])->name('production.record-stock');

    // Reports
    Route::get('/reports', function () {
        return Inertia::render('Reports');
    })->name('reports');

    // Settings
    Route::get('/settings', function () {
        return Inertia::render('Settings');
    })->name('settings');

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unread-count');
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.mark-read');
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy');

    // User Management
    Route::get('/users', [UserController::class, 'index'])->name('users.index');
    Route::post('/users', [UserController::class, 'store'])->name('users.store');
    Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
    Route::get('/permissions', [UserController::class, 'getPermissions'])->name('permissions.index');
    Route::get('/users/{user}/permissions', [UserController::class, 'getUserPermissions'])->name('users.permissions');

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});
Route::prefix('frontdesk')->middleware(['auth', 'role:admin,FrontDesk'])->name('frontdesk.')->group(function () {
    // Front Desk Dashboard
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    // Tickets Management
    Route::get('/tickets', [TicketController::class, 'index'])->name('tickets.index');
    Route::post('/tickets', [TicketController::class, 'store'])->name('tickets.store');
    Route::get('/tickets/{ticket}', [TicketController::class, 'show'])->name('tickets.show');
    Route::put('/tickets/{ticket}', [TicketController::class, 'update'])->name('tickets.update');
    Route::delete('/tickets/{ticket}', [TicketController::class, 'destroy'])->name('tickets.destroy');
    Route::patch('/tickets/{ticket}/update-status', [TicketController::class, 'updateStatus'])->name('tickets.update-status');
    Route::patch('/tickets/{ticket}/update-payment', [TicketController::class, 'updatePayment'])->name('tickets.update-payment');

    // Customer Management
    Route::resource('customers', CustomerController::class)->except(['create', 'show', 'edit']);
    Route::get('/customers/search', [CustomerController::class, 'search'])->name('customers.search');

    // Finance Hub
    Route::get('/finance', [FinanceController::class, 'index'])->name('finance.index');
    Route::post('/payments', [PaymentController::class, 'store'])->name('payments.store');
    Route::get('/payments/documents/{document}', [PaymentController::class, 'downloadDocument'])->name('payments.documents.download');
    Route::post('/expenses', [ExpenseController::class, 'store'])->name('expenses.store');

    // Inventory (Read-only for FrontDesk)
    Route::get('/inventory', [InventoryController::class, 'index'])->name('inventory.index');

    // Production Queue (View-only for FrontDesk)
    Route::get('/production', [ProductionQueueController::class, 'index'])->name('production.index');

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unread-count');
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.mark-read');
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy');

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::prefix('designer')->middleware(['auth', 'role:admin,Designer'])->name('designer.')->group(function () {
    // Designer Dashboard
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    // Mock-ups Management
    Route::get('/mock-ups', [MockupsController::class, 'index'])->name('mockups.index');
    Route::get('/mock-ups/{id}', [MockupsController::class, 'show'])->name('mockups.show');
    Route::post('/mock-ups/{id}/upload', [MockupsController::class, 'uploadMockup'])->name('mockups.upload');
    Route::post('/mock-ups/{id}/approve', [MockupsController::class, 'approve'])->name('mockups.approve');
    Route::post('/mock-ups/{id}/revision', [MockupsController::class, 'requestRevision'])->name('mockups.revision');
    Route::get('/mock-ups/files/{id}/download', [MockupsController::class, 'downloadFile'])->name('mockups.download');

    // Tickets (View-only for context)
    Route::get('/tickets', [TicketController::class, 'index'])->name('tickets.index');
    Route::get('/tickets/{ticket}', [TicketController::class, 'show'])->name('tickets.show');

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unread-count');
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.mark-read');
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy');

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::prefix('production')->middleware(['auth', 'role:admin,Production'])->name('production.')->group(function () {
    // Production Dashboard
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    // Production Queue Management
    Route::get('/queue', [ProductionQueueController::class, 'index'])->name('queue.index');
    Route::post('/queue/{id}/start', [ProductionQueueController::class, 'startProduction'])->name('queue.start');
    Route::post('/queue/{id}/update', [ProductionQueueController::class, 'updateProgress'])->name('queue.update');
    Route::post('/queue/{id}/complete', [ProductionQueueController::class, 'markCompleted'])->name('queue.complete');
    Route::post('/queue/{id}/record-stock', [ProductionQueueController::class, 'recordStockConsumption'])->name('queue.record-stock');

    // Inventory (View for stock consumption)
    Route::get('/inventory', [InventoryController::class, 'index'])->name('inventory.index');

    // Purchase Orders
    Route::get('/purchase-orders', [PurchaseOrderController::class, 'index'])->name('purchase-orders.index');
    Route::get('/purchase-orders/create', [PurchaseOrderController::class, 'create'])->name('purchase-orders.create');
    Route::post('/purchase-orders', [PurchaseOrderController::class, 'store'])->name('purchase-orders.store');
    Route::get('/purchase-orders/{id}', [PurchaseOrderController::class, 'show'])->name('purchase-orders.show');
    Route::put('/purchase-orders/{id}', [PurchaseOrderController::class, 'update'])->name('purchase-orders.update');
    Route::delete('/purchase-orders/{id}', [PurchaseOrderController::class, 'destroy'])->name('purchase-orders.destroy');
    Route::post('/purchase-orders/{id}/approve', [PurchaseOrderController::class, 'approve'])->name('purchase-orders.approve');
    Route::post('/purchase-orders/{id}/mark-ordered', [PurchaseOrderController::class, 'markOrdered'])->name('purchase-orders.mark-ordered');
    Route::post('/purchase-orders/{id}/receive', [PurchaseOrderController::class, 'receive'])->name('purchase-orders.receive');
    Route::post('/purchase-orders/{id}/cancel', [PurchaseOrderController::class, 'cancel'])->name('purchase-orders.cancel');

    // Tickets (View-only for context)
    Route::get('/tickets', [TicketController::class, 'index'])->name('tickets.index');
    Route::get('/tickets/{ticket}', [TicketController::class, 'show'])->name('tickets.show');

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unread-count');
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.mark-read');
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy');

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

/*
|--------------------------------------------------------------------------
| Fallback Route - Redirect to appropriate dashboard based on role
|--------------------------------------------------------------------------
*/

Route::get('/dashboard', function () {
    if (!auth()->check()) {
        return redirect()->route('login');
    }

    $user = auth()->user();

    // Redirect to appropriate dashboard based on role
    if ($user->hasRole('admin')) {
        return redirect()->route('admin.dashboard');
    } elseif ($user->hasRole('FrontDesk')) {
        return redirect()->route('frontdesk.dashboard');
    } elseif ($user->hasRole('Designer')) {
        return redirect()->route('designer.dashboard');
    } elseif ($user->hasRole('Production')) {
        return redirect()->route('production.dashboard');
    }

    // Default fallback
    return redirect()->route('home');
})->middleware('auth')->name('dashboard');

// Legacy tracking route (kept for backward compatibility)
Route::get('/tracking', function () {
    return redirect()->route('track');
});

require __DIR__ . '/auth.php';
