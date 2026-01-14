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

    private function normalizeMeasurementType(?string $type, ?bool $isAreaBased): string
    {
        if ($isAreaBased) {
            return 'area';
        }

        return match (strtolower($type ?? '')) {
            'area' => 'area',
            'weight', 'kg', 'kilogram', 'kilograms' => 'weight',
            'volume', 'liter', 'litre', 'liters', 'litres', 'l' => 'volume',
            'length', 'm', 'meter', 'meters', 'metre', 'metres' => 'length',
            default => 'pieces',
        };
    }

    private function deriveBaseUnit(string $measurementType, ?string $inputUnit): string
    {
        $unit = strtolower($inputUnit ?? '');
        if ($measurementType === 'area') {
            return $unit ?: 'sqft';
        }

        if ($measurementType === 'weight') {
            return 'kg';
        }

        if ($measurementType === 'volume') {
            return 'ml'; // Store as ml, not liters
        }

        if ($measurementType === 'length') {
            return 'm';
        }

        return $unit ?: 'pcs';
    }

    private function convertToBaseQuantity(string $measurementType, float $value): float
    {
        return match ($measurementType) {
            'weight' => $value / 1000, // grams -> kg (frontend sends grams, we store as kg)
            // 'volume' => $value, // ml stays as ml (no conversion)
            default => $value, // For volume (ml), pieces, area (sqft), length (m) - no conversion
        };
    }

    public function index(Request $request)
    {
        $query = StockItem::with(['jobType', 'jobTypes', 'productionConsumptions' => function ($q) {
            $q->latest()->limit(5);
        }]);


        if ($request->has('search') && $request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('sku', 'like', '%' . $request->search . '%')
                    ->orWhere('name', 'like', '%' . $request->search . '%')
                    ->orWhereHas('jobType', function ($q) use ($request) {
                        $q->where('name', 'like', '%' . $request->search . '%');
                    })
                    ->orWhereHas('jobTypes', function ($q) use ($request) {
                        $q->where('name', 'like', '%' . $request->search . '%');
                    });
            });
        }


        if ($request->has('job_type_id') && $request->job_type_id) {
            // Filter items that have this job type (either in old job_type_id or new jobTypes relationship)
            $query->where(function ($q) use ($request) {
                $q->where('job_type_id', $request->job_type_id)
                    ->orWhereHas('jobTypes', function ($q) use ($request) {
                        $q->where('job_type_id', $request->job_type_id);
                    });
            });
        }


        if ($request->has('stock_status') && $request->stock_status) {
            if ($request->stock_status === 'low') {
                $query->whereRaw('current_stock <= minimum_stock_level');
            } elseif ($request->stock_status === 'out') {
                $query->where('current_stock', '<=', 0);
            }
        }


        // if ($request->has('is_active')) {
        //     $query->where('is_active', $request->is_active);
        // } else {
        //     $query->where('is_active', true);
        // }

        $stockItems = $query->orderBy('name')->paginate($request->get('per_page', 15));


        foreach ($stockItems->items() as $stockItem) {
            $stockItem->load(['productionConsumptions' => function ($q) {
                $q->with('ticket')->latest()->limit(3);
            }]);
        }


        $jobTypes = \App\Models\JobType::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);


        $lowStockCount = StockItem::whereRaw('current_stock <= minimum_stock_level')->count();

        return Inertia::render('Inventory/Index', [
            'stockItems' => $stockItems,
            'jobTypes' => $jobTypes,
            'lowStockCount' => $lowStockCount,
            'filters' => $request->only(['search', 'job_type_id', 'stock_status']),
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
                'job_type_id' => 'nullable|exists:job_types,id', // Keep for backward compatibility
                'job_type_ids' => 'nullable|array', // Optional - job types now define their own materials
                'job_type_ids.*' => 'exists:job_types,id',
                'sku' => [
                    'required',
                    'string',
                    Rule::unique('stock_items', 'sku')->whereNull('deleted_at'),
                    'max:255',
                ],
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
                'base_unit_of_measure' => 'nullable|string|max:50',
                'measurement_type' => 'nullable|string|in:pieces,area,weight,volume,length',
                'is_area_based' => 'boolean',
                'is_garment' => 'boolean',
                'length' => 'nullable|numeric|min:0',
                'width' => 'nullable|numeric|min:0',
                'current_stock' => 'nullable|numeric|min:0',
                'minimum_stock_level' => 'nullable|numeric|min:0',
                'maximum_stock_level' => 'nullable|numeric|min:0',
                'unit_cost' => 'nullable|numeric|min:0',
                'supplier' => 'nullable|string|max:255',
                'location' => 'nullable|string|max:255',
                // 'is_active' => 'boolean',
            ]);

            // Store job type IDs for later syncing
            $jobTypeIds = $validated['job_type_ids'] ?? [];

            // Remove job_type_ids from validated data as it's not a column
            unset($validated['job_type_ids']);
            $validated['is_active'] = true;
            $measurementType = $this->normalizeMeasurementType(
                $validated['measurement_type'] ?? null,
                $validated['is_area_based'] ?? false
            );
            $validated['measurement_type'] = $measurementType;
            $validated['is_area_based'] = $measurementType === 'area';
            $validated['base_unit_of_measure'] = $this->deriveBaseUnit($measurementType, $validated['base_unit_of_measure'] ?? null);

            if ($measurementType !== 'area') {
                $validated['length'] = null;
                $validated['width'] = null;
            }

            // Convert stock levels based on measurement type
            // For weight: input is in grams, convert to kg
            // For volume: input is in ml, store as ml (no conversion)
            // For others: store as-is
            $initialStock = $validated['current_stock'] ?? 0;
            $validated['current_stock'] = 0;
            $initialStock = $this->convertToBaseQuantity($measurementType, (float) $initialStock);
            
            // Also convert minimum and maximum stock levels
            if (isset($validated['minimum_stock_level'])) {
                $validated['minimum_stock_level'] = $this->convertToBaseQuantity($measurementType, (float) $validated['minimum_stock_level']);
            }
            if (isset($validated['maximum_stock_level'])) {
                $validated['maximum_stock_level'] = $this->convertToBaseQuantity($measurementType, (float) $validated['maximum_stock_level']);
            }
            
            $stockItem = StockItem::create($validated);

            // Sync job types in pivot table
            if (!empty($jobTypeIds)) {
                $stockItem->jobTypes()->sync($jobTypeIds);
            }

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
            return redirect()->back()->with('error', 'Failed to create stock item: ' . $th->getMessage());
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
            'job_type_id' => 'nullable|exists:job_types,id', // Keep for backward compatibility
            'job_type_ids' => 'nullable|array', // Optional - job types now define their own materials
            'job_type_ids.*' => 'exists:job_types,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'base_unit_of_measure' => 'nullable|string|max:50',
            'measurement_type' => 'nullable|string|in:pieces,area,weight,volume,length',
            'is_area_based' => 'boolean',
            'is_garment' => 'boolean',
            'length' => 'nullable|numeric|min:0',
            'width' => 'nullable|numeric|min:0',
            'minimum_stock_level' => 'nullable|numeric|min:0',
            'maximum_stock_level' => 'nullable|numeric|min:0',
            'unit_cost' => 'nullable|numeric|min:0',
            'supplier' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        // Store job type IDs for later syncing
        $jobTypeIds = $validated['job_type_ids'] ?? [];

        // Remove job_type_ids from validated data as it's not a column
        unset($validated['job_type_ids']);
        $validated['is_active'] = true;
        $measurementType = $this->normalizeMeasurementType(
            $validated['measurement_type'] ?? $stockItem->measurement_type,
            $validated['is_area_based'] ?? $stockItem->is_area_based
        );
        $validated['measurement_type'] = $measurementType;
        $validated['is_area_based'] = $measurementType === 'area';
        $validated['base_unit_of_measure'] = $this->deriveBaseUnit($measurementType, $validated['base_unit_of_measure'] ?? $stockItem->base_unit_of_measure);

        if ($measurementType !== 'area') {
            $validated['length'] = null;
            $validated['width'] = null;
        }

        // Convert stock levels based on measurement type (for updates)
        // For weight: input is in grams, convert to kg
        // For volume: input is in ml, store as ml (no conversion)
        // For others: store as-is
        if (isset($validated['minimum_stock_level'])) {
            $validated['minimum_stock_level'] = $this->convertToBaseQuantity($measurementType, (float) $validated['minimum_stock_level']);
        }
        if (isset($validated['maximum_stock_level'])) {
            $validated['maximum_stock_level'] = $this->convertToBaseQuantity($measurementType, (float) $validated['maximum_stock_level']);
        }

        $stockItem->update($validated);

        // Sync job types in pivot table
        if (!empty($jobTypeIds)) {
            $stockItem->jobTypes()->sync($jobTypeIds);
        } elseif ($request->has('job_type_ids')) {
            // If job_type_ids is explicitly sent as empty array, detach all
            $stockItem->jobTypes()->detach();
        }

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
