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

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($item) {
            $item->total_cost = $item->quantity * $item->unit_cost;
        });
    }

    /**
     * Get the purchase order.
     */
    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    /**
     * Get the stock item.
     */
    public function stockItem()
    {
        return $this->belongsTo(StockItem::class);
    }

    /**
     * Check if item is fully received.
     */
    public function isFullyReceived(): bool
    {
        return $this->received_quantity >= $this->quantity;
    }

    /**
     * Get remaining quantity to receive.
     */
    public function getRemainingQuantityAttribute(): float
    {
        return max(0, $this->quantity - $this->received_quantity);
    }
}

