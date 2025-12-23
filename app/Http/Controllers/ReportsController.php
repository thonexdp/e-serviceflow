<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\Payment;
use App\Models\Expense;
use App\Models\Customer;
use App\Models\User;
use App\Models\UserActivityLog;
use App\Models\ProductionStockConsumption;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportsController extends Controller
{
    /**
     * Display the reports dashboard
     */
    public function index(Request $request)
    {
        $reportType = $request->input('report_type', 'sales');
        $dateRange = $request->input('date_range', 'this_month');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        // Calculate date ranges
        $dates = $this->calculateDateRange($dateRange, $startDate, $endDate);

        // Get report data based on type
        $reportData = match ($reportType) {
            'sales' => $this->getSalesReport($dates),
            'revenue_cashflow' => $this->getRevenueCashflowReport($dates),
            'receivables' => $this->getReceivablesReport($dates),
            'net_income' => $this->getNetIncomeReport($dates),
            'inventory' => $this->getInventoryConsumptionReport($dates),
            'product_profitability' => $this->getProductProfitabilityReport($dates),
            'production' => $this->getProductionReport($dates),
            'production_incentives' => $this->getProductionIncentivesReport($dates, $request),
            'customer_insights' => $this->getCustomerInsightsReport($dates),
            'online_orders' => $this->getOnlineOrdersReport($dates),
            'designer_approvals' => $this->getDesignerApprovalsReport($dates),
            'payment_confirmations' => $this->getPaymentConfirmationsReport($dates),
            'expenses' => $this->getExpensesReport($dates),
            'receipts' => $this->getReceiptsReport($dates),
            'staff_performance' => $this->getStaffPerformanceReport($dates),
            default => $this->getSalesReport($dates),
        };

        return Inertia::render('ReportsAnalytics', [
            'reportType' => $reportType,
            'dateRange' => $dateRange,
            'startDate' => $dates['start']->format('Y-m-d'),
            'endDate' => $dates['end']->format('Y-m-d'),
            'reportData' => $reportData,
            'filters' => [
                'report_type' => $reportType,
                'date_range' => $dateRange,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }

    private function calculateDateRange($dateRange, $startDate = null, $endDate = null)
    {
        if ($startDate && $endDate) {
            return [
                'start' => Carbon::parse($startDate)->startOfDay(),
                'end' => Carbon::parse($endDate)->endOfDay(),
            ];
        }

        return match ($dateRange) {
            'today' => [
                'start' => now()->startOfDay(),
                'end' => now()->endOfDay(),
            ],
            'yesterday' => [
                'start' => now()->subDay()->startOfDay(),
                'end' => now()->subDay()->endOfDay(),
            ],
            'this_week' => [
                'start' => now()->startOfWeek(),
                'end' => now()->endOfWeek(),
            ],
            'last_week' => [
                'start' => now()->subWeek()->startOfWeek(),
                'end' => now()->subWeek()->endOfWeek(),
            ],
            'this_month' => [
                'start' => now()->startOfMonth(),
                'end' => now()->endOfMonth(),
            ],
            'last_month' => [
                'start' => now()->subMonth()->startOfMonth(),
                'end' => now()->subMonth()->endOfMonth(),
            ],
            'this_year' => [
                'start' => now()->startOfYear(),
                'end' => now()->endOfYear(),
            ],
            'last_year' => [
                'start' => now()->subYear()->startOfYear(),
                'end' => now()->subYear()->endOfYear(),
            ],
            default => [
                'start' => now()->startOfMonth(),
                'end' => now()->endOfMonth(),
            ],
        };
    }

    /**
     * Sales Report - Daily, Monthly, Yearly breakdown with payment methods
     */
    private function getSalesReport($dates)
    {
        // Daily sales
        $dailySales = Payment::posted()
            ->collections()
            ->whereBetween('payment_date', [$dates['start'], $dates['end']])
            ->selectRaw('DATE(payment_date) as date, SUM(amount) as total, COUNT(*) as transactions')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Monthly aggregation
        $monthlySales = Payment::posted()
            ->collections()
            ->whereBetween('payment_date', [$dates['start'], $dates['end']])
            ->selectRaw('DATE_FORMAT(payment_date, "%Y-%m") as month, SUM(amount) as total, COUNT(*) as transactions')
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        // Payment methods breakdown
        $paymentMethods = Payment::posted()
            ->collections()
            ->whereBetween('payment_date', [$dates['start'], $dates['end']])
            ->selectRaw('payment_method, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('payment_method')
            ->get();

        // Summary
        $summary = [
            'total_sales' => $dailySales->sum('total'),
            'total_transactions' => $dailySales->sum('transactions'),
            'average_transaction' => $dailySales->sum('transactions') > 0 
                ? $dailySales->sum('total') / $dailySales->sum('transactions') 
                : 0,
            'days_in_period' => $dates['start']->diffInDays($dates['end']) + 1,
        ];

        return [
            'daily' => $dailySales,
            'monthly' => $monthlySales,
            'payment_methods' => $paymentMethods,
            'summary' => $summary,
        ];
    }

    /**
     * Revenue & Cashflow Report
     */
    private function getRevenueCashflowReport($dates)
    {
        $payments = Payment::posted()
            ->whereBetween('payment_date', [$dates['start'], $dates['end']])
            ->selectRaw('
                DATE(payment_date) as date,
                SUM(CASE WHEN payment_type = "collection" THEN amount ELSE 0 END) as inflow,
                SUM(CASE WHEN payment_type = "refund" THEN amount ELSE 0 END) as outflow,
                SUM(CASE WHEN payment_type = "collection" THEN amount ELSE -amount END) as net
            ')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Get expenses if table exists
        $expenses = [];
        try {
            $expenses = Expense::whereBetween('expense_date', [$dates['start'], $dates['end']])
                ->selectRaw('DATE(expense_date) as date, SUM(amount) as total')
                ->groupBy('date')
                ->get()
                ->keyBy('date');
        } catch (\Exception $e) {
            // Expenses table doesn't exist yet
        }

        // Calculate net cashflow including expenses
        $cashflow = $payments->map(function ($item) use ($expenses) {
            $expenseAmount = $expenses[$item->date]->total ?? 0;
            return [
                'date' => $item->date,
                'inflow' => $item->inflow,
                'outflow' => $item->outflow + $expenseAmount,
                'expenses' => $expenseAmount,
                'net_cashflow' => $item->net - $expenseAmount,
            ];
        });

        return [
            'cashflow' => $cashflow,
            'summary' => [
                'total_inflow' => $cashflow->sum('inflow'),
                'total_outflow' => $cashflow->sum('outflow'),
                'total_expenses' => $cashflow->sum('expenses'),
                'net_cashflow' => $cashflow->sum('net_cashflow'),
            ],
        ];
    }

    /**
     * Receivables Report - Unpaid Balances
     */
    private function getReceivablesReport($dates)
    {
        $receivables = Ticket::with('customer')
            ->whereIn('payment_status', ['pending', 'partial'])
            ->where('status', '!=', 'cancelled')
            ->selectRaw('
                tickets.*,
                (total_amount - COALESCE(amount_paid, 0)) as outstanding_balance,
                DATEDIFF(NOW(), due_date) as days_overdue
            ')
            ->orderBy('due_date')
            ->get();

        // Aging analysis
        $aging = [
            'current' => $receivables->where('days_overdue', '<=', 0)->sum('outstanding_balance'),
            '1_30_days' => $receivables->whereBetween('days_overdue', [1, 30])->sum('outstanding_balance'),
            '31_60_days' => $receivables->whereBetween('days_overdue', [31, 60])->sum('outstanding_balance'),
            '61_90_days' => $receivables->whereBetween('days_overdue', [61, 90])->sum('outstanding_balance'),
            'over_90_days' => $receivables->where('days_overdue', '>', 90)->sum('outstanding_balance'),
        ];

        return [
            'receivables' => $receivables,
            'aging' => $aging,
            'summary' => [
                'total_outstanding' => $receivables->sum('outstanding_balance'),
                'total_accounts' => $receivables->count(),
                'average_balance' => $receivables->avg('outstanding_balance'),
            ],
        ];
    }

    /**
     * Net Income Report
     */
    private function getNetIncomeReport($dates)
    {
        // Revenue
        $revenue = Payment::posted()
            ->collections()
            ->whereBetween('payment_date', [$dates['start'], $dates['end']])
            ->sum('amount');

        // Discounts
        $discounts = Ticket::whereBetween('created_at', [$dates['start'], $dates['end']])
            ->where('status', '!=', 'cancelled')
            ->sum('discount');

        // Expenses
        $expenses = 0;
        try {
            $expenses = Expense::whereBetween('expense_date', [$dates['start'], $dates['end']])
                ->sum('amount');
        } catch (\Exception $e) {
            // Expenses table doesn't exist
        }

        // Calculate actual COGS from inventory consumption
        $actualCOGS = $this->calculateActualCOGS($dates['start'], $dates['end']);

        // Net income calculation
        $netIncome = $revenue - $discounts - $actualCOGS - $expenses;
        $grossProfit = $revenue - $discounts - $actualCOGS;
        $grossMargin = $revenue > 0 ? (($grossProfit / $revenue) * 100) : 0;
        $netMargin = $revenue > 0 ? (($netIncome / $revenue) * 100) : 0;

        return [
            'revenue' => $revenue,
            'discounts' => $discounts,
            'cogs' => $actualCOGS,
            'gross_profit' => $grossProfit,
            'operating_expenses' => $expenses,
            'net_income' => $netIncome,
            'gross_margin' => $grossMargin,
            'net_margin' => $netMargin,
        ];
    }

    /**
     * Inventory Consumption Report
     */
    private function getInventoryConsumptionReport($dates)
    {
        try {
            $consumption = ProductionStockConsumption::with(['stockItem', 'ticket'])
                ->whereBetween('created_at', [$dates['start'], $dates['end']])
                ->get();

            $byItem = $consumption->groupBy('stock_item_id')->map(function ($items) {
                return [
                    'item' => $items->first()->stockItem->name ?? 'Unknown',
                    'total_consumed' => $items->sum('quantity_consumed'),
                    'unit' => $items->first()->stockItem->unit ?? '',
                    'tickets_count' => $items->count(),
                ];
            });

            return [
                'consumption' => $consumption,
                'by_item' => $byItem,
                'summary' => [
                    'total_items' => $byItem->count(),
                    'total_tickets' => $consumption->unique('ticket_id')->count(),
                ],
            ];
        } catch (\Exception $e) {
            return [
                'consumption' => [],
                'by_item' => [],
                'summary' => ['total_items' => 0, 'total_tickets' => 0],
            ];
        }
    }

    /**
     * Product Profitability Report
     */
    private function getProductProfitabilityReport($dates)
    {
        $tickets = Ticket::with('jobType')
            ->whereBetween('created_at', [$dates['start'], $dates['end']])
            ->where('status', '!=', 'cancelled')
            ->whereNotIn('payment_status', ['pending'])
            ->get();

        $byJobType = $tickets->groupBy('job_type_id')->map(function ($items) {
            $totalRevenue = $items->sum('amount_paid');
            // Calculate actual COGS for these tickets
            $ticketIds = $items->pluck('id');
            $totalCost = \App\Models\ProductionStockConsumption::whereIn('ticket_id', $ticketIds)
                ->sum('total_cost') ?? 0;
            $profit = $totalRevenue - $totalCost;
            
            return [
                'job_type' => $items->first()->jobType->name ?? 'Unknown',
                'quantity' => $items->sum('quantity'),
                'revenue' => $totalRevenue,
                'actual_cost' => $totalCost,
                'profit' => $profit,
                'margin' => $totalRevenue > 0 ? (($profit / $totalRevenue) * 100) : 0,
            ];
        })->sortByDesc('profit');

        return [
            'by_product' => $byJobType,
            'summary' => [
                'total_products' => $byJobType->count(),
                'total_revenue' => $byJobType->sum('revenue'),
                'total_profit' => $byJobType->sum('profit'),
            ],
        ];
    }

    /**
     * Production Report
     */
    private function getProductionReport($dates)
    {
        $tickets = Ticket::with('customer')
            ->whereBetween('updated_at', [$dates['start'], $dates['end']])
            ->whereIn('status', ['in_production', 'completed'])
            ->get();

        $completed = $tickets->where('status', 'completed');
        $inProgress = $tickets->where('status', 'in_production');

        // Average production time (for completed tickets)
        $avgProductionTime = $completed->map(function ($ticket) {
            return $ticket->created_at->diffInHours($ticket->updated_at);
        })->avg();

        return [
            'completed' => $completed,
            'in_progress' => $inProgress,
            'summary' => [
                'total_completed' => $completed->count(),
                'total_in_progress' => $inProgress->count(),
                'avg_production_time_hours' => round($avgProductionTime, 2),
                'total_quantity_produced' => $completed->sum('quantity'),
            ],
        ];
    }

    /**
     * Customer Insights Report
     */
    private function getCustomerInsightsReport($dates)
    {
        $customers = Customer::withCount([
            'tickets' => function ($query) use ($dates) {
                $query->whereBetween('created_at', [$dates['start'], $dates['end']]);
            }
        ])
        ->with(['tickets' => function ($query) use ($dates) {
            $query->whereBetween('created_at', [$dates['start'], $dates['end']]);
        }])
        ->having('tickets_count', '>', 0)
        ->get()
        ->map(function ($customer) {
            return [
                'id' => $customer->id,
                'name' => $customer->full_name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'total_orders' => $customer->tickets_count,
                'total_spent' => $customer->tickets->sum('amount_paid'),
                'avg_order_value' => $customer->tickets_count > 0 
                    ? $customer->tickets->sum('amount_paid') / $customer->tickets_count 
                    : 0,
            ];
        })
        ->sortByDesc('total_spent');

        return [
            'customers' => $customers,
            'summary' => [
                'total_customers' => $customers->count(),
                'total_revenue' => $customers->sum('total_spent'),
                'avg_customer_value' => $customers->avg('total_spent'),
            ],
        ];
    }

    /**
     * Online Orders Report
     */
    private function getOnlineOrdersReport($dates)
    {
        $onlineOrders = Ticket::with('customer')
            ->whereBetween('created_at', [$dates['start'], $dates['end']])
            ->where('status', 'pending')
            ->get();

        return [
            'orders' => $onlineOrders,
            'summary' => [
                'total_orders' => $onlineOrders->count(),
                'pending_value' => $onlineOrders->sum('total_amount'),
                'avg_order_value' => $onlineOrders->avg('total_amount'),
            ],
        ];
    }

    /**
     * Designer Approvals Report
     */
    private function getDesignerApprovalsReport($dates)
    {
        $tickets = Ticket::with(['customer'])
            ->whereBetween('updated_at', [$dates['start'], $dates['end']])
            ->whereIn('design_status', ['pending', 'mockup_uploaded', 'approved', 'revision_requested'])
            ->get();

        $byStatus = $tickets->groupBy('design_status')->map(function ($items, $status) {
            return [
                'status' => $status,
                'count' => $items->count(),
                'tickets' => $items,
            ];
        });

        return [
            'by_status' => $byStatus,
            'summary' => [
                'total_tickets' => $tickets->count(),
                'approved' => $tickets->where('design_status', 'approved')->count(),
                'pending' => $tickets->whereIn('design_status', ['pending', 'mockup_uploaded'])->count(),
                'revisions' => $tickets->where('design_status', 'revision_requested')->count(),
            ],
        ];
    }

    /**
     * Payment Confirmation Report
     */
    private function getPaymentConfirmationsReport($dates)
    {
        $pendingPayments = Ticket::with('customer')
            ->whereBetween('created_at', [$dates['start'], $dates['end']])
            ->whereIn('payment_status', ['pending', 'partial'])
            ->get();

        $confirmedPayments = Payment::with(['ticket.customer'])
            ->whereBetween('payment_date', [$dates['start'], $dates['end']])
            ->where('status', 'posted')
            ->get();

        return [
            'pending' => $pendingPayments,
            'confirmed' => $confirmedPayments,
            'summary' => [
                'pending_count' => $pendingPayments->count(),
                'pending_amount' => $pendingPayments->sum('outstanding_balance'),
                'confirmed_count' => $confirmedPayments->count(),
                'confirmed_amount' => $confirmedPayments->sum('amount'),
            ],
        ];
    }

    /**
     * Expenses Report
     */
    private function getExpensesReport($dates)
    {
        try {
            $expenses = Expense::whereBetween('expense_date', [$dates['start'], $dates['end']])
                ->orderBy('expense_date', 'desc')
                ->get();

            $byCategory = $expenses->groupBy('category')->map(function ($items, $category) {
                return [
                    'category' => $category,
                    'total' => $items->sum('amount'),
                    'count' => $items->count(),
                ];
            });

            return [
                'expenses' => $expenses,
                'by_category' => $byCategory,
                'summary' => [
                    'total_expenses' => $expenses->sum('amount'),
                    'total_transactions' => $expenses->count(),
                    'avg_expense' => $expenses->avg('amount'),
                ],
            ];
        } catch (\Exception $e) {
            return [
                'expenses' => [],
                'by_category' => [],
                'summary' => ['total_expenses' => 0, 'total_transactions' => 0, 'avg_expense' => 0],
            ];
        }
    }

    /**
     * OR / Receipt Report
     */
    private function getReceiptsReport($dates)
    {
        $receipts = Payment::with(['ticket.customer'])
            ->whereBetween('payment_date', [$dates['start'], $dates['end']])
            ->where('status', 'posted')
            ->whereNotNull('official_receipt_number')
            ->orderBy('payment_date', 'desc')
            ->get();

        return [
            'receipts' => $receipts,
            'summary' => [
                'total_receipts' => $receipts->count(),
                'total_amount' => $receipts->sum('amount'),
            ],
        ];
    }

    /**
     * Staff Performance Report
     */
    private function getStaffPerformanceReport($dates)
    {
        $users = User::whereIn('role', ['FrontDesk', 'Designer', 'Production'])
            ->withCount('activityLogs')
            ->get()
            ->map(function ($user) use ($dates) {
                // Get recent activity count
                $recentActivityCount = \App\Models\UserActivityLog::where('user_id', $user->id)
                    ->whereBetween('created_at', [$dates['start'], $dates['end']])
                    ->count();

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->role,
                    'email' => $user->email,
                    'last_active' => $user->updated_at,
                    'total_activities' => $user->activity_logs_count,
                    'recent_activities' => $recentActivityCount,
                ];
            });

        return [
            'staff' => $users,
            'summary' => [
                'total_staff' => $users->count(),
                'by_role' => $users->groupBy('role')->map->count(),
            ],
        ];
    }

    /**
     * Get production incentives report
     */
    private function getProductionIncentivesReport($dates, Request $request)
    {
        $query = \App\Models\ProductionRecord::with(['user', 'ticket', 'jobType', 'evidenceFiles'])
            ->whereBetween('created_at', [$dates['start'], $dates['end']]);

        // Apply user filter
        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        // Apply job type filter
        if ($request->has('job_type_id') && $request->job_type_id) {
            $query->where('job_type_id', $request->job_type_id);
        }

        $records = $query->orderBy('created_at', 'desc')->get();

        // Calculate incentive amounts based on workflow_steps
        $recordsWithIncentives = $records->map(function ($record) {
            $incentivePrice = 0;
            if ($record->jobType && $record->jobType->workflow_steps) {
                $workflowSteps = $record->jobType->workflow_steps;
                $stepData = $workflowSteps[$record->workflow_step] ?? null;
                if ($stepData && is_array($stepData) && isset($stepData['incentive_price'])) {
                    $incentivePrice = (float) ($stepData['incentive_price'] ?? 0);
                }
            }
            $record->calculated_incentive_amount = $record->quantity_produced * $incentivePrice;
            $record->calculated_incentive_price = $incentivePrice;
            return $record;
        });

        // Calculate summary
        $summary = [
            'total_incentives' => $recordsWithIncentives->sum('calculated_incentive_amount'),
            'total_quantity' => $records->sum('quantity_produced'),
            'total_records' => $records->count(),
            'unique_users' => $records->pluck('user_id')->unique()->count(),
            'by_user' => $recordsWithIncentives->groupBy('user_id')->map(function ($userRecords) {
                return [
                    'user_name' => $userRecords->first()->user->name ?? 'N/A',
                    'total_quantity' => $userRecords->sum('quantity_produced'),
                    'total_incentives' => $userRecords->sum('calculated_incentive_amount'),
                ];
            })->values()->toArray(),
            'by_job_type' => $recordsWithIncentives->groupBy('job_type_id')->map(function ($jobTypeRecords) {
                return [
                    'job_type_name' => $jobTypeRecords->first()->jobType->name ?? 'N/A',
                    'total_quantity' => $jobTypeRecords->sum('quantity_produced'),
                    'total_incentives' => $jobTypeRecords->sum('calculated_incentive_amount'),
                ];
            })->values()->toArray(),
            'by_workflow' => $recordsWithIncentives->groupBy('workflow_step')->map(function ($workflowRecords) {
                return [
                    'workflow_step' => $workflowRecords->first()->workflow_step ?? 'N/A',
                    'unique_users' => $workflowRecords->pluck('user_id')->unique()->count(),
                    'total_quantity' => $workflowRecords->sum('quantity_produced'),
                    'total_incentives' => $workflowRecords->sum('calculated_incentive_amount'),
                    'users' => $workflowRecords->groupBy('user_id')->map(function ($userRecords) {
                        return [
                            'user_id' => $userRecords->first()->user_id,
                            'user_name' => $userRecords->first()->user->name ?? 'N/A',
                            'total_quantity' => $userRecords->sum('quantity_produced'),
                            'total_incentives' => $userRecords->sum('calculated_incentive_amount'),
                        ];
                    })->values()->toArray(),
                ];
            })->values()->toArray(),
        ];

        // Format records for display
        $formattedRecords = $records->map(function ($record) {
            // Get incentive price from workflow_steps
            $incentivePrice = 0;
            if ($record->jobType && $record->jobType->workflow_steps) {
                $workflowSteps = $record->jobType->workflow_steps;
                $stepData = $workflowSteps[$record->workflow_step] ?? null;
                if ($stepData && is_array($stepData) && isset($stepData['incentive_price'])) {
                    $incentivePrice = (float) ($stepData['incentive_price'] ?? 0);
                }
            }

            return [
                'id' => $record->id,
                'date' => $record->created_at->format('Y-m-d'),
                'created_at' => $record->created_at->toDateTimeString(),
                'user_id' => $record->user_id,
                'user_name' => $record->user->name ?? 'N/A',
                'ticket_number' => $record->ticket->ticket_number ?? 'N/A',
                'job_type_name' => $record->jobType->name ?? 'N/A',
                'workflow_step' => $record->workflow_step,
                'quantity_produced' => $record->quantity_produced,
                'incentive_price' => $incentivePrice,
                'incentive_amount' => $record->quantity_produced * $incentivePrice,
                'evidence_files' => $record->evidenceFiles->map(function ($file) {
                    return [
                        'id' => $file->id,
                        'file_name' => $file->file_name,
                        'file_path' => $file->file_path,
                    ];
                })->toArray(),
            ];
        })->toArray();

        return [
            'records' => $formattedRecords,
            'summary' => $summary,
            'filters' => [
                'user_id' => $request->user_id ?? null,
                'user_name' => $request->user_id ? \App\Models\User::find($request->user_id)->name ?? null : null,
                'job_type_id' => $request->job_type_id ?? null,
                'job_type_name' => $request->job_type_id ? \App\Models\JobType::find($request->job_type_id)->name ?? null : null,
            ],
        ];
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
            // If ProductionStockConsumption table doesn't exist, return 0
            return 0;
        }
    }

    /**
     * Export report as PDF
     */
    public function exportPdf(Request $request)
    {
        // This will be implemented with a PDF library like DomPDF or TCPDF
        // For now, return the same data that can be printed from the browser
        return response()->json(['message' => 'PDF export coming soon']);
    }
}

