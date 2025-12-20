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

    /**
     * Get the ticket this assignment belongs to
     */
    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
    }

    /**
     * Get the user assigned to this workflow
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the user who made this assignment
     */
    public function assignedByUser()
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    /**
     * Scope to get only active assignments
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get assignments for a specific workflow step
     */
    public function scopeForWorkflow($query, string $workflowStep)
    {
        return $query->where('workflow_step', $workflowStep);
    }

    /**
     * Scope to get assignments for a specific user
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to get assignments for a specific ticket
     */
    public function scopeForTicket($query, int $ticketId)
    {
        return $query->where('ticket_id', $ticketId);
    }
}

