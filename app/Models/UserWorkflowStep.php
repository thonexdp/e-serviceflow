<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserWorkflowStep extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'workflow_step',
    ];

    /**
     * Get the user that owns this workflow step assignment
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
