<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\TicketFile;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class MockupsController extends Controller
{

    public function index(Request $request)
    {
        $query = Ticket::with(['customer', 'jobType.category', 'files', 'mockupFiles', 'assignedToUser', 'updatedByUser'])
            ->where('payment_status', '!=', 'awaiting_verification')
            ->whereNotNull('design_status');


        if ($request->has('search') && $request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('ticket_number', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%')
                    ->orWhereHas('customer', function ($customerQuery) use ($request) {
                        $customerQuery->where('firstname', 'like', '%' . $request->search . '%')
                            ->orWhere('lastname', 'like', '%' . $request->search . '%');
                    });
            });
        }

        $dateRange = $request->input('date_range');

        if ($dateRange) {
            if ($dateRange === 'custom' && $request->filled('start_date') && $request->filled('end_date')) {
                $query->whereBetween('updated_at', [
                    $request->start_date . ' 00:00:00',
                    $request->end_date . ' 23:59:59'
                ]);
            } elseif ($dateRange === 'last_30_days') {
                $query->whereBetween('updated_at', [
                    now()->subDays(30)->startOfDay(),
                    now()->endOfDay()
                ]);
            } elseif ($dateRange === 'today') {
                $query->whereDate('updated_at', today());
            } elseif ($dateRange === 'this_week') {
                $query->whereBetween('updated_at', [now()->startOfWeek(), now()->endOfWeek()]);
            } elseif ($dateRange === 'this_month') {
                $query->whereMonth('updated_at', now()->month)
                    ->whereYear('updated_at', now()->year);
            } elseif ($dateRange === 'last_month') {
                $query->whereMonth('updated_at', now()->subMonth()->month)
                    ->whereYear('updated_at', now()->subMonth()->year);
            } elseif (is_numeric($dateRange) && strlen($dateRange) === 4) {
                $query->whereYear('updated_at', $dateRange);
            }
        }

        if ($request->has('design_status') && $request->design_status) {
            $statuses = is_array($request->design_status) ? $request->design_status : explode(',', $request->design_status);
            if (!in_array('all', $statuses)) {
                $query->whereIn('design_status', $statuses);
            }
        } else {
            // Default: Exclude approved
            $query->where('design_status', '!=', 'approved');
        }

        if ($request->has('branch_id') && $request->branch_id) {
            $query->where('order_branch_id', $request->branch_id);
        }

        $tickets = $query->latest('updated_at')
            ->paginate($request->get('per_page', 15))
            ->withQueryString();

        return Inertia::render('Mock-ups', [
            'tickets' => $tickets,
            'filters' => $request->only(['search', 'design_status', 'date_range', 'start_date', 'end_date', 'branch_id']),
            'branches' => \App\Models\Branch::all(['id', 'name']),
        ]);
    }


    public function show($id)
    {
        $ticket = Ticket::with(['customer', 'jobType.category', 'files'])
            ->findOrFail($id);

        return response()->json($ticket);
    }


    public function uploadMockup(Request $request, $id)
    {
        $ticket = Ticket::findOrFail($id);

        $request->validate([
            'files' => 'required|array|min:1',
            'files.*' => 'file|mimes:jpg,jpeg,png|max:10240',
            'notes' => 'nullable|string|max:1000',
        ]);

        $uploadedFiles = [];


        $files = [];
        if ($request->hasFile('files')) {
            $files = is_array($request->file('files')) ? $request->file('files') : [$request->file('files')];
        }

        foreach ($files as $file) {
            $disk = app()->environment('production') ? 's3' : 'public';
            $path = Storage::disk($disk)->put('tickets/mockups', $file, $disk === 's3' ? 'public' : []);

            TicketFile::create([
                'ticket_id' => $ticket->id,
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'type' => 'mockup',
            ]);

            $uploadedFiles[] = [
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
            ];
        }


        $ticket->update([
            'design_status' => 'mockup_uploaded',
            'design_notes' => $request->notes,
        ]);

        return redirect()->back()->with('success', 'Mock-up files uploaded successfully.');
    }


    public function approve(Request $request, $id)
    {
        $ticket = Ticket::with('jobType')->findOrFail($id);
        $oldStatus = $ticket->status;

        $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        // Determine the appropriate status and workflow step based on job type configuration
        $firstWorkflowStep = $ticket->getFirstWorkflowStep();
        $hasPrintingWorkflow = false;

        // Check if the job type has a printing workflow step
        $workflowSteps = $ticket->jobType?->workflow_steps ?? $ticket->custom_workflow_steps;
        if ($workflowSteps) {
            // Support both array formats: ['printing', 'cutting'] or { printing: true, cutting: true }
            if (is_array($workflowSteps)) {
                if (array_is_list($workflowSteps)) {
                    $hasPrintingWorkflow = in_array('printing', $workflowSteps, true);
                } else {
                    $hasPrintingWorkflow = isset($workflowSteps['printing']) &&
                        (is_bool($workflowSteps['printing']) ? $workflowSteps['printing'] : (isset($workflowSteps['printing']['enabled']) && $workflowSteps['printing']['enabled']));
                }
            }
        }

        // Set status and workflow step based on whether printing is required
        if ($hasPrintingWorkflow) {
            // Traditional flow: ready_to_print status, no workflow step set yet
            $newStatus = 'ready_to_print';
            $updateData = [
                'design_status' => 'approved',
                'design_notes' => $request->notes,
                'status' => $newStatus,
            ];
        } else {
            // No printing workflow: go directly to in_production with first workflow step
            $newStatus = 'in_production';
            $updateData = [
                'design_status' => 'approved',
                'design_notes' => $request->notes,
                'status' => $newStatus,
                'current_workflow_step' => $firstWorkflowStep,
            ];
        }

        $ticket->update($updateData);
        $ticket->refresh();

        $this->notifyStatusChange($ticket, $oldStatus, $newStatus);

        return redirect()->back()->with('success', 'Design approved successfully.');
    }


    public function requestRevision(Request $request, $id)
    {
        $ticket = Ticket::findOrFail($id);
        $oldStatus = $ticket->status;

        $request->validate([
            'notes' => 'required|string|max:1000',
        ]);

        $ticket->update([
            'design_status' => 'revision_requested',
            'design_notes' => $request->notes,
            'status' => 'rejected',
        ]);


        $this->notifyStatusChange($ticket, $oldStatus, 'rejected');

        return redirect()->back()->with('success', 'Revision requested successfully.');
    }


    public function downloadFile($id)
    {
        $file = TicketFile::findOrFail($id);
        $path = $file->getRawOriginal('file_path');

        $disk = app()->environment('production') ? 's3' : 'public';
        if (!Storage::disk($disk)->exists($path)) {
            abort(404);
        }
        return Storage::download($path, $file->file_name);
    }


    protected function notifyStatusChange(Ticket $ticket, string $oldStatus, string $newStatus): void
    {
        $triggeredBy = Auth::user();

        if (!$triggeredBy) {
            Log::warning('Cannot send notification: No authenticated user');
            return;
        }

        $recipientIds = [];
        $notificationType = '';
        $title = '';
        $message = '';


        switch ($newStatus) {
            case 'approved':
            case 'ready_to_print':

                $frontDeskUsers = \App\Models\User::where('role', \App\Models\User::ROLE_FRONTDESK)
                    ->when($ticket->order_branch_id, function ($query) use ($ticket) {
                        $query->where('branch_id', $ticket->order_branch_id);
                    })
                    ->get();
                $productionUsers = \App\Models\User::where('role', \App\Models\User::ROLE_PRODUCTION)
                    ->when($ticket->production_branch_id, function ($query) use ($ticket) {
                        $query->where('branch_id', $ticket->production_branch_id);
                    })
                    ->get();
                $recipientIds = $frontDeskUsers->pluck('id')->merge($productionUsers->pluck('id'))->unique()->toArray();

                $notificationType = 'ticket_approved';
                $title = 'Ticket Approved';
                $message = "Ticket {$ticket->ticket_number} has been approved by {$triggeredBy->name} and is ready for production.";
                break;

            case 'in_production':
                // Handle tickets that go directly to production (no printing workflow)
                $frontDeskUsers = \App\Models\User::where('role', \App\Models\User::ROLE_FRONTDESK)
                    ->when($ticket->order_branch_id, function ($query) use ($ticket) {
                        $query->where('branch_id', $ticket->order_branch_id);
                    })
                    ->get();
                $productionUsers = \App\Models\User::where('role', \App\Models\User::ROLE_PRODUCTION)
                    ->when($ticket->production_branch_id, function ($query) use ($ticket) {
                        $query->where('branch_id', $ticket->production_branch_id);
                    })
                    ->get();
                $recipientIds = $frontDeskUsers->pluck('id')->merge($productionUsers->pluck('id'))->unique()->toArray();

                $notificationType = 'ticket_in_production';
                $title = 'Ticket In Production';
                $workflowStepLabel = $ticket->current_workflow_step ? ucfirst(str_replace('_', ' ', $ticket->current_workflow_step)) : 'production';
                $message = "Ticket {$ticket->ticket_number} has been approved by {$triggeredBy->name} and is now in production ({$workflowStepLabel}).";
                break;

            case 'rejected':
            case 'cancelled':

                $frontDeskUsers = \App\Models\User::where('role', \App\Models\User::ROLE_FRONTDESK)
                    ->when($ticket->order_branch_id, function ($query) use ($ticket) {
                        $query->where('branch_id', $ticket->order_branch_id);
                    })
                    ->get();
                $recipientIds = $frontDeskUsers->pluck('id')->toArray();
                $notificationType = 'ticket_rejected';
                $title = 'Ticket ' . ucfirst($newStatus);
                $message = "Ticket {$ticket->ticket_number} has been {$newStatus} by {$triggeredBy->name}.";
                break;
        }

        if (empty($recipientIds) || empty($notificationType)) {
            Log::warning("No recipients or notification type for status change: {$oldStatus} -> {$newStatus}");
            return;
        }

        Log::info("Sending notifications for ticket {$ticket->id}: {$oldStatus} -> {$newStatus}", [
            'recipients' => $recipientIds,
            'type' => $notificationType
        ]);


        $users = \App\Models\User::whereIn('id', $recipientIds)->get();
        foreach ($users as $user) {
            try {
                \App\Models\Notification::create([
                    'user_id' => $user->id,
                    'type' => $notificationType,
                    'notifiable_id' => $ticket->id,
                    'notifiable_type' => Ticket::class,
                    'title' => $title,
                    'message' => $message,
                    'data' => [
                        'ticket_id' => $ticket->id,
                        'ticket_number' => $ticket->ticket_number,
                        'old_status' => $oldStatus,
                        'new_status' => $newStatus,
                    ],
                ]);
            } catch (\Exception $e) {
                Log::error("Failed to create notification for user {$user->id}: " . $e->getMessage());
            }
        }


        try {
            event(new \App\Events\TicketStatusChanged(
                $ticket->fresh(),
                $oldStatus,
                $newStatus,
                $triggeredBy,
                $recipientIds,
                $notificationType,
                $title,
                $message
            ));
            Log::info("Broadcast event sent for ticket {$ticket->id}");
        } catch (\Exception $e) {
            Log::error("Failed to broadcast event for ticket {$ticket->id}: " . $e->getMessage());
        }
    }


    public function claimTicket($id)
    {
        $user = Auth::user();
        $ticket = Ticket::findOrFail($id);


        if ($ticket->assigned_to_user_id && $ticket->assigned_to_user_id !== $user->id) {
            $assignedUser = \App\Models\User::find($ticket->assigned_to_user_id);
            return redirect()->back()->with('error', 'This ticket is already assigned to ' . ($assignedUser->name ?? 'another user') . '.');
        }

        $ticket->update([
            'assigned_to_user_id' => $user->id,
        ]);

        return redirect()->back()->with('success', 'Ticket claimed successfully.');
    }


    public function releaseTicket($id)
    {
        $user = Auth::user();
        $ticket = Ticket::findOrFail($id);


        if ($ticket->assigned_to_user_id !== $user->id && $user->role !== \App\Models\User::ROLE_ADMIN) {
            return redirect()->back()->with('error', 'You can only release tickets assigned to you.');
        }

        $ticket->update([
            'assigned_to_user_id' => null,
        ]);

        return redirect()->back()->with('success', 'Ticket released successfully.');
    }
}
