<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use App\Traits\HasWorkflowSteps;


class Ticket extends Model
{
    use HasFactory, SoftDeletes, HasWorkflowSteps;

    protected $fillable = [
        'ticket_number',
        'customer_id',
        'description',
        'job_type',
        'job_type_id',
        'quantity',
        'free_quantity',
        'produced_quantity',
        'size_value',
        'size_unit',
        'due_date',
        'total_amount',
        'subtotal',
        'discount',
        'downpayment',
        'payment_method',
        'status',
        'current_workflow_step',
        'assigned_to_user_id',
        'design_status',
        'design_notes',
        'payment_status',
        'file_path',
        'is_workflow_completed',
        'workflow_started_at',
        'workflow_completed_at',
    ];

    protected $casts = [
        'due_date' => 'date',
        'total_amount' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'discount' => 'decimal:2',
        'downpayment' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'quantity' => 'integer',
        'free_quantity' => 'integer',
        'produced_quantity' => 'integer',
    ];

    protected $appends = [
        'total_quantity',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($ticket) {
            if (empty($ticket->ticket_number)) {
                $ticket->ticket_number = static::generateTicketNumber();
            }
            $ticket->created_by = auth()->id();
        });

        static::updating(function ($ticket) {
            $ticket->updated_by = auth()->id();
        });
    }

    /**
     * Generate a unique ticket number.
     */
    protected static function generateTicketNumber(): string
    {
        do {
            $code = 'RC-' . strtoupper(Str::random(8));
        } while (static::where('ticket_number', $code)->exists());

        return $code;

        // $last = static::orderBy('id', 'desc')->first();
        // $num = $last ? $last->id + 1 : 1;

        // return 'RC-' . date('Y') . str_pad($num, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Get the customer that owns the ticket.
     */
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get the job type for the ticket.
     */
    public function jobType()
    {
        return $this->belongsTo(JobType::class, 'job_type_id');
    }

    /**
     * Get the files for the ticket.
     */
    public function files()
    {
        return $this->hasMany(TicketFile::class);
    }

    /**
     * Get customer files for the ticket.
     */
    public function customerFiles()
    {
        return $this->hasMany(TicketFile::class)->where('type', 'customer');
    }

    /**
     * Get mockup files for the ticket.
     */
    public function mockupFiles()
    {
        return $this->hasMany(TicketFile::class)->where('type', 'mockup');
    }

    /**
     * Payments recorded for this ticket.
     */
    public function payments()
    {
        return $this->hasMany(Payment::class)->orderByDesc('payment_date');
    }

    /**
     * Outstanding balance accessor.
     */
    public function getOutstandingBalanceAttribute(): float
    {
        $total = (float)($this->total_amount ?? 0);
        $paid = (float)($this->amount_paid ?? 0);

        return max($total - $paid, 0);
    }

    /**
     * Sync amount_paid and payment_status with recorded payments.
     */
    public function refreshPaymentSummary(): void
    {
        if (!$this->exists) {
            return;
        }

        $paid = (float)$this->payments()->where('status', 'posted')->sum('amount');
        $total = (float)($this->total_amount ?? 0);

        $status = 'pending';
        if ($total <= 0 && $paid > 0) {
            $status = 'paid';
        } elseif ($paid >= $total && $total > 0) {
            $status = 'paid';
        } elseif ($paid > 0 && $paid < $total) {
            $status = 'partial';
        }

        $this->forceFill([
            'amount_paid' => round($paid, 2),
            'payment_status' => $status,
        ])->saveQuietly();
    }

    /**
     * Get the full size attribute.
     */
    public function getFullSizeAttribute(): ?string
    {
        if ($this->size_value && $this->size_unit) {
            return "{$this->size_value} {$this->size_unit}";
        }
        return null;
    }

    /**
     * Get production stock consumptions for this ticket.
     */
    public function stockConsumptions()
    {
        return $this->hasMany(ProductionStockConsumption::class);
    }

    /**
     * Get workflow progress records for this ticket.
     */
    public function workflowProgress()
    {
        return $this->hasMany(TicketWorkflowProgress::class);
    }

    /**
     * Get the user assigned to this ticket (legacy single assignment).
     */
    public function assignedToUser()
    {
        return $this->belongsTo(User::class, 'assigned_to_user_id');
    }

    /**
     * Get all users assigned to this ticket for production (many-to-many).
     */
    public function assignedUsers()
    {
        return $this->belongsToMany(User::class, 'ticket_production_assignments')
            ->withPivot('workflow_step')
            ->withTimestamps();
    }

    /**
     * Get production records for this ticket.
     */
    public function productionRecords()
    {
        return $this->hasMany(ProductionRecord::class);
    }

    /**
     * Get workflow evidence files for this ticket.
     */
    public function evidenceFiles()
    {
        return $this->hasMany(WorkflowEvidence::class, 'ticket_id');
    }

    /**
     * Parse size_value to extract width and height.
     * 
     * @return array{width: float|null, height: float|null}
     */
    public function parseSizeDimensions(): array
    {
        if (!$this->size_value) {
            return ['width' => null, 'height' => null];
        }

        // Parse "width x height" format (e.g., "10 x 20" or "10x20")
        $parts = preg_split('/\s*x\s*/i', $this->size_value);

        if (count($parts) >= 2) {
            $width = (float) preg_replace('/[^\d.]/', '', $parts[0]);
            $height = (float) preg_replace('/[^\d.]/', '', $parts[1]);
            return [
                'width' => $width > 0 ? $width : null,
                'height' => $height > 0 ? $height : null,
            ];
        }

        // Try to parse single value (for length-based)
        $singleValue = (float) preg_replace('/[^\d.]/', '', $this->size_value);
        if ($singleValue > 0) {
            return ['width' => $singleValue, 'height' => null];
        }

        return ['width' => null, 'height' => null];
    }

    public function calculateTotalArea(): ?float
    {
        $dimensions = $this->parseSizeDimensions();

        if (!$dimensions['width'] || !$dimensions['height']) {
            return null;
        }

        $width = $dimensions['width'];
        $height = $dimensions['height'];

        $areaPerPiece = $width * $height;  #Calculate area per piece

        // Convert to square meters if needed (assuming size_unit might indicate the unit)
        // For now, assume dimensions are already in meters if size_unit contains 'm' or 'sqm'
        // Otherwise, assume they're in the same unit and calculate directly
        if ($this->size_unit && (stripos($this->size_unit, 'sqm') !== false || stripos($this->size_unit, 'm²') !== false)) {
            return $areaPerPiece * $this->quantity;  # Already in square meters
        } elseif ($this->size_unit && stripos($this->size_unit, 'cm') !== false) {
            return ($areaPerPiece / 10000) * $this->quantity; #Convert from cm² to m²
        } elseif ($this->size_unit && stripos($this->size_unit, 'mm') !== false) {
            return ($areaPerPiece / 1000000) * $this->quantity;  # Convert from mm² to m²
        } else {
            return $areaPerPiece * $this->quantity;
        }
    }

    public function calculateTotalLength(): ?float
    {
        $dimensions = $this->parseSizeDimensions();

        if (!$dimensions['width']) {
            return null;
        }

        $length = $dimensions['width'];

        if ($this->size_unit && stripos($this->size_unit, 'cm') !== false) {
            return ($length / 100) * $this->quantity;
        } elseif ($this->size_unit && stripos($this->size_unit, 'mm') !== false) {
            return ($length / 1000) * $this->quantity;
        } else {
            return $length * $this->quantity;
        }
    }


    public function getTotalQuantityAttribute(): int
    {
        return (int)($this->quantity ?? 0) + (int)($this->free_quantity ?? 0);
    }

    /**
     * Check if a user can edit this ticket based on workflow permissions.
     * 
     * @param User|null $user The user to check (defaults to current auth user)
     * @return bool
     */
    public function canUserEdit(?User $user = null): bool
    {
        // Default to current authenticated user
        if (!$user) {
            $user = auth()->user();
        }

        if (!$user) {
            return false;
        }

        // Admin can always edit
        if ($user->isAdmin()) {
            return true;
        }

        // FrontDesk can edit tickets in certain statuses
        if ($user->isFrontDesk()) {
            return in_array($this->status, ['pending', 'ready_to_print', 'in_designer']);
        }

        // Designer can edit tickets in designer status
        if ($user->isDesigner()) {
            return $this->status === 'in_designer';
        }

        // Production users can only edit if ticket is in their assigned workflow step
        if ($user->isProduction()) {
            // For ready_to_print tickets, check if user is assigned to first workflow step
            if ($this->status === 'ready_to_print') {
                $firstStep = $this->getFirstWorkflowStep();
                return $firstStep && $user->isAssignedToWorkflowStep($firstStep);
            }

            // For in_production tickets, check if current workflow step matches user's assignment
            if ($this->status === 'in_production' && $this->current_workflow_step) {
                return $user->isAssignedToWorkflowStep($this->current_workflow_step);
            }

            return false;
        }

        return false;
    }

    /**
     * Get the user-friendly label for the current workflow step.
     * 
     * @return string|null
     */
    public function getCurrentWorkflowStepLabel(): ?string
    {
        if (!$this->current_workflow_step) {
            return null;
        }

        return ucfirst(str_replace('_', ' ', $this->current_workflow_step));
    }
}
