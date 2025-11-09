<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ticket extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'ticket_number',
        'customer_id',
        'description',
        'job_type',
        'quantity',
        'size_value',
        'size_unit',
        'due_date',
        'total_amount',
        'discount',
        'downpayment',
        'status',
        'payment_status',
        'file_path',
    ];

    protected $casts = [
        'due_date' => 'date',
        'total_amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'downpayment' => 'decimal:2',
        'quantity' => 'integer',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($ticket) {
            if (empty($ticket->ticket_number)) {
                $ticket->ticket_number = static::generateTicketNumber();
            }
        });
    }

    /**
     * Generate a unique ticket number.
     */
    protected static function generateTicketNumber(): string
    {
        do {
            $number = 'TKT-' . strtoupper(uniqid());
        } while (static::where('ticket_number', $number)->exists());

        return $number;
    }

    /**
     * Get the customer that owns the ticket.
     */
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get the full size attribute.
     */
    public function getFullSizeAttribute(): ?string
    {
        if ($this->size_value && $this->size_unit) {
            return "{$this->size_value} {$this->size_unit}";
        }
        return null;
    }
}



