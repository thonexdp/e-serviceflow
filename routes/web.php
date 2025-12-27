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
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Public/Home');
})->name('home');

Route::get('/track', function () {
    return view('tracking');
})->name('track');

Route::post('/api/public/tickets/search', [PublicTicketController::class, 'search'])
    ->middleware('throttle:api')
    ->name('public.tickets.search');

Route::post('/api/public/orders/customer/find-or-create', [PublicOrderController::class, 'findOrCreateCustomer'])
    ->middleware('throttle:api')
    ->name('public.orders.customer.find-or-create');

Route::post('/api/public/orders', [PublicOrderController::class, 'storeOrder'])
    ->middleware('throttle:api')
    ->name('public.orders.store');

Route::get('/csrf-token', function () {
    return response()->json(['csrf_token' => csrf_token()]);
})->name('csrf.token');

Route::get('/orders', function () {
    $jobCategories = JobCategory::with(['jobTypes' => function ($query) {
        $query->where('is_active', true)
            ->with(['priceTiers', 'sizeRates', 'promoRules'])
            ->orderBy('sort_order')
            ->orderBy('name');
    }])->orderBy('name')->get();

    $branches = \App\Models\Branch::where('is_active', true)
        ->where('can_accept_orders', true)
        ->orderBy('sort_order')
        ->orderBy('name')
        ->get(['id', 'name', 'code', 'address', 'can_produce']);

    return Inertia::render('Public/Orders', [
        'jobCategories' => $jobCategories,
        'branches' => $branches
    ]);
})->name('orders');


Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unread-count');
Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.mark-read');
Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');
Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy');

Route::prefix('admin')->middleware(['auth', 'role:admin'])->name('admin.')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('/tickets', [TicketController::class, 'index'])->name('tickets.index');
    Route::post('/tickets', [TicketController::class, 'store'])->name('tickets.store');
    Route::get('/tickets/{ticket}', [TicketController::class, 'show'])->name('tickets.show');
    Route::put('/tickets/{ticket}', [TicketController::class, 'update'])->name('tickets.update');
    Route::delete('/tickets/{ticket}', [TicketController::class, 'destroy'])->name('tickets.destroy');
    Route::patch('/tickets/{ticket}/update-status', [TicketController::class, 'updateStatus'])->name('tickets.update-status');
    Route::patch('/tickets/{ticket}/update-payment', [TicketController::class, 'updatePayment'])->name('tickets.update-payment');
    Route::patch('/tickets/{ticket}/verify-payment', [TicketController::class, 'verifyPayment'])->name('tickets.verify-payment');

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

    // Branch Management
    Route::get('/branches', [App\Http\Controllers\BranchController::class, 'index'])->name('branches.index');
    Route::post('/branches', [App\Http\Controllers\BranchController::class, 'store'])->name('branches.store');
    Route::put('/branches/{branch}', [App\Http\Controllers\BranchController::class, 'update'])->name('branches.update');
    Route::delete('/branches/{branch}', [App\Http\Controllers\BranchController::class, 'destroy'])->name('branches.destroy');

    // Branch API endpoints
    Route::get('/api/branches/active', [App\Http\Controllers\BranchController::class, 'getActiveBranches'])->name('api.branches.active');
    Route::get('/api/branches/order', [App\Http\Controllers\BranchController::class, 'getOrderBranches'])->name('api.branches.order');
    Route::get('/api/branches/production', [App\Http\Controllers\BranchController::class, 'getProductionBranches'])->name('api.branches.production');
    Route::get('/users/{user}/activity-logs', [UserController::class, 'getActivityLogs'])->name('users.activity-logs');

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

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
    Route::patch('/tickets/{ticket}/verify-payment', [TicketController::class, 'verifyPayment'])->name('tickets.verify-payment');

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
    Route::get('/inventory/low-stock', [InventoryController::class, 'lowStock'])->name('inventory.low-stock');


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

    Route::get('/tickets/all', [ProductionQueueController::class, 'allTickets'])
        ->middleware('production_head')
        ->name('tickets.all');

    Route::post('/tickets/{ticket}/assign-workflow', [ProductionQueueController::class, 'assignWorkflow'])
        ->middleware('production_head')
        ->name('tickets.assign-workflow');

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

    Route::get('/completed', [ProductionQueueController::class, 'completedTickets'])->name('completed');

    Route::get('/inventory', [InventoryController::class, 'index'])->name('inventory.index');
    Route::post('/inventory', [InventoryController::class, 'store'])->name('inventory.store');
    Route::put('/inventory/{id}', [InventoryController::class, 'update'])->name('inventory.update');
    Route::delete('/inventory/{id}', [InventoryController::class, 'destroy'])->name('inventory.destroy');
    Route::post('/inventory/{id}/adjust', [InventoryController::class, 'adjustStock'])->name('inventory.adjust');
    Route::get('/inventory/{id}/movements', [InventoryController::class, 'movements'])->name('inventory.movements');
    Route::get('/inventory/low-stock', [InventoryController::class, 'lowStock'])->name('inventory.low-stock');

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

    Route::get('/tickets', [TicketController::class, 'index'])->name('tickets.index');
    Route::get('/tickets/{ticket}', [TicketController::class, 'show'])->name('tickets.show');
    Route::get('/files/{id}/download', [MockupsController::class, 'downloadFile'])->name('files.download');

    Route::get('/reports', [App\Http\Controllers\ProductionReportController::class, 'index'])->name('reports');

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
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('/finance', [FinanceController::class, 'index'])->name('finance.index');
    Route::post('/payments', [PaymentController::class, 'store'])->name('payments.store');
    Route::post('/payments/{payment}/clear', [PaymentController::class, 'clear'])->name('payments.clear');
    Route::post('/payments/{payment}/reject', [PaymentController::class, 'reject'])->name('payments.reject');
    Route::post('/payments/{payment}/clear', [PaymentController::class, 'clear'])->name('payments.clear');
    Route::post('/payments/{payment}/reject', [PaymentController::class, 'reject'])->name('payments.reject');
    Route::get('/payments/documents/{document}', [PaymentController::class, 'downloadDocument'])->name('payments.documents.download');
    Route::post('/expenses', [ExpenseController::class, 'store'])->name('expenses.store');

    Route::get('/tickets', [TicketController::class, 'index'])->name('tickets.index');
    Route::get('/tickets/{ticket}', [TicketController::class, 'show'])->name('tickets.show');

    Route::resource('customers', CustomerController::class)->except(['create', 'show', 'edit']);
    Route::get('/customers/search', [CustomerController::class, 'search'])->name('customers.search');

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

    return redirect()->route('home');
})->middleware('auth')->name('dashboard');

Route::get('/tracking', function () {
    return redirect()->route('track');
});

Route::get('/debug-storage', function () {

    // Check which disk is set in .env
    $disk = env('FILESYSTEM_DISK', 'public');

    // Try to write a test file
    $filename = 'debug-test.txt';
    $content = 'Hello World from ' . $disk . ' disk';

    try {
        Storage::disk($disk)->put($filename, $content);
        $url = Storage::disk($disk)->url($filename);

        return response()->json([
            'status' => 'success',
            'disk' => $disk,
            'file' => $filename,
            'url' => $url,
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'disk' => $disk,
            'message' => $e->getMessage(),
        ]);
    }
});


require __DIR__ . '/auth.php';
