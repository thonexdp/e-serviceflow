<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Storage;

class Setting extends Model
{
    use HasFactory;

    protected $fillable = ['key', 'value', 'type'];

    /**
     * Get the full URL for image value paths.
     * This ensures images are accessible from Cloud Storage (GCS) or local storage.
     */
    protected function value(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                // Only process image types
                if ($this->type !== 'image' || !$value) {
                    return $value;
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

    /**
     * Get a setting value by key with optional default
     */
    public static function get($key, $default = null)
    {
        $setting = self::where('key', $key)->first();

        if (!$setting) {
            return $default;
        }

        // Parse JSON values - use raw value for JSON decoding
        if ($setting->type === 'json') {
            $rawValue = $setting->getRawOriginal('value');
            return json_decode($rawValue, true) ?? $default;
        }

        // For image types, the Attribute accessor will handle URL generation
        if ($setting->type === 'image') {
            return $setting->value ?? $default;
        }

        return $setting->value ?? $default;
    }

    /**
     * Set a setting value
     */
    public static function set($key, $value, $type = 'string')
    {
        // Handle JSON encoding
        if ($type === 'json' && is_array($value)) {
            $value = json_encode($value);
        }

        return self::updateOrCreate(
            ['key' => $key],
            ['value' => $value, 'type' => $type]
        );
    }

    /**
     * Get all settings as an associative array
     */
    public static function getAll()
    {
        $settings = self::all();
        $result = [];

        foreach ($settings as $setting) {
            if ($setting->type === 'json') {
                // Use raw value for JSON decoding
                $rawValue = $setting->getRawOriginal('value');
                $result[$setting->key] = json_decode($rawValue, true);
            } elseif ($setting->type === 'image') {
                // The Attribute accessor will handle URL generation
                $result[$setting->key] = $setting->value;
            } else {
                $result[$setting->key] = $setting->value;
            }
        }

        return $result;
    }
}
