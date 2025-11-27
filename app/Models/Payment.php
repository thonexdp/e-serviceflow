<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payment extends Model
{
    use HasFactory, SoftDeletes;

    public const TYPES = ['collection', 'refund', 'adjustment'];
    public const METHODS = ['cash', 'gcash', 'bank_transfer', 'credit_card', 'check'];
    public const ALLOCATIONS = ['downpayment', 'balance', 'full'];

    protected $fillable = [
        'ticket_id',
        'customer_id',
        'recorded_by',
        'invoice_number',
        'official_receipt_number',
        'payment_reference',
        'payer_type',
        'payer_name',
        'payment_type',
        'allocation',
        'payment_method',
        'amount',
        'balance_before',
        'balance_after',
        'payment_date',
        'status',
        'notes',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'payment_date' => 'date',
        'amount' => 'decimal:2',
        'balance_before' => 'decimal:2',
        'balance_after' => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::saved(function (Payment $payment) {
            $payment->ticket?->refreshPaymentSummary();
        });

        static::deleted(function (Payment $payment) {
            // deleted is triggered for soft deletes as well
            $payment->ticket?->refreshPaymentSummary();
        });
    }

    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function documents()
    {
        return $this->hasMany(PaymentDocument::class);
    }

    public function scopePosted($query)
    {
        return $query->where('status', 'posted');
    }

    public function scopeCollections($query)
    {
        return $query->where('payment_type', 'collection');
    }

    public function getDisplayPayerAttribute(): string
    {
        if ($this->payer_type === 'customer' && $this->customer) {
            return $this->customer->full_name ?? $this->customer->firstname ?? 'Customer';
        }

        return $this->payer_name ?? 'Walk-in';
    }
}
