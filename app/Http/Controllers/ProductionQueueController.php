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
            'productionUsers' => $data['productionUsers'],
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
            'assignedUsers',
            'workflowProgress',
            'productionRecords.user',
            'productionRecords.evidenceFiles'
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

        // Get all production users for assignment dropdown
        $productionUsers = \App\Models\User::where('role', \App\Models\User::ROLE_PRODUCTION)
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        return [
            'tickets' => $tickets,
            'stockItems' => $stockItems,
            'productionUsers' => $productionUsers,
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

        // Don't auto-claim - users should be assigned by Production Head
        // Keep legacy assigned_to_user_id for backward compatibility if needed
        $updateData = [
            'status' => 'in_production',
        ];

        // Only set assigned_to_user_id if not already set (backward compatibility)
        if (!$ticket->assigned_to_user_id && $ticket->assignedUsers->isEmpty()) {
            $updateData['assigned_to_user_id'] = $user->id;
        }

        $ticket->update($updateData);

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

        // Check if user is in assigned users list (for multi-user assignment)
        $assignedUsers = $ticket->assignedUsers;
        $isUserAssigned = $assignedUsers->contains('id', $user->id);

        // For backward compatibility, also check single assignment
        if (!$isUserAssigned && $ticket->assigned_to_user_id) {
            $isUserAssigned = $ticket->assigned_to_user_id === $user->id;
        }

        // Allow if user is assigned, is admin, or is production head
        if (!$isUserAssigned && !$user->isAdmin() && !$user->isProductionHead()) {
            return redirect()->back()->with('error', 'You are not assigned to this ticket. Please ask Production Head to assign you.');
        }

        $maxQuantity = $ticket->total_quantity ?? $ticket->quantity;

        // Validate request - support both single quantity and multi-user quantities
        $validated = $request->validate([
            'produced_quantity' => 'nullable|integer|min:0|max:' . $maxQuantity,
            'user_quantities' => 'nullable|string', // JSON string
            'status' => 'nullable|string|in:in_production,completed',
            'current_workflow_step' => 'nullable|string',
            'evidence_files.*' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
        ]);

        $oldStatus = $ticket->status;
        $oldWorkflowStep = $ticket->current_workflow_step;
        $oldQuantity = $ticket->produced_quantity;
        $newWorkflowStep = $validated['current_workflow_step'] ?? $ticket->current_workflow_step;
        $workflowStepChanged = $newWorkflowStep && $newWorkflowStep !== $oldWorkflowStep;

        // Parse user quantities if provided
        $userQuantities = [];
        if (!empty($validated['user_quantities'])) {
            $userQuantities = json_decode($validated['user_quantities'], true) ?? [];
        }

        // Calculate total quantity from user quantities or use single quantity
        $totalQuantity = 0;
        if (!empty($userQuantities)) {
            foreach ($userQuantities as $userQty) {
                $totalQuantity += (int)($userQty['quantity_produced'] ?? 0);
            }
        } else {
            $totalQuantity = (int)($validated['produced_quantity'] ?? 0);
        }

        $maxQuantity = $ticket->total_quantity ?? $ticket->quantity;
        $newStatus = $validated['status'] ?? ($totalQuantity >= $maxQuantity ? 'completed' : 'in_production');
        $wasCompleted = $ticket->status === 'completed';
        $isNowCompleted = $newStatus === 'completed';

        try {
            DB::transaction(function () use ($ticket, $validated, $totalQuantity, $newStatus, $isNowCompleted, $wasCompleted, $oldStatus, $user, $newWorkflowStep, $workflowStepChanged, $userQuantities, $request) {
                // If workflow step changed, check if there's existing progress for the new step
                if ($workflowStepChanged && $newWorkflowStep) {
                    $existingProgress = \App\Models\TicketWorkflowProgress::where('ticket_id', $ticket->id)
                        ->where('workflow_step', $newWorkflowStep)
                        ->first();

                    // If no record exists for the new step, reset quantity to 0
                    if (!$existingProgress) {
                        $totalQuantity = 0;
                    } else {
                        // Use the existing progress quantity for this step
                        $totalQuantity = $existingProgress->completed_quantity;
                    }
                }

                $updateData = [
                    'produced_quantity' => $totalQuantity,
                    'status' => $newStatus,
                ];

                // Update workflow step if provided
                if (isset($validated['current_workflow_step'])) {
                    $updateData['current_workflow_step'] = $validated['current_workflow_step'];
                }

                $ticket->update($updateData);

                // Create production records for each user quantity
                $currentWorkflowStep = $ticket->current_workflow_step ?? $newWorkflowStep;
                $incentivePrice = $ticket->jobType->incentive_price ?? 0;
                $createdRecords = [];

                if (!empty($userQuantities) && $currentWorkflowStep) {
                    foreach ($userQuantities as $userQty) {
                        $userId = (int)($userQty['user_id'] ?? 0);
                        $qty = (int)($userQty['quantity_produced'] ?? 0);

                        if ($userId > 0 && $qty > 0) {
                            $productionRecord = \App\Models\ProductionRecord::create([
                                'ticket_id' => $ticket->id,
                                'user_id' => $userId,
                                'job_type_id' => $ticket->job_type_id,
                                'workflow_step' => $currentWorkflowStep,
                                'quantity_produced' => $qty,
                                'incentive_amount' => $qty * $incentivePrice,
                            ]);

                            $createdRecords[] = $productionRecord;
                        }
                    }
                } else if ($totalQuantity > 0 && $currentWorkflowStep) {
                    // Single user mode (backward compatible) - create record for current user
                    $productionRecord = \App\Models\ProductionRecord::create([
                        'ticket_id' => $ticket->id,
                        'user_id' => $user->id,
                        'job_type_id' => $ticket->job_type_id,
                        'workflow_step' => $currentWorkflowStep,
                        'quantity_produced' => $totalQuantity,
                        'incentive_amount' => $totalQuantity * $incentivePrice,
                    ]);

                    $createdRecords[] = $productionRecord;
                }

                // Handle evidence files - attach to all records created in this update
                if ($request->hasFile('evidence_files') && !empty($createdRecords)) {
                    foreach ($request->file('evidence_files') as $file) {
                        $fileName = time() . '_' . uniqid() . '_' . $file->getClientOriginalName();
                        $filePath = $file->storeAs('production_evidence', $fileName, 'public');

                        // Get the public URL for the file
                        $fileUrl = asset('storage/' . $filePath);

                        // Attach evidence to all production records created in this update
                        foreach ($createdRecords as $record) {
                            \App\Models\ProductionEvidenceFile::create([
                                'production_record_id' => $record->id,
                                'file_name' => $file->getClientOriginalName(),
                                'file_path' => $fileUrl,
                                'file_type' => $file->getMimeType(),
                                'file_size' => $file->getSize(),
                            ]);
                        }
                    }
                }

                // Record workflow progress for the current step (always save progress)
                $stepCompleted = false;
                if ($currentWorkflowStep) {
                    $progress = $this->recordWorkflowProgress($ticket, $currentWorkflowStep, $totalQuantity, $user);
                    $stepCompleted = $progress->is_completed;
                }

                // If step is completed, advance to next workflow step
                if ($stepCompleted && $currentWorkflowStep) {
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
                $quantityChanged = $totalQuantity !== $oldQuantity;

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
     * Assign production users to a ticket (Production Head only)
     */
    public function assignUsers(Request $request, $id)
    {
        $user = Auth::user();
        $ticket = Ticket::findOrFail($id);

        // Only Production Head or Admin can assign users
        if (!$user->isProductionHead() && !$user->isAdmin()) {
            return redirect()->back()->with('error', 'Only Production Head or Admin can assign users to tickets.');
        }

        $validated = $request->validate([
            'user_ids' => 'array', // Allow empty array for unassigning
            'user_ids.*' => 'exists:users,id',
            'workflow_step' => 'nullable|string',
        ]);

        $userIds = $validated['user_ids'] ?? [];

        // Ensure all users are production users
        $productionUserIds = [];
        if (!empty($userIds)) {
            $productionUserIds = \App\Models\User::where('role', \App\Models\User::ROLE_PRODUCTION)
                ->whereIn('id', $userIds)
                ->pluck('id')
                ->toArray();

            // if (count($productionUserIds) !== count($userIds)) {
            //     dd($productionUserIds, $userIds);
            //     return redirect()->back()->with('error', 'All assigned users must be production users.');
            // }
        }

        // Sync assignments with workflow step
        $syncData = [];
        foreach ($productionUserIds as $userId) {
            $syncData[$userId] = ['workflow_step' => $validated['workflow_step'] ?? $ticket->current_workflow_step];
        }

        $ticket->assignedUsers()->sync($syncData);

        // Also update legacy assigned_to_user_id for backward compatibility
        if (!empty($productionUserIds)) {
            $ticket->update(['assigned_to_user_id' => $productionUserIds[0]]);
        } else {
            // Clear assignment if no users selected
            $ticket->update(['assigned_to_user_id' => null]);
        }

        return redirect()->back()->with('success', 'Users assigned successfully.');
    }

    /**
     * Show all tickets regardless of workflow (Production Head view)
     */
    public function allTickets(Request $request)
    {
        $user = Auth::user();

        $query = Ticket::with([
            'customer',
            'jobType',
            'mockupFiles',
            'workflowProgress',
            'productionRecords.user',
            'assignedUsers',
            'assignedToUser',
        ])
            ->whereIn('status', ['ready_to_print', 'in_production', 'completed']);

        // Apply filters
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('ticket_number', 'like', "%{$request->search}%")
                    ->orWhere('description', 'like', "%{$request->search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('workflow_step')) {
            $query->where('current_workflow_step', $request->workflow_step);
        }

        $tickets = $query->orderBy('due_date', 'asc')
            ->paginate(20)
            ->withQueryString();

        // Get production users for assignment
        $productionUsers = \App\Models\User::where('role', \App\Models\User::ROLE_PRODUCTION)
            ->where('is_active', true)
            ->get();


        return Inertia::render('Production/AllTickets', [
            'tickets' => $tickets,
            'productionUsers' => $productionUsers,
            'filters' => $request->only(['search', 'status', 'workflow_step']),
        ]);
    }

    /**
     * Show tickets for specific workflow step
     */
    public function workflowView(Request $request, string $workflowStep)
    {
        try {
            //code...

            $user = Auth::user();

            // Verify user has access to this workflow step
            if ($user->role === 'Production' && !$user->is_head && !$user->isAdmin()) {
                $hasAccess = $user->workflowSteps()->where('workflow_step', $workflowStep)->exists();
                if (!$hasAccess) {
                    abort(403, 'You are not assigned to this workflow step.');
                }
            }

            $query = Ticket::with([
                'customer',
                'jobType',
                'mockupFiles',
                'workflowProgress',
                'productionRecords.user',
                'assignedUsers',
                'assignedToUser',
                'evidenceFiles.user',
            ]);

            // For printing workflow, include ready_to_print tickets
            if ($workflowStep === 'printing') {
                $query->where(function ($q) use ($workflowStep) {
                    $q->where(function ($sq) use ($workflowStep) {
                        $sq->where('current_workflow_step', $workflowStep)
                            ->where('status', 'in_production');
                    })
                        ->orWhere('status', 'ready_to_print');
                });
            } else {
                // For other workflow steps, only show in_production tickets with matching step
                $query->where('current_workflow_step', $workflowStep)
                    ->where('status', 'in_production');
            }

            // Filter to only tickets assigned to this user (unless Production Head/Admin)
            if (!$user->is_head && $user->role !== 'admin') {
                $query->where(function ($q) use ($user) {
                    $q->whereHas('assignedUsers', function ($sq) use ($user) {
                        $sq->where('users.id', $user->id);
                    })->orWhere('assigned_to_user_id', $user->id);
                });
            }

            if ($request->filled('search')) {
                $query->where(function ($q) use ($request) {
                    $q->where('ticket_number', 'like', "%{$request->search}%")
                        ->orWhere('description', 'like', "%{$request->search}%");
                });
            }

            $tickets = $query->orderBy('due_date', 'asc')
                ->paginate(20)
                ->withQueryString();

            return Inertia::render('Production/WorkflowView', [
                'tickets' => $tickets,
                'workflowStep' => $workflowStep,
                'filters' => $request->only(['search']),
            ]);
        } catch (\Throwable $th) {
            dd($th);
        }
    }

    /**
     * Start work on a specific workflow step
     */
    public function startWorkflow(Request $request, string $workflowStep, Ticket $ticket)
    {
        $user = Auth::user();
        $oldStatus = $ticket->status;

        // Check if design is approved (if applicable)
        if ($ticket->design_status && $ticket->design_status !== 'approved') {
            return redirect()->back()->with('error', 'Ticket design must be approved before starting production.');
        }

        // Check if user is authorized to start production (for Production users)
        if ($user && $user->isProduction() && !$user->isAdmin()) {
            $firstStep = $ticket->getFirstWorkflowStep();
            if ($firstStep && !$user->isAssignedToWorkflowStep($firstStep)) {
                return redirect()->back()->with('error', 'You cannot start production on this ticket. The first workflow step "' . ucfirst(str_replace('_', ' ', $firstStep)) . '" is not assigned to you.');
            }
        }

        // Update ticket status to in_production
        $updateData = [
            'status' => 'in_production',
        ];

        // Update workflow_started_at if first workflow
        if (empty($ticket->workflow_started_at)) {
            $updateData['workflow_started_at'] = now();
        }

        $ticket->update($updateData);

        // Initialize workflow step
        $ticket->initializeWorkflow();

        // Record initial workflow progress
        if ($ticket->current_workflow_step) {
            $this->recordWorkflowProgress($ticket, $ticket->current_workflow_step, 0, $user);
        }

        // Create workflow log entry
        \App\Models\WorkflowLog::create([
            'ticket_id' => $ticket->id,
            'workflow_step' => $workflowStep,
            'user_id' => $user->id,
            'status' => 'in_progress',
            'started_at' => now(),
        ]);

        // Notify FrontDesk and Production users
        $this->notifyStatusChange($ticket, $oldStatus, 'in_production');

        return redirect()->back()->with('success', 'Production started successfully.');
    }

    /**
     * Update progress for a workflow step
     */
    public function updateWorkflow(Request $request, string $workflowStep, Ticket $ticket)
    {
        $request->validate([
            'produced_quantity' => 'required|integer|min:0',
            'evidence_files.*' => 'nullable|file|image|max:10240', // 10MB max
            'selected_user_id' => 'nullable|exists:users,id',
        ]);

        $user = Auth::user();
        $producedQuantity = $request->input('produced_quantity');
        $selectedUserId = $request->input('selected_user_id', $user->id);

        DB::beginTransaction();
        try {
            // Create or update production record for the selected user (or current user if not specified)
            $productionRecord = \App\Models\ProductionRecord::updateOrCreate(
                [
                    'ticket_id' => $ticket->id,
                    'user_id' => $selectedUserId,
                    'workflow_step' => $workflowStep,
                ],
                [
                    'quantity_produced' => $producedQuantity,
                    'job_type_id' => $ticket->job_type_id,
                    'incentive_amount' => $producedQuantity * ($ticket->jobType->incentive_price ?? 0),
                    'recorded_at' => now(),
                ]
            );

            // Calculate total completed quantity by summing all production records for this workflow step
            $totalCompletedQuantity = \App\Models\ProductionRecord::where('ticket_id', $ticket->id)
                ->where('workflow_step', $workflowStep)
                ->sum('quantity_produced');

            // Update or create workflow progress with the total from all users
            $workflowProgress = \App\Models\TicketWorkflowProgress::updateOrCreate(
                [
                    'ticket_id' => $ticket->id,
                    'workflow_step' => $workflowStep,
                ],
                [
                    'completed_quantity' => $totalCompletedQuantity,
                    'total_quantity' => $ticket->total_quantity ?? $ticket->quantity,
                    'is_completed' => $totalCompletedQuantity >= ($ticket->total_quantity ?? $ticket->quantity),
                    'completed_at' => $totalCompletedQuantity >= ($ticket->total_quantity ?? $ticket->quantity) ? now() : null,
                ]
            );

            // Update workflow log
            $workflowLog = \App\Models\WorkflowLog::where('ticket_id', $ticket->id)
                ->where('workflow_step', $workflowStep)
                ->where('user_id', $selectedUserId)
                ->latest()
                ->first();

            if ($workflowLog) {
                $workflowLog->update([
                    'quantity_produced' => $producedQuantity,
                    'status' => $producedQuantity >= ($ticket->total_quantity ?? $ticket->quantity) ? 'completed' : 'in_progress',
                ]);
            }

            // Handle evidence file uploads
            if ($request->hasFile('evidence_files')) {
                foreach ($request->file('evidence_files') as $file) {
                    $filename = time() . '_' . uniqid() . '_' . $file->getClientOriginalName();
                    $path = $file->storeAs('evidence/' . $ticket->id, $filename, 'public');

                    \App\Models\WorkflowEvidence::create([
                        'ticket_id' => $ticket->id,
                        'workflow_step' => $workflowStep,
                        'user_id' => $user->id,
                        'workflow_log_id' => $workflowLog?->id,
                        'file_name' => $filename,
                        'file_path' => asset('storage/' . $path),
                        'file_size' => $file->getSize(),
                        'mime_type' => $file->getMimeType(),
                        'uploaded_at' => now(),
                    ]);
                }
            }

            // Update ticket produced_quantity with total from all workflow steps
            $totalProduced = \App\Models\ProductionRecord::where('ticket_id', $ticket->id)
                ->sum('quantity_produced');
            $ticket->update(['produced_quantity' => $totalProduced]);

            DB::commit();

            return redirect()->back()->with('success', 'Progress updated successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Workflow update failed: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to update progress. Please try again.');
        }
    }

    /**
     * Mark a workflow step as completed and move to next step
     */
    public function completeWorkflow(Request $request, string $workflowStep, Ticket $ticket)
    {
        $request->validate([
            'produced_quantity' => 'nullable|integer|min:0',
            'evidence_files.*' => 'nullable|file|image|max:10240',
            'selected_user_id' => 'nullable|exists:users,id',
        ]);

        $user = Auth::user();
        $producedQuantity = $request->input('produced_quantity');
        $selectedUserId = $request->input('selected_user_id', $user->id);

        DB::beginTransaction();
        try {
            // If quantity provided, update production record first
            if ($producedQuantity !== null) {
                // Create or update production record
                $productionRecord = \App\Models\ProductionRecord::updateOrCreate(
                    [
                        'ticket_id' => $ticket->id,
                        'user_id' => $selectedUserId,
                        'workflow_step' => $workflowStep,
                    ],
                    [
                        'quantity_produced' => $producedQuantity,
                        'job_type_id' => $ticket->job_type_id,
                        'incentive_amount' => $producedQuantity * ($ticket->jobType->incentive_price ?? 0),
                        'recorded_at' => now(),
                    ]
                );

                // Calculate total completed quantity by summing all production records for this workflow step
                $totalCompletedQuantity = \App\Models\ProductionRecord::where('ticket_id', $ticket->id)
                    ->where('workflow_step', $workflowStep)
                    ->sum('quantity_produced');

                // Update workflow progress with the total from all users
                $workflowProgress = \App\Models\TicketWorkflowProgress::updateOrCreate(
                    [
                        'ticket_id' => $ticket->id,
                        'workflow_step' => $workflowStep,
                    ],
                    [
                        'completed_quantity' => $totalCompletedQuantity,
                        'total_quantity' => $ticket->total_quantity ?? $ticket->quantity,
                        'is_completed' => true,
                        'completed_at' => now(),
                        'completed_by' => $user->id,
                    ]
                );

                // Handle evidence file uploads
                if ($request->hasFile('evidence_files')) {
                    foreach ($request->file('evidence_files') as $file) {
                        $filename = time() . '_' . uniqid() . '_' . $file->getClientOriginalName();
                        $path = $file->storeAs('evidence/' . $ticket->id, $filename, 'public');

                        \App\Models\WorkflowEvidence::create([
                            'ticket_id' => $ticket->id,
                            'workflow_step' => $workflowStep,
                            'user_id' => $selectedUserId,
                            'workflow_log_id' => null,
                            'file_name' => $filename,
                            'file_path' => asset('storage/' . $path),
                            'file_size' => $file->getSize(),
                            'mime_type' => $file->getMimeType(),
                            'uploaded_at' => now(),
                        ]);
                    }
                }

                // Update ticket produced_quantity with total from all workflow steps
                $totalProduced = \App\Models\ProductionRecord::where('ticket_id', $ticket->id)
                    ->sum('quantity_produced');
                $ticket->update(['produced_quantity' => $totalProduced]);
            } else {
                // Mark workflow progress as completed (legacy behavior)
                $workflowProgress = \App\Models\TicketWorkflowProgress::where('ticket_id', $ticket->id)
                    ->where('workflow_step', $workflowStep)
                    ->first();

                if ($workflowProgress) {
                    $workflowProgress->update([
                        'is_completed' => true,
                        'completed_at' => now(),
                        'completed_by' => $user->id,
                    ]);
                }
            }

            // Update workflow log
            $workflowLog = \App\Models\WorkflowLog::where('ticket_id', $ticket->id)
                ->where('workflow_step', $workflowStep)
                ->where('user_id', $selectedUserId)
                ->latest()
                ->first();

            if ($workflowLog) {
                $workflowLog->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                    'quantity_produced' => $producedQuantity ?? $workflowLog->quantity_produced,
                ]);
            }

            // Get next workflow step
            $nextStep = $ticket->getNextWorkflowStep();

            if ($nextStep) {
                // Move to next workflow step
                $ticket->update(['current_workflow_step' => $nextStep]);

                // Notify users assigned to next step
                $this->notifyNextWorkflowStepUsers($ticket, $nextStep);
            } else {
                // All workflows completed
                $ticket->update([
                    'status' => 'completed',
                    'is_workflow_completed' => true,
                    'workflow_completed_at' => now(),
                    'current_workflow_step' => null,
                ]);

                // Auto-consume stock
                $this->stockService->autoConsumeStockForProduction($ticket);
            }

            DB::commit();

            return redirect()->back()->with('success', 'Workflow step completed successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Workflow completion failed: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to complete workflow. Please try again.');
        }
    }

    /**
     * Show completed tickets
     */
    public function completedTickets(Request $request)
    {
        $query = Ticket::with([
            'customer',
            'jobType',
            'mockupFiles',
            'workflowProgress',
            'productionRecords.user',
        ])
            ->where('status', 'completed')
            ->where(function ($q) {
                $q->where('is_workflow_completed', true)
                    ->orWhereNull('is_workflow_completed');
            });

        // Apply filters
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('ticket_number', 'like', "%{$request->search}%")
                    ->orWhere('description', 'like', "%{$request->search}%");
            });
        }

        if ($request->filled('date_range')) {
            switch ($request->date_range) {
                case 'today':
                    $query->whereDate('workflow_completed_at', today());
                    break;
                case 'this_week':
                    $query->whereBetween('workflow_completed_at', [now()->startOfWeek(), now()->endOfWeek()]);
                    break;
                case 'this_month':
                    $query->whereMonth('workflow_completed_at', now()->month)
                        ->whereYear('workflow_completed_at', now()->year);
                    break;
                case 'last_month':
                    $query->whereMonth('workflow_completed_at', now()->subMonth()->month)
                        ->whereYear('workflow_completed_at', now()->subMonth()->year);
                    break;
            }
        }

        $tickets = $query->orderBy('workflow_completed_at', 'desc')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Production/CompletedTickets', [
            'tickets' => $tickets,
            'filters' => $request->only(['search', 'date_range']),
        ]);
    }

    /**
     * Assign users to a specific workflow step for a ticket (Production Head)
     */
    public function assignWorkflow(Request $request, Ticket $ticket)
    {
        $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
            'workflow_step' => 'required|string',
        ]);

        $assignedBy = auth()->id();

        DB::beginTransaction();
        try {
            // Deactivate existing assignments for this workflow step
            \App\Models\WorkflowAssignment::where('ticket_id', $ticket->id)
                ->where('workflow_step', $request->workflow_step)
                ->update(['is_active' => false]);

            // Create new assignments
            foreach ($request->user_ids as $userId) {
                \App\Models\WorkflowAssignment::create([
                    'ticket_id' => $ticket->id,
                    'workflow_step' => $request->workflow_step,
                    'user_id' => $userId,
                    'assigned_by' => $assignedBy,
                    'is_active' => true,
                ]);
            }

            // Also sync with assigned_users relationship for compatibility
            $syncData = [];
            foreach ($request->user_ids as $userId) {
                $syncData[$userId] = ['workflow_step' => $request->workflow_step];
            }
            $ticket->assignedUsers()->syncWithoutDetaching($syncData);

            DB::commit();

            return redirect()->back()->with('success', 'Users assigned successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Workflow assignment failed: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to assign users. Please try again.');
        }
    }
}
