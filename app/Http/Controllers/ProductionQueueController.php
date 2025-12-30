<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Services\StockManagementService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ProductionQueueController extends Controller
{
    protected $stockService;

    public function __construct(StockManagementService $stockService)
    {
        $this->stockService = $stockService;
    }


    public function index(Request $request)
    {


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
            'productionRecords.evidenceFiles',
            'payments.documents',
            'payments.recordedBy',
            'orderBranch',
            'productionBranch'
        ])
            ->whereIn('status', ['ready_to_print', 'in_production'])
            ->where('payment_status', '!=', 'awaiting_verification')
            ->where(function ($q) {
                $q->where('design_status', 'approved')
                    ->orWhereNull('design_status');
            })


            ->whereHas('jobType', function ($q) {
                $q->where('show_in_dashboard', true);
            });



        if ($user && $user->isProduction() && !$user->isAdmin() && $user->branch_id) {
            $query->where('production_branch_id', $user->branch_id);
        }


        if ($request->has('search') && $request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('ticket_number', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }


        if ($request->has('status') && $request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $tickets = $query->orderByRaw("
            CASE 
                WHEN status = 'in_production' THEN 1
                WHEN status = 'ready_to_print' THEN 2
                WHEN status = 'completed' THEN 3
                ELSE 4
            END
        ")
            ->orderBy('due_date', 'asc')
            ->get();





        $perPage = $request->get('per_page', 10);
        $currentPage = $request->get('page', 1);
        $total = $tickets->count();


        if ($perPage >= 1000) {
            $tickets = $tickets->values();

            $tickets = new \Illuminate\Pagination\LengthAwarePaginator(
                $tickets,
                $total,
                $total,
                1,
                ['path' => $request->url(), 'query' => $request->query()]
            );
        } else {
            $tickets = $tickets->slice(($currentPage - 1) * $perPage, $perPage)->values();


            $tickets = new \Illuminate\Pagination\LengthAwarePaginator(
                $tickets,
                $total,
                $perPage,
                $currentPage,
                ['path' => $request->url(), 'query' => $request->query()]
            );
        }


        $stockItems = \App\Models\StockItem::where('is_active', true)
            ->orderBy('name')
            ->get();


        $summaryBase = Ticket::where('payment_status', '!=', 'awaiting_verification')
            ->where(function ($q) {
                $q->where('design_status', 'approved')
                    ->orWhereNull('design_status');
            });

        if ($user && $user->isProduction() && !$user->isAdmin() && $user->branch_id) {
            $summaryBase->where('production_branch_id', $user->branch_id);
        }

        $today = now()->startOfDay();

        $summary = [
            'total' => (clone $summaryBase)->whereIn('status', ['ready_to_print', 'in_production'])->count(),
            'inProgress' => (clone $summaryBase)->where('status', 'in_production')->count(),
            'finished' => (clone $summaryBase)->where('status', 'completed')->count(),
            'delays' => (clone $summaryBase)
                ->where('status', '!=', 'completed')
                ->whereNotNull('due_date')
                ->whereDate('due_date', '<', $today)
                ->count(),
        ];


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


    public function startProduction($id)
    {

        $user = Auth::user();
        $ticket = Ticket::with('jobType')->findOrFail($id);
        $oldStatus = $ticket->status;

        if ($ticket->design_status !== 'approved') {
            return redirect()->back()->with('error', 'Ticket design must be approved before starting production.');
        }


        if ($user && $user->isProduction() && !$user->isAdmin() && !$user->isProductionHead()) {
            $firstStep = $ticket->getFirstWorkflowStep();
            if ($firstStep && !$user->isAssignedToWorkflowStep($firstStep)) {
                return redirect()->back()->with('error', 'You cannot start production on this ticket. The first workflow step "' . ucfirst(str_replace('_', ' ', $firstStep)) . '" is not assigned to you.');
            }


            $assignedUsers = $ticket->assignedUsers;
            $isUserAssigned = $assignedUsers->contains('id', $user->id);


            if (!$isUserAssigned && $ticket->assigned_to_user_id) {
                $isUserAssigned = $ticket->assigned_to_user_id === $user->id;
            }

            if (!$isUserAssigned) {
                return redirect()->back()->with('error', 'You cannot start production on this ticket because you are not assigned to it.');
            }
        }



        $updateData = [
            'status' => 'in_production',
        ];


        if (!$ticket->assigned_to_user_id && $ticket->assignedUsers->isEmpty()) {
            $updateData['assigned_to_user_id'] = $user->id;
        }

        $ticket->update($updateData);


        $ticket->initializeWorkflow();


        if ($ticket->current_workflow_step) {
            $this->recordWorkflowProgress($ticket, $ticket->current_workflow_step, 0, $user);
        }


        $this->notifyStatusChange($ticket, $oldStatus, 'in_production');

        return redirect()->back()->with('success', 'Production started successfully.');
    }


    public function updateProgress(Request $request, $id)
    {

        $user = Auth::user();
        $ticket = Ticket::with([
            'jobType',
            'jobType.stockRequirements',
            'jobType.stockRequirements.stockItem'
        ])->findOrFail($id);


        if ($user && $user->isProduction() && !$user->isAdmin()) {

            if ($ticket->current_workflow_step) {
                if (!$user->isAssignedToWorkflowStep($ticket->current_workflow_step)) {
                    $stepLabel = ucfirst(str_replace('_', ' ', $ticket->current_workflow_step));
                    return redirect()->back()->with('error', 'You cannot update this ticket. It is currently in the "' . $stepLabel . '" step, which is not assigned to you.');
                }
            }


            if ($request->has('current_workflow_step') && $request->current_workflow_step) {
                if ($request->current_workflow_step !== $ticket->current_workflow_step) {
                    if (!$user->isAssignedToWorkflowStep($request->current_workflow_step)) {
                        $newStepLabel = ucfirst(str_replace('_', ' ', $request->current_workflow_step));
                        return redirect()->back()->with('error', 'You are not assigned to the "' . $newStepLabel . '" workflow step.');
                    }
                }
            }
        }


        $assignedUsers = $ticket->assignedUsers;
        $isUserAssigned = $assignedUsers->contains('id', $user->id);


        if (!$isUserAssigned && $ticket->assigned_to_user_id) {
            $isUserAssigned = $ticket->assigned_to_user_id === $user->id;
        }


        if (!$isUserAssigned && !$user->isAdmin() && !$user->isProductionHead()) {
            return redirect()->back()->with('error', 'You are not assigned to this ticket. Please ask Production Head to assign you.');
        }

        $maxQuantity = $ticket->total_quantity ?? $ticket->quantity;


        $validated = $request->validate([
            'produced_quantity' => 'nullable|integer|min:0|max:' . $maxQuantity,
            'user_quantities' => 'nullable|string',
            'status' => 'nullable|string|in:in_production,completed',
            'current_workflow_step' => 'nullable|string',
            'evidence_files.*' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
        ]);

        $oldStatus = $ticket->status;
        $oldWorkflowStep = $ticket->current_workflow_step;
        $oldQuantity = $ticket->produced_quantity;
        $newWorkflowStep = $validated['current_workflow_step'] ?? $ticket->current_workflow_step;
        $workflowStepChanged = $newWorkflowStep && $newWorkflowStep !== $oldWorkflowStep;


        $userQuantities = [];
        if (!empty($validated['user_quantities'])) {
            $userQuantities = json_decode($validated['user_quantities'], true) ?? [];
        }


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

                if ($workflowStepChanged && $newWorkflowStep) {
                    $existingProgress = \App\Models\TicketWorkflowProgress::where('ticket_id', $ticket->id)
                        ->where('workflow_step', $newWorkflowStep)
                        ->first();


                    if (!$existingProgress) {
                        $totalQuantity = 0;
                    } else {

                        $totalQuantity = $existingProgress->completed_quantity;
                    }
                }

                $updateData = [
                    'produced_quantity' => $totalQuantity,
                    'status' => $newStatus,
                ];


                if (isset($validated['current_workflow_step'])) {
                    $updateData['current_workflow_step'] = $validated['current_workflow_step'];
                }

                $ticket->update($updateData);


                $currentWorkflowStep = $ticket->current_workflow_step ?? $newWorkflowStep;
                $incentivePrice = $ticket->jobType ? $ticket->jobType->getIncentivePriceForStep($currentWorkflowStep) : 0;
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


                if ($request->hasFile('evidence_files') && !empty($createdRecords)) {
                    foreach ($request->file('evidence_files') as $file) {
                        $fileName = time() . '_' . uniqid() . '_' . $file->getClientOriginalName();
                        $disk = app()->environment('production') ? 's3' : 'public';
                        $filePath = $file->storeAs('production_evidence', $fileName, $disk);


                        $disk = app()->environment('production') ? 's3' : 'public';
                        $fileUrl = Storage::disk($disk)->url($filePath);


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


                $stepCompleted = false;
                if ($currentWorkflowStep) {
                    $progress = $this->recordWorkflowProgress($ticket, $currentWorkflowStep, $totalQuantity, $user);
                    $stepCompleted = $progress->is_completed;
                }


                if ($stepCompleted && $currentWorkflowStep) {
                    $nextStep = $ticket->getNextWorkflowStep();
                    if ($nextStep) {

                        $ticket->update(['current_workflow_step' => $nextStep]);

                        $this->notifyNextWorkflowStepUsers($ticket, $nextStep);
                    } else {

                        $ticket->update(['status' => 'completed', 'current_workflow_step' => null]);
                    }
                }


                if ($isNowCompleted && !$wasCompleted) {

                    $ticket->refresh();


                    $this->stockService->autoConsumeStockForProduction($ticket);
                }
            });


            $ticket->refresh();

            $message = 'Production progress updated successfully.';
            if ($isNowCompleted && !$wasCompleted) {
                $consumptionCount = \App\Models\ProductionStockConsumption::where('ticket_id', $ticket->id)->count();
                if ($consumptionCount > 0) {
                    $message .= ' Stock automatically deducted.';
                }

                $this->notifyStatusChange($ticket, $oldStatus, 'completed');
            } elseif ($oldStatus !== $newStatus && $newStatus === 'in_production') {

                $this->notifyStatusChange($ticket, $oldStatus, 'in_production');
            } else {

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

                $ticket->update([
                    'status' => 'completed',
                    'produced_quantity' => $ticket->quantity,
                ]);


                $ticket->refresh();


                $this->stockService->autoConsumeStockForProduction($ticket);
            });

            $message = 'Ticket marked as completed successfully.';


            $consumptionCount = \App\Models\ProductionStockConsumption::where('ticket_id', $ticket->id)->count();
            if ($consumptionCount > 0) {
                $message .= ' Stock automatically deducted.';
            } else {
                $message .= ' (No stock requirements found for this job type)';
            }


            $this->notifyStatusChange($ticket, $oldStatus, 'completed');

            return redirect()->back()->with('success', $message);
        } catch (\Exception $e) {

            Log::error("Auto-consumption failed for ticket {$id}: " . $e->getMessage());
            Log::error("Stack trace: " . $e->getTraceAsString());

            return redirect()->back()->with(
                'warning',
                'Ticket marked as completed, but automatic stock deduction failed: ' . $e->getMessage() .
                    ' Please manually record stock consumption.'
            );
        }
    }


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


    protected function notifyStatusChange(Ticket $ticket, string $oldStatus, string $newStatus): void
    {
        try {


            $triggeredBy = Auth::user();
            $recipientIds = [];
            $notificationType = '';
            $title = '';
            $message = '';


            switch ($newStatus) {
                case 'in_production':

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


                    $allUsers = $frontDeskUsers->merge($productionUsers);
                    $recipientIds = $allUsers->pluck('id')->unique()->toArray();

                    $notificationType = 'ticket_in_production';
                    $title = 'Ticket In Production';
                    $message = "Ticket {$ticket->ticket_number} is now in production.";
                    break;

                case 'completed':

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


    protected function notifyProductionUpdate(Ticket $ticket, ?string $oldWorkflowStep, ?int $oldQuantity): void
    {
        try {
            $triggeredBy = Auth::user();


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

            $allUsers = $frontDeskUsers->merge($productionUsers);
            $recipientIds = $allUsers->pluck('id')->unique()->toArray();


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


            event(new \App\Events\TicketStatusChanged(
                $ticket,
                $ticket->status,
                $ticket->status,
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


    protected function notifyWorkflowProgressUpdate(Ticket $ticket, string $workflowStep, ?int $oldQuantity, int $newQuantity, $triggeredBy): void
    {
        try {
            // Get all production users (and production heads/admins) to notify
            $productionUsers = \App\Models\User::where('role', \App\Models\User::ROLE_PRODUCTION)
                ->when($ticket->production_branch_id, function ($query) use ($ticket) {
                    $query->where('branch_id', $ticket->production_branch_id);
                })
                ->get();

            // Also include admins
            $adminUsers = \App\Models\User::where('role', 'admin')->get();

            $allUsers = $productionUsers->merge($adminUsers);
            $recipientIds = $allUsers->pluck('id')->unique()->toArray();

            if (empty($recipientIds)) {
                return;
            }

            $stepLabel = ucfirst(str_replace('_', ' ', $workflowStep));
            $maxQuantity = $ticket->total_quantity ?? (($ticket->quantity ?? 0) + ($ticket->free_quantity ?? 0));

            $message = "Ticket #{$ticket->ticket_number} - {$stepLabel} progress updated: {$newQuantity}/{$maxQuantity} by {$triggeredBy->name}";
            $notificationType = 'ticket_workflow_progress_updated';
            $title = "{$stepLabel} Progress Updated";

            // Create database notifications
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
                        'workflow_step' => $workflowStep,
                        'old_quantity' => $oldQuantity,
                        'new_quantity' => $newQuantity,
                        'max_quantity' => $maxQuantity,
                        'triggered_by' => [
                            'id' => $triggeredBy->id,
                            'name' => $triggeredBy->name,
                        ],
                    ],
                ]);
            }

            // Broadcast real-time event to all production users
            event(new \App\Events\TicketStatusChanged(
                $ticket->fresh(),
                $ticket->status,
                $ticket->status,
                $triggeredBy,
                $recipientIds,
                $notificationType,
                $title,
                $message
            ));
        } catch (\Exception $e) {
            Log::error("Error Workflow Progress Update Notification: " . $e->getMessage());
            Log::error("Error trace: " . $e->getTraceAsString());
        }
    }


    protected function notifyWorkflowStepCompleted(Ticket $ticket, string $workflowStep, $triggeredBy, bool $isFullyCompleted = false): void
    {
        try {
            // Get all production users (and production heads/admins) to notify
            $productionUsers = \App\Models\User::where('role', \App\Models\User::ROLE_PRODUCTION)
                ->when($ticket->production_branch_id, function ($query) use ($ticket) {
                    $query->where('branch_id', $ticket->production_branch_id);
                })
                ->get();

            // Also include admins
            $adminUsers = \App\Models\User::where('role', 'admin')->get();

            $allUsers = $productionUsers->merge($adminUsers);
            $recipientIds = $allUsers->pluck('id')->unique()->toArray();

            if (empty($recipientIds)) {
                return;
            }

            $stepLabel = ucfirst(str_replace('_', ' ', $workflowStep));

            if ($isFullyCompleted) {
                $message = "Ticket #{$ticket->ticket_number} - All workflow steps completed! Production finished by {$triggeredBy->name}";
                $title = "Production Completed";
                $notificationType = 'ticket_production_completed';
            } else {
                $message = "Ticket #{$ticket->ticket_number} - {$stepLabel} step completed";
                $title = "{$stepLabel} Completed";
                $notificationType = 'ticket_workflow_step_completed';
            }

            // Create database notifications
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
                        'workflow_step' => $workflowStep,
                        'is_fully_completed' => $isFullyCompleted,
                        'triggered_by' => [
                            'id' => $triggeredBy->id,
                            'name' => $triggeredBy->name,
                        ],
                    ],
                ]);
            }

            // Broadcast real-time event to all production users
            event(new \App\Events\TicketStatusChanged(
                $ticket->fresh(),
                $ticket->status,
                $ticket->status,
                $triggeredBy,
                $recipientIds,
                $notificationType,
                $title,
                $message
            ));
        } catch (\Exception $e) {
            Log::error("Error Workflow Step Completed Notification: " . $e->getMessage());
            Log::error("Error trace: " . $e->getTraceAsString());
        }
    }


    protected function recordWorkflowProgress(Ticket $ticket, string $workflowStep, int $quantity, $user = null)
    {
        $progress = \App\Models\TicketWorkflowProgress::firstOrNew([
            'ticket_id' => $ticket->id,
            'workflow_step' => $workflowStep,
        ]);

        $progress->completed_quantity = $quantity;

        $maxQuantity = $ticket->total_quantity ?? (($ticket->quantity ?? 0) + ($ticket->free_quantity ?? 0));
        $progress->is_completed = $quantity >= $maxQuantity;

        if ($progress->is_completed && !$progress->completed_at) {
            $progress->completed_at = now();
            $progress->completed_by = $user ? $user->id : null;
        }

        $progress->save();

        return $progress;
    }


    protected function notifyNextWorkflowStepUsers(Ticket $ticket, string $nextWorkflowStep): void
    {
        try {

            $users = \App\Models\User::getUsersAssignedToWorkflowStep($nextWorkflowStep)
                ->when($ticket->production_branch_id, function ($query) use ($ticket) {
                    $query->where('branch_id', $ticket->production_branch_id);
                });

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
                        'production_branch_id' => $ticket->production_branch_id,
                    ],
                ]);
            }


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


    public function assignUsers(Request $request, $id)
    {

        $user = Auth::user();
        $ticket = Ticket::findOrFail($id);


        $isPrintingWorkflow = $ticket->current_workflow_step === 'printing' || $ticket->status === 'ready_to_print';
        $canAssignByCanOnlyPrint = $user->can_only_print && $isPrintingWorkflow;

        if (!$user->isProductionHead() && !$user->isAdmin() && !$canAssignByCanOnlyPrint) {
            return redirect()->back()->with('error', 'You do not have permission to assign users to tickets.');
        }


        if ($user->can_only_print && !$isPrintingWorkflow) {
            return redirect()->back()->with('error', 'You can only assign users to tickets in the printing workflow step.');
        }

        $validated = $request->validate([
            'user_ids' => 'array',
            'user_ids.*' => 'exists:users,id',
            'workflow_step' => 'nullable|string',
        ]);

        $userIds = $validated['user_ids'] ?? [];


        $productionUserIds = [];
        if (!empty($userIds)) {
            $productionUserIds = \App\Models\User::where('role', \App\Models\User::ROLE_PRODUCTION)
                ->whereIn('id', $userIds)
                ->pluck('id')
                ->toArray();
        }


        $syncData = [];
        foreach ($productionUserIds as $userId) {
            $syncData[$userId] = ['workflow_step' => $validated['workflow_step'] ?? $ticket->current_workflow_step];
        }

        $ticket->assignedUsers()->sync($syncData);


        if (!empty($productionUserIds)) {
            $ticket->update(['assigned_to_user_id' => $productionUserIds[0]]);
        } else {

            $ticket->update(['assigned_to_user_id' => null]);
        }

        return redirect()->back()->with('success', 'Users assigned successfully.');
    }


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
            ->whereIn('status', ['ready_to_print', 'in_production']);


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

        $tickets = $query->orderByRaw("
                CASE 
                    WHEN status = 'in_production' THEN 1
                    WHEN status = 'ready_to_print' THEN 2
                    WHEN status = 'completed' THEN 3
                    ELSE 4
                END
            ")
            ->orderBy('due_date', 'asc')
            ->paginate(20)
            ->withQueryString();


        $productionUsers = \App\Models\User::where('role', \App\Models\User::ROLE_PRODUCTION)
            ->where('is_active', true)
            ->get();


        return Inertia::render('Production/AllTickets', [
            'tickets' => $tickets,
            'productionUsers' => $productionUsers,
            'filters' => $request->only(['search', 'status', 'workflow_step']),
        ]);
    }


    public function workflowView(Request $request, string $workflowStep)
    {
        try {

            $user = Auth::user();


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


            $query->whereHas('jobType', function ($q) use ($workflowStep) {

                $q->where(function ($sq) use ($workflowStep) {
                    $sq->where("workflow_steps->{$workflowStep}->enabled", true)
                        ->orWhere("workflow_steps->{$workflowStep}", true);
                });
            });


            if ($workflowStep === 'printing') {

                if ($user->can_only_print) {
                    $query->where(function ($q) use ($workflowStep) {
                        $q->where('status', 'ready_to_print')
                            ->orWhere(function ($sq) use ($workflowStep) {
                                $sq->where('current_workflow_step', $workflowStep)
                                    ->where('status', 'in_production');
                            });
                    });
                } else {
                    $query->where(function ($q) use ($workflowStep) {
                        $q->where(function ($sq) use ($workflowStep) {
                            $sq->where('current_workflow_step', $workflowStep)
                                ->where('status', 'in_production');
                        })
                            ->orWhere('status', 'ready_to_print');
                    });
                }
            } else {

                $query->where('current_workflow_step', $workflowStep)
                    ->where('status', 'in_production');
            }





            if (!$user->is_head && $user->role !== 'admin' && $user->role === 'Production') {
            } elseif (!$user->is_head && $user->role !== 'admin') {

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

            $tickets = $query->orderByRaw("
                    CASE 
                        WHEN status = 'in_production' THEN 1
                        WHEN status = 'ready_to_print' THEN 2
                        WHEN status = 'completed' THEN 3
                        ELSE 4
                    END
                ")
                ->orderBy('due_date', 'asc')
                ->paginate(20)
                ->withQueryString();


            $productionUsers = \App\Models\User::where('role', \App\Models\User::ROLE_PRODUCTION)
                ->where('is_active', true)
                ->orderBy('name')
                ->get();

            return Inertia::render('Production/WorkflowView', [
                'tickets' => $tickets,
                'workflowStep' => $workflowStep,
                'filters' => $request->only(['search']),
                'productionUsers' => $productionUsers,
            ]);
        } catch (\Throwable $th) {
            dd($th);
        }
    }


    public function startWorkflow(Request $request, string $workflowStep, Ticket $ticket)
    {

        $user = Auth::user();
        $oldStatus = $ticket->status;


        if ($ticket->design_status && $ticket->design_status !== 'approved') {
            return redirect()->back()->with('error', 'Ticket design must be approved before starting production.');
        }


        if ($user && $user->isProduction() && !$user->isAdmin()) {

            if ($user->can_only_print && $workflowStep === 'printing' && ($ticket->status === 'ready_to_print' || $ticket->current_workflow_step === 'printing')) {
            } else {
                $firstStep = $ticket->getFirstWorkflowStep();
                if ($firstStep && !$user->isAssignedToWorkflowStep($firstStep)) {
                    return redirect()->back()->with('error', 'You cannot start production on this ticket. The first workflow step "' . ucfirst(str_replace('_', ' ', $firstStep)) . '" is not assigned to you.');
                }
            }
        }


        $updateData = [
            'status' => 'in_production',
        ];


        if (empty($ticket->workflow_started_at)) {
            $updateData['workflow_started_at'] = now();
        }

        $ticket->update($updateData);


        $ticket->initializeWorkflow();


        if ($ticket->current_workflow_step) {
            $this->recordWorkflowProgress($ticket, $ticket->current_workflow_step, 0, $user);
        }


        \App\Models\WorkflowLog::create([
            'ticket_id' => $ticket->id,
            'workflow_step' => $workflowStep,
            'user_id' => $user->id,
            'status' => 'in_progress',
            'started_at' => now(),
        ]);


        $this->notifyStatusChange($ticket, $oldStatus, 'in_production');

        return redirect()->back()->with('success', 'Production started successfully.');
    }


    public function updateWorkflow(Request $request, string $workflowStep, Ticket $ticket)
    {

        $user = Auth::user();

        // Validate can_only_print permissions
        if ($user->can_only_print && $workflowStep !== 'printing') {
            return redirect()->back()->with('error', 'You can only update printing workflow tickets.');
        }


        if ($user->can_only_print && $workflowStep === 'printing') {
            if ($ticket->status !== 'ready_to_print' && $ticket->status !== 'in_production') {
                return redirect()->back()->with('error', 'You can only update tickets that are ready to print or in production.');
            }
            if ($ticket->status === 'in_production' && $ticket->current_workflow_step !== 'printing') {
                return redirect()->back()->with('error', 'This ticket is not in the printing workflow step.');
            }
        }

        // Validate the request - now accepting batch updates
        $request->validate([
            'user_updates' => 'required|json',
            'evidence_files' => 'nullable|array',
            'evidence_files.*.file' => 'nullable|file|image|max:10240',
            'evidence_files.*.user_id' => 'required|exists:users,id',
            'workflow_step' => 'required|string',
        ]);

        // Decode user updates
        $userUpdates = json_decode($request->input('user_updates'), true);

        if (empty($userUpdates) || !is_array($userUpdates)) {
            return redirect()->back()->with('error', 'No user updates provided.');
        }

        DB::beginTransaction();
        try {
            $oldProducedQuantity = $ticket->produced_quantity;
            $totalCompletedQuantity = 0;

            // Process each user's update
            foreach ($userUpdates as $userUpdate) {
                $userId = $userUpdate['user_id'] ?? null;
                $producedQuantity = $userUpdate['quantity_produced'] ?? 0;

                if (!$userId || $producedQuantity <= 0) {
                    continue;
                }

                // Update or create production record for this user
                $productionRecord = \App\Models\ProductionRecord::updateOrCreate(
                    [
                        'ticket_id' => $ticket->id,
                        'user_id' => $userId,
                        'workflow_step' => $workflowStep,
                    ],
                    [
                        'quantity_produced' => $producedQuantity,
                        'job_type_id' => $ticket->job_type_id,
                        'incentive_amount' => $producedQuantity * ($ticket->jobType ? $ticket->jobType->getIncentivePriceForStep($workflowStep) : 0),
                        'recorded_at' => now(),
                    ]
                );
            }

            // Calculate total completed quantity for this workflow step
            $totalCompletedQuantity = \App\Models\ProductionRecord::where('ticket_id', $ticket->id)
                ->where('workflow_step', $workflowStep)
                ->sum('quantity_produced');

            // Update workflow progress
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

            // Handle evidence files
            if ($request->has('evidence_files')) {
                $evidenceFiles = $request->input('evidence_files');

                foreach ($evidenceFiles as $index => $evidenceData) {
                    $fileKey = "evidence_files.{$index}.file";

                    if ($request->hasFile($fileKey)) {
                        $file = $request->file($fileKey);
                        $userId = $evidenceData['user_id'] ?? $user->id;

                        $filename = time() . '_' . uniqid() . '_' . $file->getClientOriginalName();
                        $disk = app()->environment('production') ? 's3' : 'public';
                        $path = $file->storeAs('evidence/' . $ticket->id, $filename, $disk);
                        $fileUrl = Storage::disk($disk)->url($path);

                        // Find the workflow log for this user
                        $workflowLog = \App\Models\WorkflowLog::where('ticket_id', $ticket->id)
                            ->where('workflow_step', $workflowStep)
                            ->where('user_id', $userId)
                            ->latest()
                            ->first();

                        \App\Models\WorkflowEvidence::create([
                            'ticket_id' => $ticket->id,
                            'workflow_step' => $workflowStep,
                            'user_id' => $userId,
                            'workflow_log_id' => $workflowLog?->id,
                            'file_name' => $filename,
                            'file_path' => $fileUrl,
                            'file_size' => $file->getSize(),
                            'mime_type' => $file->getMimeType(),
                            'uploaded_at' => now(),
                        ]);
                    }
                }
            }

            // Update ticket's total produced quantity
            $totalProduced = \App\Models\ProductionRecord::where('ticket_id', $ticket->id)
                ->where('workflow_step', $workflowStep)
                ->sum('quantity_produced');

            $ticket->update(['produced_quantity' => $totalProduced]);

            DB::commit();

            // Notify all production users about the workflow update
            $this->notifyWorkflowProgressUpdate($ticket, $workflowStep, $oldProducedQuantity, $totalProduced, $user);

            return redirect()->back()->with('success', 'Progress updated successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Workflow update failed: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return redirect()->back()->with('error', 'Failed to update progress: ' . $e->getMessage());
        }
    }


    public function completeWorkflow(Request $request, string $workflowStep, Ticket $ticket)
    {

        $user = Auth::user();


        if ($user->can_only_print && $workflowStep !== 'printing') {
            return redirect()->back()->with('error', 'You can only complete printing workflow tickets.');
        }


        if ($user->can_only_print && $workflowStep === 'printing') {
            if ($ticket->status !== 'ready_to_print' && $ticket->status !== 'in_production') {
                return redirect()->back()->with('error', 'You can only complete tickets that are ready to print or in production.');
            }
            if ($ticket->status === 'in_production' && $ticket->current_workflow_step !== 'printing') {
                return redirect()->back()->with('error', 'This ticket is not in the printing workflow step.');
            }
        }

        $request->validate([
            'produced_quantity' => 'nullable|integer|min:0',
            'evidence_files.*' => 'nullable|file|image|max:10240',
            'selected_user_id' => 'nullable|exists:users,id',
        ]);
        $producedQuantity = $request->input('produced_quantity');
        $selectedUserId = $request->input('selected_user_id', $user->id);

        DB::beginTransaction();
        try {

            if ($producedQuantity !== null) {

                $productionRecord = \App\Models\ProductionRecord::updateOrCreate(
                    [
                        'ticket_id' => $ticket->id,
                        'user_id' => $selectedUserId,
                        'workflow_step' => $workflowStep,
                    ],
                    [
                        'quantity_produced' => $producedQuantity,
                        'job_type_id' => $ticket->job_type_id,
                        'incentive_amount' => $producedQuantity * ($ticket->jobType ? $ticket->jobType->getIncentivePriceForStep($workflowStep) : 0),
                        'recorded_at' => now(),
                    ]
                );


                $totalCompletedQuantity = \App\Models\ProductionRecord::where('ticket_id', $ticket->id)
                    ->where('workflow_step', $workflowStep)
                    ->sum('quantity_produced');


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


                if ($request->hasFile('evidence_files')) {
                    foreach ($request->file('evidence_files') as $file) {
                        $filename = time() . '_' . uniqid() . '_' . $file->getClientOriginalName();
                        $disk = app()->environment('production') ? 's3' : 'public';
                        $path = $file->storeAs('evidence/' . $ticket->id, $filename, $disk);
                        $fileUrl = Storage::disk($disk)->url($path);

                        \App\Models\WorkflowEvidence::create([
                            'ticket_id' => $ticket->id,
                            'workflow_step' => $workflowStep,
                            'user_id' => $selectedUserId,
                            'workflow_log_id' => null,
                            'file_name' => $filename,
                            'file_path' => $fileUrl,
                            'file_size' => $file->getSize(),
                            'mime_type' => $file->getMimeType(),
                            'uploaded_at' => now(),
                        ]);
                    }
                }


                $totalProduced = \App\Models\ProductionRecord::where('ticket_id', $ticket->id)
                    ->where('workflow_step', $workflowStep)
                    ->sum('quantity_produced');
                $ticket->update(['produced_quantity' => $totalProduced]);
            } else {

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


            $nextStep = $ticket->getNextWorkflowStep();

            if ($nextStep) {

                $ticket->update(['current_workflow_step' => $nextStep]);


                $this->notifyNextWorkflowStepUsers($ticket, $nextStep);

                // Also notify all production users that the current step was completed
                $this->notifyWorkflowStepCompleted($ticket, $workflowStep, $user);
            } else {

                $ticket->update([
                    'status' => 'completed',
                    'is_workflow_completed' => true,
                    'workflow_completed_at' => now(),
                    'current_workflow_step' => null,
                    'produced_quantity' => $ticket->total_quantity,
                ]);


                $this->stockService->autoConsumeStockForProduction($ticket);

                // Notify all production users that the workflow is fully completed
                $this->notifyWorkflowStepCompleted($ticket, $workflowStep, $user, true);
            }

            DB::commit();

            return redirect()->back()->with('success', 'Workflow step completed successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Workflow completion failed: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to complete workflow. Please try again.');
        }
    }


    public function completedTickets(Request $request)
    {
        $query = Ticket::with([
            'customer',
            'jobType',
            'mockupFiles',
            'workflowProgress',
            'productionRecords.user',
            'evidenceFiles.user',
        ])
            ->where('status', 'completed')
            ->where(function ($q) {
                $q->where('is_workflow_completed', true)
                    ->orWhereNull('is_workflow_completed');
            });


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

            \App\Models\WorkflowAssignment::where('ticket_id', $ticket->id)
                ->where('workflow_step', $request->workflow_step)
                ->update(['is_active' => false]);


            foreach ($request->user_ids as $userId) {
                \App\Models\WorkflowAssignment::create([
                    'ticket_id' => $ticket->id,
                    'workflow_step' => $request->workflow_step,
                    'user_id' => $userId,
                    'assigned_by' => $assignedBy,
                    'is_active' => true,
                ]);
            }


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
