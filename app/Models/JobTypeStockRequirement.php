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
     */
    public function calculateRequiredQuantity(int $productionQuantity): float
    {
        return $this->quantity_per_unit * $productionQuantity;
    }
}

