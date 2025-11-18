<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;


class Ticket extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'ticket_number',
        'customer_id',
        'description',
        'job_type',
        'job_type_id',
        'quantity',
        'produced_quantity',
        'size_value',
        'size_unit',
        'due_date',
        'total_amount',
        'subtotal',
        'discount',
        'downpayment',
        'payment_method',
        'status',
        'design_status',
        'design_notes',
        'payment_status',
        'file_path',
    ];

    protected $casts = [
        'due_date' => 'date',
        'total_amount' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'discount' => 'decimal:2',
        'downpayment' => 'decimal:2',
        'quantity' => 'integer',
        'produced_quantity' => 'integer',
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
        // do {
        //     $number = 'TKT-' .(Str::uuid()->toString());
        // } while (static::where('ticket_number', $number)->exists());

        // return $number;

        $last = static::orderBy('id', 'desc')->first();
        $num = $last ? $last->id + 1 : 1;
    
        return 'TKT-' . str_pad($num, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Get the customer that owns the ticket.
     */
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get the job type for the ticket.
     */
    public function jobType()
    {
        return $this->belongsTo(JobType::class, 'job_type_id');
    }

    /**
     * Get the files for the ticket.
     */
    public function files()
    {
        return $this->hasMany(TicketFile::class);
    }

    /**
     * Get customer files for the ticket.
     */
    public function customerFiles()
    {
        return $this->hasMany(TicketFile::class)->where('type', 'customer');
    }

    /**
     * Get mockup files for the ticket.
     */
    public function mockupFiles()
    {
        return $this->hasMany(TicketFile::class)->where('type', 'mockup');
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

    /**
     * Get production stock consumptions for this ticket.
     */
    public function stockConsumptions()
    {
        return $this->hasMany(ProductionStockConsumption::class);
    }
}






