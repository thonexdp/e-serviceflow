<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkflowLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_id',
        'workflow_step',
        'user_id',
        'status',
        'quantity_produced',
        'started_at',
        'completed_at',
        'notes',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'quantity_produced' => 'integer',
    ];

    /**
     * Get the ticket that this log belongs to
     */
    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
    }

    /**
     * Get the user who performed this work
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get evidence files for this log
     */
    public function evidenceFiles()
    {
        return $this->hasMany(WorkflowEvidence::class);
    }

    /**
     * Calculate duration in minutes
     */
    public function getDurationInMinutesAttribute()
    {
        if (!$this->started_at || !$this->completed_at) {
            return null;
        }

        return $this->started_at->diffInMinutes($this->completed_at);
    }

    /**
     * Scope to get logs for a specific workflow step
     */
    public function scopeForWorkflow($query, string $workflowStep)
    {
        return $query->where('workflow_step', $workflowStep);
    }

    /**
     * Scope to get completed logs
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope to get in-progress logs
     */
    public function scopeInProgress($query)
    {
        return $query->where('status', 'in_progress');
    }
}

