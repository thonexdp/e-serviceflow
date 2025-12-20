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

    /**
     * Get the ticket for this production record.
     */
    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
    }

    /**
     * Get the user who produced this.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the job type for this production record.
     */
    public function jobType()
    {
        return $this->belongsTo(JobType::class);
    }

    /**
     * Get evidence files for this production record.
     */
    public function evidenceFiles()
    {
        return $this->hasMany(ProductionEvidenceFile::class);
    }
}
