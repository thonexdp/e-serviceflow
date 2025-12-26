<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductionRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_id',
        'user_id',
        'job_type_id',
        'workflow_step',
        'quantity_produced',
        'incentive_amount',
    ];

    protected $casts = [
        'quantity_produced' => 'integer',
        'incentive_amount' => 'decimal:2',
    ];

    
    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
    }

    
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    
    public function jobType()
    {
        return $this->belongsTo(JobType::class);
    }

    
    public function evidenceFiles()
    {
        return $this->hasMany(ProductionEvidenceFile::class);
    }
}
