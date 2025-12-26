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

    
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
