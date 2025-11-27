<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\HasRoleBasedRoutes;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\StockItem;
use App\Services\StockManagementService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class PurchaseOrderController extends Controller
{
    use HasRoleBasedRoutes;
    protected $stockService;

    public function __construct(StockManagementService $stockService)
    {
        $this->stockService = $stockService;
    }

    /**
     * Display a listing of purchase orders.
     */
    public function index(Request $request)
    {
        $query = PurchaseOrder::with(['creator', 'approver', 'items.stockItem']);

        // Search
        if ($request->has('search') && $request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('po_number', 'like', '%' . $request->search . '%')
                    ->orWhere('supplier', 'like', '%' . $request->search . '%');
            });
        }

        // Filter by status
        if ($request->has('status') && $request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $purchaseOrders = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return Inertia::render('PurchaseOrders/Index', [
            'purchaseOrders' => $purchaseOrders,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    /**
     * Show the form for creating a new purchase order.
     */
    public function create()
    {
        $stockItems = StockItem::where('is_active', true)
            ->orderBy('name')
            ->get();

        return Inertia::render('PurchaseOrders/Create', [
            'stockItems' => $stockItems,
        ]);
    }

    /**
     * Store a newly created purchase order.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier' => 'nullable|string|max:255',
            'supplier_contact' => 'nullable|string|max:255',
            'supplier_email' => 'nullable|email|max:255',
            'order_date' => 'nullable|date',
            'expected_delivery_date' => 'nullable|date|after_or_equal:order_date',
            'tax' => 'nullable|numeric|min:0',
            'shipping_cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.stock_item_id' => 'required|exists:stock_items,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_cost' => 'required|numeric|min:0',
            'items.*.notes' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated) {
            $purchaseOrder = PurchaseOrder::create([
                'supplier' => $validated['supplier'] ?? null,
                'supplier_contact' => $validated['supplier_contact'] ?? null,
                'supplier_email' => $validated['supplier_email'] ?? null,
                'order_date' => $validated['order_date'] ?? now(),
                'expected_delivery_date' => $validated['expected_delivery_date'] ?? null,
                'tax' => $validated['tax'] ?? 0,
                'shipping_cost' => $validated['shipping_cost'] ?? 0,
                'notes' => $validated['notes'] ?? null,
                'internal_notes' => $validated['internal_notes'] ?? null,
                'status' => 'draft',
                'created_by' => auth()->id(),
            ]);

            foreach ($validated['items'] as $itemData) {
                PurchaseOrderItem::create([
                    'purchase_order_id' => $purchaseOrder->id,
                    'stock_item_id' => $itemData['stock_item_id'],
                    'quantity' => $itemData['quantity'],
                    'unit_cost' => $itemData['unit_cost'],
                    'notes' => $itemData['notes'] ?? null,
                ]);
            }

            $purchaseOrder->calculateTotals();

            return $this->redirectToRoleRoute('purchase-orders.show', $purchaseOrder->id)
                ->with('success', 'Purchase order created successfully.');
        });
    }

    /**
     * Display the specified purchase order.
     */
    public function show($id)
    {
        $purchaseOrder = PurchaseOrder::with([
            'items.stockItem',
            'creator',
            'approver'
        ])->findOrFail($id);

        return Inertia::render('PurchaseOrders/Show', [
            'purchaseOrder' => $purchaseOrder,
        ]);
    }

    /**
     * Update the specified purchase order.
     */
    public function update(Request $request, $id)
    {
        $purchaseOrder = PurchaseOrder::findOrFail($id);

        // Only allow updates if in draft status
        if ($purchaseOrder->status !== 'draft') {
            return redirect()->back()->with('error', 'Cannot update purchase order that is not in draft status.');
        }

        $validated = $request->validate([
            'supplier' => 'nullable|string|max:255',
            'supplier_contact' => 'nullable|string|max:255',
            'supplier_email' => 'nullable|email|max:255',
            'order_date' => 'nullable|date',
            'expected_delivery_date' => 'nullable|date|after_or_equal:order_date',
            'tax' => 'nullable|numeric|min:0',
            'shipping_cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
        ]);

        $purchaseOrder->update($validated);
        $purchaseOrder->calculateTotals();

        return redirect()->back()->with('success', 'Purchase order updated successfully.');
    }

    /**
     * Approve purchase order.
     */
    public function approve($id)
    {
        $purchaseOrder = PurchaseOrder::findOrFail($id);

        if ($purchaseOrder->status !== 'draft') {
            return redirect()->back()->with('error', 'Only draft purchase orders can be approved.');
        }

        $purchaseOrder->update([
            'status' => 'approved',
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Purchase order approved successfully.');
    }

    /**
     * Mark purchase order as ordered.
     */
    public function markOrdered($id)
    {
        $purchaseOrder = PurchaseOrder::findOrFail($id);

        if (!in_array($purchaseOrder->status, ['approved', 'draft'])) {
            return redirect()->back()->with('error', 'Purchase order cannot be marked as ordered.');
        }

        $purchaseOrder->update([
            'status' => 'ordered',
        ]);

        return redirect()->back()->with('success', 'Purchase order marked as ordered.');
    }

    /**
     * Receive purchase order items.
     */
    public function receive(Request $request, $id)
    {
        $purchaseOrder = PurchaseOrder::findOrFail($id);

        if (!$purchaseOrder->canBeReceived()) {
            return redirect()->back()->with('error', 'Purchase order cannot be received in current status.');
        }

        $validated = $request->validate([
            'received_items' => 'required|array|min:1',
            'received_items.*.id' => 'required|exists:purchase_order_items,id',
            'received_items.*.received_quantity' => 'required|numeric|min:0',
        ]);

        try {
            $this->stockService->receivePurchaseOrderItems($purchaseOrder, $validated['received_items']);

            return redirect()->back()->with('success', 'Items received and stock updated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Cancel purchase order.
     */
    public function cancel($id)
    {
        $purchaseOrder = PurchaseOrder::findOrFail($id);

        if (in_array($purchaseOrder->status, ['received', 'cancelled'])) {
            return redirect()->back()->with('error', 'Purchase order cannot be cancelled.');
        }

        $purchaseOrder->update([
            'status' => 'cancelled',
        ]);

        return redirect()->back()->with('success', 'Purchase order cancelled successfully.');
    }

    /**
     * Remove the specified purchase order.
     */
    public function destroy($id)
    {
        $purchaseOrder = PurchaseOrder::findOrFail($id);

        if ($purchaseOrder->status !== 'draft') {
            return redirect()->back()->with('error', 'Only draft purchase orders can be deleted.');
        }

        $purchaseOrder->delete();

        return $this->redirectToRoleRoute('purchase-orders.index')
            ->with('success', 'Purchase order deleted successfully.');
    }
}
