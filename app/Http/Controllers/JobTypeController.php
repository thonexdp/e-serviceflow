<?php

namespace App\Http\Controllers;

use App\Models\JobType;
use App\Models\JobCategory;
use App\Models\UserActivityLog;
use App\Http\Requests\JobTypeRequest;
use App\Services\JobTypePricingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
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
            // Explicitly use 's3' in production, 'public' otherwise
            $disk = (app()->environment('production') || env('APP_ENV') === 'production') ? 's3' : 'public';

            // Verify S3 config in production
            if ($disk === 's3') {
                $s3Config = config('filesystems.disks.s3');
                Log::info('S3 Configuration Check', [
                    'disk' => $disk,
                    'bucket' => $s3Config['bucket'] ?? 'NOT SET',
                    'region' => $s3Config['region'] ?? 'NOT SET',
                    'endpoint' => $s3Config['endpoint'] ?? 'NOT SET',
                    'has_key' => !empty($s3Config['key']),
                    'has_secret' => !empty($s3Config['secret']),
                ]);
            }

            try {
                // For S3/DigitalOcean Spaces, explicitly set visibility to 'public'
                // Pass 'public' as string for visibility
                $path = $disk === 's3'
                    ? Storage::disk($disk)->put('job-types', $file, 'public')
                    : Storage::disk($disk)->put('job-types', $file);
                $validated['image_path'] = $path;

                // Verify file was actually saved
                try {
                    $exists = Storage::disk($disk)->exists($path);
                } catch (\Exception $existsException) {
                    // Some S3 services have issues with exists(), try reading instead
                    try {
                        $testContent = Storage::disk($disk)->get($path);
                        $exists = !empty($testContent);
                    } catch (\Exception $readException) {
                        $exists = false;
                    }
                }

                // Log for debugging in production
                if (app()->environment('production')) {
                    Log::info('JobType image uploaded', [
                        'disk' => $disk,
                        'path' => $path,
                        'bucket' => config('filesystems.disks.s3.bucket'),
                        'file_size' => $file->getSize(),
                        'file_exists' => $exists,
                        'url' => Storage::disk($disk)->url($path),
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('JobType image upload failed', [
                    'disk' => $disk,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'bucket' => config('filesystems.disks.s3.bucket'),
                    's3_config' => $disk === 's3' ? [
                        'bucket' => config('filesystems.disks.s3.bucket'),
                        'region' => config('filesystems.disks.s3.region'),
                        'endpoint' => config('filesystems.disks.s3.endpoint'),
                    ] : null,
                ]);
                throw $e;
            }
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
            // Explicitly use 's3' in production, 'public' otherwise
            $disk = (app()->environment('production') || env('APP_ENV') === 'production') ? 's3' : 'public';

            if ($jobType->getRawOriginal('image_path')) {
                try {
                    Storage::disk($disk)->delete($jobType->getRawOriginal('image_path'));
                } catch (\Exception $e) {
                    // Log but don't fail if old file doesn't exist
                    Log::warning('Failed to delete old job type image', [
                        'path' => $jobType->getRawOriginal('image_path'),
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            $file = $request->file('image');

            // Verify S3 config in production
            if ($disk === 's3') {
                $s3Config = config('filesystems.disks.s3');
                Log::info('S3 Configuration Check (Update)', [
                    'disk' => $disk,
                    'bucket' => $s3Config['bucket'] ?? 'NOT SET',
                    'region' => $s3Config['region'] ?? 'NOT SET',
                    'endpoint' => $s3Config['endpoint'] ?? 'NOT SET',
                    'has_key' => !empty($s3Config['key']),
                    'has_secret' => !empty($s3Config['secret']),
                ]);
            }

            try {
                // For S3/DigitalOcean Spaces, explicitly set visibility to 'public'
                // Pass 'public' as string for visibility
                $path = $disk === 's3'
                    ? Storage::disk($disk)->put('job-types', $file, 'public')
                    : Storage::disk($disk)->put('job-types', $file);
                $validated['image_path'] = $path;

                // Verify file was actually saved
                try {
                    $exists = Storage::disk($disk)->exists($path);
                } catch (\Exception $existsException) {
                    // Some S3 services have issues with exists(), try reading instead
                    try {
                        $testContent = Storage::disk($disk)->get($path);
                        $exists = !empty($testContent);
                    } catch (\Exception $readException) {
                        $exists = false;
                    }
                }

                // Log for debugging in production
                if (app()->environment('production')) {
                    Log::info('JobType image updated', [
                        'disk' => $disk,
                        'path' => $path,
                        'bucket' => config('filesystems.disks.s3.bucket'),
                        'file_size' => $file->getSize(),
                        'file_exists' => $exists,
                        'url' => Storage::disk($disk)->url($path),
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('JobType image update failed', [
                    'disk' => $disk,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'bucket' => config('filesystems.disks.s3.bucket'),
                    's3_config' => $disk === 's3' ? [
                        'bucket' => config('filesystems.disks.s3.bucket'),
                        'region' => config('filesystems.disks.s3.region'),
                        'endpoint' => config('filesystems.disks.s3.endpoint'),
                    ] : null,
                ]);
                throw $e;
            }
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

    /**
     * Check if job type can be deleted and get dependencies
     */
    public function checkDeletion(JobType $jobType)
    {
        $result = $jobType->canBeDeleted();
        return response()->json($result);
    }

    public function destroy(JobType $jobType)
    {
        // Check if can be deleted
        $check = $jobType->canBeDeleted();
        
        if (!$check['can_delete']) {
            return back()->with('error', 'Cannot delete job type. It has active dependencies.');
        }

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


    private function syncPromoRules(JobType $jobType, array $promoRules)
    {

        $jobType->promoRules()->delete();


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
