<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseOrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_order_id',
        'stock_item_id',
        'quantity',
        'unit_cost',
        'total_cost',
        'received_quantity',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'received_quantity' => 'decimal:2',
    ];

    
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($item) {
            $item->total_cost = $item->quantity * $item->unit_cost;
        });
    }

    
    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    
    public function stockItem()
    {
        return $this->belongsTo(StockItem::class);
    }

    
    public function isFullyReceived(): bool
    {
        return $this->received_quantity >= $this->quantity;
    }

    
    public function getRemainingQuantityAttribute(): float
    {
        return max(0, $this->quantity - $this->received_quantity);
    }
}

