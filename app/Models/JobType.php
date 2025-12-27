<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Storage;

class JobType extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'category_id',
        'name',
        'description',
        'image_path',
        'price',
        'price_by',
        'discount',
        'incentive_price',
        'promo_text',
        'is_active',
        'show_in_dashboard',
        'sort_order',
        'workflow_steps',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'discount' => 'decimal:2',
        'incentive_price' => 'decimal:2',
        'is_active' => 'boolean',
        'show_in_dashboard' => 'boolean',
        'sort_order' => 'integer',
        'workflow_steps' => 'array',
    ];

    
    public function category()
    {
        return $this->belongsTo(JobCategory::class, 'category_id');
    }

    
    protected function imagePath(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (!$value) {
                    return null;
                }

                $disk = config('filesystems.default');

                
                if ($disk === 'gcs') {
                    $bucket = config('filesystems.disks.gcs.bucket');
                    return "https://storage.googleapis.com/{$bucket}/{$value}";
                }

                
                if ($disk === 'public' || $disk === 'local') {
                    return "/storage/{$value}";
                }

                
                try {
                    if ($disk === 's3') {
                        return \storage()->url($value);
                    }
                    return Storage::url($value);
                } catch (\Exception $e) {
                    return "/storage/{$value}";
                }
            }
        );
    }

    public function priceTiers()
    {
        return $this->hasMany(JobTypePriceTier::class)->orderBy('min_quantity');
    }

    public function sizeRates()
    {
        return $this->hasMany(JobTypeSizeRate::class)->orderBy('rate');
    }

    
    public function stockRequirements()
    {
        return $this->hasMany(JobTypeStockRequirement::class);
    }

    
    public function promoRules()
    {
        return $this->hasMany(JobTypePromoRule::class)->orderBy('buy_quantity');
    }

    
    public function activePromoRules()
    {
        return $this->hasMany(JobTypePromoRule::class)->where('is_active', true)->orderBy('buy_quantity');
    }

    
    public function requiredStockItems()
    {
        return $this->belongsToMany(StockItem::class, 'job_type_stock_requirements')
            ->withPivot('quantity_per_unit', 'is_required', 'notes')
            ->withTimestamps();
    }

    
    public function getIncentivePriceForStep(string $workflowStep): float
    {
        
        if (!$this->workflow_steps) {
            return (float) ($this->incentive_price ?? 0);
        }

        
        if (!isset($this->workflow_steps[$workflowStep])) {
            return (float) ($this->incentive_price ?? 0);
        }

        $stepData = $this->workflow_steps[$workflowStep];

        
        if (is_array($stepData) && isset($stepData['incentive_price'])) {
            return (float) ($stepData['incentive_price'] ?? 0);
        }

        
        return (float) ($this->incentive_price ?? 0);
    }
}
