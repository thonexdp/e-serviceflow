<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PurchaseOrder extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'po_number',
        'supplier',
        'supplier_contact',
        'supplier_email',
        'status',
        'order_date',
        'expected_delivery_date',
        'received_date',
        'subtotal',
        'tax',
        'shipping_cost',
        'total_amount',
        'notes',
        'internal_notes',
        'created_by',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'order_date' => 'date',
        'expected_delivery_date' => 'date',
        'received_date' => 'date',
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'approved_at' => 'datetime',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($po) {
            if (empty($po->po_number)) {
                $po->po_number = static::generatePONumber();
            }
        });
    }

    /**
     * Generate a unique PO number.
     */
    protected static function generatePONumber(): string
    {
        $last = static::orderBy('id', 'desc')->first();
        $num = $last ? $last->id + 1 : 1;
        return 'PO-' . date('Y') . '-' . str_pad($num, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Get purchase order items.
     */
    public function items()
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    /**
     * Get the user who created the PO.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who approved the PO.
     */
    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Check if PO can be received.
     */
    public function canBeReceived(): bool
    {
        return in_array($this->status, ['approved', 'ordered']);
    }

    /**
     * Check if PO is fully received.
     */
    public function isFullyReceived(): bool
    {
        return $this->items->every(function ($item) {
            return $item->received_quantity >= $item->quantity;
        });
    }

    /**
     * Calculate totals from items.
     */
    public function calculateTotals()
    {
        $this->subtotal = $this->items->sum('total_cost');
        $this->total_amount = $this->subtotal + $this->tax + $this->shipping_cost;
        $this->save();
    }
}

