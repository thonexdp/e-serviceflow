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

    /**
     * Get the ticket that owns the file.
     */
    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
    }

    /**
     * Get the full URL for the file path.
     * This ensures files are accessible from Cloud Storage.
     */
    protected function filePath(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (!$value) {
                    return null;
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
}
