<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\Payment;
use Carbon\Carbon;
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
                'filters' => [
                    'date_range' => $request->input('date_range', 'this_month'),
                    'year' => $request->input('year', now()->year),
                    'month' => $request->input('month', now()->format('m')),
                ],
                'dashboardData' => function () use ($request) {
                    return $this->getAdminDashboardData($request);
                },
            ]),
            'FrontDesk' => Inertia::render('Dashboard/FrontDesk', [
                'user' => $user,
                'filters' => [
                    'date_range' => $request->input('date_range', 'this_month'),
                ],
                'statistics' => function () use ($request, $user) {
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

                    // Apply branch filtering - FrontDesk sees only their branch's orders
                    $branchFilter = function ($query) use ($user) {
                        if ($user && !$user->isAdmin() && $user->branch_id) {
                            $query->where('order_branch_id', $user->branch_id);
                        }
                    };

                    // New orders from online (customer orders) - specifically awaiting verification
                    $newOnlineOrders = Ticket::where('status', 'pending')
                        ->where('payment_status', 'awaiting_verification')
                        ->whereBetween('created_at', [$startDate, $endDate])
                        ->when($user && !$user->isAdmin() && $user->branch_id, $branchFilter)
                        ->count();

                    return [
                        'newTickets' => Ticket::where('status', 'pending')
                            ->whereBetween('created_at', [$startDate, $endDate])
                            ->when($user && !$user->isAdmin() && $user->branch_id, $branchFilter)
                            ->count(),
                        'newOnlineOrders' => $newOnlineOrders,
                        'paymentPending' => Ticket::whereIn('payment_status', ['pending', 'partial'])
                            ->whereBetween('created_at', [$startDate, $endDate])
                            ->when($user && !$user->isAdmin() && $user->branch_id, $branchFilter)
                            ->count(),
                        'completed' => Ticket::where('status', 'completed')
                            ->whereBetween('updated_at', [$startDate, $endDate])
                            ->when($user && !$user->isAdmin() && $user->branch_id, $branchFilter)
                            ->count(),
                        'inProgress' => Ticket::whereIn('status', ['in_production', 'ready_to_print'])
                            ->whereBetween('created_at', [$startDate, $endDate])
                            ->when($user && !$user->isAdmin() && $user->branch_id, $branchFilter)
                            ->count(),
                    ];
                },
                'ticketsByStatus' => [
                    'pendingPayment' => Ticket::with('customer')
                        ->whereIn('payment_status', ['pending', 'partial'])
                        ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                            $query->where('order_branch_id', $user->branch_id);
                        })
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
                        ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                            $query->where('order_branch_id', $user->branch_id);
                        })
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
                        ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                            $query->where('order_branch_id', $user->branch_id);
                        })
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
                        ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                            $query->where('order_branch_id', $user->branch_id);
                        })
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
                'newOnlineOrders' => function () use ($request, $user) {
                    $query = Ticket::with(['customer', 'customerFiles', 'payments.documents'])
                        ->where('status', 'pending')
                        // Apply branch filtering
                        ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                            $query->where('order_branch_id', $user->branch_id);
                        })
                        ->orderByRaw("CASE WHEN payment_status = 'awaiting_verification' THEN 0 ELSE 1 END")
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
                                    'file_name' => $file->file_name,
                                    'file_path' => $file->file_path,
                                    'type' => $file->type,
                                ];
                            }),
                        ];
                    });
                },
                // Recent Tickets (Today)
                'recentTicketsToday' => function () use ($request, $user) {
                    $query = Ticket::with(['customer', 'payments.documents'])
                        ->whereDate('created_at', today())
                        // Apply branch filtering
                        ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                            $query->where('order_branch_id', $user->branch_id);
                        });

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
                    // Apply branch filtering
                    ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                        $query->where('order_branch_id', $user->branch_id);
                    })
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
                'statistics' => function () use ($request, $user) {
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

                    // Apply branch filtering for designers
                    $branchFilter = function ($query) use ($user) {
                        if ($user && !$user->isAdmin() && $user->branch_id) {
                            $query->where('order_branch_id', $user->branch_id);
                        }
                    };

                    return [
                        'ticketsPendingReview' => Ticket::where(function ($q) {
                            $q->whereNull('design_status')
                                ->orWhere('design_status', 'pending');
                        })
                            ->whereBetween('created_at', [$startDate, $endDate])
                            ->when($user && !$user->isAdmin() && $user->branch_id, $branchFilter)
                            ->count(),
                        'revisionRequested' => Ticket::where('design_status', 'revision_requested')
                            ->whereBetween('updated_at', [$startDate, $endDate])
                            ->when($user && !$user->isAdmin() && $user->branch_id, $branchFilter)
                            ->count(),
                        'mockupsUploadedToday' => Ticket::where('design_status', 'mockup_uploaded')
                            ->whereDate('updated_at', today())
                            ->when($user && !$user->isAdmin() && $user->branch_id, $branchFilter)
                            ->count(),
                        'approvedDesign' => Ticket::where('design_status', 'approved')
                            ->whereBetween('updated_at', [$startDate, $endDate])
                            ->when($user && !$user->isAdmin() && $user->branch_id, $branchFilter)
                            ->count(),
                    ];
                },
                'ticketsPendingReview' => function () use ($request, $user) {
                    $query = Ticket::with(['customer', 'customerFiles', 'jobType'])
                        ->where(function ($q) {
                            $q->whereNull('design_status')
                                ->orWhere('design_status', 'pending');
                        })
                        // Apply branch filtering
                        ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                            $query->where('order_branch_id', $user->branch_id);
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
                                    'file_name' => $file->file_name,
                                    'file_path' => $file->file_path,
                                    'type' => $file->type,
                                ];
                            }),
                        ];
                    });
                },
                'revisionRequested' => function () use ($request, $user) {
                    $query = Ticket::with(['customer', 'mockupFiles', 'jobType'])
                        ->where('design_status', 'revision_requested')
                        // Apply branch filtering
                        ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                            $query->where('order_branch_id', $user->branch_id);
                        })
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
                                    'file_name' => $file->file_name,
                                    'file_path' => $file->file_path,
                                    'type' => $file->type,
                                ];
                            }),
                        ];
                    });
                },
                'mockupsUploadedToday' => function () use ($request, $user) {
                    $query = Ticket::with(['customer', 'mockupFiles', 'jobType'])
                        ->where('design_status', 'mockup_uploaded')
                        ->whereDate('updated_at', today())
                        // Apply branch filtering
                        ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                            $query->where('order_branch_id', $user->branch_id);
                        })
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
                                    'file_name' => $file->file_name,
                                    'file_path' => $file->file_path,
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
            'Cashier' => Inertia::render('Dashboard/Cashier', [
                'user' => $user,
                'filters' => [
                    'date_range' => $request->input('date_range', 'today'),
                ],
                'statistics' => function () use ($request, $user) {
                    $today = now()->startOfDay();
                    $tomorrow = now()->endOfDay();

                    $thisMonthStart = now()->startOfMonth();
                    $thisMonthEnd = now()->endOfMonth();

                    return [
                        'todayCollections' => (float) Payment::whereBetween('payment_date', [$today, $tomorrow])
                            ->where('payment_type', 'collection')
                            // Apply branch filtering
                            ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                                $query->whereHas('ticket', function ($q) use ($user) {
                                    $q->where('order_branch_id', $user->branch_id);
                                });
                            })
                            ->sum('amount'),
                        'monthCollections' => (float) Payment::whereBetween('payment_date', [$thisMonthStart, $thisMonthEnd])
                            ->where('payment_type', 'collection')
                            // Apply branch filtering
                            ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                                $query->whereHas('ticket', function ($q) use ($user) {
                                    $q->where('order_branch_id', $user->branch_id);
                                });
                            })
                            ->sum('amount'),
                        'totalReceivables' => (float) Ticket::whereIn('payment_status', ['pending', 'partial'])
                            ->where('status', '!=', 'cancelled')
                            // Apply branch filtering
                            ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                                $query->where('order_branch_id', $user->branch_id);
                            })
                            ->selectRaw('SUM(total_amount - COALESCE(amount_paid, 0)) as outstanding')
                            ->value('outstanding') ?? 0,
                        'readyForPickupUnpaid' => Ticket::where('status', 'completed')
                            ->whereIn('payment_status', ['pending', 'partial'])
                            // Apply branch filtering
                            ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                                $query->where('order_branch_id', $user->branch_id);
                            })
                            ->count(),
                        'todayTransactionsCount' => Payment::whereBetween('payment_date', [$today, $tomorrow])
                            // Apply branch filtering
                            ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                                $query->whereHas('ticket', function ($q) use ($user) {
                                    $q->where('order_branch_id', $user->branch_id);
                                });
                            })
                            ->count(),
                    ];
                },
                'urgentReceivables' => function () use ($user) {
                    return Ticket::with(['customer', 'jobType'])
                        ->where('status', 'completed')
                        ->whereIn('payment_status', ['pending', 'partial'])
                        // Apply branch filtering
                        ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                            $query->where('order_branch_id', $user->branch_id);
                        })
                        ->orderBy('updated_at', 'desc')
                        ->take(10)
                        ->get()
                        ->map(fn($t) => [
                            'id' => $t->id,
                            'ticket_number' => $t->ticket_number,
                            'customer_name' => $t->customer->full_name ?? 'Walk-in',
                            'total_amount' => $t->total_amount,
                            'balance' => $t->outstanding_balance,
                            'updated_at' => $t->updated_at,
                            'has_promo' => $t->jobType && $t->jobType->discount > 0,
                        ]);
                },
                'latestCollections' => function () use ($user) {
                    return Payment::with(['ticket.customer', 'ticket.jobType', 'recordedBy'])
                        ->where('payment_type', 'collection')
                        // Apply branch filtering
                        ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                            $query->whereHas('ticket', function ($q) use ($user) {
                                $q->where('order_branch_id', $user->branch_id);
                            });
                        })
                        ->orderBy('created_at', 'desc')
                        ->take(10)
                        ->get()
                        ->map(fn($p) => [
                            'id' => $p->id,
                            'amount' => $p->amount,
                            'method' => $p->payment_method,
                            'date' => $p->payment_date,
                            'ticket_number' => $p->ticket->ticket_number ?? 'N/A',
                            'customer_name' => $p->ticket->customer->full_name ?? $p->customer->full_name ?? 'Walk-in',
                            'recorded_by' => $p->recordedBy->name ?? 'System',
                            'has_promo' => $p->ticket && $p->ticket->jobType && $p->ticket->jobType->discount > 0,
                        ]);
                },
                'collectionSummary' => function () use ($user) {
                    $today = now()->startOfDay();
                    $tomorrow = now()->endOfDay();

                    return Payment::whereBetween('payment_date', [$today, $tomorrow])
                        ->where('payment_type', 'collection')
                        // Apply branch filtering
                        ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                            $query->whereHas('ticket', function ($q) use ($user) {
                                $q->where('order_branch_id', $user->branch_id);
                            });
                        })
                        ->selectRaw('payment_method, SUM(amount) as total')
                        ->groupBy('payment_method')
                        ->get()
                        ->pluck('total', 'payment_method');
                }
            ]),
            default => Inertia::render('Dashboard/FrontDesk', [
                'user' => $user,
            ]),
        };
    }

    private function getAdminDashboardData(Request $request)
    {
        $dateRange = $request->input('date_range', 'this_month');
        $year = $request->input('year', now()->year);
        $month = $request->input('month', now()->format('m'));

        // Calculate date ranges for current and previous periods
        $dates = $this->calculateDateRanges($dateRange, $year, $month);

        // Get statistics for current period
        $currentStats = $this->calculatePeriodStats($dates['current_start'], $dates['current_end']);

        // Get statistics for previous period (for comparison)
        $previousStats = $this->calculatePeriodStats($dates['previous_start'], $dates['previous_end']);

        // Calculate daily data for charts (for selected month)
        $dailyOrders = $this->getDailyOrders($year, $month);
        $dailyRevenue = $this->getDailyRevenue($year, $month);

        // Get user transaction summaries
        $frontDeskTransactions = $this->getUserTransactions('FrontDesk', $dates['current_start'], $dates['current_end']);
        $designerTransactions = $this->getUserTransactions('Designer', $dates['current_start'], $dates['current_end']);
        $productionTransactions = $this->getUserTransactions('Production', $dates['current_start'], $dates['current_end']);

        return [
            'current_stats' => $currentStats,
            'previous_stats' => $previousStats,
            'daily_orders' => $dailyOrders,
            'daily_revenue' => $dailyRevenue,
            'frontdesk_transactions' => $frontDeskTransactions,
            'designer_transactions' => $designerTransactions,
            'production_transactions' => $productionTransactions,
            'date_info' => [
                'current_start' => $dates['current_start']->format('Y-m-d'),
                'current_end' => $dates['current_end']->format('Y-m-d'),
                'year' => $year,
                'month' => $month,
            ],
        ];
    }

    private function calculateDateRanges($dateRange, $year, $month)
    {
        $currentStart = null;
        $currentEnd = null;
        $previousStart = null;
        $previousEnd = null;

        switch ($dateRange) {
            case 'today':
                $currentStart = now()->startOfDay();
                $currentEnd = now()->endOfDay();
                $previousStart = now()->subDay()->startOfDay();
                $previousEnd = now()->subDay()->endOfDay();
                break;
            case 'this_week':
                $currentStart = now()->startOfWeek();
                $currentEnd = now()->endOfWeek();
                $previousStart = now()->subWeek()->startOfWeek();
                $previousEnd = now()->subWeek()->endOfWeek();
                break;
            case 'this_month':
                $currentStart = now()->startOfMonth();
                $currentEnd = now()->endOfMonth();
                $previousStart = now()->subMonth()->startOfMonth();
                $previousEnd = now()->subMonth()->endOfMonth();
                break;
            case 'last_30_days':
                $currentEnd = now();
                $currentStart = now()->subDays(30);
                $previousEnd = now()->subDays(30);
                $previousStart = now()->subDays(60);
                break;
            case 'this_year':
                $currentStart = now()->startOfYear();
                $currentEnd = now()->endOfYear();
                $previousStart = now()->subYear()->startOfYear();
                $previousEnd = now()->subYear()->endOfYear();
                break;
            default:
                // Handle year_YYYY format
                if (str_starts_with($dateRange, 'year_')) {
                    $selectedYear = (int) str_replace('year_', '', $dateRange);
                    $currentStart = now()->setYear($selectedYear)->startOfYear();
                    $currentEnd = now()->setYear($selectedYear)->endOfYear();
                    $previousStart = now()->setYear($selectedYear - 1)->startOfYear();
                    $previousEnd = now()->setYear($selectedYear - 1)->endOfYear();
                } else {
                    $currentStart = now()->startOfMonth();
                    $currentEnd = now()->endOfMonth();
                    $previousStart = now()->subMonth()->startOfMonth();
                    $previousEnd = now()->subMonth()->endOfMonth();
                }
                break;
        }

        return [
            'current_start' => $currentStart,
            'current_end' => $currentEnd,
            'previous_start' => $previousStart,
            'previous_end' => $previousEnd,
        ];
    }

    private function calculatePeriodStats($startDate, $endDate)
    {
        // Total orders (excluding cancelled)
        $totalOrders = Ticket::whereBetween('created_at', [$startDate, $endDate])
            ->where('status', '!=', 'cancelled')
            ->count();

        // Completed orders
        $completedOrders = Ticket::whereBetween('updated_at', [$startDate, $endDate])
            ->where('status', 'completed')
            ->count();

        // Total sales from posted payments (excluding pending payment status)
        // Using Payment model for accurate tracking
        $totalSales = Payment::posted()
            ->collections()
            ->whereBetween('payment_date', [$startDate, $endDate])
            ->sum('amount');

        // Alternative: Calculate from tickets (for tickets without separate payment records)
        $ticketSales = Ticket::whereBetween('created_at', [$startDate, $endDate])
            ->whereNotIn('payment_status', ['pending'])
            ->where('status', '!=', 'cancelled')
            ->sum('amount_paid');

        // Use the higher value (handles both payment tracking methods)
        $totalSales = max($totalSales, $ticketSales);

        // Calculate receivables (outstanding balances)
        $receivables = Ticket::whereIn('payment_status', ['pending', 'partial'])
            ->where('status', '!=', 'cancelled')
            ->selectRaw('SUM(total_amount - COALESCE(amount_paid, 0)) as outstanding')
            ->value('outstanding') ?? 0;

        // Net income calculation (Revenue - Discounts - Actual COGS)
        $discounts = Ticket::whereBetween('created_at', [$startDate, $endDate])
            ->where('status', '!=', 'cancelled')
            ->sum('discount');

        // Calculate actual COGS from inventory consumption
        $actualCOGS = $this->calculateActualCOGS($startDate, $endDate);

        $netIncome = $totalSales - $discounts - $actualCOGS;

        return [
            'total_orders' => $totalOrders,
            'completed_orders' => $completedOrders,
            'total_sales' => round($totalSales, 2),
            'net_income' => round($netIncome, 2),
            'receivables' => round($receivables, 2),
            'discounts' => round($discounts, 2),
            'actual_cogs' => round($actualCOGS, 2),
        ];
    }

    private function getDailyOrders($year, $month)
    {
        // Get the number of days in the month
        // $daysInMonth = cal_days_in_month(CAL_GREGORIAN, $month, $year);
        $daysInMonth = \Carbon\Carbon::create($year, $month)->daysInMonth;

        $startDate = \Carbon\Carbon::create($year, $month, 1)->startOfDay();
        $endDate = \Carbon\Carbon::create($year, $month, $daysInMonth)->endOfDay();

        // Get actual order counts per day
        $orders = Ticket::whereBetween('created_at', [$startDate, $endDate])
            ->where('status', '!=', 'cancelled')
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->pluck('count', 'date')
            ->toArray();

        // Create array with all days of the month
        $dailyData = [];
        for ($day = 1; $day <= $daysInMonth; $day++) {
            $date = sprintf('%04d-%02d-%02d', $year, $month, $day);
            $dailyData[] = [
                'day' => $day,
                'date' => $date,
                'orders' => $orders[$date] ?? 0,
            ];
        }

        return $dailyData;
    }

    private function getDailyRevenue($year, $month)
    {
        $daysInMonth = \Carbon\Carbon::create($year, $month)->daysInMonth;

        $startDate = \Carbon\Carbon::create($year, $month, 1)->startOfDay();
        $endDate = \Carbon\Carbon::create($year, $month, $daysInMonth)->endOfDay();

        // Get sales from payments
        $paymentsRevenue = Payment::posted()
            ->collections()
            ->whereBetween('payment_date', [$startDate, $endDate])
            ->selectRaw('DATE(payment_date) as date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date')
            ->toArray();

        // Also check ticket amounts for tickets paid on specific dates
        $ticketRevenue = Ticket::whereBetween('updated_at', [$startDate, $endDate])
            ->whereNotIn('payment_status', ['pending'])
            ->where('status', '!=', 'cancelled')
            ->selectRaw('DATE(updated_at) as date, SUM(amount_paid) as total')
            ->groupBy('date')
            ->pluck('total', 'date')
            ->toArray();

        // Get actual COGS per day from inventory consumption
        $dailyCOGS = $this->getDailyCOGS($startDate, $endDate);

        // Create array with all days of the month
        $dailyData = [];
        for ($day = 1; $day <= $daysInMonth; $day++) {
            $date = sprintf('%04d-%02d-%02d', $year, $month, $day);
            $sales = max($paymentsRevenue[$date] ?? 0, $ticketRevenue[$date] ?? 0);
            $cogs = $dailyCOGS[$date] ?? 0;
            $netIncome = $sales - $cogs; // Actual net income = Sales - Actual COGS

            $dailyData[] = [
                'day' => $day,
                'date' => $date,
                'sales' => round($sales, 2),
                'cogs' => round($cogs, 2),
                'net_income' => round($netIncome, 2),
            ];
        }

        return $dailyData;
    }

    /**
     * Calculate actual COGS from inventory consumption
     * Handles both unit-based (mugs) and area-based (tarpaulin) items
     */
    private function calculateActualCOGS($startDate, $endDate)
    {
        try {
            // Get all stock consumptions for tickets in the date range
            // COGS is calculated when materials are consumed during production
            $cogs = \App\Models\ProductionStockConsumption::whereHas('ticket', function ($query) use ($startDate, $endDate) {
                $query->whereBetween('created_at', [$startDate, $endDate])
                    ->where('status', '!=', 'cancelled');
            })
                ->sum('total_cost');

            return $cogs ?? 0;
        } catch (\Exception $e) {
            // If ProductionStockConsumption table doesn't exist, fallback to 30% estimate
            return 0;
        }
    }

    /**
     * Get daily COGS breakdown for chart display
     */
    private function getDailyCOGS($startDate, $endDate)
    {
        try {
            // Get COGS grouped by ticket creation date
            // Note: We use ticket creation date, but COGS is recorded when consumption happens
            // For more accuracy, you might want to use consumption date if available
            $dailyCogs = \App\Models\ProductionStockConsumption::whereHas('ticket', function ($query) use ($startDate, $endDate) {
                $query->whereBetween('created_at', [$startDate, $endDate])
                    ->where('status', '!=', 'cancelled');
            })
                ->join('tickets', 'production_stock_consumptions.ticket_id', '=', 'tickets.id')
                ->selectRaw('DATE(tickets.created_at) as date, SUM(production_stock_consumptions.total_cost) as total')
                ->groupBy('date')
                ->pluck('total', 'date')
                ->toArray();

            return $dailyCogs;
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getUserTransactions($role, $startDate, $endDate)
    {
        // Get users by role
        $users = \App\Models\User::where('role', $role)
            ->limit(10)
            ->get();

        return $users->map(function ($user) use ($startDate, $endDate, $role) {
            $stats = [
                'name' => $user->name,
                'last_activity' => $user->updated_at->format('M d, Y'),
            ];

            if ($role === 'FrontDesk') {
                // FrontDesk: Track created tickets and collected payments
                $stats['metric_1_label'] = 'Tickets Created';
                $stats['metric_1_value'] = Ticket::where('created_by', $user->id)
                    ->whereBetween('created_at', [$startDate, $endDate])
                    ->count();

                $stats['metric_2_label'] = 'Sales Collected';
                $stats['metric_2_value'] = Payment::where('recorded_by', $user->id)
                    ->whereBetween('payment_date', [$startDate, $endDate])
                    ->sum('amount');
            } elseif ($role === 'Production') {
                // Production: Track tasks and units produced
                $stats['metric_1_label'] = 'Tasks Completed';
                $stats['metric_1_value'] = \App\Models\ProductionRecord::where('user_id', $user->id)
                    ->whereBetween('created_at', [$startDate, $endDate])
                    ->count();

                $stats['metric_2_label'] = 'Units Produced';
                $stats['metric_2_value'] = \App\Models\ProductionRecord::where('user_id', $user->id)
                    ->whereBetween('created_at', [$startDate, $endDate])
                    ->sum('quantity_produced');
            } elseif ($role === 'Designer') {
                // Designer: Track assigned and completed designs
                // Assuming legacy single assignment for now, or use assignment table if available
                $stats['metric_1_label'] = 'Assigned';
                $stats['metric_1_value'] = Ticket::where('assigned_to_user_id', $user->id)
                    ->whereBetween('created_at', [$startDate, $endDate])
                    ->count();

                $stats['metric_2_label'] = 'Completed';
                $stats['metric_2_value'] = Ticket::where('assigned_to_user_id', $user->id)
                    ->where('design_status', 'approved') // or 'completed'
                    ->whereBetween('updated_at', [$startDate, $endDate])
                    ->count();
            } else {
                // Fallback / Other roles
                $stats['metric_1_label'] = 'Tickets';
                $stats['metric_1_value'] = 0;
                $stats['metric_2_label'] = '-';
                $stats['metric_2_value'] = '-';
            }

            return $stats;
        });
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
