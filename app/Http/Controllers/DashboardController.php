<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\Payment;
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
                'filters' => [
                    'date_range' => $request->input('date_range', 'this_month'),
                ],
                'statistics' => function () use ($request) {
                    $dateRange = $request->input('date_range', 'this_month');
                    $startDate = now()->startOfMonth();
                    $endDate = now()->endOfMonth();

                    switch ($dateRange) {
                        case 'today':
                            $startDate = now()->startOfDay();
                            $endDate = now()->endOfDay();
                            break;
                        case 'this_week':
                            $startDate = now()->startOfWeek();
                            $endDate = now()->endOfWeek();
                            break;
                        case 'this_month':
                            $startDate = now()->startOfMonth();
                            $endDate = now()->endOfMonth();
                            break;
                        case 'last_30_days':
                            $startDate = now()->subDays(30);
                            $endDate = now();
                            break;
                        case 'this_year':
                            $startDate = now()->startOfYear();
                            $endDate = now()->endOfYear();
                            break;
                    }

                    return [
                        'newTickets' => Ticket::where('status', 'pending')
                            ->whereBetween('created_at', [$startDate, $endDate])
                            ->count(),
                        'paymentPending' => Ticket::whereIn('payment_status', ['pending', 'partial'])
                            ->whereBetween('created_at', [$startDate, $endDate])
                            ->count(),
                        'completed' => Ticket::where('status', 'completed')
                            ->whereBetween('updated_at', [$startDate, $endDate])
                            ->count(),
                        'inProgress' => Ticket::whereIn('status', ['in_production', 'ready_to_print'])
                            ->whereBetween('created_at', [$startDate, $endDate])
                            ->count(),
                    ];
                },
                'ticketsByStatus' => [
                    'pendingPayment' => Ticket::with('customer')
                        ->whereIn('payment_status', ['pending', 'partial'])
                        ->latest()
                        ->take(5)
                        ->get()
                        ->map(fn($t) => [
                            'id' => $t->id,
                            'trackingNumber' => $t->ticket_number,
                            'customer' => $t->customer->name ?? 'Unknown',
                        ]),
                    'inProgress' => Ticket::with('customer')
                        ->whereIn('status', ['in_production', 'ready_to_print'])
                        ->latest()
                        ->take(5)
                        ->get()
                        ->map(fn($t) => [
                            'id' => $t->id,
                            'trackingNumber' => $t->ticket_number,
                            'customer' => $t->customer->name ?? 'Unknown',
                        ]),
                    'readyForPickup' => Ticket::with('customer')
                        ->where('status', 'completed')
                        ->latest()
                        ->take(5)
                        ->get()
                        ->map(fn($t) => [
                            'id' => $t->id,
                            'trackingNumber' => $t->ticket_number,
                            'customer' => $t->customer->name ?? 'Unknown',
                        ]),
                    'completed' => Ticket::with('customer')
                        ->where('status', 'completed')
                        ->whereDate('updated_at', today())
                        ->latest()
                        ->take(5)
                        ->get()
                        ->map(fn($t) => [
                            'id' => $t->id,
                            'trackingNumber' => $t->ticket_number,
                            'customer' => $t->customer->name ?? 'Unknown',
                        ]),
                ],
                'allTickets' => Ticket::with('customer')
                    ->latest()
                    ->take(10)
                    ->get()
                    ->map(fn($t) => [
                        'id' => $t->id,
                        'trackingNumber' => $t->ticket_number,
                        'customer' => ['name' => $t->customer->name ?? 'Unknown'],
                        'description' => $t->description,
                        'dueDate' => $t->due_date,
                        'status' => $t->status,
                        'statusLabel' => ucfirst(str_replace('_', ' ', $t->status)),
                        'statusColor' => $this->getStatusColor($t->status),
                        'totalAmount' => $t->total_amount,
                    ]),
                'payments' => Ticket::whereIn('payment_status', ['pending', 'partial'])
                    ->with('customer')
                    ->latest()
                    ->take(10)
                    ->get()
                    ->map(fn($t) => [
                        'id' => $t->id,
                        'ticketId' => $t->id,
                        'trackingNumber' => $t->ticket_number,
                        'customer' => ['name' => $t->customer->name ?? 'Unknown', 'id' => $t->customer_id],
                        'amountDue' => $t->outstanding_balance,
                        'dueDate' => $t->due_date,
                        'paymentStatus' => $t->payment_status,
                        'paymentDate' => null,
                    ]),
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

    private function getStatusColor($status)
    {
        return match ($status) {
            'pending' => 'primary',
            'payment_pending' => 'warning',
            'ready_to_print', 'in_production' => 'info',
            'completed', 'approved' => 'success',
            'cancelled', 'rejected' => 'danger',
            default => 'secondary',
        };
    }
}
