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
    ->middleware('throttle:5,1')
    ->name('public.orders.store');

Route::get('/csrf-token', function () {
    return response()->json(['csrf_token' => csrf_token()]);
})->name('csrf.token');

Route::get('/orders', function () {
    $jobCategories = JobCategory::with(['jobTypes' => function ($query) {
        $query->where('is_active', true)
            ->where('show_in_customer_view', true)
            ->with(['priceTiers', 'sizeRates', 'promoRules'])
            ->orderBy('sort_order')
            ->orderBy('name');
    }])->orderBy('name')->get();

    $branches = \App\Models\Branch::where('is_active', true)
        ->where('can_accept_orders', true)
        ->orderBy('sort_order')
        ->orderBy('name')
        ->get(['id', 'name', 'email', 'code', 'address', 'can_produce']);

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
    Route::get('/tickets/{ticket}/check-deletion', [TicketController::class, 'checkDeletion'])->name('tickets.check-deletion');

    // Customer Management
    Route::resource('customers', CustomerController::class)->except(['create', 'show', 'edit']);
    Route::get('/customers/search', [CustomerController::class, 'search'])->name('customers.search');
    Route::get('/customers/{customer}/check-deletion', [CustomerController::class, 'checkDeletion'])->name('customers.check-deletion');

    // Job Categories Management
    Route::resource('job-categories', JobCategoryController::class)->except(['create', 'show', 'edit']);

    // Job Types Management
    Route::resource('job-types', JobTypeController::class)->except(['create', 'show', 'edit']);
    Route::get('/job-types/{jobType}/check-deletion', [JobTypeController::class, 'checkDeletion'])->name('job-types.check-deletion');

    // Finance Hub
    Route::get('/finance', [FinanceController::class, 'index'])->name('finance.index');
    Route::post('/payments', [PaymentController::class, 'store'])->name('payments.store');
    Route::post('/payments/{payment}/clear', [PaymentController::class, 'clear'])->name('payments.clear');
    Route::post('/payments/{payment}/reject', [PaymentController::class, 'reject'])->name('payments.reject');
    Route::post('/payments/{payment}/upload', [PaymentController::class, 'uploadAttachment'])->name('payments.upload');
    Route::get('/payments/documents/{document}', [PaymentController::class, 'downloadDocument'])->name('payments.documents.download');
    Route::post('/expenses', [ExpenseController::class, 'store'])->name('expenses.store');

    // Inventory Management
    Route::get('/inventory', [InventoryController::class, 'index'])->name('inventory.index');
    Route::post('/inventory', [InventoryController::class, 'store'])->name('inventory.store');
    Route::put('/inventory/{id}', [InventoryController::class, 'update'])->name('inventory.update');
    Route::delete('/inventory/{id}', [InventoryController::class, 'destroy'])->name('inventory.destroy');
    Route::get('/inventory/{id}/check-deletion', [InventoryController::class, 'checkDeletion'])->name('inventory.check-deletion');
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
    Route::post('/mock-ups/{id}/claim', [MockupsController::class, 'claimTicket'])->name('mockups.claim');
    Route::post('/mock-ups/{id}/release', [MockupsController::class, 'releaseTicket'])->name('mockups.release');
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
        ->where('workflowStep', '(printing|lamination_heatpress|cutting|sewing|dtf_press|embroidery|knitting|lasser_cutting|qa)')
        ->name('production.workflow.view');
    Route::get('/production/completed', [ProductionQueueController::class, 'completedTickets'])->name('production.completed');
    Route::get('/workflow/{workflowStep}', [ProductionQueueController::class, 'workflowView'])
        ->where('workflowStep', '(printing|lamination_heatpress|cutting|sewing|dtf_press|embroidery|knitting|lasser_cutting|qa)')
        ->name('workflow.view');

    Route::post('/workflow/{workflowStep}/start/{ticket}', [ProductionQueueController::class, 'startWorkflow'])
        ->where('workflowStep', '(printing|lamination_heatpress|cutting|sewing|dtf_press|embroidery|knitting|lasser_cutting|qa)')
        ->name('workflow.start');

    Route::post('/workflow/{workflowStep}/update/{ticket}', [ProductionQueueController::class, 'updateWorkflow'])
        ->where('workflowStep', '(printing|lamination_heatpress|cutting|sewing|dtf_press|embroidery|knitting|lasser_cutting|qa)')
        ->name('workflow.update');

    Route::post('/workflow/{workflowStep}/complete/{ticket}', [ProductionQueueController::class, 'completeWorkflow'])
        ->where('workflowStep', '(printing|lamination_heatpress|cutting|sewing|dtf_press|embroidery|knitting|lasser_cutting|qa)')
        ->name('workflow.complete');

    // Reports & Analytics
    Route::get('/reports', [App\Http\Controllers\ReportsController::class, 'index'])->name('reports');
    Route::post('/reports/export-pdf', [App\Http\Controllers\ReportsController::class, 'exportPdf'])->name('reports.export-pdf');
    Route::get('/files/{id}/download', [MockupsController::class, 'downloadFile'])->name('files.download');

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
    Route::get('/branches/{branch}/check-deletion', [App\Http\Controllers\BranchController::class, 'checkDeletion'])->name('branches.check-deletion');

    // Branch API endpoints
    Route::get('/api/branches/active', [App\Http\Controllers\BranchController::class, 'getActiveBranches'])->name('api.branches.active');
    Route::get('/api/branches/order', [App\Http\Controllers\BranchController::class, 'getOrderBranches'])->name('api.branches.order');
    Route::get('/api/branches/production', [App\Http\Controllers\BranchController::class, 'getProductionBranches'])->name('api.branches.production');
    Route::get('/users/{user}/activity-logs', [UserController::class, 'getActivityLogs'])->name('users.activity-logs');

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Production Queue Management (Legacy - kept for backward compatibility)
    Route::get('/queue', [ProductionQueueController::class, 'index'])->name('queue.index');
    Route::post('/queue/{id}/start', [ProductionQueueController::class, 'startProduction'])->name('queue.start');
    Route::post('/queue/{id}/update', [ProductionQueueController::class, 'updateProgress'])->name('queue.update');
    Route::post('/queue/{id}/complete', [ProductionQueueController::class, 'markCompleted'])->name('queue.complete');
    Route::post('/queue/{id}/record-stock', [ProductionQueueController::class, 'recordStockConsumption'])->name('queue.record-stock');
    Route::post('/queue/{id}/assign-users', [ProductionQueueController::class, 'assignUsers'])->name('queue.assign-users');
});

Route::middleware('auth')->group(function () {
    Route::put('/user/password', [ProfileController::class, 'updatePassword'])->name('user.password.update');
    Route::get('/delivery-receipts', [TicketController::class, 'deliveryReceipts'])->name('delivery-receipts.index');
    Route::get('/api/tickets/search', [TicketController::class, 'searchByTicketNumber'])->name('api.tickets.search');
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
    Route::get('/tickets/{ticket}/check-deletion', [TicketController::class, 'checkDeletion'])->name('tickets.check-deletion');
    Route::patch('/tickets/{ticket}/update-status', [TicketController::class, 'updateStatus'])->name('tickets.update-status');
    Route::patch('/tickets/{ticket}/update-payment', [TicketController::class, 'updatePayment'])->name('tickets.update-payment');
    Route::patch('/tickets/{ticket}/verify-payment', [TicketController::class, 'verifyPayment'])->name('tickets.verify-payment');

    // Customer Management
    Route::resource('customers', CustomerController::class)->except(['create', 'show', 'edit']);
    Route::get('/customers/search', [CustomerController::class, 'search'])->name('customers.search');
    Route::get('/customers/{customer}/check-deletion', [CustomerController::class, 'checkDeletion'])->name('customers.check-deletion');


    // Finance Hub
    Route::get('/finance', [FinanceController::class, 'index'])->name('finance.index');
    Route::post('/payments', [PaymentController::class, 'store'])->name('payments.store');
    Route::post('/payments/{payment}/clear', [PaymentController::class, 'clear'])->name('payments.clear');
    Route::post('/payments/{payment}/reject', [PaymentController::class, 'reject'])->name('payments.reject');
    Route::post('/payments/{payment}/upload', [PaymentController::class, 'uploadAttachment'])->name('payments.upload');
    Route::get('/payments/documents/{document}', [PaymentController::class, 'downloadDocument'])->name('payments.documents.download');
    Route::post('/expenses', [ExpenseController::class, 'store'])->name('expenses.store');

    // Inventory (Read-only for FrontDesk)
    Route::get('/inventory', [InventoryController::class, 'index'])->name('inventory.index');
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


    // Mock-ups Management
    Route::get('/mock-ups', [MockupsController::class, 'index'])->name('mockups.index');
    Route::get('/mock-ups/{id}', [MockupsController::class, 'show'])->name('mockups.show');
    Route::post('/mock-ups/{id}/upload', [MockupsController::class, 'uploadMockup'])->name('mockups.upload');
    Route::post('/mock-ups/{id}/approve', [MockupsController::class, 'approve'])->name('mockups.approve');
    Route::post('/mock-ups/{id}/revision', [MockupsController::class, 'requestRevision'])->name('mockups.revision');
    Route::get('/mock-ups/files/{id}/download', [MockupsController::class, 'downloadFile'])->name('mockups.download');
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

    // TV/Monitor View (same as dashboard but with dedicated route)
    Route::get('/tvview', [DashboardController::class, 'tvView'])->name('tvview');

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
        ->where('workflowStep', '(printing|lamination_heatpress|cutting|sewing|dtf_press|embroidery|knitting|lasser_cutting|qa)')
        ->name('workflow.view');

    Route::post('/workflow/{workflowStep}/start/{ticket}', [ProductionQueueController::class, 'startWorkflow'])
        ->where('workflowStep', '(printing|lamination_heatpress|cutting|sewing|dtf_press|embroidery|knitting|lasser_cutting|qa)')
        ->name('workflow.start');

    Route::post('/workflow/{workflowStep}/update/{ticket}', [ProductionQueueController::class, 'updateWorkflow'])
        ->where('workflowStep', '(printing|lamination_heatpress|cutting|sewing|dtf_press|embroidery|knitting|lasser_cutting|qa)')
        ->name('workflow.update');

    Route::post('/workflow/{workflowStep}/complete/{ticket}', [ProductionQueueController::class, 'completeWorkflow'])
        ->where('workflowStep', '(printing|lamination_heatpress|cutting|sewing|dtf_press|embroidery|knitting|lasser_cutting|qa)')
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
    // Route::post('/payments/{payment}/reject', [PaymentController::class, 'reject'])->name('payments.reject');
    Route::get('/payments/documents/{document}', [PaymentController::class, 'downloadDocument'])->name('payments.documents.download');
    Route::post('/expenses', [ExpenseController::class, 'store'])->name('expenses.store');
    Route::post('/payments/{payment}/upload', [PaymentController::class, 'uploadAttachment'])->name('payments.upload');

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
    $results = [
        'timestamp' => now()->toDateTimeString(),
        'environment' => app()->environment(),
        'config' => [],
        'connection_test' => [],
        'upload_test' => [],
        'url_test' => [],
    ];

    // Get configuration - use helper if available, otherwise determine from env
    $diskName = function_exists('storage_disk')
        ? storage_disk()
        : (app()->environment('production') ? 's3' : 'public');
    $config = config('filesystems.disks.' . $diskName);

    $results['config'] = [
        'active_disk' => $diskName,
        'default_disk' => config('filesystems.default'),
        'bucket' => $config['bucket'] ?? 'N/A',
        'region' => $config['region'] ?? 'N/A',
        'endpoint' => $config['endpoint'] ?? 'N/A',
        'has_key' => !empty($config['key']),
        'has_secret' => !empty($config['secret']),
        'visibility' => $config['visibility'] ?? 'N/A',
    ];

    try {
        // Test 1: Check if we can connect and list files (or at least access the disk)
        $storage = function_exists('storage')
            ? storage()
            : Storage::disk($diskName);
        $results['connection_test'] = [
            'status' => 'success',
            'message' => 'Storage disk initialized successfully',
        ];
    } catch (\Exception $e) {
        $results['connection_test'] = [
            'status' => 'error',
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ];
        return response()->json($results, 500);
    }

    try {
        // Test 2: Upload a test file
        $testFilename = 'debug/test-' . time() . '.txt';
        $testContent = 'Storage connection test - ' . now()->toDateTimeString() . PHP_EOL;
        $testContent .= 'Environment: ' . app()->environment() . PHP_EOL;
        $testContent .= 'Disk: ' . $diskName . PHP_EOL;

        $uploaded = $storage->put($testFilename, $testContent);

        $results['upload_test'] = [
            'status' => 'success',
            'filename' => $testFilename,
            'path' => $uploaded,
            'message' => 'File uploaded successfully',
        ];

        // Test 3: Check if file exists (use the returned path from put())
        // Note: DigitalOcean Spaces sometimes has issues with exists() check
        // So we'll try to read the file instead as a more reliable check
        $checkPath = $uploaded ?: $testFilename;
        try {
            $exists = $storage->exists($checkPath);
            $results['upload_test']['file_exists'] = $exists;
            $results['upload_test']['checked_path'] = $checkPath;
        } catch (\Exception $e) {
            // If exists() fails, try reading the file as a workaround
            // This is a known issue with some S3-compatible services
            try {
                $testRead = $storage->get($checkPath);
                $results['upload_test']['file_exists'] = [
                    'status' => 'success (via read)',
                    'exists' => true,
                    'note' => 'exists() method failed, but file is accessible via get()',
                    'error' => $e->getMessage(),
                ];
            } catch (\Exception $readException) {
                $results['upload_test']['file_exists'] = [
                    'status' => 'warning',
                    'exists' => false,
                    'message' => 'exists() check failed: ' . $e->getMessage(),
                    'read_also_failed' => $readException->getMessage(),
                    'note' => 'File upload reported success, but verification failed. This may be a permissions issue.',
                ];
            }
        }

        // Test 4: Get file URL (use the returned path from put())
        try {
            $urlPath = $uploaded ?: $testFilename;
            $url = $storage->url($urlPath);
            $results['url_test'] = [
                'status' => 'success',
                'url' => $url,
                'url_path' => $urlPath,
                'message' => 'URL generated successfully',
            ];
        } catch (\Exception $e) {
            $results['url_test'] = [
                'status' => 'warning',
                'message' => $e->getMessage(),
                'attempted_path' => $uploaded ?: $testFilename,
            ];
        }

        // Test 5: Try to read the file back (use the returned path from put())
        try {
            $readPath = $uploaded ?: $testFilename;
            $readContent = $storage->get($readPath);
            $results['upload_test']['read_test'] = [
                'status' => 'success',
                'content_length' => strlen($readContent),
                'matches' => $readContent === $testContent,
                'read_path' => $readPath,
            ];
        } catch (\Exception $e) {
            $results['upload_test']['read_test'] = [
                'status' => 'error',
                'message' => $e->getMessage(),
                'attempted_path' => $uploaded ?: $testFilename,
            ];
        }

        // Clean up test file (optional - you might want to keep it for verification)
        // storage()->delete($testFilename);

    } catch (\Exception $e) {
        $results['upload_test'] = [
            'status' => 'error',
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ];
    }

    // Determine overall status
    $overallStatus = 'success';
    if (
        $results['connection_test']['status'] === 'error' ||
        $results['upload_test']['status'] === 'error'
    ) {
        $overallStatus = 'error';
    }

    $results['overall_status'] = $overallStatus;

    return response()->json($results, $overallStatus === 'success' ? 200 : 500);
})->middleware('auth')->name('debug.storage');


require __DIR__ . '/auth.php';
