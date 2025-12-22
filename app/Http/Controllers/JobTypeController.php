<?php

namespace App\Http\Controllers;

use App\Models\JobType;
use App\Models\JobCategory;
use App\Models\UserActivityLog;
use App\Http\Requests\JobTypeRequest;
use App\Services\JobTypePricingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class JobTypeController extends Controller
{
    protected JobTypePricingService $pricing;

    public function __construct(JobTypePricingService $pricing)
    {
        $this->pricing = $pricing;
    }

    public function index(Request $request)
    {
        $jobTypes = JobType::with(['category', 'priceTiers', 'sizeRates', 'promoRules'])
            ->when(request('search'), function ($q) {
                $search = request('search');
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('category', fn($c) => $c->where('name', 'like', "%{$search}%"));
            })
            ->when(request('category_id'), fn($q) => $q->where('category_id', request('category_id')))
            ->when(request()->has('is_active'), fn($q) => $q->where('is_active', request('is_active')))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(request('per_page', 15));

        $categories = JobCategory::query()
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->latest()
            ->paginate(20);

        return Inertia::render('JobTypes', [
            'jobTypes' => $jobTypes,
            'allcategories' => JobCategory::orderBy('name')->get(),
            'categories' => $categories,
            'filters' => request()->only(['search', 'category_id', 'is_active']),
        ]);
    }

    public function store(JobTypeRequest $request)
    {
        $validated = $request->validated();

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $path = Storage::put('job-types', $file);
            $validated['image_path'] = $path;
        }

        $jobType = JobType::create($validated);
        $this->pricing->sync($jobType, $validated['price_tiers'] ?? [], $validated['size_rates'] ?? []);
        $this->syncPromoRules($jobType, $validated['promo_rules'] ?? []);

        UserActivityLog::log(
            auth()->id(),
            'created_job_type',
            "Created new job type: {$jobType->name}",
            $jobType,
            $validated
        );

        return back()->with('success', 'Job type created successfully!');
    }

    public function update(JobTypeRequest $request, JobType $jobType)
    {
        $validated = $request->validated();

        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($jobType->getRawOriginal('image_path')) {
                Storage::delete($jobType->getRawOriginal('image_path'));
            }
            $file = $request->file('image');
            $path = Storage::put('job-types', $file);
            $validated['image_path'] = $path;
        }

        $jobType->update($validated);
        $this->pricing->sync($jobType, $validated['price_tiers'] ?? [], $validated['size_rates'] ?? []);
        $this->syncPromoRules($jobType, $validated['promo_rules'] ?? []);

        UserActivityLog::log(
            auth()->id(),
            'updated_job_type',
            "Updated job type: {$jobType->name}",
            $jobType,
            $validated
        );

        return back()->with('success', 'Job type updated successfully!');
    }

    public function destroy(JobType $jobType)
    {
        $jobTypeName = $jobType->name;
        $jobType->delete();

        UserActivityLog::log(
            auth()->id(),
            'deleted_job_type',
            "Deleted job type: {$jobTypeName}",
            null
        );

        return back()->with('success', 'Job type deleted successfully!');
    }

    /**
     * Sync promo rules for a job type
     */
    private function syncPromoRules(JobType $jobType, array $promoRules)
    {
        // Delete existing promo rules for this job type
        $jobType->promoRules()->delete();

        // Create new promo rules
        foreach ($promoRules as $rule) {
            if (!empty($rule['buy_quantity']) && !empty($rule['free_quantity'])) {
                $jobType->promoRules()->create([
                    'buy_quantity' => $rule['buy_quantity'],
                    'free_quantity' => $rule['free_quantity'],
                    'description' => $rule['description'] ?? null,
                    'is_active' => $rule['is_active'] ?? true,
                ]);
            }
        }
    }
}
