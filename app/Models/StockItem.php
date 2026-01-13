<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class StockItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $dates = ['deleted_at'];
    protected $fillable = [
        'job_type_id',
        'sku',
        'name',
        'description',
        'category',
        'base_unit_of_measure',
        'measurement_type',
        'length',
        'width',
        'is_area_based',
        'is_garment',
        'current_stock',
        'minimum_stock_level',
        'maximum_stock_level',
        'unit_cost',
        'supplier',
        'location',
        'is_active',
    ];

    protected $casts = [
        'length' => 'decimal:2',
        'width' => 'decimal:2',
        'is_area_based' => 'boolean',
        'is_garment' => 'boolean',
        'measurement_type' => 'string',
        'current_stock' => 'decimal:2',
        'minimum_stock_level' => 'decimal:2',
        'maximum_stock_level' => 'decimal:2',
        'unit_cost' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    
    public function movements()
    {
        return $this->hasMany(StockMovement::class);
    }

    
    public function purchaseOrderItems()
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    
    public function productionConsumptions()
    {
        return $this->hasMany(ProductionStockConsumption::class);
    }

    
    public function isLowStock(): bool
    {
        return $this->current_stock <= $this->minimum_stock_level;
    }

    
    public function isOutOfStock(): bool
    {
        return $this->current_stock <= 0;
    }

    
    public function getStockStatusAttribute(): string
    {
        if ($this->isOutOfStock()) {
            return 'out_of_stock';
        } elseif ($this->isLowStock()) {
            return 'low_stock';
        }
        return 'in_stock';
    }

    /**
     * Get the job types that use this stock item in their recipe/BOM (NEW - Job-type driven)
     */
    public function jobTypesUsingThis()
    {
        return $this->belongsToMany(JobType::class, 'job_type_inventory')
            ->withPivot('consume_type', 'avg_quantity_per_unit', 'is_optional', 'notes')
            ->withTimestamps();
    }

    /**
     * Get inventory recipe entries for this stock item
     */
    public function inventoryRecipes()
    {
        return $this->hasMany(JobTypeInventory::class);
    }

    /**
     * OLD RELATIONSHIPS - Kept for backward compatibility during migration
     * @deprecated - Inventory should not "know" about job types in new design
     */
    public function jobType()
    {
        return $this->belongsTo(JobType::class);
    }

    /**
     * @deprecated Use jobTypesUsingThis() instead
     */
    public function jobTypes()
    {
        return $this->belongsToMany(JobType::class, 'job_type_stock_requirements')
            ->withPivot('quantity_per_unit', 'is_required', 'notes')
            ->withTimestamps();
    }

    
    public function getAreaAttribute(): ?float
    {
        if ($this->is_area_based && $this->length && $this->width) {
            return $this->length * $this->width;
        }
        return null;
    }

    
    public function calculateRequiredQuantity(int $productionQuantity, ?float $productionLength = null, ?float $productionWidth = null): float
    {
        if ($this->is_area_based) {
            
            if ($productionLength && $productionWidth && $this->length && $this->width) {
                $productionArea = $productionLength * $productionWidth;
                $stockArea = $this->length * $this->width;
                $piecesNeeded = ceil($productionArea / $stockArea) * $productionQuantity;
                return $piecesNeeded;
            }
            
            return $productionQuantity;
        } else {
            
            return $productionQuantity;
        }
    }

    /**
     * Check if this stock item can be safely deleted
     */
    public function canBeDeleted(): array
    {
        $dependencies = $this->getDeletionDependencies();
        
        return [
            'can_delete' => $dependencies['blocking_count'] === 0,
            'dependencies' => $dependencies,
            'warnings' => $this->getDeletionWarnings(),
        ];
    }

    /**
     * Get all dependencies that prevent deletion
     */
    public function getDeletionDependencies(): array
    {
        $movements = $this->movements()->count();
        $recentMovements = $this->movements()
            ->where('created_at', '>=', now()->subDays(30))
            ->count();
        
        $consumptions = $this->productionConsumptions()->count();
        $recentConsumptions = $this->productionConsumptions()
            ->where('created_at', '>=', now()->subDays(30))
            ->count();
        
        $purchaseOrderItems = $this->purchaseOrderItems()->count();
        $pendingPurchaseOrders = $this->purchaseOrderItems()
            ->whereHas('purchaseOrder', function ($query) {
                $query->whereIn('status', ['draft', 'pending', 'approved', 'ordered']);
            })
            ->count();
        
        $jobTypeLinks = $this->jobTypes()->count();

        return [
            'movements' => [
                'total' => $movements,
                'recent' => $recentMovements,
                'message' => $movements > 0 ? "{$movements} stock movement(s) on record ({$recentMovements} in last 30 days)" : null,
            ],
            'consumptions' => [
                'total' => $consumptions,
                'recent' => $recentConsumptions,
                'message' => $consumptions > 0 ? "{$consumptions} production consumption(s) recorded ({$recentConsumptions} in last 30 days)" : null,
            ],
            'purchase_orders' => [
                'total' => $purchaseOrderItems,
                'pending' => $pendingPurchaseOrders,
                'message' => $purchaseOrderItems > 0 ? "{$purchaseOrderItems} purchase order item(s) ({$pendingPurchaseOrders} pending)" : null,
            ],
            'job_types' => [
                'count' => $jobTypeLinks,
                'message' => $jobTypeLinks > 0 ? "Linked to {$jobTypeLinks} job type(s)" : null,
            ],
            'total_count' => $movements + $consumptions + $purchaseOrderItems + $jobTypeLinks,
            'blocking_count' => $pendingPurchaseOrders,
        ];
    }

    /**
     * Get warnings about deletion
     */
    private function getDeletionWarnings(): array
    {
        $warnings = [];

        $pendingPurchaseOrders = $this->purchaseOrderItems()
            ->whereHas('purchaseOrder', function ($query) {
                $query->whereIn('status', ['draft', 'pending', 'approved', 'ordered']);
            })
            ->count();

        if ($pendingPurchaseOrders > 0) {
            $warnings[] = "Stock item has {$pendingPurchaseOrders} pending purchase order(s). Cannot delete until orders are completed or cancelled.";
        }

        if ($this->current_stock > 0) {
            $warnings[] = "Stock item has current stock of {$this->current_stock} {$this->base_unit_of_measure}. Consider adjusting to zero before deletion.";
        }

        $consumptions = $this->productionConsumptions()->count();
        if ($consumptions > 0) {
            $warnings[] = "Stock item has {$consumptions} production consumption record(s). Deleting will remove consumption history.";
        }

        $movements = $this->movements()->count();
        if ($movements > 0) {
            $warnings[] = "Stock item has {$movements} stock movement(s). Deleting will remove movement history.";
        }

        return $warnings;
    }
}
