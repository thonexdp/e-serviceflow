<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Services\StockManagementService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

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
        $query = Ticket::with([
            'jobType.category', 
            'jobType.stockRequirements.stockItem', 
            'mockupFiles', 
            'stockConsumptions.stockItem'
        ])
            ->where('design_status', 'approved')
            ->whereIn('status', ['pending', 'ready_to_print', 'in_production', 'completed']);

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
        ")->latest()->paginate($request->get('per_page', 15));

        // Get all active stock items for consumption form
        $stockItems = \App\Models\StockItem::where('is_active', true)
            ->orderBy('name')
            ->get();

        // Calculate summary statistics for today
        $today = now()->startOfDay();
        $baseQuery = Ticket::where('design_status', 'approved')
            ->whereIn('status', ['pending', 'ready_to_print', 'in_production', 'completed']);

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
        $ticket = Ticket::findOrFail($id);
        $oldStatus = $ticket->status;

        if ($ticket->design_status !== 'approved') {
            return redirect()->back()->with('error', 'Ticket design must be approved before starting production.');
        }

        $ticket->update([
            'status' => 'in_production',
        ]);

        // Notify FrontDesk (optional)
        $this->notifyStatusChange($ticket, $oldStatus, 'in_production');

        return redirect()->back()->with('success', 'Production started successfully.');
    }

    /**
     * Update production progress.
     */
    public function updateProgress(Request $request, $id)
    {
        $ticket = Ticket::with([
            'jobType',
            'jobType.stockRequirements',
            'jobType.stockRequirements.stockItem'
        ])->findOrFail($id);

        $validated = $request->validate([
            'produced_quantity' => 'required|integer|min:0|max:' . $ticket->quantity,
            'status' => 'nullable|string|in:in_production,completed',
        ]);

        $oldStatus = $ticket->status;
        $newStatus = $validated['status'] ?? ($validated['produced_quantity'] >= $ticket->quantity ? 'completed' : 'in_production');
        $wasCompleted = $ticket->status === 'completed';
        $isNowCompleted = $newStatus === 'completed';

        try {
            \DB::transaction(function () use ($ticket, $validated, $newStatus, $isNowCompleted, $wasCompleted, $oldStatus) {
        $ticket->update([
            'produced_quantity' => $validated['produced_quantity'],
                    'status' => $newStatus,
                ]);

                // Auto-consume stock if just marked as completed (and wasn't already completed)
                if ($isNowCompleted && !$wasCompleted) {
                    // Refresh ticket to ensure we have latest data
                    $ticket->refresh();
                    
                    // Automatically consume stock based on job type requirements
                    $this->stockService->autoConsumeStockForProduction($ticket);
                }
            });

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
            }

            return redirect()->back()->with('success', $message);
        } catch (\Exception $e) {
            \Log::error("Update progress failed for ticket {$id}: " . $e->getMessage());
            \Log::error("Stack trace: " . $e->getTraceAsString());
            
            return redirect()->back()->with('warning', 
                'Production progress updated, but automatic stock deduction failed: ' . $e->getMessage()
            );
        }
    }

    /**
     * Mark ticket as completed.
     */
    public function markCompleted($id)
    {
        // dd("completed:",$id);
        $ticket = Ticket::with([
            'jobType',
            'jobType.stockRequirements',
            'jobType.stockRequirements.stockItem'
        ])->findOrFail($id);
        $oldStatus = $ticket->status;

        try {
            \DB::transaction(function () use ($ticket) {
                // Update ticket status first
        $ticket->update([
            'status' => 'completed',
            'produced_quantity' => $ticket->quantity,
        ]);

                // Refresh ticket to ensure we have latest data
                $ticket->refresh();

                // Automatically consume stock based on job type requirements
                $consumptions = $this->stockService->autoConsumeStockForProduction($ticket);
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
            \Log::error("Auto-consumption failed for ticket {$id}: " . $e->getMessage());
            \Log::error("Stack trace: " . $e->getTraceAsString());
            
            return redirect()->back()->with('warning', 
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
                // Notify FrontDesk (optional)
                $frontDeskUsers = \App\Models\User::where('role', \App\Models\User::ROLE_FRONTDESK)->get();
                $recipientIds = $frontDeskUsers->pluck('id')->toArray();
                $notificationType = 'ticket_in_production';
                $title = 'Ticket In Production';
                $message = "Ticket {$ticket->ticket_number} is now in production.";
                break;

            case 'completed':
                // Notify FrontDesk (optional)
                $frontDeskUsers = \App\Models\User::where('role', \App\Models\User::ROLE_FRONTDESK)->get();
                $recipientIds = $frontDeskUsers->pluck('id')->toArray();
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
        \Log::error("Error Notification: " . $e->getMessage());
        \Log::error("Error trace: " . $e->getTraceAsString());
    }
  }

}