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

    /**
     * Scope to get only active workflow steps
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to order by step order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('step_order', 'asc');
    }
}

