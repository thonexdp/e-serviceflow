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

    
    public function jobType()
    {
        return $this->belongsTo(JobType::class);
    }

    
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
}
