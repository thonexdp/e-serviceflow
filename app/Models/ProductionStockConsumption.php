<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductionStockConsumption extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_id',
        'stock_item_id',
        'quantity_consumed',
        'unit_cost',
        'total_cost',
        'notes',
    ];

    protected $casts = [
        'quantity_consumed' => 'decimal:2',
        'unit_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
    ];

    
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($consumption) {
            if ($consumption->unit_cost && $consumption->quantity_consumed) {
                $consumption->total_cost = $consumption->quantity_consumed * $consumption->unit_cost;
            }
        });
    }

    
    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
    }

    
    public function stockItem()
    {
        return $this->belongsTo(StockItem::class);
    }
}

