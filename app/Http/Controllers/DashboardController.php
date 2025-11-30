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
                        default:
                            // Handle year_YYYY format
                            if (str_starts_with($dateRange, 'year_')) {
                                $year = (int) str_replace('year_', '', $dateRange);
                                $startDate = now()->setYear($year)->startOfYear();
                                $endDate = now()->setYear($year)->endOfYear();
                            } else {
                                $startDate = now()->startOfMonth();
                                $endDate = now()->endOfMonth();
                            }
                            break;
                    }

                    // New orders from online (customer orders) - pending status tickets
                    $newOnlineOrders = Ticket::where('status', 'pending')
                        ->whereBetween('created_at', [$startDate, $endDate])
                        ->count();

                    return [
                        'newTickets' => Ticket::where('status', 'pending')
                            ->whereBetween('created_at', [$startDate, $endDate])
                            ->count(),
                        'newOnlineOrders' => $newOnlineOrders,
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
                // New/Online Orders to Confirm - pending tickets with pagination
                'newOnlineOrders' => function () use ($request) {
                    $query = Ticket::with(['customer', 'customerFiles', 'payments.documents'])
                        ->where('status', 'pending')
                        ->orderBy('created_at', 'desc');

                    // Search
                    if ($request->has('search') && $request->search) {
                        $search = $request->search;
                        $query->where(function ($q) use ($search) {
                            $q->where('ticket_number', 'like', "%{$search}%")
                                ->orWhere('description', 'like', "%{$search}%")
                                ->orWhereHas('customer', function ($customerQuery) use ($search) {
                                    $customerQuery->where('firstname', 'like', "%{$search}%")
                                        ->orWhere('lastname', 'like', "%{$search}%")
                                        ->orWhere('email', 'like', "%{$search}%");
                                });
                        });
                    }


                    // Order by
                    $orderBy = $request->get('order_by', 'created_at');
                    $orderDir = $request->get('order_dir', 'desc');
                    $query->orderBy($orderBy, $orderDir);


                    $tickets = $query->paginate(5);

                    return $tickets->through(function ($ticket) {
                        return [
                            'id' => $ticket->id,
                            'ticket_number' => $ticket->ticket_number,
                            'customer' => $ticket->customer ? [
                                'id' => $ticket->customer->id,
                                'name' => $ticket->customer->firstname . ' ' . $ticket->customer->lastname,
                                'email' => $ticket->customer->email,
                                'phone' => $ticket->customer->phone,
                            ] : null,
                            'description' => $ticket->description,
                            'total_amount' => $ticket->total_amount,
                            'payment_status' => $ticket->payment_status,
                            'payment_method' => $ticket->payment_method,
                            'created_at' => $ticket->created_at,
                            'customer_files' => $ticket->customerFiles->map(function ($file) {
                                return [
                                    'id' => $file->id,
                                    'filename' => $file->filename,
                                    'filepath' => $file->filepath,
                                    'file_path' => $file->file_path,
                                ];
                            }),
                        ];
                    });
                },
                // Recent Tickets (Today)
                'recentTicketsToday' => function () use ($request) {
                    $query = Ticket::with(['customer', 'payments.documents'])
                        ->whereDate('created_at', today());

                    // Search functionality
                    if ($request->has('recent_search') && $request->recent_search) {
                        $search = $request->recent_search;
                        $query->where(function ($q) use ($search) {
                            $q->where('ticket_number', 'like', "%{$search}%")
                                ->orWhere('description', 'like', "%{$search}%")
                                ->orWhereHas('customer', function ($customerQuery) use ($search) {
                                    $customerQuery->where('firstname', 'like', "%{$search}%")
                                        ->orWhere('lastname', 'like', "%{$search}%")
                                        ->orWhere('email', 'like', "%{$search}%");
                                });
                        });
                    }

                    // Sorting
                    $orderBy = $request->get('recent_order_by', 'created_at');
                    $orderDir = $request->get('recent_order_dir', 'desc');
                    $query->orderBy($orderBy, $orderDir);

                    $tickets = $query->paginate(10, ['*'], 'recent_page');

                    return $tickets->through(function ($ticket) {
                        return [
                            'id' => $ticket->id,
                            'ticket_number' => $ticket->ticket_number,
                            'customer' => $ticket->customer ? [
                                'id' => $ticket->customer->id,
                                'firstname' => $ticket->customer->firstname,
                                'lastname' => $ticket->customer->lastname,
                                'full_name' => $ticket->customer->firstname . ' ' . $ticket->customer->lastname,
                            ] : null,
                            'description' => $ticket->description,
                            'total_amount' => $ticket->total_amount,
                            'amount_paid' => $ticket->amount_paid ?? 0,
                            'outstanding_balance' => $ticket->outstanding_balance ?? $ticket->total_amount,
                            'due_date' => $ticket->due_date,
                            'status' => $ticket->status,
                            'payment_status' => $ticket->payment_status,
                            'payments' => $ticket->payments->map(function ($payment) {
                                return [
                                    'id' => $payment->id,
                                    'amount' => $payment->amount,
                                    'payment_date' => $payment->payment_date,
                                    'payment_method' => $payment->payment_method,
                                    'official_receipt_number' => $payment->official_receipt_number,
                                    'payment_reference' => $payment->payment_reference,
                                    'notes' => $payment->notes,
                                    'documents' => $payment->documents->map(function ($doc) {
                                        return [
                                            'id' => $doc->id,
                                            'file_path' => $doc->file_path,
                                        ];
                                    }),
                                ];
                            }),
                        ];
                    });
                },
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
                        default:
                            // Handle year_YYYY format
                            if (str_starts_with($dateRange, 'year_')) {
                                $year = (int) str_replace('year_', '', $dateRange);
                                $startDate = now()->setYear($year)->startOfYear();
                                $endDate = now()->setYear($year)->endOfYear();
                            } else {
                                $startDate = now()->startOfMonth();
                                $endDate = now()->endOfMonth();
                            }
                            break;
                    }

                    return [
                        'ticketsPendingReview' => Ticket::where(function ($q) {
                            $q->whereNull('design_status')
                                ->orWhere('design_status', 'pending');
                        })
                            ->whereBetween('created_at', [$startDate, $endDate])
                            ->count(),
                        'revisionRequested' => Ticket::where('design_status', 'revision_requested')
                            ->whereBetween('updated_at', [$startDate, $endDate])
                            ->count(),
                        'mockupsUploadedToday' => Ticket::where('design_status', 'mockup_uploaded')
                            ->whereDate('updated_at', today())
                            ->count(),
                        'approvedDesign' => Ticket::where('design_status', 'approved')
                            ->whereBetween('updated_at', [$startDate, $endDate])
                            ->count(),
                    ];
                },
                'ticketsPendingReview' => function () use ($request) {
                    $query = Ticket::with(['customer', 'customerFiles', 'jobType'])
                        ->where(function ($q) {
                            $q->whereNull('design_status')
                                ->orWhere('design_status', 'pending');
                        })
                        ->orderBy('created_at', 'desc')
                        ->limit(10);

                    return $query->get()->map(function ($ticket) {
                        return [
                            'id' => $ticket->id,
                            'ticket_number' => $ticket->ticket_number,
                            'customer' => $ticket->customer ? [
                                'id' => $ticket->customer->id,
                                'name' => $ticket->customer->firstname . ' ' . $ticket->customer->lastname,
                            ] : null,
                            'description' => $ticket->description,
                            'due_date' => $ticket->due_date,
                            'created_at' => $ticket->created_at,
                            'customer_files' => $ticket->customerFiles->map(function ($file) {
                                return [
                                    'id' => $file->id,
                                    'filename' => $file->filename,
                                    'filepath' => $file->filepath,
                                ];
                            }),
                        ];
                    });
                },
                'revisionRequested' => function () use ($request) {
                    $query = Ticket::with(['customer', 'mockupFiles', 'jobType'])
                        ->where('design_status', 'revision_requested')
                        ->orderBy('updated_at', 'desc')
                        ->limit(10);

                    return $query->get()->map(function ($ticket) {
                        return [
                            'id' => $ticket->id,
                            'ticket_number' => $ticket->ticket_number,
                            'customer' => $ticket->customer ? [
                                'id' => $ticket->customer->id,
                                'name' => $ticket->customer->firstname . ' ' . $ticket->customer->lastname,
                            ] : null,
                            'description' => $ticket->description,
                            'design_notes' => $ticket->design_notes,
                            'due_date' => $ticket->due_date,
                            'updated_at' => $ticket->updated_at,
                            'mockup_files' => $ticket->mockupFiles->map(function ($file) {
                                return [
                                    'id' => $file->id,
                                    'filename' => $file->filename,
                                    'filepath' => $file->filepath,
                                ];
                            }),
                        ];
                    });
                },
                'mockupsUploadedToday' => function () use ($request) {
                    $query = Ticket::with(['customer', 'mockupFiles', 'jobType'])
                        ->where('design_status', 'mockup_uploaded')
                        ->whereDate('updated_at', today())
                        ->orderBy('updated_at', 'desc')
                        ->limit(10);

                    return $query->get()->map(function ($ticket) {
                        return [
                            'id' => $ticket->id,
                            'ticket_number' => $ticket->ticket_number,
                            'customer' => $ticket->customer ? [
                                'id' => $ticket->customer->id,
                                'name' => $ticket->customer->firstname . ' ' . $ticket->customer->lastname,
                            ] : null,
                            'description' => $ticket->description,
                            'due_date' => $ticket->due_date,
                            'updated_at' => $ticket->updated_at,
                            'mockup_files' => $ticket->mockupFiles->map(function ($file) {
                                return [
                                    'id' => $file->id,
                                    'filename' => $file->filename,
                                    'filepath' => $file->filepath,
                                ];
                            }),
                        ];
                    });
                },
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
