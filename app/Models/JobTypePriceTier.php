<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobTypePriceTier extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_type_id',
        'label',
        'min_quantity',
        'max_quantity',
        'price',
        'notes',
    ];

    public function jobType()
    {
        return $this->belongsTo(JobType::class);
    }
}
