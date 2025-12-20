<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class JobType extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'category_id',
        'name',
        'description',
        'price',
        'price_by',
        'discount',
        'incentive_price',
        'promo_text',
        'is_active',
        'sort_order',
        'workflow_steps',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'discount' => 'decimal:2',
        'incentive_price' => 'decimal:2',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
        'workflow_steps' => 'array',
    ];

    /**
     * Get the category that owns the job type.
     */
    public function category()
    {
        return $this->belongsTo(JobCategory::class, 'category_id');
    }

    public function priceTiers()
    {
        return $this->hasMany(JobTypePriceTier::class)->orderBy('min_quantity');
    }

    public function sizeRates()
    {
        return $this->hasMany(JobTypeSizeRate::class)->orderBy('rate');
    }

    /**
     * Get stock requirements for this job type.
     */
    public function stockRequirements()
    {
        return $this->hasMany(JobTypeStockRequirement::class);
    }

    /**
     * Get promo rules for this job type.
     */
    public function promoRules()
    {
        return $this->hasMany(JobTypePromoRule::class)->orderBy('buy_quantity');
    }

    /**
     * Get only active promo rules for this job type.
     */
    public function activePromoRules()
    {
        return $this->hasMany(JobTypePromoRule::class)->where('is_active', true)->orderBy('buy_quantity');
    }

    /**
     * Get required stock items for this job type.
     */
    public function requiredStockItems()
    {
        return $this->belongsToMany(StockItem::class, 'job_type_stock_requirements')
            ->withPivot('quantity_per_unit', 'is_required', 'notes')
            ->withTimestamps();
    }
}
