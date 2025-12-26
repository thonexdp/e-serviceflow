<?php

namespace App\Models;


use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Notifications\CustomResetPasswordNotification;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_active',
        'is_head',
        'can_only_print',
        'branch_id',
    ];

    
    protected $hidden = [
        'password',
        'remember_token',
    ];

    
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_active' => 'boolean',
        'is_head' => 'boolean',
        'can_only_print' => 'boolean',
    ];

    
    const ROLE_ADMIN = 'admin';
    const ROLE_FRONTDESK = 'FrontDesk';
    const ROLE_DESIGNER = 'Designer';
    const ROLE_PRODUCTION = 'Production';
    const ROLE_CASHIER = 'Cashier';

    
    public function sendPasswordResetNotification($token)
    {
        $this->notify(new CustomResetPasswordNotification($token));
    }

    
    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    
    public function isAdmin(): bool
    {
        return $this->hasRole(self::ROLE_ADMIN);
    }

    
    public function isFrontDesk(): bool
    {
        return $this->hasRole(self::ROLE_FRONTDESK);
    }

    
    public function isDesigner(): bool
    {
        return $this->hasRole(self::ROLE_DESIGNER);
    }

    
    public function isProduction(): bool
    {
        return $this->hasRole(self::ROLE_PRODUCTION);
    }

    
    public function isCashier(): bool
    {
        return $this->hasRole(self::ROLE_CASHIER);
    }

    
    public function isProductionHead(): bool
    {
        return $this->isProduction() && $this->is_head === true;
    }

    
    public function notifications()
    {
        return $this->hasMany(\App\Models\Notification::class);
    }

    
    public function unreadNotifications()
    {
        return $this->hasMany(\App\Models\Notification::class)->where('read', false);
    }

    
    public function permissions()
    {
        return $this->belongsToMany(Permission::class, 'user_permissions')
            ->withPivot('granted')
            ->withTimestamps();
    }

    
    public function hasPermission(string $module, string $feature): bool
    {
        
        if ($this->isAdmin()) {
            return true;
        }

        
        return $this->permissions()
            ->where('module', $module)
            ->where('feature', $feature)
            ->wherePivot('granted', true)
            ->exists();
    }

    
    public function grantPermission($permissionId, $granted = true)
    {
        $this->permissions()->syncWithoutDetaching([
            $permissionId => ['granted' => $granted]
        ]);
    }

    
    public function revokePermission($permissionId)
    {
        $this->permissions()->detach($permissionId);
    }

    
    public function syncPermissions(array $permissions)
    {
        $sync = [];
        foreach ($permissions as $permissionId => $granted) {
            $sync[$permissionId] = ['granted' => $granted];
        }
        $this->permissions()->sync($sync);
    }

    
    public function workflowSteps()
    {
        return $this->hasMany(\App\Models\UserWorkflowStep::class);
    }

    
    public function getAssignedWorkflowSteps(): array
    {
        return $this->workflowSteps()->pluck('workflow_step')->toArray();
    }

    
    public function isAssignedToWorkflowStep(string $workflowStep): bool
    {
        
        if ($this->isAdmin()) {
            return true;
        }

        
        if (!$this->isProduction() && !$this->is_head) {
            return true;
        }

        
        return $this->workflowSteps()->where('workflow_step', $workflowStep)->exists();
    }

    
    public function syncWorkflowSteps(array $workflowSteps)
    {
        
        if (!$this->isProduction() && !$this->is_head) {
            return;
        }

        
        $this->workflowSteps()->delete();

        
        foreach ($workflowSteps as $step) {
            $this->workflowSteps()->create([
                'workflow_step' => $step,
            ]);
        }
    }

    
    public function activityLogs()
    {
        return $this->hasMany(UserActivityLog::class)->orderBy('created_at', 'desc');
    }

    
    public static function getUsersAssignedToWorkflowStep(string $workflowStep): \Illuminate\Database\Eloquent\Collection
    {
        return self::whereHas('workflowSteps', function ($query) use ($workflowStep) {
            $query->where('workflow_step', $workflowStep);
        })->where('is_active', true)->get();
    }

    
    public function assignedTickets()
    {
        return $this->belongsToMany(Ticket::class, 'ticket_production_assignments')
            ->withPivot('workflow_step')
            ->withTimestamps();
    }

    
    public function productionRecords()
    {
        return $this->hasMany(ProductionRecord::class);
    }

    
    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
