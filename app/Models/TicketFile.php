<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Storage;

class TicketFile extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_id',
        'file_name',
        'file_path',
        'type',
    ];

    
    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
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
}
