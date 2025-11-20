<?php

namespace App\Http\Controllers;

use App\Models\StockItem;
use App\Models\StockMovement;
use App\Services\StockManagementService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    protected $stockService;

    public function __construct(StockManagementService $stockService)
    {
        $this->stockService = $stockService;
    }

    /**
     * Display a listing of stock items.
     */
    public function index(Request $request)
    {
        $query = StockItem::with(['jobType', 'productionConsumptions' => function($q) {
            $q->latest()->limit(5); // Get recent consumptions
        }]);

        // Search
        if ($request->has('search') && $request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('sku', 'like', '%' . $request->search . '%')
                    ->orWhere('name', 'like', '%' . $request->search . '%')
                    ->orWhereHas('jobType', function ($q) use ($request) {
                        $q->where('name', 'like', '%' . $request->search . '%');
                    });
            });
        }

        // Filter by job type
        if ($request->has('job_type_id') && $request->job_type_id) {
            $query->where('job_type_id', $request->job_type_id);
        }

        // Filter by stock status
        if ($request->has('stock_status') && $request->stock_status) {
            if ($request->stock_status === 'low') {
                $query->whereRaw('current_stock <= minimum_stock_level');
            } elseif ($request->stock_status === 'out') {
                $query->where('current_stock', '<=', 0);
            }
        }

        // Filter by active status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        } else {
            $query->where('is_active', true);
        }

        $stockItems = $query->orderBy('name')->paginate($request->get('per_page', 15));
        
        // Load production consumptions for each stock item (for display)
        foreach ($stockItems->items() as $stockItem) {
            $stockItem->load(['productionConsumptions' => function($q) {
                $q->with('ticket')->latest()->limit(3);
            }]);
        }

        // Get job types for filter
        $jobTypes = \App\Models\JobType::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        // Get low stock items count
        $lowStockCount = StockItem::where('is_active', true)
            ->whereRaw('current_stock <= minimum_stock_level')
            ->count();

        return Inertia::render('Inventory/Index', [
            'stockItems' => $stockItems,
            'jobTypes' => $jobTypes,
            'lowStockCount' => $lowStockCount,
            'filters' => $request->only(['search', 'job_type_id', 'stock_status', 'is_active']),
        ]);
    }

    /**
     * Store a newly created stock item.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'job_type_id' => 'required|exists:job_types,id',
            'sku' => 'required|string|unique:stock_items,sku|max:255',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'base_unit_of_measure' => 'required|string|max:50',
            'is_area_based' => 'boolean',
            'length' => 'nullable|required_if:is_area_based,1|numeric|min:0',
            'width' => 'nullable|required_if:is_area_based,1|numeric|min:0',
            'current_stock' => 'nullable|numeric|min:0',
            'minimum_stock_level' => 'nullable|numeric|min:0',
            'maximum_stock_level' => 'nullable|numeric|min:0',
            'unit_cost' => 'nullable|numeric|min:0',
            'supplier' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        // Create stock item with 0 stock initially to avoid double counting
        $initialStock = $validated['current_stock'] ?? 0;
        $validated['current_stock'] = 0; // Set to 0 first
        $stockItem = StockItem::create($validated);

        // Record initial stock movement if stock is provided (this will add it properly)
        if ($initialStock > 0) {
            $this->stockService->recordMovement(
                $stockItem,
                'adjustment',
                $initialStock,
                $validated['unit_cost'] ?? 0,
                null,
                null,
                'Initial stock'
            );
        }

        return redirect()->back()->with('success', 'Stock item created successfully.');
    }

    /**
     * Update the specified stock item.
     */
    public function update(Request $request, $id)
    {
        $stockItem = StockItem::findOrFail($id);

        $validated = $request->validate([
            'job_type_id' => 'required|exists:job_types,id',
            'sku' => 'required|string|unique:stock_items,sku,' . $id . '|max:255',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'base_unit_of_measure' => 'required|string|max:50',
            'is_area_based' => 'boolean',
            'length' => 'nullable|required_if:is_area_based,1|numeric|min:0',
            'width' => 'nullable|required_if:is_area_based,1|numeric|min:0',
            'minimum_stock_level' => 'nullable|numeric|min:0',
            'maximum_stock_level' => 'nullable|numeric|min:0',
            'unit_cost' => 'nullable|numeric|min:0',
            'supplier' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $stockItem->update($validated);

        return redirect()->back()->with('success', 'Stock item updated successfully.');
    }

    /**
     * Remove the specified stock item.
     */
    public function destroy($id)
    {
        $stockItem = StockItem::findOrFail($id);
        $stockItem->delete();

        return redirect()->back()->with('success', 'Stock item deleted successfully.');
    }

    /**
     * Adjust stock level.
     */
    public function adjustStock(Request $request, $id)
    {
        $stockItem = StockItem::findOrFail($id);

        $validated = $request->validate([
            'quantity' => 'required|numeric',
            'notes' => 'nullable|string',
        ]);

        $this->stockService->recordMovement(
            $stockItem,
            'adjustment',
            $validated['quantity'],
            null,
            null,
            null,
            $validated['notes'] ?? 'Manual stock adjustment'
        );

        return redirect()->back()->with('success', 'Stock adjusted successfully.');
    }

    /**
     * Get stock movements for a stock item.
     */
    public function movements($id, Request $request)
    {
        $stockItem = StockItem::findOrFail($id);
        
        $movements = StockMovement::where('stock_item_id', $id)
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return Inertia::render('Inventory/Movements', [
            'stockItem' => $stockItem,
            'movements' => $movements,
        ]);
    }

    /**
     * Get low stock items.
     */
    public function lowStock()
    {
        $lowStockItems = $this->stockService->getLowStockItems();

        return Inertia::render('Inventory/LowStock', [
            'lowStockItems' => $lowStockItems,
        ]);
    }
}

