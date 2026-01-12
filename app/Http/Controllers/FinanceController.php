<?php

/*!
 * Developed By: Antonio Jr De Paz
 * Built with: Laravel, Inertia, React
 * Year: 2025
 */

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Expense;
use App\Models\Payment;
use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class FinanceController extends Controller
{


    public function index(Request $request): Response
    {
        $user = auth()->user();
        $search = $request->input('search');


        $ledger = Payment::with(['ticket.customer', 'ticket.jobType', 'ticket.payments', 'customer', 'documents'])

            ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                $query->whereHas('ticket', function ($q) use ($user) {
                    $q->where('order_branch_id', $user->branch_id);
                });
            })
            ->when($request->filled('method'), fn($query) => $query->where('payment_method', $request->string('method')))
            ->when(
                $request->filled('status'),
                fn($query) => $query->where('status', $request->string('status')),
                fn($query) => $query->whereNotIn('status', ['pending', 'rejected'])
            )
            ->when($request->filled('customer_id'), fn($query) => $query->where('customer_id', $request->input('customer_id')))
            ->whereHas('ticket', function ($query) {
                $query->where('payment_status', '!=', 'awaiting_verification');
            })
            ->when($search, function ($query) use ($search) {
                $term = '%' . $search . '%';
                $query->where(function ($q) use ($term) {
                    $q->where('official_receipt_number', 'like', $term)
                        ->orWhere('invoice_number', 'like', $term)
                        ->orWhere('payment_reference', 'like', $term)
                        ->orWhere('payer_name', 'like', $term)
                        ->orWhere('payment_method', 'like', $term)
                        ->orWhere('notes', 'like', $term)
                        ->orWhere('amount', 'like', $term)
                        ->orWhereHas('ticket', function ($t) use ($term) {
                            $t->where('ticket_number', 'like', $term)
                                ->orWhere('description', 'like', $term);
                        })
                        ->orWhereHas('customer', function ($c) use ($term) {
                            $c->where('firstname', 'like', $term)
                                ->orWhere('lastname', 'like', $term)
                                ->orWhereRaw("CONCAT(firstname, ' ', lastname) LIKE ?", [$term]);
                        });
                });
            })
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->paginate(15, ['*'], 'ledger_page')
            ->withQueryString();


        $receivables = $this->buildReceivables($request);


        $expenses = Expense::with('ticket')
            ->when($search, function ($query) use ($search) {
                $term = '%' . $search . '%';
                $query->where(function ($q) use ($term) {
                    $q->where('description', 'like', $term)
                        ->orWhere('vendor', 'like', $term)
                        ->orWhere('category', 'like', $term)
                        ->orWhere('amount', 'like', $term)
                        ->orWhere('notes', 'like', $term)
                        ->orWhere('payment_method', 'like', $term)
                        ->orWhereHas('ticket', function ($t) use ($term) {
                            $t->where('ticket_number', 'like', $term);
                        });
                });
            })
            ->orderByDesc('expense_date')
            ->paginate(15, ['*'], 'expenses_page')
            ->withQueryString();


        $cashFlow = [];


        $pendingPayments = Payment::with(['ticket.customer', 'customer', 'documents'])

            ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                $query->whereHas('ticket', function ($q) use ($user) {
                    $q->where('order_branch_id', $user->branch_id);
                });
            })
            ->when($request->filled('customer_id'), fn($query) => $query->where('customer_id', $request->input('customer_id')))
            ->where('status', 'pending')
            ->orderByDesc('payment_date')
            ->get();


        $summary = $this->buildSummary();


        $openTickets = Ticket::with('customer')
            ->where('payment_status', '!=', 'paid')
            ->where('payment_status', '!=', 'awaiting_verification')

            ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                $query->where('order_branch_id', $user->branch_id);
            })
            ->orderByDesc('created_at')
            ->limit(50)
            ->get(['id', 'ticket_number', 'customer_id', 'total_amount', 'subtotal', 'amount_paid', 'discount', 'quantity', 'description', 'size_value', 'size_unit', 'job_type']);

        $recentCustomers = Customer::orderBy('lastname')
            ->limit(500)
            ->get(['id', 'firstname', 'lastname']);


        $summary['pending_cheques_count'] = $pendingPayments->where('payment_method', 'check')->count();
        $summary['pending_government_count'] = $pendingPayments->where('payment_method', 'government_ar')->count();
        $summary['pending_cheques_total'] = $pendingPayments->where('payment_method', 'check')->sum('amount');
        $summary['pending_government_total'] = $pendingPayments->where('payment_method', 'government_ar')->sum('amount');
        $summary['collectable_total'] = $summary['pending_cheques_total'] + $summary['pending_government_total'];

        return Inertia::render('PaymentsFinance', [
            'ledger' => $ledger,
            'pendingPayments' => $pendingPayments,
            'receivables' => $receivables,
            'expenses' => $expenses,
            'cashFlow' => $cashFlow,
            'summary' => $summary,
            'filters' => $request->only(['search', 'method', 'status', 'tab', 'customer_id']),
            'paymentMethods' => Payment::METHODS,
            'expenseCategories' => Expense::CATEGORIES,
            'openTickets' => $openTickets,
            'customers' => $recentCustomers,
            'printSettings' => [
                'bank_account' => collect(\App\Models\Setting::get('payment_bank_accounts', []))
                    ->map(function ($acc) {
                        if (!empty($acc['qrcode'])) {
                            if (strpos($acc['qrcode'], 'http') !== 0 && strpos($acc['qrcode'], '/storage/') !== 0) {
                                $acc['qrcode'] = \Illuminate\Support\Facades\Storage::url($acc['qrcode']);
                            }
                        }
                        return $acc;
                    })
                    ->firstWhere('active_for_print', true)
            ]
        ]);
    }

    protected function buildReceivables(Request $request)
    {
        $user = auth()->user();
        $search = $request->input('search');

        $query = Ticket::with(['customer', 'jobType', 'payments' => function ($q) {
            $q->where('status', 'rejected')->latest();
        }])
            ->where('payment_status', '!=', 'paid')
            ->where('payment_status', '!=', 'awaiting_verification')
            ->whereDoesntHave('payments', function ($q) {
                $q->where('status', 'pending');
            })

            ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                $query->where('order_branch_id', $user->branch_id);
            });

        if ($search) {
            $term = '%' . $search . '%';
            $query->where(function ($q) use ($term) {
                $q->where('ticket_number', 'like', $term)
                    ->orWhere('description', 'like', $term)
                    ->orWhereHas('customer', function ($c) use ($term) {
                        $c->where('firstname', 'like', $term)
                            ->orWhere('lastname', 'like', $term)
                            ->orWhereRaw("CONCAT(firstname, ' ', lastname) LIKE ?", [$term]);
                    });
            });
        }

        return $query->when($request->filled('customer_id'), fn($q) => $q->where('customer_id', $request->input('customer_id')))
            ->orderByDesc('created_at')
            ->paginate(15, ['*'], 'receivables_page')
            ->withQueryString()
            ->through(function ($ticket) {
                return [
                    'ticket_id' => $ticket->id,
                    'customer_id' => $ticket->customer_id,
                    'ticket_number' => $ticket->ticket_number,
                    'name' => $ticket->customer ? $ticket->customer->full_name : 'Walk-in',
                    'description' => $ticket->description,
                    'subtotal' => $ticket->subtotal,
                    'total_invoiced' => $ticket->total_amount,
                    'total_paid' => $ticket->amount_paid,
                    'balance' => $ticket->total_amount - $ticket->amount_paid,
                    'discount' => $ticket->discount,
                    'due_date' => $ticket->due_date,
                    'created_at' => $ticket->created_at,
                    'has_rejected_payment' => $ticket->payments->isNotEmpty(),
                    'last_rejected_payment' => $ticket->payments->first(),
                ];
            });
    }

    protected function buildCashFlow(): Collection
    {
        return Payment::posted()
            ->with(['ticket', 'customer'])
            ->orderByDesc('payment_date')
            ->get();
    }

    protected function buildSummary(?Collection $receivables = null): array
    {
        $user = auth()->user();
        $now = Carbon::now();
        $monthRange = [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()];

        $collections = Payment::posted()
            ->collections()
            ->whereBetween('payment_date', $monthRange)

            ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                $query->whereHas('ticket', function ($q) use ($user) {
                    $q->where('order_branch_id', $user->branch_id);
                });
            })
            ->sum('amount');

        $expenses = Expense::whereBetween('expense_date', $monthRange)->sum('amount');


        $receivablesTotal = Ticket::where('payment_status', '!=', 'paid')
            ->where('payment_status', '!=', 'awaiting_verification')
            ->whereDoesntHave('payments', function ($q) {
                $q->where('status', 'pending');
            })

            ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                $query->where('order_branch_id', $user->branch_id);
            })
            ->get()
            ->sum(function ($ticket) {
                return $ticket->total_amount - $ticket->amount_paid;
            });

        return [
            'collections_month' => round($collections, 2),
            'expenses_month' => round($expenses, 2),
            'net_cash_flow_month' => round($collections - $expenses, 2),
            'receivables_total' => round($receivablesTotal, 2),
            'open_tickets' => Ticket::where('payment_status', '!=', 'paid')
                ->where('payment_status', '!=', 'awaiting_verification')

                ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                    $query->where('order_branch_id', $user->branch_id);
                })
                ->count(),
        ];
    }
}
