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
use App\Http\Controllers\PublicOrderController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\SettingsController;
use App\Models\JobCategory;
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

// Order tracking (public)
Route::get('/track', function () {
    return view('tracking');
})->name('track');

// Public API for ticket search
Route::post('/api/public/tickets/search', [PublicTicketController::class, 'search'])
    ->middleware('throttle:api')
    ->name('public.tickets.search');

// Public API for orders
Route::post('/api/public/orders/customer/find-or-create', [PublicOrderController::class, 'findOrCreateCustomer'])
    ->middleware('throttle:api')
    ->name('public.orders.customer.find-or-create');

Route::post('/api/public/orders', [PublicOrderController::class, 'storeOrder'])
    ->middleware('throttle:api')
    ->name('public.orders.store');

// About page (public)
Route::get('/orders', function () {
    $jobCategories = JobCategory::with(['jobTypes' => function ($query) {
        $query->where('is_active', true)
            ->with(['priceTiers', 'sizeRates', 'promoRules'])
            ->orderBy('sort_order')
            ->orderBy('name');
    }])->orderBy('name')->get();

    return Inertia::render('Public/Orders', [
        'jobCategories' => $jobCategories
    ]);
})->name('orders');


// Notifications
Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unread-count');
Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.mark-read');
Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');
Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy');

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
    Route::post('/payments/{payment}/clear', [PaymentController::class, 'clear'])->name('payments.clear');
    Route::post('/payments/{payment}/reject', [PaymentController::class, 'reject'])->name('payments.reject');
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

    // Production Queue (Admin can access - Legacy routes)
    Route::get('/production', [ProductionQueueController::class, 'index'])->name('production.index');
    Route::post('/production/{id}/start', [ProductionQueueController::class, 'startProduction'])->name('production.start');
    Route::post('/production/{id}/update', [ProductionQueueController::class, 'updateProgress'])->name('production.update');
    Route::post('/production/{id}/complete', [ProductionQueueController::class, 'markCompleted'])->name('production.complete');
    Route::post('/production/{id}/record-stock', [ProductionQueueController::class, 'recordStockConsumption'])->name('production.record-stock');
    Route::post('/production/{id}/assign-users', [ProductionQueueController::class, 'assignUsers'])->name('production.assign-users');

    // New Workflow Routes (Admin can access all)
    Route::get('/production/tickets/all', [ProductionQueueController::class, 'allTickets'])->name('production.tickets.all');
    Route::post('/production/tickets/{ticket}/assign-workflow', [ProductionQueueController::class, 'assignWorkflow'])->name('production.tickets.assign-workflow');
    Route::get('/production/workflow/{workflowStep}', [ProductionQueueController::class, 'workflowView'])
        ->where('workflowStep', '(printing|lamination_heatpress|cutting|sewing|dtf_press|qa)')
        ->name('production.workflow.view');
    Route::get('/production/completed', [ProductionQueueController::class, 'completedTickets'])->name('production.completed');

    // Reports & Analytics
    Route::get('/reports', [App\Http\Controllers\ReportsController::class, 'index'])->name('reports');
    Route::post('/reports/export-pdf', [App\Http\Controllers\ReportsController::class, 'exportPdf'])->name('reports.export-pdf');

    // Settings
    Route::get('/settings', [SettingsController::class, 'index'])->name('settings');
    Route::post('/settings', [SettingsController::class, 'update'])->name('settings.update');

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
    Route::get('/users/{user}/activity-logs', [UserController::class, 'getActivityLogs'])->name('users.activity-logs');

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Shared routes for all authenticated users (password update)
Route::middleware('auth')->group(function () {
    Route::put('/user/password', [ProfileController::class, 'updatePassword'])->name('user.password.update');
});

Route::prefix('frontdesk')->middleware(['auth', 'role:admin,FrontDesk'])->name('frontdesk.')->group(function () {
    // Front Desk Dashboard
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    // Tickets Management
    Route::patch('/tickets/{ticket}/verify-payment', [TicketController::class, 'verifyPayment'])->name('tickets.verify-payment');
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
    Route::post('/payments/{payment}/clear', [PaymentController::class, 'clear'])->name('payments.clear');
    Route::post('/payments/{payment}/reject', [PaymentController::class, 'reject'])->name('payments.reject');
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
    Route::post('/mock-ups/{id}/claim', [MockupsController::class, 'claimTicket'])->name('mockups.claim');
    Route::post('/mock-ups/{id}/release', [MockupsController::class, 'releaseTicket'])->name('mockups.release');

    // // Tickets (View-only for context)
    // Route::get('/tickets', [TicketController::class, 'index'])->name('tickets.index');
    // Route::get('/tickets/{ticket}', [TicketController::class, 'show'])->name('tickets.show');

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

    // Production Queue Management (Legacy - kept for backward compatibility)
    Route::get('/queue', [ProductionQueueController::class, 'index'])->name('queue.index');
    Route::post('/queue/{id}/start', [ProductionQueueController::class, 'startProduction'])->name('queue.start');
    Route::post('/queue/{id}/update', [ProductionQueueController::class, 'updateProgress'])->name('queue.update');
    Route::post('/queue/{id}/complete', [ProductionQueueController::class, 'markCompleted'])->name('queue.complete');
    Route::post('/queue/{id}/record-stock', [ProductionQueueController::class, 'recordStockConsumption'])->name('queue.record-stock');
    Route::post('/queue/{id}/assign-users', [ProductionQueueController::class, 'assignUsers'])->name('queue.assign-users');

    // New Workflow-Based Routes
    // All Tickets View (Production Head only)
    Route::get('/tickets/all', [ProductionQueueController::class, 'allTickets'])
        ->middleware('production_head')
        ->name('tickets.all');

    // Assign users to workflow steps (Production Head only)
    Route::post('/tickets/{ticket}/assign-workflow', [ProductionQueueController::class, 'assignWorkflow'])
        ->middleware('production_head')
        ->name('tickets.assign-workflow');

    // Workflow-specific views
    Route::get('/workflow/{workflowStep}', [ProductionQueueController::class, 'workflowView'])
        ->where('workflowStep', '(printing|lamination_heatpress|cutting|sewing|dtf_press|qa)')
        ->name('workflow.view');

    Route::post('/workflow/{workflowStep}/start/{ticket}', [ProductionQueueController::class, 'startWorkflow'])
        ->where('workflowStep', '(printing|lamination_heatpress|cutting|sewing|dtf_press|qa)')
        ->name('workflow.start');

    Route::post('/workflow/{workflowStep}/update/{ticket}', [ProductionQueueController::class, 'updateWorkflow'])
        ->where('workflowStep', '(printing|lamination_heatpress|cutting|sewing|dtf_press|qa)')
        ->name('workflow.update');

    Route::post('/workflow/{workflowStep}/complete/{ticket}', [ProductionQueueController::class, 'completeWorkflow'])
        ->where('workflowStep', '(printing|lamination_heatpress|cutting|sewing|dtf_press|qa)')
        ->name('workflow.complete');

    // Completed tickets
    Route::get('/completed', [ProductionQueueController::class, 'completedTickets'])->name('completed');

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
    Route::get('/files/{id}/download', [MockupsController::class, 'downloadFile'])->name('files.download');

    // Reports
    Route::get('/reports', [App\Http\Controllers\ProductionReportController::class, 'index'])->name('reports');

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

Route::prefix('cashier')->middleware(['auth', 'role:admin,Cashier'])->name('cashier.')->group(function () {
    // Cashier Dashboard
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    // Finance Hub
    Route::get('/finance', [FinanceController::class, 'index'])->name('finance.index');
    Route::post('/payments', [PaymentController::class, 'store'])->name('payments.store');
    Route::post('/payments/{payment}/clear', [PaymentController::class, 'clear'])->name('payments.clear');
    Route::post('/payments/{payment}/reject', [PaymentController::class, 'reject'])->name('payments.reject');
    Route::post('/payments/{payment}/clear', [PaymentController::class, 'clear'])->name('payments.clear');
    Route::post('/payments/{payment}/reject', [PaymentController::class, 'reject'])->name('payments.reject');
    Route::get('/payments/documents/{document}', [PaymentController::class, 'downloadDocument'])->name('payments.documents.download');
    Route::post('/expenses', [ExpenseController::class, 'store'])->name('expenses.store');

    // Tickets (Read-only view for payment lookup)
    Route::get('/tickets', [TicketController::class, 'index'])->name('tickets.index');
    Route::get('/tickets/{ticket}', [TicketController::class, 'show'])->name('tickets.show');

    // Customer Management
    Route::resource('customers', CustomerController::class)->except(['create', 'show', 'edit']);
    Route::get('/customers/search', [CustomerController::class, 'search'])->name('customers.search');

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
    } elseif ($user->hasRole('Cashier')) {
        return redirect()->route('cashier.dashboard');
    }

    // Default fallback
    return redirect()->route('home');
})->middleware('auth')->name('dashboard');

// Legacy tracking route (kept for backward compatibility)
Route::get('/tracking', function () {
    return redirect()->route('track');
});

/*
|--------------------------------------------------------------------------
| Error Page Test Routes (Remove in Production)
|--------------------------------------------------------------------------
| These routes allow you to test the custom error pages during development.
| Comment out or remove these routes before deploying to production.
*/

if (config('app.debug')) {
    Route::get('/test-error-401', fn() => abort(401))->name('test.error.401');
    Route::get('/test-error-403', fn() => abort(403))->name('test.error.403');
    Route::get('/test-error-404', fn() => abort(404))->name('test.error.404');
    Route::get('/test-error-419', fn() => abort(419))->name('test.error.419');
    Route::get('/test-error-429', fn() => abort(429))->name('test.error.429');
    Route::get('/test-error-500', fn() => abort(500))->name('test.error.500');
    Route::get('/test-error-503', fn() => abort(503))->name('test.error.503');
}

require __DIR__ . '/auth.php';
