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

    /**
     * Check if this customer can be safely deleted
     */
    public function canBeDeleted(): array
    {
        $dependencies = $this->getDeletionDependencies();
        
        return [
            'can_delete' => $dependencies['blocking_count'] === 0,
            'dependencies' => $dependencies,
            'warnings' => $this->getDeletionWarnings(),
        ];
    }

    /**
     * Get all dependencies that prevent deletion
     */
    public function getDeletionDependencies(): array
    {
        $totalTickets = $this->tickets()->count();
        $activeTickets = $this->tickets()
            ->whereIn('status', ['pending', 'in_designer', 'ready_to_print', 'in_production'])
            ->count();
        $completedTickets = $this->tickets()
            ->where('status', 'completed')
            ->count();
        
        $totalPayments = $this->payments()->count();
        $postedPayments = $this->payments()->where('status', 'posted')->count();
        $totalPaid = $this->payments()->where('status', 'posted')->sum('amount');

        return [
            'tickets' => [
                'total' => $totalTickets,
                'active' => $activeTickets,
                'completed' => $completedTickets,
                'message' => $totalTickets > 0 ? "{$totalTickets} ticket(s) on record ({$activeTickets} active)" : null,
            ],
            'payments' => [
                'total' => $totalPayments,
                'posted' => $postedPayments,
                'total_amount' => $totalPaid,
                'message' => $postedPayments > 0 ? "{$postedPayments} payment(s) recorded (₱" . number_format($totalPaid, 2) . ")" : null,
            ],
            'total_count' => $totalTickets + $totalPayments,
            'blocking_count' => $activeTickets,
        ];
    }

    /**
     * Get warnings about deletion
     */
    private function getDeletionWarnings(): array
    {
        $warnings = [];

        $activeTickets = $this->tickets()
            ->whereIn('status', ['pending', 'in_designer', 'ready_to_print', 'in_production'])
            ->count();

        if ($activeTickets > 0) {
            $warnings[] = "Customer has {$activeTickets} active ticket(s). Cannot delete until all tickets are completed or cancelled.";
        }

        $completedTickets = $this->tickets()->where('status', 'completed')->count();
        if ($completedTickets > 0) {
            $warnings[] = "Customer has {$completedTickets} completed ticket(s). Deleting will remove order history.";
        }

        $postedPayments = $this->payments()->where('status', 'posted')->count();
        if ($postedPayments > 0) {
            $warnings[] = "Customer has {$postedPayments} posted payment(s). Deleting will affect financial records.";
        }

        return $warnings;
    }
}















