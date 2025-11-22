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
    public function index(Request $request): Response
    {
        $perPage = (int)$request->input('per_page', 15);

        $ledgerQuery = Payment::with(['ticket.customer', 'customer', 'documents'])
            ->when($request->filled('method'), fn ($query) => $query->where('payment_method', $request->string('method')))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->when($request->filled('search'), function ($query) use ($request) {
                $term = '%' . $request->search . '%';
                $query->where(function ($q) use ($term) {
                    $q->where('official_receipt_number', 'like', $term)
                        ->orWhere('invoice_number', 'like', $term)
                        ->orWhere('payment_reference', 'like', $term)
                        ->orWhere('payer_name', 'like', $term);
                });
            })
            ->orderByDesc('payment_date')
            ->orderByDesc('id');

        $ledger = $ledgerQuery->latest()->paginate($perPage)->withQueryString();

        $receivables = $this->buildReceivables();

        $expenses = Expense::with('ticket')
            ->orderByDesc('expense_date')
            ->paginate(15)
            ->withQueryString();

        $cashFlow = $this->buildCashFlow();

        $summary = $this->buildSummary($receivables);

        $openTickets = Ticket::with('customer')
            ->where('payment_status', '!=', 'paid')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get(['id', 'ticket_number', 'customer_id', 'total_amount', 'amount_paid']);

        $recentCustomers = Customer::orderBy('lastname')
            ->limit(50)
            ->get(['id', 'firstname', 'lastname']);

        return Inertia::render('PaymentsFinance', [
            'ledger' => $ledger,
            'receivables' => $receivables,
            'expenses' => $expenses,
            'cashFlow' => $cashFlow,
            'summary' => $summary,
            'filters' => $request->only(['search', 'method', 'status']),
            'paymentMethods' => Payment::METHODS,
            'expenseCategories' => Expense::CATEGORIES,
            'openTickets' => $openTickets,
            'customers' => $recentCustomers,
        ]);
    }

    /**
     * Aggregate receivables per customer.
     *
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    protected function buildReceivables(): Collection
    {
        return Customer::query()
            ->withSum(['tickets as total_invoiced' => function ($query) {
                $query->whereNull('tickets.deleted_at')
                    ->where('status', '!=', 'cancelled');
            }], 'total_amount')
            ->withSum(['payments as total_paid' => function ($query) {
                $query->whereNull('payments.deleted_at')
                    ->where('status', 'posted');
            }], 'amount')
            ->withMax(['payments as last_payment_at' => function ($query) {
                $query->whereNull('payments.deleted_at')
                    ->where('status', 'posted');
            }], 'payment_date')
            ->withCount(['tickets as open_tickets_count' => function ($query) {
                $query->whereNull('tickets.deleted_at')
                    ->where('payment_status', '!=', 'paid');
            }])
            ->orderBy('lastname')
            ->get()
            ->map(function (Customer $customer) {
                $invoiced = (float)($customer->total_invoiced ?? 0);
                $paid = (float)($customer->total_paid ?? 0);
                $balance = max($invoiced - $paid, 0);

                return [
                    'id' => $customer->id,
                    'name' => $customer->full_name,
                    'total_invoiced' => round($invoiced, 2),
                    'total_paid' => round($paid, 2),
                    'balance' => round($balance, 2),
                    'open_tickets' => $customer->open_tickets_count ?? 0,
                    'last_payment_at' => $customer->last_payment_at,
                ];
            })
            ->filter(fn ($row) => $row['balance'] > 0)
            ->values();
    }

    /**
     * Combine payments (inflows) and expenses (outflows) for a quick cash flow view.
     */
    protected function buildCashFlow(int $days = 30): Collection
    {
        $startDate = Carbon::now()->subDays($days)->startOfDay();

        $paymentFlows = Payment::posted()
            ->whereDate('payment_date', '>=', $startDate)
            ->get()
            ->map(function (Payment $payment) {
                return [
                    'id' => "payment-{$payment->id}",
                    'entry_date' => $payment->payment_date->toDateString(),
                    'type' => 'inflow',
                    'source' => 'Payment',
                    'description' => trim(($payment->ticket?->ticket_number ? "#{$payment->ticket->ticket_number}" : '') . ' ' . $payment->display_payer),
                    'amount' => (float)$payment->amount,
                    'method' => $payment->payment_method,
                ];
            });

        $expenseFlows = Expense::query()
            ->whereDate('expense_date', '>=', $startDate)
            ->get()
            ->map(function (Expense $expense) {
                return [
                    'id' => "expense-{$expense->id}",
                    'entry_date' => $expense->expense_date->toDateString(),
                    'type' => 'outflow',
                    'source' => 'Expense',
                    'description' => $expense->description,
                    'amount' => (float)$expense->amount,
                    'method' => $expense->payment_method,
                ];
            });

        $entries = $paymentFlows->merge($expenseFlows)
            ->sortBy(fn ($row) => $row['entry_date'])
            ->values();

        $running = 0;
        foreach ($entries as &$entry) {
            $running += $entry['type'] === 'inflow' ? $entry['amount'] : -$entry['amount'];
            $entry['running_balance'] = round($running, 2);
        }
        unset($entry);

        return $entries->sortByDesc('entry_date')->values();
    }

    protected function buildSummary(Collection $receivables): array
    {
        $now = Carbon::now();
        $monthRange = [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()];

        $collections = Payment::posted()
            ->collections()
            ->whereBetween('payment_date', $monthRange)
            ->sum('amount');

        $expenses = Expense::whereBetween('expense_date', $monthRange)->sum('amount');

        return [
            'collections_month' => round($collections, 2),
            'expenses_month' => round($expenses, 2),
            'net_cash_flow_month' => round($collections - $expenses, 2),
            'receivables_total' => round($receivables->sum('balance'), 2),
            'open_tickets' => Ticket::where('payment_status', '!=', 'paid')->count(),
        ];
    }
}
