<?php

namespace App\Http\Controllers;

use App\Models\ProductionRecord;
use App\Models\User;
use App\Models\JobType;
use App\Models\WorkflowEvidence;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class ProductionReportController extends Controller
{
    public function index(Request $request)
    {
        $dateRange = $request->input('date_range', 'this_month');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        // Calculate date ranges
        $dates = $this->calculateDateRange($dateRange, $startDate, $endDate);

        $query = ProductionRecord::with(['user', 'ticket', 'jobType'])
            ->whereBetween('created_at', [$dates['start'], $dates['end']]);

        // If not head or admin, only show own records
        // Assuming there is a way to check if user is head, e.g. $request->user()->is_head or similar.
        // The prompt implies "production user", typically they see their own progress.
        // But if they are a head, they might want to filter by user. 
        // For now, I'll filter by logged in user unless they have permission to see others.
        // Checking Sidebar.jsx line 112: {auth?.user?.is_head && ...}

        $user = $request->user();
        if (!$user->is_head && !$user->hasRole('admin')) {
            $query->where('user_id', $user->id);
        } else {
            // If head, allow filtering by user
            if ($request->has('user_id') && $request->user_id) {
                $query->where('user_id', $request->user_id);
            }
        }

        // Apply job type filter
        if ($request->has('job_type_id') && $request->job_type_id) {
            $query->where('job_type_id', $request->job_type_id);
        }

        $records = $query->orderBy('created_at', 'desc')->get();

        // Calculate summary - Excluding Incentives Amount
        $summary = [
            'total_quantity' => $records->sum('quantity_produced'),
            'total_records' => $records->count(),
            'unique_users' => $records->pluck('user_id')->unique()->count(),
            'by_user' => $records->groupBy('user_id')->map(function ($userRecords) {
                return [
                    'user_name' => $userRecords->first()->user->name ?? 'N/A',
                    'total_quantity' => $userRecords->sum('quantity_produced'),
                    // 'total_incentives' => $userRecords->sum('incentive_amount'), // Excluded
                ];
            })->values()->toArray(),
            'by_job_type' => $records->groupBy('job_type_id')->map(function ($jobTypeRecords) {
                return [
                    'job_type_name' => $jobTypeRecords->first()->jobType->name ?? 'N/A',
                    'total_quantity' => $jobTypeRecords->sum('quantity_produced'),
                    // 'total_incentives' => $jobTypeRecords->sum('incentive_amount'), // Excluded
                ];
            })->values()->toArray(),
        ];

        // Get all relevant evidence files for these records to avoid N+1
        $ticketIds = $records->pluck('ticket_id')->unique();
        $allEvidence = WorkflowEvidence::whereIn('ticket_id', $ticketIds)->get();

        // Format records for display - Excluding Incentives Amount
        $formattedRecords = $records->map(function ($record) use ($allEvidence) {
            // Find evidence for this specific production record
            $evidence = $allEvidence->filter(function ($e) use ($record) {
                return $e->ticket_id == $record->ticket_id &&
                    $e->user_id == $record->user_id &&
                    $e->workflow_step == $record->workflow_step;
            });

            return [
                'id' => $record->id,
                'date' => $record->created_at->format('Y-m-d'),
                'created_at' => $record->created_at->toDateTimeString(),
                'user_name' => $record->user->name ?? 'N/A',
                'ticket_number' => $record->ticket->ticket_number ?? 'N/A',
                'job_type_name' => $record->jobType->name ?? 'N/A',
                'workflow_step' => $record->workflow_step,
                'quantity_produced' => $record->quantity_produced,
                'ticket_id' => $record->ticket_id,
                // 'incentive_price' => $record->jobType->incentive_price ?? 0, // Excluded
                'evidence_files' => $evidence->map(function ($file) {
                    return [
                        'id' => $file->id,
                        'file_name' => $file->file_name,
                        'file_path' => $file->file_path,
                    ];
                })->values()->toArray(),
            ];
        })->toArray();

        // Get users for filter if head
        $users = [];
        if ($user->is_head || $user->hasRole('admin')) {
            $users = User::where('role', 'Production')->select('id', 'name')->get();
        }

        // Get job types for filter
        $jobTypes = JobType::select('id', 'name')->get();

        return Inertia::render('Production/Reports/Index', [
            'dateRange' => $dateRange,
            'startDate' => $dates['start']->format('Y-m-d'),
            'endDate' => $dates['end']->format('Y-m-d'),
            'records' => $formattedRecords,
            'summary' => $summary,
            'users' => $users,
            'jobTypes' => $jobTypes,
            'filters' => [
                'date_range' => $dateRange,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'user_id' => $request->user_id ?? null,
                'job_type_id' => $request->job_type_id ?? null,
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
}
