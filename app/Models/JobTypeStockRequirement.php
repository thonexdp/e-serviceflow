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

    
    public function jobType()
    {
        return $this->belongsTo(JobType::class);
    }

    
    public function stockItem()
    {
        return $this->belongsTo(StockItem::class);
    }

    
    public function calculateRequiredQuantity(
        int $productionQuantity,
        ?float $area = null,
        ?float $length = null
    ): float {
        $calculationType = $this->calculation_type ?? 'quantity';

        switch ($calculationType) {
            case 'area':
                
                
                return $this->quantity_per_unit * ($area ?? 0);

            case 'length':
                
                
                return $this->quantity_per_unit * ($length ?? 0);

            case 'quantity':
            default:
                
                
                return $this->quantity_per_unit * $productionQuantity;
        }
    }
}
