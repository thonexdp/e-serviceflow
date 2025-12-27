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

    
    protected function value(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                
                if ($this->type !== 'image' || !$value) {
                    return $value;
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

    
    public static function get($key, $default = null)
    {
        $setting = self::where('key', $key)->first();

        if (!$setting) {
            return $default;
        }

        
        if ($setting->type === 'json') {
            $rawValue = $setting->getRawOriginal('value');
            return json_decode($rawValue, true) ?? $default;
        }

        
        if ($setting->type === 'image') {
            return $setting->value ?? $default;
        }

        return $setting->value ?? $default;
    }

    
    public static function set($key, $value, $type = 'string')
    {
        
        if ($type === 'json' && is_array($value)) {
            $value = json_encode($value);
        }

        return self::updateOrCreate(
            ['key' => $key],
            ['value' => $value, 'type' => $type]
        );
    }

    
    public static function getAll()
    {
        $settings = self::all();
        $result = [];

        foreach ($settings as $setting) {
            if ($setting->type === 'json') {
                
                $rawValue = $setting->getRawOriginal('value');
                $result[$setting->key] = json_decode($rawValue, true);
            } elseif ($setting->type === 'image') {
                
                $result[$setting->key] = $setting->value;
            } else {
                $result[$setting->key] = $setting->value;
            }
        }

        return $result;
    }
}
