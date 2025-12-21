<?php

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
    /**
     * Render the Payments & Finance hub with ledger, receivables, expenses, and cash flow tabs.
     */
    /**
     * Render the Payments & Finance hub with ledger, receivables, expenses, and cash flow tabs.
     */
    public function index(Request $request): Response
    {
        $user = auth()->user();
        $search = $request->input('search');

        // Ledger (Payment History)
        $ledger = Payment::with(['ticket.customer', 'customer', 'documents'])
            // Apply branch filtering for non-admin users
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
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->paginate(15, ['*'], 'ledger_page')
            ->withQueryString();

        // Receivables - always load
        $receivables = $this->buildReceivables($request);

        // Expenses - always load
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

        // Cash Flow - keep empty or load if needed
        $cashFlow = [];

        // Pending Payments - always load
        $pendingPayments = Payment::with(['ticket.customer', 'customer', 'documents'])
            // Apply branch filtering for non-admin users
            ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                $query->whereHas('ticket', function ($q) use ($user) {
                    $q->where('order_branch_id', $user->branch_id);
                });
            })
            ->where('status', 'pending')
            ->orderByDesc('payment_date')
            ->get();

        // Summary Statistics (Always loaded for header cards)
        $summary = $this->buildSummary();

        // Dropdown Data
        $openTickets = Ticket::with('customer')
            ->where('payment_status', '!=', 'paid')
            // Apply branch filtering for non-admin users
            ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                $query->where('order_branch_id', $user->branch_id);
            })
            ->orderByDesc('created_at')
            ->limit(50)
            ->get(['id', 'ticket_number', 'customer_id', 'total_amount', 'amount_paid', 'discount', 'quantity', 'description', 'size_value', 'size_unit', 'job_type']);

        $recentCustomers = Customer::orderBy('lastname')
            ->limit(50)
            ->get(['id', 'firstname', 'lastname']);

        // Update summary with accurate count
        $summary['pending_cheques_count'] = $pendingPayments->count();


        return Inertia::render('PaymentsFinance', [
            'ledger' => $ledger,
            'pendingPayments' => $pendingPayments,
            'receivables' => $receivables,
            'expenses' => $expenses,
            'cashFlow' => $cashFlow,
            'summary' => $summary,
            'filters' => $request->only(['search', 'method', 'status', 'tab']),
            'paymentMethods' => Payment::METHODS,
            'expenseCategories' => Expense::CATEGORIES,
            'openTickets' => $openTickets,
            'customers' => $recentCustomers,
        ]);
    }

    protected function buildReceivables(Request $request)
    {
        $user = auth()->user();
        $search = $request->input('search');

        $query = Ticket::with(['customer', 'payments' => function ($q) {
            $q->where('status', 'rejected')->latest();
        }])
            ->where('payment_status', '!=', 'paid')
            ->whereDoesntHave('payments', function ($q) {
                $q->where('status', 'pending');
            })
            // Apply branch filtering for non-admin users
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

        return $query->orderByDesc('created_at') // Sort by ticket creation date (descending)
            ->paginate(15, ['*'], 'receivables_page')
            ->withQueryString()
            ->through(function ($ticket) {
                return [
                    'ticket_id' => $ticket->id,
                    'customer_id' => $ticket->customer_id,
                    'ticket_number' => $ticket->ticket_number,
                    'name' => $ticket->customer ? $ticket->customer->full_name : 'Walk-in',
                    'description' => $ticket->description,
                    'total_invoiced' => $ticket->total_amount,
                    'total_paid' => $ticket->amount_paid,
                    'balance' => $ticket->total_amount - $ticket->amount_paid,
                    'due_date' => $ticket->due_date,
                    'created_at' => $ticket->created_at, // useful for debug/display
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
            // Apply branch filtering for non-admin users
            ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                $query->whereHas('ticket', function ($q) use ($user) {
                    $q->where('order_branch_id', $user->branch_id);
                });
            })
            ->sum('amount');

        $expenses = Expense::whereBetween('expense_date', $monthRange)->sum('amount');

        // Calculate total receivables independently since we don't load all of them anymore
        $receivablesTotal = Ticket::where('payment_status', '!=', 'paid')
            ->whereDoesntHave('payments', function ($q) {
                $q->where('status', 'pending');
            })
            // Apply branch filtering for non-admin users
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
            'pending_cheques_count' => 0, // set in index
            'open_tickets' => Ticket::where('payment_status', '!=', 'paid')
                // Apply branch filtering for non-admin users
                ->when($user && !$user->isAdmin() && $user->branch_id, function ($query) use ($user) {
                    $query->where('order_branch_id', $user->branch_id);
                })
                ->count(),
        ];
    }
}
