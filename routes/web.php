<?php

use App\Http\Controllers\ProfileController;
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

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::get('/', function () {
        return Inertia::render("Dashboard/FrontDesk");

        return Inertia::render("Dashboard/Graphic");
        return Inertia::render("Dashboard/Production");
        return Inertia::render("Dashboard/Admin");

    return Inertia::render('Dashboard', [
        'user' => [
            'name' => 'John',
            'avatar' => 'images/avatar/1.jpg'
        ],
        'notifications' => [
            [
                'id' => 1,
                'user' => 'Mr. John',
                'message' => '5 members joined today',
                'time' => '02:34 PM',
                'avatar' => 'images/avatar/3.jpg',
                'unread' => false
            ],
            [
                'id' => 2,
                'user' => 'Mariam',
                'message' => 'likes a photo of you',
                'time' => '02:34 PM',
                'avatar' => 'images/avatar/3.jpg',
                'unread' => false
            ]
        ],
        'messages' => [
            [
                'id' => 1,
                'user' => 'Michael Qin',
                'message' => 'Hi Teddy, Just wanted to let you ...',
                'time' => '02:34 PM',
                'avatar' => 'images/avatar/1.jpg',
                'unread' => true
            ],
            [
                'id' => 2,
                'user' => 'Mr. John',
                'message' => 'Hi Teddy, Just wanted to let you ...',
                'time' => '02:34 PM',
                'avatar' => 'images/avatar/2.jpg',
                'unread' => true
            ]
        ]
    ]);
})->name('dashboard');

Route::get('/tickets', function () {
    return Inertia::render('Tickets/Tickets');
})->name('tickets');

Route::get('/customers', function () {
    return Inertia::render('Clients/Client');
})->name('customers');

Route::get('/mock-ups', function () {
    return Inertia::render('Mock-ups');
})->name('mockups');
Route::get('/production', function () {
    return Inertia::render('Production-Queue');
})->name('production-queue');

Route::get('/reports', function () {
    return Inertia::render('Reports');
})->name('reports');

Route::get('/settings', function () {
    return Inertia::render('Settings');
})->name('settings');

require __DIR__.'/auth.php';
