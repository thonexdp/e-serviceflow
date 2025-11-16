<?php

namespace App\Http\Controllers;

use App\Models\JobCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class JobCategoryController extends Controller
{
    /**
     * Display a listing of job categories.
     */
    public function index(Request $request)
    {
        $categories = JobCategory::query()
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->latest()
            ->paginate(20);

        return Inertia::render('JobCategories', [
            'categories' => $categories,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Store a newly created job category.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:job_categories,name',
        ]);

        JobCategory::create($validated);

        return redirect()->back()->with('success', 'Job category created successfully!');
    }

    /**
     * Update the specified job category.
     */
    public function update(Request $request, $id)
    {
        $jobCategory = JobCategory::findOrFail($id);
        
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:job_categories,name,' . $jobCategory->id,
        ]);

        $jobCategory->update($validated);

        return redirect()->back()->with('success', 'Job category updated successfully!');
    }

    /**
     * Remove the specified job category.
     */
    public function destroy($id)
    {
        try {
            $jobCategory = JobCategory::findOrFail($id);
            
            // Check if category has job types
            if ($jobCategory->jobTypes()->count() > 0) {
                return redirect()->back()->with('error', 'Cannot delete category. It has associated job types.');
            }

            $jobCategory->delete();
            return redirect()->back()->with('success', 'Job category deleted successfully!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to delete job category. Please try again.');
        }
    }
}
