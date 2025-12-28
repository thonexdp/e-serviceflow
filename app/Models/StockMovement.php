<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'stock_item_id',
        'movement_type',
        'reference_type',
        'reference_id',
        'quantity',
        'unit_cost',
        'total_cost',
        'stock_before',
        'stock_after',
        'notes',
        'user_id',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'stock_before' => 'decimal:2',
        'stock_after' => 'decimal:2',
    ];

    
    public function stockItem()
    {
        return $this->belongsTo(StockItem::class);
    }

    
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    
    public function reference()
    {
        return $this->morphTo('reference', 'reference_type', 'reference_id');
    }
}

