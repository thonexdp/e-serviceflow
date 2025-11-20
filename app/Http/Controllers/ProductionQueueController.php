<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Services\StockManagementService;
use Illuminate\Http\Request;
use Inertia\Inertia;

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

        return Inertia::render('Production-Queue', [
            'tickets' => $tickets,
            'stockItems' => $stockItems,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    /**
     * Start production (change status to in_production).
     */
    public function startProduction($id)
    {
        $ticket = Ticket::findOrFail($id);

        if ($ticket->design_status !== 'approved') {
            return redirect()->back()->with('error', 'Ticket design must be approved before starting production.');
        }

        $ticket->update([
            'status' => 'in_production',
        ]);

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

        $newStatus = $validated['status'] ?? ($validated['produced_quantity'] >= $ticket->quantity ? 'completed' : 'in_production');
        $wasCompleted = $ticket->status === 'completed';
        $isNowCompleted = $newStatus === 'completed';

        try {
            \DB::transaction(function () use ($ticket, $validated, $newStatus, $isNowCompleted, $wasCompleted) {
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
}
