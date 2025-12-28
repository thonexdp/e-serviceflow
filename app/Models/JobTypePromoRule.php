<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobTypePromoRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_type_id',
        'buy_quantity',
        'free_quantity',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'buy_quantity' => 'integer',
        'free_quantity' => 'integer',
    ];

    
    public function jobType()
    {
        return $this->belongsTo(JobType::class);
    }
}
