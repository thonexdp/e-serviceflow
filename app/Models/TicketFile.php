<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TicketFile extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_id',
        'filename',
        'filepath',
        'type',
    ];

    /**
     * Get the ticket that owns the file.
     */
    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
    }
}
