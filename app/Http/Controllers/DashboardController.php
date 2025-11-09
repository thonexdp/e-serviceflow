<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the dashboard based on user role.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        
        if (!$user) {
            return redirect()->route('login');
        }

        // Render dashboard based on user role
        return match($user->role) {
            'admin' => Inertia::render('Dashboard/Admin', [
                'user' => $user,
            ]),
            'FrontDesk' => Inertia::render('Dashboard/FrontDesk', [
                'user' => $user,
            ]),
            'Designer' => Inertia::render('Dashboard/Graphic', [
                'user' => $user,
            ]),
            'Production' => Inertia::render('Dashboard/Production', [
                'user' => $user,
            ]),
            default => Inertia::render('Dashboard/FrontDesk', [
                'user' => $user,
            ]),
        };
    }
}

