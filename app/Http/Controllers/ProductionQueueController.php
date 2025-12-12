<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Services\StockManagementService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProductionQueueController extends Controller
{
    protected $stockService;

    public function __construct(StockManagementService $stockService)
    {
        $this->stockService = $stockService;
    }

    /**
     * Display a listing of tickets ready for production.
     */
    public function index(Request $request)
    {
        // Get tickets that are approved by designer (ready for production)
        $data = $this->getData($request);
        return Inertia::render('Productions', [
            'tickets' => $data['tickets'],
            'stockItems' => $data['stockItems'],
            'filters' => $request->only(['search', 'status']),
            'summary' => $data['summary'],
        ]);
    }


    public function getData(Request $request)
    {
        $user = Auth::user();

        $query = Ticket::with([
            'jobType.category',
            'jobType.stockRequirements.stockItem',
            'mockupFiles',
            'stockConsumptions.stockItem',
            'assignedToUser',
            'workflowProgress'
        ])
            ->whereIn('status', ['ready_to_print', 'in_production', 'completed'])
            ->where(function ($q) {
                $q->where('design_status', 'approved')
                    ->orWhereNull('design_status');
            });

        // Production users can see ALL tickets for progress tracking
        // They will be restricted from editing tickets that aren't in their workflow step
        // No filtering by workflow step assignment for visibility

        // Apply search
        if ($request->has('search') && $request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('ticket_number', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        // Filter by production status
        if ($request->has('status') && $request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $tickets = $query->orderByRaw("
            CASE 
                WHEN status = 'ready_to_print' THEN 1
                WHEN status = 'in_production' THEN 2
                WHEN status = 'completed' THEN 3
                ELSE 4
            END
        ")->latest()->get();

        // Production users can see all tickets for progress tracking
        // Permission to edit will be checked in the update methods

        // Paginate manually
        $perPage = $request->get('per_page', 15);
        $currentPage = $request->get('page', 1);
        $total = $tickets->count();
        $tickets = $tickets->slice(($currentPage - 1) * $perPage, $perPage)->values();

        // Create paginator manually
        $tickets = new \Illuminate\Pagination\LengthAwarePaginator(
            $tickets,
            $total,
            $perPage,
            $currentPage,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        // Get all active stock items for consumption form
        $stockItems = \App\Models\StockItem::where('is_active', true)
            ->orderBy('name')
            ->get();

        // Calculate summary statistics for today
        $today = now()->startOfDay();
        $baseQuery = Ticket::whereIn('status', ['ready_to_print', 'in_production', 'completed'])
            ->where(function ($q) {
                $q->where('design_status', 'approved')
                    ->orWhereNull('design_status');
            });

        // Apply same filters for summary (except status filter to get all counts)
        if ($request->has('search') && $request->search) {
            $baseQuery->where(function ($q) use ($request) {
                $q->where('ticket_number', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        $summary = [
            'total' => (clone $baseQuery)->count(),
            'inProgress' => (clone $baseQuery)->where('status', 'in_production')->count(),
            'finished' => (clone $baseQuery)->where('status', 'completed')->count(),
            'delays' => (clone $baseQuery)
                ->where('status', '!=', 'completed')
                ->whereNotNull('due_date')
                ->whereDate('due_date', '<', $today)
                ->count(),
        ];

        return [
            'tickets' => $tickets,
            'stockItems' => $stockItems,
            'filters' => $request->only(['search', 'status']),
            'summary' => $summary,
        ];
    }

    /**
     * Start production (change status to in_production).
     */
    public function startProduction($id)
    {
        $user = Auth::user();
        $ticket = Ticket::with('jobType')->findOrFail($id);
        $oldStatus = $ticket->status;

        if ($ticket->design_status !== 'approved') {
            return redirect()->back()->with('error', 'Ticket design must be approved before starting production.');
        }

        // Check if user is authorized to start production (for Production users)
        if ($user && $user->isProduction() && !$user->isAdmin()) {
            $firstStep = $ticket->getFirstWorkflowStep();
            if ($firstStep && !$user->isAssignedToWorkflowStep($firstStep)) {
                return redirect()->back()->with('error', 'You cannot start production on this ticket. The first workflow step "' . ucfirst(str_replace('_', ' ', $firstStep)) . '" is not assigned to you.');
            }
        }

        // Auto-claim ticket if not already assigned
        if (!$ticket->assigned_to_user_id) {
            $ticket->assigned_to_user_id = $user->id;
        }

        $ticket->update([
            'status' => 'in_production',
            'assigned_to_user_id' => $ticket->assigned_to_user_id,
        ]);

        // Initialize workflow step
        $ticket->initializeWorkflow();

        // Record initial workflow progress
        if ($ticket->current_workflow_step) {
            $this->recordWorkflowProgress($ticket, $ticket->current_workflow_step, 0, $user);
        }

        // Notify FrontDesk (optional)
        $this->notifyStatusChange($ticket, $oldStatus, 'in_production');

        return redirect()->back()->with('success', 'Production started successfully.');
    }

    /**
     * Update production progress.
     */
    public function updateProgress(Request $request, $id)
    {
        $user = Auth::user();
        $ticket = Ticket::with([
            'jobType',
            'jobType.stockRequirements',
            'jobType.stockRequirements.stockItem'
        ])->findOrFail($id);

        // Check if user is authorized to update this ticket's workflow step
        if ($user && $user->isProduction() && !$user->isAdmin()) {
            // If ticket has a current workflow step, user must be assigned to it
            if ($ticket->current_workflow_step) {
                if (!$user->isAssignedToWorkflowStep($ticket->current_workflow_step)) {
                    $stepLabel = ucfirst(str_replace('_', ' ', $ticket->current_workflow_step));
                    return redirect()->back()->with('error', 'You cannot update this ticket. It is currently in the "' . $stepLabel . '" step, which is not assigned to you.');
                }
            }

            // If user is trying to manually change workflow step, validate they're assigned to the new step
            if ($request->has('current_workflow_step') && $request->current_workflow_step) {
                if ($request->current_workflow_step !== $ticket->current_workflow_step) {
                    if (!$user->isAssignedToWorkflowStep($request->current_workflow_step)) {
                        $newStepLabel = ucfirst(str_replace('_', ' ', $request->current_workflow_step));
                        return redirect()->back()->with('error', 'You are not assigned to the "' . $newStepLabel . '" workflow step.');
                    }
                }
            }
        }

        // Check if ticket is assigned to another user (do this AFTER workflow step check)
        // This allows users in the correct workflow step to take over if needed
        if ($ticket->assigned_to_user_id && $ticket->assigned_to_user_id !== $user->id) {
            $assignedUser = \App\Models\User::find($ticket->assigned_to_user_id);
            return redirect()->back()->with('error', 'This ticket is currently assigned to ' . ($assignedUser->name ?? 'another user') . '. Please ask them to release it first, or have an admin reassign it.');
        }

        $maxQuantity = $ticket->total_quantity ?? $ticket->quantity;

        $validated = $request->validate([
            'produced_quantity' => 'required|integer|min:0|max:' . $maxQuantity,
            'status' => 'nullable|string|in:in_production,completed',
            'current_workflow_step' => 'nullable|string',
        ]);

        $oldStatus = $ticket->status;
        $oldWorkflowStep = $ticket->current_workflow_step;
        $oldQuantity = $ticket->produced_quantity;
        $newWorkflowStep = $validated['current_workflow_step'] ?? $ticket->current_workflow_step;
        $workflowStepChanged = $newWorkflowStep && $newWorkflowStep !== $oldWorkflowStep;

        $maxQuantity = $ticket->total_quantity ?? $ticket->quantity;
        $newStatus = $validated['status'] ?? ($validated['produced_quantity'] >= $maxQuantity ? 'completed' : 'in_production');
        $wasCompleted = $ticket->status === 'completed';
        $isNowCompleted = $newStatus === 'completed';

        try {
            DB::transaction(function () use ($ticket, $validated, $newStatus, $isNowCompleted, $wasCompleted, $oldStatus, $user, $newWorkflowStep, $workflowStepChanged) {
                // If workflow step changed, check if there's existing progress for the new step
                if ($workflowStepChanged && $newWorkflowStep) {
                    $existingProgress = \App\Models\TicketWorkflowProgress::where('ticket_id', $ticket->id)
                        ->where('workflow_step', $newWorkflowStep)
                        ->first();

                    // If no record exists for the new step, reset quantity to 0
                    if (!$existingProgress) {
                        $validated['produced_quantity'] = 0;
                    } else {
                        // Use the existing progress quantity for this step
                        $validated['produced_quantity'] = $existingProgress->completed_quantity;
                    }
                }

                $updateData = [
                    'produced_quantity' => $validated['produced_quantity'],
                    'status' => $newStatus,
                ];

                // Update workflow step if provided
                if (isset($validated['current_workflow_step'])) {
                    $updateData['current_workflow_step'] = $validated['current_workflow_step'];
                }

                $ticket->update($updateData);

                // Record workflow progress for the current step (always save progress)
                $stepCompleted = false;
                if ($ticket->current_workflow_step) {
                    $progress = $this->recordWorkflowProgress($ticket, $ticket->current_workflow_step, $validated['produced_quantity'], $user);
                    $stepCompleted = $progress->is_completed;
                }

                // If step is completed, advance to next workflow step
                if ($stepCompleted && $ticket->current_workflow_step) {
                    $nextStep = $ticket->getNextWorkflowStep();
                    if ($nextStep) {
                        // Advance to next step and reset quantity for the new step
                        $ticket->update(['current_workflow_step' => $nextStep]);
                        // Notify users assigned to the next workflow step
                        $this->notifyNextWorkflowStepUsers($ticket, $nextStep);
                    } else {
                        // No more steps, mark as completed
                        $ticket->update(['status' => 'completed', 'current_workflow_step' => null]);
                    }
                }

                // Auto-consume stock if just marked as completed (and wasn't already completed)
                if ($isNowCompleted && !$wasCompleted) {
                    // Refresh ticket to ensure we have latest data
                    $ticket->refresh();

                    // Automatically consume stock based on job type requirements
                    $this->stockService->autoConsumeStockForProduction($ticket);
                }
            });

            // Refresh ticket to get latest workflow step
            $ticket->refresh();

            $message = 'Production progress updated successfully.';
            if ($isNowCompleted && !$wasCompleted) {
                $consumptionCount = \App\Models\ProductionStockConsumption::where('ticket_id', $ticket->id)->count();
                if ($consumptionCount > 0) {
                    $message .= ' Stock automatically deducted.';
                }
                // Notify FrontDesk when completed
                $this->notifyStatusChange($ticket, $oldStatus, 'completed');
            } elseif ($oldStatus !== $newStatus && $newStatus === 'in_production') {
                // Notify when status changes to in_production
                $this->notifyStatusChange($ticket, $oldStatus, 'in_production');
            } else {
                // Notify for workflow step or quantity changes (even if status didn't change)
                $workflowStepChanged = $ticket->current_workflow_step !== $oldWorkflowStep;
                $quantityChanged = $validated['produced_quantity'] !== $oldQuantity;

                if ($workflowStepChanged || $quantityChanged) {
                    $this->notifyProductionUpdate($ticket, $oldWorkflowStep, $oldQuantity);
                }
            }
            return redirect()->back()->with('success', $message);
        } catch (\Exception $e) {
            Log::error("Update progress failed for ticket {$id}: " . $e->getMessage());
            Log::error("Stack trace: " . $e->getTraceAsString());

            return redirect()->back()->with(
                'warning',
                'Production progress updated, but automatic stock deduction failed: ' . $e->getMessage()
            );
        }
    }

    /**
     * Mark ticket as completed.
     */
    public function markCompleted($id)
    {
        $ticket = Ticket::with([
            'jobType',
            'jobType.stockRequirements',
            'jobType.stockRequirements.stockItem'
        ])->findOrFail($id);
        $oldStatus = $ticket->status;

        try {
            DB::transaction(function () use ($ticket) {
                // Update ticket status first
                $ticket->update([
                    'status' => 'completed',
                    'produced_quantity' => $ticket->quantity,
                ]);

                // Refresh ticket to ensure we have latest data
                $ticket->refresh();

                // Automatically consume stock based on job type requirements
                $this->stockService->autoConsumeStockForProduction($ticket);
            });

            $message = 'Ticket marked as completed successfully.';

            // Check if consumptions were created
            $consumptionCount = \App\Models\ProductionStockConsumption::where('ticket_id', $ticket->id)->count();
            if ($consumptionCount > 0) {
                $message .= ' Stock automatically deducted.';
            } else {
                $message .= ' (No stock requirements found for this job type)';
            }

            // Notify FrontDesk when completed
            $this->notifyStatusChange($ticket, $oldStatus, 'completed');

            return redirect()->back()->with('success', $message);
        } catch (\Exception $e) {
            // If auto-consumption fails, still mark as completed but show warning
            Log::error("Auto-consumption failed for ticket {$id}: " . $e->getMessage());
            Log::error("Stack trace: " . $e->getTraceAsString());

            return redirect()->back()->with(
                'warning',
                'Ticket marked as completed, but automatic stock deduction failed: ' . $e->getMessage() .
                    ' Please manually record stock consumption.'
            );
        }
    }

    /**
     * Record stock consumption for a completed production.
     */
    public function recordStockConsumption(Request $request, $id)
    {
        $ticket = Ticket::findOrFail($id);

        if ($ticket->status !== 'completed') {
            return redirect()->back()->with('error', 'Stock consumption can only be recorded for completed tickets.');
        }

        $validated = $request->validate([
            'stock_consumptions' => 'required|array|min:1',
            'stock_consumptions.*.stock_item_id' => 'required|exists:stock_items,id',
            'stock_consumptions.*.quantity' => 'required|numeric|min:0.01',
            'stock_consumptions.*.notes' => 'nullable|string',
        ]);

        try {
            foreach ($validated['stock_consumptions'] as $consumption) {
                $this->stockService->consumeStockForProduction(
                    $ticket->id,
                    $consumption['stock_item_id'],
                    $consumption['quantity'],
                    $consumption['notes'] ?? null
                );
            }

            return redirect()->back()->with('success', 'Stock consumption recorded successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Notify users about ticket status changes (shared with TicketController logic)
     */
    protected function notifyStatusChange(Ticket $ticket, string $oldStatus, string $newStatus): void
    {
        try {
            //code...

            $triggeredBy = Auth::user();
            $recipientIds = [];
            $notificationType = '';
            $title = '';
            $message = '';

            // Determine recipients and notification content based on status change
            switch ($newStatus) {
                case 'in_production':
                    // Notify FrontDesk AND Production users
                    $frontDeskUsers = \App\Models\User::where('role', \App\Models\User::ROLE_FRONTDESK)->get();
                    $productionUsers = \App\Models\User::where('role', \App\Models\User::ROLE_PRODUCTION)->get();

                    // Merge both user collections and get unique IDs
                    $allUsers = $frontDeskUsers->merge($productionUsers);
                    $recipientIds = $allUsers->pluck('id')->unique()->toArray();

                    $notificationType = 'ticket_in_production';
                    $title = 'Ticket In Production';
                    $message = "Ticket {$ticket->ticket_number} is now in production.";
                    break;

                case 'completed':
                    // Notify FrontDesk AND Production users
                    $frontDeskUsers = \App\Models\User::where('role', \App\Models\User::ROLE_FRONTDESK)->get();
                    $productionUsers = \App\Models\User::where('role', \App\Models\User::ROLE_PRODUCTION)->get();

                    // Merge both user collections and get unique IDs
                    $allUsers = $frontDeskUsers->merge($productionUsers);
                    $recipientIds = $allUsers->pluck('id')->unique()->toArray();

                    $notificationType = 'ticket_completed';
                    $title = 'Ticket Completed';
                    $message = "Ticket {$ticket->ticket_number} has been completed.";
                    break;
            }

            if (empty($recipientIds) || empty($notificationType)) {
                return;
            }

            // Create notifications for all recipients
            $users = \App\Models\User::whereIn('id', $recipientIds)->get();
            foreach ($users as $user) {
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
            }

            // Broadcast event
            event(new \App\Events\TicketStatusChanged(
                $ticket,
                $oldStatus,
                $newStatus,
                $triggeredBy,
                $recipientIds,
                $notificationType,
                $title,
                $message
            ));
        } catch (\Exception $e) {
            Log::error("Error Notification: " . $e->getMessage());
            Log::error("Error trace: " . $e->getTraceAsString());
        }
    }

    /**
     * Notify users about production updates (workflow step or quantity changes)
     */
    protected function notifyProductionUpdate(Ticket $ticket, ?string $oldWorkflowStep, ?int $oldQuantity): void
    {
        try {
            $triggeredBy = Auth::user();

            // Notify ALL production users AND frontdesk
            $frontDeskUsers = \App\Models\User::where('role', \App\Models\User::ROLE_FRONTDESK)->get();
            $productionUsers = \App\Models\User::where('role', \App\Models\User::ROLE_PRODUCTION)->get();

            $allUsers = $frontDeskUsers->merge($productionUsers);
            $recipientIds = $allUsers->pluck('id')->unique()->toArray();

            // Build message based on what changed
            $changes = [];
            if ($ticket->current_workflow_step !== $oldWorkflowStep) {
                $stepLabel = ucfirst(str_replace('_', ' ', $ticket->current_workflow_step ?? 'unknown'));
                $changes[] = "moved to {$stepLabel}";
            }
            if ($ticket->produced_quantity !== $oldQuantity) {
                $changes[] = "quantity updated to {$ticket->produced_quantity}/{$ticket->quantity}";
            }

            $message = "Ticket {$ticket->ticket_number} " . implode(', ', $changes) . ".";

            $notificationType = 'ticket_production_updated';
            $title = 'Production Update';

            // Create notifications for all recipients
            $users = \App\Models\User::whereIn('id', $recipientIds)->get();
            foreach ($users as $user) {
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
                        'old_workflow_step' => $oldWorkflowStep,
                        'new_workflow_step' => $ticket->current_workflow_step,
                        'old_quantity' => $oldQuantity,
                        'new_quantity' => $ticket->produced_quantity,
                    ],
                ]);
            }

            // Broadcast event to all production users
            event(new \App\Events\TicketStatusChanged(
                $ticket,
                $ticket->status, // Status didn't change
                $ticket->status, // Status didn't change
                $triggeredBy,
                $recipientIds,
                $notificationType,
                $title,
                $message
            ));
        } catch (\Exception $e) {
            Log::error("Error Production Update Notification: " . $e->getMessage());
            Log::error("Error trace: " . $e->getTraceAsString());
        }
    }

    /**
     * Record workflow progress for a ticket
     * 
     * @return \App\Models\TicketWorkflowProgress
     */
    protected function recordWorkflowProgress(Ticket $ticket, string $workflowStep, int $quantity, $user = null)
    {
        $progress = \App\Models\TicketWorkflowProgress::firstOrNew([
            'ticket_id' => $ticket->id,
            'workflow_step' => $workflowStep,
        ]);

        $progress->completed_quantity = $quantity;
        // Use total_quantity which includes free_quantity
        $maxQuantity = $ticket->total_quantity ?? (($ticket->quantity ?? 0) + ($ticket->free_quantity ?? 0));
        $progress->is_completed = $quantity >= $maxQuantity;

        if ($progress->is_completed && !$progress->completed_at) {
            $progress->completed_at = now();
            $progress->completed_by = $user ? $user->id : null;
        }

        $progress->save();

        return $progress;
    }

    /**
     * Notify users assigned to the next workflow step
     */
    protected function notifyNextWorkflowStepUsers(Ticket $ticket, string $nextWorkflowStep): void
    {
        try {
            $users = \App\Models\User::getUsersAssignedToWorkflowStep($nextWorkflowStep);

            if ($users->isEmpty()) {
                return;
            }

            $stepLabel = ucfirst(str_replace('_', ' ', $nextWorkflowStep));
            $message = "Ticket {$ticket->ticket_number} is now ready for {$stepLabel}. It's your turn to work on it.";
            $title = "Ticket Ready for {$stepLabel}";

            foreach ($users as $user) {
                \App\Models\Notification::create([
                    'user_id' => $user->id,
                    'type' => 'ticket_workflow_step_ready',
                    'notifiable_id' => $ticket->id,
                    'notifiable_type' => Ticket::class,
                    'title' => $title,
                    'message' => $message,
                    'data' => [
                        'ticket_id' => $ticket->id,
                        'ticket_number' => $ticket->ticket_number,
                        'workflow_step' => $nextWorkflowStep,
                        'workflow_step_label' => $stepLabel,
                    ],
                ]);
            }

            // Broadcast event
            event(new \App\Events\TicketStatusChanged(
                $ticket,
                $ticket->status,
                $ticket->status,
                Auth::user(),
                $users->pluck('id')->toArray(),
                'ticket_workflow_step_ready',
                $title,
                $message
            ));
        } catch (\Exception $e) {
            Log::error("Error notifying next workflow step users: " . $e->getMessage());
        }
    }

    /**
     * Claim a ticket for the current user
     */
    public function claimTicket($id)
    {
        $user = Auth::user();
        $ticket = Ticket::findOrFail($id);

        // Check if ticket is already assigned to another user
        if ($ticket->assigned_to_user_id && $ticket->assigned_to_user_id !== $user->id) {
            $assignedUser = \App\Models\User::find($ticket->assigned_to_user_id);
            return redirect()->back()->with('error', 'This ticket is already assigned to ' . ($assignedUser->name ?? 'another user') . '.');
        }

        // Check if user can claim this ticket based on current workflow step
        if ($user && $user->isProduction() && !$user->isAdmin()) {
            if ($ticket->status === 'ready_to_print') {
                // For ready_to_print, check if user is assigned to first workflow step
                $firstStep = $ticket->getFirstWorkflowStep();
                if ($firstStep && !$user->isAssignedToWorkflowStep($firstStep)) {
                    return redirect()->back()->with('error', 'You cannot claim this ticket. It\'s not in your assigned workflow step yet.');
                }
            } else if ($ticket->status === 'in_production' && $ticket->current_workflow_step) {
                // For in_production, check if current workflow step matches user's assignment
                if (!$user->isAssignedToWorkflowStep($ticket->current_workflow_step)) {
                    return redirect()->back()->with('error', 'You cannot claim this ticket. It\'s currently in the "' . ucfirst(str_replace('_', ' ', $ticket->current_workflow_step)) . '" step, which is not assigned to you.');
                }
            }
        }

        $ticket->update([
            'assigned_to_user_id' => $user->id,
        ]);

        return redirect()->back()->with('success', 'Ticket claimed successfully.');
    }

    /**
     * Release a ticket (unclaim it)
     */
    public function releaseTicket($id)
    {
        $user = Auth::user();
        $ticket = Ticket::findOrFail($id);

        // Only the assigned user or admin can release
        if ($ticket->assigned_to_user_id !== $user->id && !$user->isAdmin()) {
            return redirect()->back()->with('error', 'You can only release tickets assigned to you.');
        }

        $ticket->update([
            'assigned_to_user_id' => null,
        ]);

        return redirect()->back()->with('success', 'Ticket released successfully.');
    }
}
