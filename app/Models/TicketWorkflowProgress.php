<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TicketWorkflowProgress extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_id',
        'workflow_step',
        'completed_quantity',
        'is_completed',
        'completed_at',
        'completed_by',
    ];

    protected $casts = [
        'is_completed' => 'boolean',
        'completed_at' => 'datetime',
        'completed_quantity' => 'integer',
    ];

    /**
     * Get the ticket that owns this workflow progress
     */
    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
    }

    /**
     * Get the user who completed this step
     */
    public function completedBy()
    {
        return $this->belongsTo(User::class, 'completed_by');
    }
}
