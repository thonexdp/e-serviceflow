<?php

/*!
 * Developed By: Antonio Jr De Paz
 * Built with: Laravel, Inertia, React
 * Year: 2025
 */

namespace App\Http\Controllers;

use App\Models\StockItem;
use App\Models\StockMovement;
use App\Services\StockManagementService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class InventoryController extends Controller
{
    protected $stockService;

    public function __construct(StockManagementService $stockService)
    {
        $this->stockService = $stockService;
    }


    public function index(Request $request)
    {
        $query = StockItem::with(['jobType', 'productionConsumptions' => function ($q) {
            $q->latest()->limit(5);
        }]);


        if ($request->has('search') && $request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('sku', 'like', '%' . $request->search . '%')
                    ->orWhere('name', 'like', '%' . $request->search . '%')
                    ->orWhereHas('jobType', function ($q) use ($request) {
                        $q->where('name', 'like', '%' . $request->search . '%');
                    });
            });
        }


        if ($request->has('job_type_id') && $request->job_type_id) {
            $query->where('job_type_id', $request->job_type_id);
        }


        if ($request->has('stock_status') && $request->stock_status) {
            if ($request->stock_status === 'low') {
                $query->whereRaw('current_stock <= minimum_stock_level');
            } elseif ($request->stock_status === 'out') {
                $query->where('current_stock', '<=', 0);
            }
        }


        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        } else {
            $query->where('is_active', true);
        }

        $stockItems = $query->orderBy('name')->paginate($request->get('per_page', 15));


        foreach ($stockItems->items() as $stockItem) {
            $stockItem->load(['productionConsumptions' => function ($q) {
                $q->with('ticket')->latest()->limit(3);
            }]);
        }


        $jobTypes = \App\Models\JobType::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);


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


    public function store(Request $request)
    {
        try {


            $isGarment = $request->has('is_garment') &&
                ($request->is_garment === true ||
                    $request->is_garment === 1 ||
                    $request->is_garment === '1' ||
                    $request->is_garment === 'on');

            $validated = $request->validate([
                'job_type_id' => $isGarment ? 'nullable|exists:job_types,id' : 'required|exists:job_types,id',
                'sku' => [
                    'required',
                    'string',
                    Rule::unique('stock_items', 'sku')->whereNull('deleted_at'),
                    'max:255',
                ],
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
                'base_unit_of_measure' => 'required|string|max:50',
                'is_area_based' => 'boolean',
                'is_garment' => 'boolean',
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


            $initialStock = $validated['current_stock'] ?? 0;
            $validated['current_stock'] = 0;
            $stockItem = StockItem::create($validated);


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
        } catch (\Throwable $th) {
            dd($th);
        }
    }


    public function update(Request $request, $id)
    {
        $stockItem = StockItem::findOrFail($id);


        $isGarment = $request->has('is_garment') &&
            ($request->is_garment === true ||
                $request->is_garment === 1 ||
                $request->is_garment === '1' ||
                $request->is_garment === 'on');

        $validated = $request->validate([
            'job_type_id' => $isGarment ? 'nullable|exists:job_types,id' : 'required|exists:job_types,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'base_unit_of_measure' => 'required|string|max:50',
            'is_area_based' => 'boolean',
            'is_garment' => 'boolean',
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
     * Check if stock item can be deleted and get dependencies
     */
    public function checkDeletion($id)
    {
        $stockItem = StockItem::findOrFail($id);
        $result = $stockItem->canBeDeleted();
        return response()->json($result);
    }

    public function destroy($id)
    {
        $stockItem = StockItem::findOrFail($id);

        // Check if can be deleted
        $check = $stockItem->canBeDeleted();

        if (!$check['can_delete']) {
            return redirect()->back()->with('error', 'Cannot delete stock item. It has pending purchase orders or active dependencies.');
        }

        $stockItem->delete();

        return redirect()->back()->with('success', 'Stock item deleted successfully.');
    }


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


    public function lowStock()
    {
        $lowStockItems = $this->stockService->getLowStockItems();

        return Inertia::render('Inventory/LowStock', [
            'lowStockItems' => $lowStockItems,
        ]);
    }
}
