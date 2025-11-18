<?php

namespace App\Services;

use App\Models\StockItem;
use App\Models\StockMovement;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class StockManagementService
{
    /**
     * Record stock movement and update stock level.
     */
    public function recordMovement(
        StockItem $stockItem,
        string $movementType,
        float $quantity,
        ?float $unitCost = null,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $notes = null
    ): StockMovement {
        return DB::transaction(function () use (
            $stockItem,
            $movementType,
            $quantity,
            $unitCost,
            $referenceType,
            $referenceId,
            $notes
        ) {
            $stockBefore = $stockItem->current_stock;
            
            // Calculate stock after
            if ($movementType === 'in' || $movementType === 'adjustment') {
                $stockAfter = $stockBefore + $quantity;
            } elseif ($movementType === 'out') {
                $stockAfter = max(0, $stockBefore - $quantity);
            } else {
                $stockAfter = $stockBefore;
            }

            // Use provided unit cost or current unit cost
            $cost = $unitCost ?? $stockItem->unit_cost;
            $totalCost = $cost * abs($quantity);

            // Update stock item
            $stockItem->current_stock = $stockAfter;
            if ($unitCost && ($movementType === 'in')) {
                // Update average cost (weighted average)
                $totalValue = ($stockBefore * $stockItem->unit_cost) + $totalCost;
                $stockItem->unit_cost = $stockAfter > 0 ? $totalValue / $stockAfter : $cost;
            }
            $stockItem->save();

            // Create movement record
            return StockMovement::create([
                'stock_item_id' => $stockItem->id,
                'movement_type' => $movementType,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'quantity' => $quantity,
                'unit_cost' => $cost,
                'total_cost' => $totalCost,
                'stock_before' => $stockBefore,
                'stock_after' => $stockAfter,
                'notes' => $notes,
                'user_id' => Auth::id(),
            ]);
        });
    }

    /**
     * Receive purchase order items and update stock.
     */
    public function receivePurchaseOrderItems(PurchaseOrder $purchaseOrder, array $receivedItems): void
    {
        DB::transaction(function () use ($purchaseOrder, $receivedItems) {
            foreach ($receivedItems as $itemData) {
                $poItem = PurchaseOrderItem::findOrFail($itemData['id']);
                $receivedQty = $itemData['received_quantity'] ?? $poItem->quantity;

                // Validate received quantity
                if ($receivedQty > $poItem->remaining_quantity) {
                    throw new \Exception("Received quantity cannot exceed remaining quantity for item {$poItem->stockItem->name}");
                }

                // Update received quantity
                $poItem->received_quantity += $receivedQty;
                $poItem->save();

                // Record stock movement
                $this->recordMovement(
                    $poItem->stockItem,
                    'in',
                    $receivedQty,
                    $poItem->unit_cost,
                    PurchaseOrder::class,
                    $purchaseOrder->id,
                    "Received from PO {$purchaseOrder->po_number}"
                );
            }

            // Update PO status if fully received
            if ($purchaseOrder->isFullyReceived()) {
                $purchaseOrder->status = 'received';
                $purchaseOrder->received_date = now();
                $purchaseOrder->save();
            } else {
                $purchaseOrder->status = 'ordered';
                $purchaseOrder->save();
            }
        });
    }

    /**
     * Consume stock for production.
     */
    public function consumeStockForProduction(
        int $ticketId,
        int $stockItemId,
        float $quantity,
        ?string $notes = null
    ): void {
        $stockItem = StockItem::findOrFail($stockItemId);

        if ($stockItem->current_stock < $quantity) {
            throw new \Exception("Insufficient stock. Available: {$stockItem->current_stock}, Required: {$quantity}");
        }

        DB::transaction(function () use ($ticketId, $stockItem, $quantity, $notes) {
            // Record consumption
            \App\Models\ProductionStockConsumption::create([
                'ticket_id' => $ticketId,
                'stock_item_id' => $stockItem->id,
                'quantity_consumed' => $quantity,
                'unit_cost' => $stockItem->unit_cost,
                'total_cost' => $quantity * $stockItem->unit_cost,
                'notes' => $notes,
            ]);

            // Record stock movement
            $this->recordMovement(
                $stockItem,
                'out',
                $quantity,
                null,
                \App\Models\Ticket::class,
                $ticketId,
                $notes ?? "Consumed for production"
            );
        });
    }

    /**
     * Get low stock items.
     */
    public function getLowStockItems()
    {
        return StockItem::where('is_active', true)
            ->whereRaw('current_stock <= minimum_stock_level')
            ->orderBy('current_stock', 'asc')
            ->get();
    }
}

