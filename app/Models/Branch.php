<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Branch extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'address',
        'phone',
        'email',
        'facebook',
        'business_hours',
        'can_accept_orders',
        'can_produce',
        'is_default_production',
        'is_active',
        'sort_order',
        'notes',
    ];

    protected $casts = [
        'can_accept_orders' => 'boolean',
        'can_produce' => 'boolean',
        'is_default_production' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
        'business_hours' => 'array',
    ];

    
    public function users()
    {
        return $this->hasMany(User::class);
    }

    
    public function orderedTickets()
    {
        return $this->hasMany(Ticket::class, 'order_branch_id');
    }

    
    public function productionTickets()
    {
        return $this->hasMany(Ticket::class, 'production_branch_id');
    }

    
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    
    public function scopeCanAcceptOrders($query)
    {
        return $query->where('can_accept_orders', true);
    }

    
    public function scopeCanProduce($query)
    {
        return $query->where('can_produce', true);
    }

    
    public static function getDefaultProductionBranch()
    {
        return static::where('is_default_production', true)
            ->where('is_active', true)
            ->first();
    }

    
    public function canHandleProduction(): bool
    {
        return $this->can_produce && $this->is_active;
    }

    
    public function canAcceptOrders(): bool
    {
        return $this->can_accept_orders && $this->is_active;
    }

    /**
     * Check if this branch can be safely deleted
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
        $users = $this->users()->count();
        $activeUsers = $this->users()->whereNull('deleted_at')->count();
        
        $orderedTickets = $this->orderedTickets()->count();
        $activeOrderedTickets = $this->orderedTickets()
            ->whereIn('status', ['pending', 'in_designer', 'ready_to_print', 'in_production'])
            ->count();
        
        $productionTickets = $this->productionTickets()->count();
        $activeProductionTickets = $this->productionTickets()
            ->whereIn('status', ['ready_to_print', 'in_production'])
            ->count();

        return [
            'users' => [
                'total' => $users,
                'active' => $activeUsers,
                'message' => $users > 0 ? "{$users} user(s) assigned to this branch" : null,
            ],
            'ordered_tickets' => [
                'total' => $orderedTickets,
                'active' => $activeOrderedTickets,
                'message' => $orderedTickets > 0 ? "{$orderedTickets} order(s) from this branch ({$activeOrderedTickets} active)" : null,
            ],
            'production_tickets' => [
                'total' => $productionTickets,
                'active' => $activeProductionTickets,
                'message' => $productionTickets > 0 ? "{$productionTickets} production ticket(s) ({$activeProductionTickets} active)" : null,
            ],
            'total_count' => $users + $orderedTickets + $productionTickets,
            'blocking_count' => $activeUsers + $activeOrderedTickets + $activeProductionTickets,
        ];
    }

    /**
     * Get warnings about deletion
     */
    private function getDeletionWarnings(): array
    {
        $warnings = [];

        $activeUsers = $this->users()->whereNull('deleted_at')->count();
        if ($activeUsers > 0) {
            $warnings[] = "Branch has {$activeUsers} active user(s). Cannot delete until all users are reassigned.";
        }

        $activeOrderedTickets = $this->orderedTickets()
            ->whereIn('status', ['pending', 'in_designer', 'ready_to_print', 'in_production'])
            ->count();
        if ($activeOrderedTickets > 0) {
            $warnings[] = "Branch has {$activeOrderedTickets} active order(s). Cannot delete until all orders are completed.";
        }

        $activeProductionTickets = $this->productionTickets()
            ->whereIn('status', ['ready_to_print', 'in_production'])
            ->count();
        if ($activeProductionTickets > 0) {
            $warnings[] = "Branch has {$activeProductionTickets} ticket(s) in production. Cannot delete until production is complete.";
        }

        if ($this->is_default_production) {
            $warnings[] = "This is the default production branch. Make another branch default before deleting.";
        }

        return $warnings;
    }
}
