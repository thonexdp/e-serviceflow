<?php

namespace App\Http\Controllers;

use App\Models\JobType;
use App\Models\JobCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class JobTypeController extends Controller
{
    /**
     * Display a listing of job types.
     */
    public function index(Request $request)
    {
        $query = JobType::with('category');

        // Apply search
        if ($request->has('search') && $request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%')
                    ->orWhereHas('category', function ($categoryQuery) use ($request) {
                        $categoryQuery->where('name', 'like', '%' . $request->search . '%');
                    });
            });
        }

        // Filter by category
        if ($request->has('category_id') && $request->category_id) {
            $query->where('category_id', $request->category_id);
        }

        // Filter by active status
        if ($request->has('is_active') && $request->is_active !== null) {
            $query->where('is_active', $request->is_active);
        }

        $jobTypes = $query->orderBy('sort_order')->orderBy('name')->paginate($request->get('per_page', 15));

        // Get categories for dropdown
        $categories = JobCategory::orderBy('name')->get();

        return Inertia::render('JobTypes', [
            'jobTypes' => $jobTypes,
            'categories' => $categories,
            'filters' => $request->only(['search', 'category_id', 'is_active']),
        ]);
    }

    /**
     * Store a newly created job type.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:job_categories,id',
            'name' => 'required|string|max:120',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'price_by' => 'required|in:pcs,sqm,length',
            'discount' => 'nullable|numeric|min:0|max:100',
            'promo_text' => 'nullable|string|max:255',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        JobType::create($validated);

        return redirect()->back()->with('success', 'Job type created successfully!');
    }

    /**
     * Update the specified job type.
     */
    public function update(Request $request, $id)
    {
        $jobType = JobType::findOrFail($id);
        
        $validated = $request->validate([
            'category_id' => 'required|exists:job_categories,id',
            'name' => 'required|string|max:120',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'price_by' => 'required|in:pcs,sqm,length',
            'discount' => 'nullable|numeric|min:0|max:100',
            'promo_text' => 'nullable|string|max:255',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $jobType->update($validated);

        return redirect()->back()->with('success', 'Job type updated successfully!');
    }

    /**
     * Remove the specified job type.
     */
    public function destroy($id)
    {
        try {
            $jobType = JobType::findOrFail($id);
            $jobType->delete();
            return redirect()->back()->with('success', 'Job type deleted successfully!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to delete job type. Please try again.');
        }
    }
}
