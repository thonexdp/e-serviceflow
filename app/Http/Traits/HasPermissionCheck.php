<?php

namespace App\Http\Traits;

trait HasPermissionCheck
{
    /**
     * Check if the current user has permission for a specific module and feature
     *
     * @param string $module
     * @param string $feature
     * @return bool
     */
    protected function userCan(string $module, string $feature): bool
    {
        $user = auth()->user();

        if (!$user) {
            return false;
        }

        return $user->hasPermission($module, $feature);
    }

    /**
     * Authorize the user has permission or abort with 403
     *
     * @param string $module
     * @param string $feature
     * @param string|null $message
     * @return void
     */
    protected function authorizePermission(string $module, string $feature, ?string $message = null): void
    {
        if (!$this->userCan($module, $feature)) {
            abort(403, $message ?? "You don't have permission to {$feature} {$module}.");
        }
    }

    /**
     * Check if user can read/view a module
     */
    protected function canRead(string $module): bool
    {
        return $this->userCan($module, 'read');
    }

    /**
     * Check if user can create in a module
     */
    protected function canCreate(string $module): bool
    {
        return $this->userCan($module, 'create');
    }

    /**
     * Check if user can update in a module
     */
    protected function canUpdate(string $module): bool
    {
        return $this->userCan($module, 'update');
    }

    /**
     * Check if user can delete in a module
     */
    protected function canDelete(string $module): bool
    {
        return $this->userCan($module, 'delete');
    }

    /**
     * Check if user can edit prices in a module
     */
    protected function canEditPrice(string $module): bool
    {
        return $this->userCan($module, 'price_edit');
    }
}
