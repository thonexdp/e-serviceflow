<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkflowEvidence extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_id',
        'workflow_step',
        'user_id',
        'workflow_log_id',
        'file_name',
        'file_path',
        'file_size',
        'mime_type',
        'uploaded_at',
        'notes',
    ];

    protected $casts = [
        'uploaded_at' => 'datetime',
        'file_size' => 'integer',
    ];

    /**
     * Get the ticket this evidence belongs to
     */
    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
    }

    /**
     * Get the user who uploaded this evidence
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the workflow log this evidence is associated with
     */
    public function workflowLog()
    {
        return $this->belongsTo(WorkflowLog::class);
    }

    /**
     * Scope to get evidence for a specific workflow step
     */
    public function scopeForWorkflow($query, string $workflowStep)
    {
        return $query->where('workflow_step', $workflowStep);
    }

    /**
     * Scope to get evidence for a specific user
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Get file size in human-readable format
     */
    public function getFileSizeHumanAttribute()
    {
        if (!$this->file_size) {
            return 'Unknown';
        }

        $bytes = $this->file_size;
        $units = ['B', 'KB', 'MB', 'GB'];
        $power = $bytes > 0 ? floor(log($bytes, 1024)) : 0;

        return number_format($bytes / pow(1024, $power), 2) . ' ' . $units[$power];
    }

    /**
     * Check if file is an image
     */
    public function getIsImageAttribute()
    {
        return str_starts_with($this->mime_type ?? '', 'image/');
    }
}

