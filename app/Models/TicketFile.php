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
        'filename',
        'filepath',
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
            get: fn($value) => $value ? Storage::url($value) : null
        );
    }
}
