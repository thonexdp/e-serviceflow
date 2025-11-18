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
        $query = Ticket::with(['jobType.category', 'jobType.stockRequirements.stockItem', 'mockupFiles', 'stockConsumptions.stockItem'])
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
        $ticket = Ticket::findOrFail($id);

        $validated = $request->validate([
            'produced_quantity' => 'required|integer|min:0|max:' . $ticket->quantity,
            'status' => 'nullable|string|in:in_production,completed',
        ]);

        $ticket->update([
            'produced_quantity' => $validated['produced_quantity'],
            'status' => $validated['status'] ?? ($validated['produced_quantity'] >= $ticket->quantity ? 'completed' : 'in_production'),
        ]);

        return redirect()->back()->with('success', 'Production progress updated successfully.');
    }

    /**
     * Mark ticket as completed.
     */
    public function markCompleted($id)
    {
        $ticket = Ticket::findOrFail($id);

        $ticket->update([
            'status' => 'completed',
            'produced_quantity' => $ticket->quantity,
        ]);

        // Note: Stock consumption should be handled separately via a dedicated endpoint
        // or through a production stock consumption form when production is completed

        return redirect()->back()->with('success', 'Ticket marked as completed successfully.');
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
