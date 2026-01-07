<?php

namespace App\Http\Controllers;

use App\Models\JobCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class JobCategoryController extends Controller
{

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


    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:job_categories,name',
            'image' => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $disk = (app()->environment('production') || env('APP_ENV') === 'production') ? 's3' : 'public';

            $path = $disk === 's3'
                ? Storage::disk($disk)->put('job-categories', $file, 'public')
                : Storage::disk($disk)->put('job-categories', $file);

            $validated['image_path'] = $path;
        }

        JobCategory::create($validated);

        return redirect()->back()->with('success', 'Job category created successfully!');
    }


    public function update(Request $request, $id)
    {
        $jobCategory = JobCategory::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:job_categories,name,' . $jobCategory->id,
            'image' => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('image')) {
            $disk = (app()->environment('production') || env('APP_ENV') === 'production') ? 's3' : 'public';

            // Delete old image if exists
            if ($jobCategory->getRawOriginal('image_path')) {
                try {
                    Storage::disk($disk)->delete($jobCategory->getRawOriginal('image_path'));
                } catch (\Exception $e) {
                    Log::warning('Failed to delete old job category image', [
                        'path' => $jobCategory->getRawOriginal('image_path'),
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            $file = $request->file('image');
            $path = $disk === 's3'
                ? Storage::disk($disk)->put('job-categories', $file, 'public')
                : Storage::disk($disk)->put('job-categories', $file);

            $validated['image_path'] = $path;
        }

        $jobCategory->update($validated);

        return redirect()->back()->with('success', 'Job category updated successfully!');
    }


    public function destroy($id)
    {
        try {
            $jobCategory = JobCategory::findOrFail($id);


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
