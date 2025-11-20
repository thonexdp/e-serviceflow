<?php

namespace App\Services;

use App\Models\StockItem;
use App\Models\StockMovement;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

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
            if ($movementType === 'in') {
                // Always add for 'in' type
                $stockAfter = $stockBefore + abs($quantity);
            } elseif ($movementType === 'adjustment') {
                // Adjustment can be positive (add) or negative (subtract)
                $stockAfter = $stockBefore + $quantity; // quantity can be negative
                $stockAfter = max(0, $stockAfter); // Ensure non-negative
            } elseif ($movementType === 'out') {
                $stockAfter = max(0, $stockBefore - abs($quantity));
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

    /**
     * Automatically consume stock for a completed production based on job type requirements.
     * 
     * @param \App\Models\Ticket $ticket
     * @return array Array of consumption records created
     * @throws \Exception If stock is insufficient or requirements are missing
     */
    public function autoConsumeStockForProduction(\App\Models\Ticket $ticket): array
    {
        // Reload ticket with relationships if not already loaded
        if (!$ticket->relationLoaded('jobType')) {
            $ticket->load('jobType');
        }
        
        if (!$ticket->jobType) {
            Log::warning("Ticket {$ticket->id} does not have a job type assigned.");
            return [];
        }

        // Load stock requirements for this job type
        $stockRequirements = $ticket->jobType->stockRequirements()
            ->where('is_required', true)
            ->with('stockItem')
            ->get();

        // If no explicit requirements found, try to find stock items directly linked to this job type
        if ($stockRequirements->isEmpty()) {
            Log::info("No explicit stock requirements found for job type {$ticket->jobType->id} (Ticket {$ticket->id}). Checking for stock items linked to this job type...");
            
            // Find stock items that are linked to this job type via job_type_id
            $linkedStockItems = \App\Models\StockItem::where('job_type_id', $ticket->jobType->id)
                ->where('is_active', true)
                ->get();
            
            if ($linkedStockItems->isEmpty()) {
                Log::warning("No stock items found linked to job type {$ticket->jobType->id} (Ticket {$ticket->id}). Auto-consumption skipped.");
                return [];
            }
            
            // Create temporary requirement objects from linked stock items
            Log::info("Found {$linkedStockItems->count()} stock item(s) linked to job type {$ticket->jobType->id}. Creating requirements automatically...");
            
            foreach ($linkedStockItems as $stockItem) {
                // Create requirement if it doesn't exist
                $requirement = \App\Models\JobTypeStockRequirement::firstOrCreate(
                    [
                        'job_type_id' => $ticket->jobType->id,
                        'stock_item_id' => $stockItem->id,
                    ],
                    [
                        'quantity_per_unit' => $stockItem->is_area_based ? 0 : 1,
                        'is_required' => true,
                        'notes' => $stockItem->is_area_based 
                            ? 'Area-based material - calculated from production dimensions (auto-created)' 
                            : 'Standard 1:1 consumption (auto-created)',
                    ]
                );
                
                // Load the stockItem relationship
                $requirement->load('stockItem');
                $stockRequirements->push($requirement);
            }
            
            Log::info("Created {$stockRequirements->count()} stock requirement(s) for job type {$ticket->jobType->id}.");
        }

        // Parse production dimensions from ticket
        $productionLength = null;
        $productionWidth = null;
        
        if ($ticket->size_value) {
            // Try to parse "100x50" or "100 x 50" format
            if (preg_match('/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i', $ticket->size_value, $matches)) {
                $productionLength = floatval($matches[1]);
                $productionWidth = floatval($matches[2]);
            }
        }

        $consumptions = [];
        $errors = [];

        DB::transaction(function () use ($ticket, $stockRequirements, $productionLength, $productionWidth, &$consumptions, &$errors) {
            foreach ($stockRequirements as $requirement) {
                $stockItem = $requirement->stockItem;
                
                if (!$stockItem) {
                    $errors[] = "Stock item not found for requirement ID {$requirement->id}.";
                    continue;
                }
                
                if (!$stockItem->is_active) {
                    $errors[] = "Stock item '{$stockItem->name}' is not active.";
                    continue;
                }

                // Calculate required quantity
                $requiredQuantity = 0;
                $areaConsumed = 0; // Track area consumed for area-based materials
                
                if ($stockItem->is_area_based) {
                    // For area-based materials (tarpaulin, etc.)
                    if ($productionLength && $productionWidth && $stockItem->length && $stockItem->width) {
                        // Calculate total area needed for production
                        $productionArea = $productionLength * $productionWidth;
                        $totalAreaNeeded = $productionArea * $ticket->quantity;
                        
                        // Calculate stock area per piece/roll
                        $stockArea = $stockItem->length * $stockItem->width;
                        
                        // Calculate how many pieces/rolls are needed (as decimal for partial consumption)
                        // Example: 9 sq.ft needed from 450 sq.ft roll = 9/450 = 0.02 rolls
                        $requiredQuantity = $totalAreaNeeded / $stockArea;
                        $areaConsumed = $totalAreaNeeded;
                        
                        Log::info("Area-based calculation for '{$stockItem->name}': Production area = {$productionArea} sq.ft × {$ticket->quantity} = {$totalAreaNeeded} sq.ft. Stock area = {$stockArea} sq.ft. Required = {$requiredQuantity} pieces.");
                    } else {
                        // Fallback: use quantity_per_unit from requirement
                        $qtyPerUnit = $requirement->quantity_per_unit ?? 1;
                        $requiredQuantity = $qtyPerUnit * $ticket->quantity;
                        if ($stockItem->length && $stockItem->width) {
                            $stockArea = $stockItem->length * $stockItem->width;
                            $areaConsumed = $requiredQuantity * $stockArea;
                        }
                    }
                } else {
                    // For regular items (mugs, shirts, etc.)
                    $qtyPerUnit = $requirement->quantity_per_unit ?? 1;
                    $requiredQuantity = $qtyPerUnit * $ticket->quantity;
                }

                if ($requiredQuantity <= 0) {
                    // Skip if no quantity is required
                    continue;
                }

                // Refresh stock item to get latest stock level before checking
                $stockItem->refresh();
                
                // For area-based materials, check if we have enough area (not just pieces)
                if ($stockItem->is_area_based && $areaConsumed > 0) {
                    $availableArea = $stockItem->current_stock * ($stockItem->length * $stockItem->width);
                    if ($availableArea < $areaConsumed) {
                        $errors[] = "Insufficient stock area for '{$stockItem->name}'. Available: {$availableArea} sq.ft, Required: {$areaConsumed} sq.ft";
                        continue;
                    }
                } else {
                    // For regular items, check piece count
                    if ($stockItem->current_stock < $requiredQuantity) {
                        $errors[] = "Insufficient stock for '{$stockItem->name}'. Available: {$stockItem->current_stock}, Required: {$requiredQuantity}";
                        continue;
                    }
                }

                // Check if already consumed (prevent double consumption)
                $existingConsumption = \App\Models\ProductionStockConsumption::where('ticket_id', $ticket->id)
                    ->where('stock_item_id', $stockItem->id)
                    ->first();

                if ($existingConsumption) {
                    // Already consumed, skip
                    Log::info("Stock already consumed for ticket {$ticket->id}, stock item {$stockItem->id}");
                    continue;
                }

                // Create consumption record with area information
                $consumptionNotes = "Auto-consumed based on job type requirements";
                if ($stockItem->is_area_based && $areaConsumed > 0) {
                    $consumptionNotes .= " (Area: " . number_format($areaConsumed, 2) . " sq.ft)";
                }
                
                $consumption = \App\Models\ProductionStockConsumption::create([
                    'ticket_id' => $ticket->id,
                    'stock_item_id' => $stockItem->id,
                    'quantity_consumed' => $requiredQuantity,
                    'unit_cost' => $stockItem->unit_cost,
                    'total_cost' => $requiredQuantity * $stockItem->unit_cost,
                    'notes' => $consumptionNotes,
                ]);

                // Record stock movement
                // For area-based materials, deduct the calculated fraction of pieces/rolls
                $movementNotes = "Auto-consumed for production (Ticket: {$ticket->ticket_number})";
                if ($stockItem->is_area_based && $areaConsumed > 0) {
                    $movementNotes .= " - Area: " . number_format($areaConsumed, 2) . " sq.ft";
                }
                
                $this->recordMovement(
                    $stockItem,
                    'out',
                    $requiredQuantity,
                    null,
                    \App\Models\Ticket::class,
                    $ticket->id,
                    $movementNotes
                );

                $consumptions[] = $consumption;
            }

            // If there are errors and no successful consumptions, throw exception
            if (!empty($errors) && empty($consumptions)) {
                throw new \Exception(implode(' ', $errors));
            }
        });

        // If there are errors but some consumptions succeeded, log them but don't fail
        if (!empty($errors)) {
            Log::warning("Auto-consumption warnings for ticket {$ticket->id}: " . implode(' ', $errors));
        }

        return $consumptions;
    }
}

