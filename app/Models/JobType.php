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

    /**
     * Get the category that owns the job type.
     */
    public function category()
    {
        return $this->belongsTo(JobCategory::class, 'category_id');
    }

    /**
     * Get the full URL for the image path.
     * This ensures images are accessible from Cloud Storage.
     */
    protected function imagePath(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (!$value) {
                    return null;
                }

                $disk = config('filesystems.default');

                // For GCS, generate the full public URL
                if ($disk === 'gcs') {
                    $bucket = config('filesystems.disks.gcs.bucket');
                    return "https://storage.googleapis.com/{$bucket}/{$value}";
                }

                // For local/public storage, use the /storage/ prefix
                if ($disk === 'public' || $disk === 'local') {
                    return "/storage/{$value}";
                }

                // Fallback: try to use Storage::url()
                try {
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

    /**
     * Get the incentive price for a specific workflow step.
     * 
     * @param string $workflowStep The workflow step (e.g., 'printing', 'cutting')
     * @return float The incentive price for the step, or 0 if not found
     */
    public function getIncentivePriceForStep(string $workflowStep): float
    {
        // If no workflow_steps configured, fall back to global incentive_price
        if (!$this->workflow_steps) {
            return (float) ($this->incentive_price ?? 0);
        }

        // Check if workflow step exists
        if (!isset($this->workflow_steps[$workflowStep])) {
            return (float) ($this->incentive_price ?? 0);
        }

        $stepData = $this->workflow_steps[$workflowStep];

        // Handle new format (object with enabled and incentive_price)
        if (is_array($stepData) && isset($stepData['incentive_price'])) {
            return (float) ($stepData['incentive_price'] ?? 0);
        }

        // Fall back to global incentive_price for old format
        return (float) ($this->incentive_price ?? 0);
    }
}
