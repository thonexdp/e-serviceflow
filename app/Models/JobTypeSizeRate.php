<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobTypeSizeRate extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_type_id',
        'variant_name',
        'description',
        'calculation_method',
        'dimension_unit',
        'rate',
        'min_width',
        'max_width',
        'min_height',
        'max_height',
        'is_default',
    ];

    protected $casts = [
        'rate' => 'decimal:2',
        'min_width' => 'decimal:2',
        'max_width' => 'decimal:2',
        'min_height' => 'decimal:2',
        'max_height' => 'decimal:2',
        'is_default' => 'boolean',
    ];

    public function jobType()
    {
        return $this->belongsTo(JobType::class);
    }
}
