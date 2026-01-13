<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobTypeInventory extends Model
{
    use HasFactory;

    protected $table = 'job_type_inventory';

    protected $fillable = [
        'job_type_id',
        'stock_item_id',
        'consume_type',
        'avg_quantity_per_unit',
        'is_optional',
        'notes',
    ];

    protected $casts = [
        'avg_quantity_per_unit' => 'decimal:4',
        'is_optional' => 'boolean',
    ];

    /**
     * Get the job type that owns this inventory relationship
     */
    public function jobType()
    {
        return $this->belongsTo(JobType::class);
    }

    /**
     * Get the stock item that is consumed
     */
    public function stockItem()
    {
        return $this->belongsTo(StockItem::class);
    }

    /**
     * Calculate the total quantity needed for a given production quantity
     * 
     * @param int $productionQuantity The number of units being produced
     * @param float|null $productionLength Optional length for area-based calculations
     * @param float|null $productionWidth Optional width for area-based calculations
     * @return float The quantity of this material needed
     */
    public function calculateQuantityNeeded(int $productionQuantity, ?float $productionLength = null, ?float $productionWidth = null): float
    {
        // Get the stock item to check if it's area-based
        $stockItem = $this->stockItem;

        // Support both old 'area' and new 'sqft' consume_type for backward compatibility
        $isAreaBased = ($this->consume_type === 'area' || $this->consume_type === 'sqft')
            && $stockItem
            && ($stockItem->is_area_based || $stockItem->measurement_type === 'area');

        if ($isAreaBased) {
            // For area-based items, consumption is based on production area
            // avg_quantity_per_unit acts as a Multiplier
            // If dimensions are provided (Size Based job), calculate total area first
            if ($productionLength && $productionWidth) {
                $totalArea = $productionLength * $productionWidth;
                return $totalArea * $this->avg_quantity_per_unit * $productionQuantity;
            }

            // If no dimensions (unlikely for sqft stock but possible as fallback), fallback to simple multiplication
            return $this->avg_quantity_per_unit * $productionQuantity;
        }

        // Default: simple multiplication for all other types (pcs, kg, ml, m)
        // avg_quantity_per_unit represents the amount consumed per job unit in the respective unit
        return $this->avg_quantity_per_unit * $productionQuantity;
    }
}
