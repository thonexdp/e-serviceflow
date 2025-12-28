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

            
            if ($movementType === 'in') {
                
                $stockAfter = $stockBefore + abs($quantity);
            } elseif ($movementType === 'adjustment') {
                
                $stockAfter = $stockBefore + $quantity; 
                $stockAfter = max(0, $stockAfter); 
            } elseif ($movementType === 'out') {
                $stockAfter = max(0, $stockBefore - abs($quantity));
            } else {
                $stockAfter = $stockBefore;
            }

            
            $cost = $unitCost ?? $stockItem->unit_cost;
            $totalCost = $cost * abs($quantity);

            
            $stockItem->current_stock = $stockAfter;
            if ($unitCost && ($movementType === 'in')) {
                
                $totalValue = ($stockBefore * $stockItem->unit_cost) + $totalCost;
                $stockItem->unit_cost = $stockAfter > 0 ? $totalValue / $stockAfter : $cost;
            }
            $stockItem->save();

            
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

    
    public function receivePurchaseOrderItems(PurchaseOrder $purchaseOrder, array $receivedItems): void
    {
        DB::transaction(function () use ($purchaseOrder, $receivedItems) {
            foreach ($receivedItems as $itemData) {
                $poItem = PurchaseOrderItem::findOrFail($itemData['id']);
                $receivedQty = $itemData['received_quantity'] ?? $poItem->quantity;

                
                if ($receivedQty > $poItem->remaining_quantity) {
                    throw new \Exception("Received quantity cannot exceed remaining quantity for item {$poItem->stockItem->name}");
                }

                
                $poItem->received_quantity += $receivedQty;
                $poItem->save();

                
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
            
            \App\Models\ProductionStockConsumption::create([
                'ticket_id' => $ticketId,
                'stock_item_id' => $stockItem->id,
                'quantity_consumed' => $quantity,
                'unit_cost' => $stockItem->unit_cost,
                'total_cost' => $quantity * $stockItem->unit_cost,
                'notes' => $notes,
            ]);

            
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

    
    public function getLowStockItems()
    {
        return StockItem::where('is_active', true)
            ->whereRaw('current_stock <= minimum_stock_level')
            ->orderBy('current_stock', 'asc')
            ->get();
    }

    
    public function autoConsumeStockForProduction(\App\Models\Ticket $ticket): array
    {
        
        if (!$ticket->relationLoaded('jobType')) {
            $ticket->load('jobType');
        }

        if (!$ticket->jobType) {
            Log::warning("Ticket {$ticket->id} does not have a job type assigned.");
            return [];
        }

        
        $stockRequirements = $ticket->jobType->stockRequirements()
            ->where('is_required', true)
            ->with('stockItem')
            ->get();

        
        if ($stockRequirements->isEmpty()) {
            Log::info("No explicit stock requirements found for job type {$ticket->jobType->id} (Ticket {$ticket->id}). Checking for stock items linked to this job type...");

            
            $linkedStockItems = \App\Models\StockItem::where('job_type_id', $ticket->jobType->id)
                ->where('is_active', true)
                ->get();

            if ($linkedStockItems->isEmpty()) {
                Log::warning("No stock items found linked to job type {$ticket->jobType->id} (Ticket {$ticket->id}). Auto-consumption skipped.");
                return [];
            }

            
            Log::info("Found {$linkedStockItems->count()} stock item(s) linked to job type {$ticket->jobType->id}. Creating requirements automatically...");

            foreach ($linkedStockItems as $stockItem) {
                
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

                
                $requirement->load('stockItem');
                $stockRequirements->push($requirement);
            }

            Log::info("Created {$stockRequirements->count()} stock requirement(s) for job type {$ticket->jobType->id}.");
        }

        
        $productionLength = null;
        $productionWidth = null;

        if ($ticket->size_value) {
            
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

                
                $requiredQuantity = 0;
                $areaConsumed = 0; 

                if ($stockItem->is_area_based) {
                    
                    if ($productionLength && $productionWidth && $stockItem->length && $stockItem->width) {
                        
                        $productionArea = $productionLength * $productionWidth;
                        $totalAreaNeeded = $productionArea * $ticket->quantity;

                        
                        $stockArea = $stockItem->length * $stockItem->width;

                        
                        
                        $requiredQuantity = $totalAreaNeeded / $stockArea;
                        $areaConsumed = $totalAreaNeeded;

                        Log::info("Area-based calculation for '{$stockItem->name}': Production area = {$productionArea} sq.ft × {$ticket->quantity} = {$totalAreaNeeded} sq.ft. Stock area = {$stockArea} sq.ft. Required = {$requiredQuantity} pieces.");
                    } else {
                        
                        $qtyPerUnit = $requirement->quantity_per_unit ?? 1;
                        $requiredQuantity = $qtyPerUnit * $ticket->quantity;
                        if ($stockItem->length && $stockItem->width) {
                            $stockArea = $stockItem->length * $stockItem->width;
                            $areaConsumed = $requiredQuantity * $stockArea;
                        }
                    }
                } else {
                    
                    $qtyPerUnit = $requirement->quantity_per_unit ?? 1;
                    $requiredQuantity = $qtyPerUnit * $ticket->quantity;
                }

                if ($requiredQuantity <= 0) {
                    
                    continue;
                }

                
                $stockItem->refresh();

                
                if ($stockItem->is_area_based && $areaConsumed > 0) {
                    $availableArea = $stockItem->current_stock * ($stockItem->length * $stockItem->width);
                    if ($availableArea < $areaConsumed) {
                        $errors[] = "Insufficient stock area for '{$stockItem->name}'. Available: {$availableArea} sq.ft, Required: {$areaConsumed} sq.ft";
                        continue;
                    }
                } else {
                    
                    if ($stockItem->current_stock < $requiredQuantity) {
                        $errors[] = "Insufficient stock for '{$stockItem->name}'. Available: {$stockItem->current_stock}, Required: {$requiredQuantity}";
                        continue;
                    }
                }

                
                $existingConsumption = \App\Models\ProductionStockConsumption::where('ticket_id', $ticket->id)
                    ->where('stock_item_id', $stockItem->id)
                    ->first();

                if ($existingConsumption) {
                    
                    Log::info("Stock already consumed for ticket {$ticket->id}, stock item {$stockItem->id}");
                    continue;
                }

                
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

            
            if (!empty($errors) && empty($consumptions)) {
                throw new \Exception(implode(' ', $errors));
            }
        });

        
        if (!empty($errors)) {
            Log::warning("Auto-consumption warnings for ticket {$ticket->id}: " . implode(' ', $errors));
        }

        return $consumptions;
    }
}
