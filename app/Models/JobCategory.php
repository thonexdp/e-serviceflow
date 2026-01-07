<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Storage;

class JobCategory extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'image_path',
    ];


    protected function imagePath(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (!$value) {
                    return null;
                }

                // If it's already a full URL (legacy or external), return it
                if (filter_var($value, FILTER_VALIDATE_URL)) {
                    return $value;
                }

                // Clean the path (remove any accidentally saved prefixes)
                $cleanPath = ltrim($value, '/');
                $cleanPath = preg_replace('/^storage\//', '', $cleanPath);

                $isProd = app()->environment('production') || env('APP_ENV') === 'production';
                $disk = $isProd ? 's3' : 'public';

                try {
                    // This returns full URL for S3/Spaces and /storage/ path for public (local)
                    return Storage::disk($disk)->url($cleanPath);
                } catch (\Exception $e) {
                    // Fallback: If prod, don't guess a local path. If local, use standard storage.
                    return $isProd ? $value : "/storage/{$cleanPath}";
                }
            }
        );
    }

    public function jobTypes()
    {
        return $this->hasMany(JobType::class, 'category_id');
    }
}
