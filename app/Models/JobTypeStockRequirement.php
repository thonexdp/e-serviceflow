<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobTypeStockRequirement extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_type_id',
        'stock_item_id',
        'quantity_per_unit',
        'calculation_type',
        'is_required',
        'notes',
    ];

    protected $casts = [
        'quantity_per_unit' => 'decimal:2',
        'is_required' => 'boolean',
    ];

    /**
     * Get the job type.
     */
    public function jobType()
    {
        return $this->belongsTo(JobType::class);
    }

    /**
     * Get the stock item.
     */
    public function stockItem()
    {
        return $this->belongsTo(StockItem::class);
    }

    /**
     * Calculate required quantity for a given production quantity.
     * 
     * @param int $productionQuantity Number of pieces produced
     * @param float|null $area Total area in square meters (for area-based calculations)
     * @param float|null $length Total length in meters (for length-based calculations)
     * @return float Required stock quantity
     */
    public function calculateRequiredQuantity(
        int $productionQuantity,
        ?float $area = null,
        ?float $length = null
    ): float {
        $calculationType = $this->calculation_type ?? 'quantity';

        switch ($calculationType) {
            case 'area':
                // For area-based: quantity_per_unit is per sqm
                // Example: 0.5 sqm per sqm of production = 0.5 * area
                return $this->quantity_per_unit * ($area ?? 0);

            case 'length':
                // For length-based: quantity_per_unit is per meter
                // Example: 0.1 meters per meter of production = 0.1 * length
                return $this->quantity_per_unit * ($length ?? 0);

            case 'quantity':
            default:
                // For quantity-based: quantity_per_unit is per piece
                // Example: 2 pieces per production unit = 2 * quantity
                return $this->quantity_per_unit * $productionQuantity;
        }
    }
}
