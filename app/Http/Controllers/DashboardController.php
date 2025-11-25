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
    protected $productionQueue;
    public function __construct(ProductionQueueController $productionQueue)
    {
        $this->productionQueue = $productionQueue;
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $data = [];

        if (!$user) {
            return redirect()->route('login');
        }
        if (strtolower(trim($user->role)) === "production") {
            $data = $this->productionQueue->getData($request);
        }

        return match ($user->role) {
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
                'tickets' => $data['tickets'],
                'stockItems' => $data['stockItems'],
                'filters' => $request->only(['search', 'status']),
                'summary' => $data['summary'],
            ]),
            default => Inertia::render('Dashboard/FrontDesk', [
                'user' => $user,
            ]),
        };
    }
}
