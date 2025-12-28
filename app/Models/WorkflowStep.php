<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkflowStep extends Model
{
    use HasFactory;

    protected $fillable = [
        'step_key',
        'step_name',
        'step_order',
        'icon',
        'color',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'step_order' => 'integer',
    ];

    
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    
    public function scopeOrdered($query)
    {
        return $query->orderBy('step_order', 'asc');
    }
}

