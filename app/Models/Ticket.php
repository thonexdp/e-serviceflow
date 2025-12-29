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
        'order_branch_id',
        'production_branch_id',
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


    protected static function boot()
    {
        parent::boot();

        static::creating(function ($ticket) {
            if (empty($ticket->ticket_number)) {
                $ticket->ticket_number = static::generateTicketNumber();
            }
            $ticket->created_by = auth()->id();


            if (auth()->user() && auth()->user()->branch_id) {
                $userBranch = auth()->user()->branch;


                if (!$ticket->order_branch_id) {
                    $ticket->order_branch_id = $userBranch->id;
                }


                if (!$ticket->production_branch_id) {
                    if ($userBranch->can_produce) {

                        $ticket->production_branch_id = $userBranch->id;
                    } else {

                        $defaultProductionBranch = \App\Models\Branch::getDefaultProductionBranch();
                        if ($defaultProductionBranch) {
                            $ticket->production_branch_id = $defaultProductionBranch->id;
                        }
                    }
                }
            }
        });

        static::updating(function ($ticket) {
            $ticket->updated_by = auth()->id();
        });
    }


    protected static function generateTicketNumber(): string
    {
        do {
            $code = 'RC-' . now()->year . '-' . strtoupper(Str::random(4));
        } while (static::where('ticket_number', $code)->exists());

        return $code;
    }


    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }


    public function jobType()
    {
        return $this->belongsTo(JobType::class, 'job_type_id');
    }


    public function files()
    {
        return $this->hasMany(TicketFile::class);
    }


    public function customerFiles()
    {
        return $this->hasMany(TicketFile::class)->where('type', 'customer');
    }


    public function mockupFiles()
    {
        return $this->hasMany(TicketFile::class)->where('type', 'mockup');
    }


    public function payments()
    {
        return $this->hasMany(Payment::class)->orderByDesc('payment_date');
    }


    public function getOutstandingBalanceAttribute(): float
    {
        $total = (float)($this->total_amount ?? 0);
        $paid = (float)($this->amount_paid ?? 0);

        return max($total - $paid, 0);
    }


    public function refreshPaymentSummary(): void
    {
        if (!$this->exists) {
            return;
        }



        if ($this->payment_status === 'awaiting_verification') {

            $paid = (float)$this->payments()->where('status', 'posted')->sum('amount');
            $this->forceFill([
                'amount_paid' => round($paid, 2),
            ])->saveQuietly();
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


    public function getFullSizeAttribute(): ?string
    {
        if ($this->size_value && $this->size_unit) {
            return "{$this->size_value} {$this->size_unit}";
        }
        return null;
    }


    public function stockConsumptions()
    {
        return $this->hasMany(ProductionStockConsumption::class);
    }


    public function workflowProgress()
    {
        return $this->hasMany(TicketWorkflowProgress::class);
    }


    public function assignedToUser()
    {
        return $this->belongsTo(User::class, 'assigned_to_user_id');
    }

    public function updatedByUser()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }


    public function assignedUsers()
    {
        return $this->belongsToMany(User::class, 'ticket_production_assignments')
            ->withPivot('workflow_step')
            ->withTimestamps();
    }


    public function productionRecords()
    {
        return $this->hasMany(ProductionRecord::class);
    }


    public function evidenceFiles()
    {
        return $this->hasMany(WorkflowEvidence::class, 'ticket_id');
    }


    public function parseSizeDimensions(): array
    {
        if (!$this->size_value) {
            return ['width' => null, 'height' => null];
        }


        $parts = preg_split('/\s*x\s*/i', $this->size_value);

        if (count($parts) >= 2) {
            $width = (float) preg_replace('/[^\d.]/', '', $parts[0]);
            $height = (float) preg_replace('/[^\d.]/', '', $parts[1]);
            return [
                'width' => $width > 0 ? $width : null,
                'height' => $height > 0 ? $height : null,
            ];
        }


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


    public function canUserEdit(?User $user = null): bool
    {

        if (!$user) {
            $user = auth()->user();
        }

        if (!$user) {
            return false;
        }


        if ($user->isAdmin()) {
            return true;
        }


        if ($user->isFrontDesk()) {
            return in_array($this->status, ['pending', 'ready_to_print', 'in_designer']);
        }


        if ($user->isDesigner()) {
            return $this->status === 'in_designer';
        }


        if ($user->isProduction()) {

            if ($this->status === 'ready_to_print') {
                $firstStep = $this->getFirstWorkflowStep();
                return $firstStep && $user->isAssignedToWorkflowStep($firstStep);
            }


            if ($this->status === 'in_production' && $this->current_workflow_step) {
                return $user->isAssignedToWorkflowStep($this->current_workflow_step);
            }

            return false;
        }

        return false;
    }


    public function getCurrentWorkflowStepLabel(): ?string
    {
        if (!$this->current_workflow_step) {
            return null;
        }

        return ucfirst(str_replace('_', ' ', $this->current_workflow_step));
    }


    public function orderBranch()
    {
        return $this->belongsTo(Branch::class, 'order_branch_id');
    }


    public function productionBranch()
    {
        return $this->belongsTo(Branch::class, 'production_branch_id');
    }


    public function canUserViewByBranch(?User $user = null): bool
    {

        if (!$user) {
            $user = auth()->user();
        }

        if (!$user) {
            return false;
        }


        if ($user->isAdmin()) {
            return true;
        }


        if (!$user->branch_id) {
            return false;
        }


        if ($user->isFrontDesk() || $user->isCashier()) {
            return $this->order_branch_id === $user->branch_id;
        }


        if ($user->isProduction()) {
            return $this->production_branch_id === $user->branch_id;
        }


        if ($user->isDesigner()) {
            return true;
        }

        return false;
    }


    public function canUserEditByBranch(?User $user = null): bool
    {

        if (!$user) {
            $user = auth()->user();
        }

        if (!$user) {
            return false;
        }


        if ($user->isAdmin()) {
            return true;
        }


        if (!$user->branch_id) {
            return false;
        }


        if ($user->isFrontDesk() || $user->isCashier()) {
            return $this->order_branch_id === $user->branch_id;
        }


        if ($user->isProduction()) {
            return $this->production_branch_id === $user->branch_id;
        }

        return false;
    }
}
