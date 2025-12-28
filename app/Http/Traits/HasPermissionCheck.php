<?php

namespace App\Http\Traits;

trait HasPermissionCheck
{
    
    protected function userCan(string $module, string $feature): bool
    {
        $user = auth()->user();

        if (!$user) {
            return false;
        }

        return $user->hasPermission($module, $feature);
    }

    
    protected function authorizePermission(string $module, string $feature, ?string $message = null): void
    {
        if (!$this->userCan($module, $feature)) {
            abort(403, $message ?? "You don't have permission to {$feature} {$module}.");
        }
    }

    
    protected function canRead(string $module): bool
    {
        return $this->userCan($module, 'read');
    }

    
    protected function canCreate(string $module): bool
    {
        return $this->userCan($module, 'create');
    }

    
    protected function canUpdate(string $module): bool
    {
        return $this->userCan($module, 'update');
    }

    
    protected function canDelete(string $module): bool
    {
        return $this->userCan($module, 'delete');
    }

    
    protected function canEditPrice(string $module): bool
    {
        return $this->userCan($module, 'price_edit');
    }
}
