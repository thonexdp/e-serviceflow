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
        'show_in_customer_view',
        'sort_order',
        'workflow_steps',
        'brochure_link',
        'has_colors',
        'available_colors',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'discount' => 'decimal:2',
        'incentive_price' => 'decimal:2',
        'is_active' => 'boolean',
        'show_in_dashboard' => 'boolean',
        'show_in_customer_view' => 'boolean',
        'sort_order' => 'integer',
        'workflow_steps' => 'array',
        'has_colors' => 'boolean',
        'available_colors' => 'array',
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
                        // Use Storage::disk() directly to avoid helper function issues
                        $s3Disk = app()->environment('production') ? 's3' : 'public';
                        return Storage::disk($s3Disk)->url($value);
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

    /**
     * Check if this job type can be safely deleted
     */
    public function canBeDeleted(): array
    {
        $dependencies = $this->getDeletionDependencies();

        return [
            'can_delete' => $dependencies['total_count'] === 0,
            'dependencies' => $dependencies,
        ];
    }

    /**
     * Get all dependencies that prevent deletion
     */
    public function getDeletionDependencies(): array
    {
        $tickets = Ticket::where('job_type_id', $this->id)->count();
        $activeTickets = Ticket::where('job_type_id', $this->id)
            ->whereIn('status', ['pending', 'in_designer', 'ready_to_print', 'in_production'])
            ->count();
        $completedTickets = Ticket::where('job_type_id', $this->id)
            ->where('status', 'completed')
            ->count();

        $stockRequirements = $this->stockRequirements()->count();
        $priceTiers = $this->priceTiers()->count();
        $sizeRates = $this->sizeRates()->count();
        $promoRules = $this->promoRules()->count();

        return [
            'tickets' => [
                'total' => $tickets,
                'active' => $activeTickets,
                'completed' => $completedTickets,
                'message' => $tickets > 0 ? "{$tickets} ticket(s) are using this job type" : null,
            ],
            'stock_requirements' => [
                'count' => $stockRequirements,
                'message' => $stockRequirements > 0 ? "{$stockRequirements} stock requirement(s) configured" : null,
            ],
            'price_tiers' => [
                'count' => $priceTiers,
                'message' => $priceTiers > 0 ? "{$priceTiers} price tier(s) configured" : null,
            ],
            'size_rates' => [
                'count' => $sizeRates,
                'message' => $sizeRates > 0 ? "{$sizeRates} size rate(s) configured" : null,
            ],
            'promo_rules' => [
                'count' => $promoRules,
                'message' => $promoRules > 0 ? "{$promoRules} promo rule(s) configured" : null,
            ],
            'total_count' => $tickets,
            'blocking_count' => $activeTickets,
        ];
    }
}
