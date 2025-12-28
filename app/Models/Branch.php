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
}
