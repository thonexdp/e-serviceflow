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
    ];

    /**
     * Get users assigned to this branch.
     */
    public function users()
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get tickets where this branch accepted the order.
     */
    public function orderedTickets()
    {
        return $this->hasMany(Ticket::class, 'order_branch_id');
    }

    /**
     * Get tickets where this branch is responsible for production.
     */
    public function productionTickets()
    {
        return $this->hasMany(Ticket::class, 'production_branch_id');
    }

    /**
     * Scope to get only active branches.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get branches that can accept orders.
     */
    public function scopeCanAcceptOrders($query)
    {
        return $query->where('can_accept_orders', true);
    }

    /**
     * Scope to get branches that can produce.
     */
    public function scopeCanProduce($query)
    {
        return $query->where('can_produce', true);
    }

    /**
     * Get the default production branch.
     */
    public static function getDefaultProductionBranch()
    {
        return static::where('is_default_production', true)
            ->where('is_active', true)
            ->first();
    }

    /**
     * Check if this branch can handle production.
     */
    public function canHandleProduction(): bool
    {
        return $this->can_produce && $this->is_active;
    }

    /**
     * Check if this branch can accept orders.
     */
    public function canAcceptOrders(): bool
    {
        return $this->can_accept_orders && $this->is_active;
    }
}
