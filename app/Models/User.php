<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Notifications\CustomResetPasswordNotification;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_active',
        'is_head',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_active' => 'boolean',
        'is_head' => 'boolean',
    ];

    /**
     * User role constants
     */
    const ROLE_ADMIN = 'admin';
    const ROLE_FRONTDESK = 'FrontDesk';
    const ROLE_DESIGNER = 'Designer';
    const ROLE_PRODUCTION = 'Production';

    /**
     * Send the password reset notification.
     *
     * @param  string  $token
     * @return void
     */
    public function sendPasswordResetNotification($token)
    {
        $this->notify(new CustomResetPasswordNotification($token));
    }

    /**
     * Check if user has a specific role
     */
    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    /**
     * Check if user is admin
     */
    public function isAdmin(): bool
    {
        return $this->hasRole(self::ROLE_ADMIN);
    }

    /**
     * Check if user is FrontDesk
     */
    public function isFrontDesk(): bool
    {
        return $this->hasRole(self::ROLE_FRONTDESK);
    }

    /**
     * Check if user is Designer
     */
    public function isDesigner(): bool
    {
        return $this->hasRole(self::ROLE_DESIGNER);
    }

    /**
     * Check if user is Production
     */
    public function isProduction(): bool
    {
        return $this->hasRole(self::ROLE_PRODUCTION);
    }

    /**
     * Get all notifications for the user.
     */
    public function notifications()
    {
        return $this->hasMany(\App\Models\Notification::class);
    }

    /**
     * Get unread notifications for the user.
     */
    public function unreadNotifications()
    {
        return $this->hasMany(\App\Models\Notification::class)->where('read', false);
    }

    /**
     * Get the permissions for the user.
     */
    public function permissions()
    {
        return $this->belongsToMany(Permission::class, 'user_permissions')
            ->withPivot('granted')
            ->withTimestamps();
    }

    /**
     * Check if user has a specific permission
     * 
     * @param string $module The module name (e.g., 'tickets', 'customers')
     * @param string $feature The feature name (e.g., 'read', 'create', 'update', 'delete', 'price_edit')
     * @return bool
     */
    public function hasPermission(string $module, string $feature): bool
    {
        // Admin has all permissions
        if ($this->isAdmin()) {
            return true;
        }

        // Check if user has the specific permission
        return $this->permissions()
            ->where('module', $module)
            ->where('feature', $feature)
            ->wherePivot('granted', true)
            ->exists();
    }

    /**
     * Grant a permission to the user
     */
    public function grantPermission($permissionId, $granted = true)
    {
        $this->permissions()->syncWithoutDetaching([
            $permissionId => ['granted' => $granted]
        ]);
    }

    /**
     * Revoke a permission from the user
     */
    public function revokePermission($permissionId)
    {
        $this->permissions()->detach($permissionId);
    }

    /**
     * Sync user permissions
     * 
     * @param array $permissions Array of permission IDs with granted status
     */
    public function syncPermissions(array $permissions)
    {
        $sync = [];
        foreach ($permissions as $permissionId => $granted) {
            $sync[$permissionId] = ['granted' => $granted];
        }
        $this->permissions()->sync($sync);
    }

    /**
     * Get workflow steps assigned to this user (for Production users)
     */
    public function workflowSteps()
    {
        return $this->hasMany(\App\Models\UserWorkflowStep::class);
    }

    /**
     * Get list of workflow step names assigned to this user
     * 
     * @return array
     */
    public function getAssignedWorkflowSteps(): array
    {
        return $this->workflowSteps()->pluck('workflow_step')->toArray();
    }

    /**
     * Check if user is assigned to a specific workflow step
     * 
     * @param string $workflowStep
     * @return bool
     */
    public function isAssignedToWorkflowStep(string $workflowStep): bool
    {
        // Admin and non-production users can see all tickets
        if (!$this->isProduction() || $this->isAdmin()) {
            return true;
        }

        return $this->workflowSteps()->where('workflow_step', $workflowStep)->exists();
    }

    /**
     * Sync workflow steps for production users
     * 
     * @param array $workflowSteps Array of workflow step names
     */
    public function syncWorkflowSteps(array $workflowSteps)
    {
        // Only sync for production users
        if (!$this->isProduction()) {
            return;
        }

        // Delete existing assignments
        $this->workflowSteps()->delete();

        // Create new assignments
        foreach ($workflowSteps as $step) {
            $this->workflowSteps()->create([
                'workflow_step' => $step,
            ]);
        }
    }

    /**
     * Get activity logs for this user
     */
    public function activityLogs()
    {
        return $this->hasMany(UserActivityLog::class)->orderBy('created_at', 'desc');
    }

    /**
     * Get all users assigned to a specific workflow step
     */
    public static function getUsersAssignedToWorkflowStep(string $workflowStep): \Illuminate\Database\Eloquent\Collection
    {
        return self::whereHas('workflowSteps', function ($query) use ($workflowStep) {
            $query->where('workflow_step', $workflowStep);
        })->where('is_active', true)->get();
    }
}
