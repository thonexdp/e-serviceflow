<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'firstname',
        'lastname',
        'phone',
        'normalized_phone',
        'email',
        'facebook',
        'address',
    ];

    protected $appends = ['full_name'];

    
    public function getFullNameAttribute(): string
    {
        return "{$this->firstname} {$this->lastname}";
    }

    /**
     * Normalize phone number to consistent format (639XXXXXXXXX)
     */
    public static function normalizePhone(?string $phone): ?string
    {
        if (!$phone) {
            return null;
        }

        // Remove all non-digit characters
        $cleaned = preg_replace('/\D/', '', $phone);

        // Convert to 639XXXXXXXXX format
        if (str_starts_with($cleaned, '0') && strlen($cleaned) === 11) {
            // 09XX XXX XXXX -> 639XXXXXXXXX
            $cleaned = '63' . substr($cleaned, 1);
        } elseif (str_starts_with($cleaned, '9') && strlen($cleaned) === 10) {
            // 9XX XXX XXXX -> 639XXXXXXXXX
            $cleaned = '63' . $cleaned;
        }

        return $cleaned;
    }

    
    public function tickets()
    {
        return $this->hasMany(Ticket::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }
}















