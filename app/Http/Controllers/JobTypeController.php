<?php

namespace App\Http\Controllers;

use App\Models\JobType;
use App\Models\JobCategory;
use App\Http\Requests\JobTypeRequest;
use App\Services\JobTypePricingService;
use Illuminate\Http\Request;
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
        $jobTypes = JobType::with(['category', 'priceTiers', 'sizeRates'])
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
        $jobType = JobType::create($validated);
        $this->pricing->sync($jobType, $validated['price_tiers'] ?? [], $validated['size_rates'] ?? []);

        return back()->with('success', 'Job type created successfully!');
    }

    public function update(JobTypeRequest $request, JobType $jobType)
    {
        $validated = $request->validated();

        $jobType->update($validated);
        $this->pricing->sync($jobType, $validated['price_tiers'] ?? [], $validated['size_rates'] ?? []);

        return back()->with('success', 'Job type updated successfully!');
    }

    public function destroy(JobType $jobType)
    {
        $jobType->delete();

        return back()->with('success', 'Job type deleted successfully!');
    }
}
