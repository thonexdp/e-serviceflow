<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductionEvidenceFile extends Model
{
    use HasFactory;

    protected $fillable = [
        'production_record_id',
        'file_name',
        'file_path',
        'file_type',
        'file_size',
    ];

    protected $casts = [
        'file_size' => 'integer',
    ];

    /**
     * Get the production record that owns this evidence file.
     */
    public function productionRecord()
    {
        return $this->belongsTo(ProductionRecord::class);
    }
}
