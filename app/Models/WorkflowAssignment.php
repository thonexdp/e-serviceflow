<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkflowAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_id',
        'workflow_step',
        'user_id',
        'assigned_by',
        'assigned_at',
        'is_active',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    
    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
    }

    
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    
    public function assignedByUser()
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    
    public function scopeForWorkflow($query, string $workflowStep)
    {
        return $query->where('workflow_step', $workflowStep);
    }

    
    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    
    public function scopeForTicket($query, int $ticketId)
    {
        return $query->where('ticket_id', $ticketId);
    }
}

