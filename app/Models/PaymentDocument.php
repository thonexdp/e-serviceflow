<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Storage;

class PaymentDocument extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'payment_id',
        'uploaded_by',
        'original_name',
        'file_path',
        'mime_type',
        'file_size',
    ];

    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    
    protected function filePath(): Attribute
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
                    return Storage::url($value);
                } catch (\Exception $e) {
                    return "/storage/{$value}";
                }
            }
        );
    }
}
