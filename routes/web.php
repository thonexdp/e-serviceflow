<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\TicketController;
use App\Http\Controllers\DashboardController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

// Route::get('/', function () {
//     return Inertia::render('Welcome', [
//         'canLogin' => Route::has('login'),
//         'canRegister' => Route::has('register'),
//         'laravelVersion' => Application::VERSION,
//         'phpVersion' => PHP_VERSION,
//     ]);
// });

// Route::get('/dashboard', function () {
//     return Inertia::render('Dashboard');
// })->middleware(['auth', 'verified'])->name('dashboard');

// Root route - redirect to dashboard (auth middleware will handle login redirect)
Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }
    return redirect()->route('login');
});

// Protected routes - require authentication
Route::middleware('auth')->group(function () {
    // Dashboard - accessible to all authenticated users
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Profile routes
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Tickets Routes - accessible to all authenticated users
    Route::get('/tickets', [TicketController::class, 'index'])->name('tickets.index');
    Route::post('/tickets', [TicketController::class, 'store'])->name('tickets.store');
    Route::get('/tickets/{ticket}', [TicketController::class, 'show'])->name('tickets.show');
    Route::post('/tickets/{ticket}', [TicketController::class, 'update'])->name('tickets.update');
    Route::delete('/tickets/{ticket}', [TicketController::class, 'destroy'])->name('tickets.destroy');

    // Customer routes - accessible to all authenticated users
    Route::resource('customers', CustomerController::class)->except(['create', 'show', 'edit']);
    Route::get('/customers/search', [CustomerController::class, 'search'])->name('customers.search');

    // Mock-ups - accessible to FrontDesk, Designer, and Admin
    Route::get('/mock-ups', function () {
        return Inertia::render('Mock-ups');
    })->middleware('role:admin,FrontDesk,Designer')->name('mockups');

    // Production Queue - accessible to Production, FrontDesk, and Admin
    Route::get('/production', function () {
        return Inertia::render('Production-Queue');
    })->middleware('role:admin,FrontDesk,Production')->name('production-queue');

    // Reports - accessible to Admin only
    Route::get('/reports', function () {
        return Inertia::render('Reports');
    })->middleware('role:admin')->name('reports');

    // Settings - accessible to Admin only
    Route::get('/settings', function () {
        return Inertia::render('Settings');
    })->middleware('role:admin')->name('settings');
});

// Route::get('/', function () {
//         return Inertia::render("Dashboard/Production");

//         return Inertia::render("Dashboard/Graphic");

//         return Inertia::render("Dashboard/FrontDesk");

//         return Inertia::render("Dashboard/Admin");



//     return Inertia::render('Dashboard', [
//         'user' => [
//             'name' => 'John',
//             'avatar' => 'images/avatar/1.jpg'
//         ],
//         'notifications' => [
//             [
//                 'id' => 1,
//                 'user' => 'Mr. John',
//                 'message' => '5 members joined today',
//                 'time' => '02:34 PM',
//                 'avatar' => 'images/avatar/3.jpg',
//                 'unread' => false
//             ],
//             [
//                 'id' => 2,
//                 'user' => 'Mariam',
//                 'message' => 'likes a photo of you',
//                 'time' => '02:34 PM',
//                 'avatar' => 'images/avatar/3.jpg',
//                 'unread' => false
//             ]
//         ],
//         'messages' => [
//             [
//                 'id' => 1,
//                 'user' => 'Michael Qin',
//                 'message' => 'Hi Teddy, Just wanted to let you ...',
//                 'time' => '02:34 PM',
//                 'avatar' => 'images/avatar/1.jpg',
//                 'unread' => true
//             ],
//             [
//                 'id' => 2,
//                 'user' => 'Mr. John',
//                 'message' => 'Hi Teddy, Just wanted to let you ...',
//                 'time' => '02:34 PM',
//                 'avatar' => 'images/avatar/2.jpg',
//                 'unread' => true
//             ]
//         ]
//     ]);
// })->name('dashboard');


Route::get('/tracking', function () {
    return Inertia::render('Tracking');
})->name('tracking');

require __DIR__.'/auth.php';
