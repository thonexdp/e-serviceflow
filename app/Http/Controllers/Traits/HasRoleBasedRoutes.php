<?php

namespace App\Http\Controllers\Traits;

use Illuminate\Support\Facades\Auth;

trait HasRoleBasedRoutes
{
    
    protected function roleRoute(string $routeName): string
    {
        $role = Auth::user()?->role;

        if (!$role) {
            return $routeName;
        }

        $rolePrefix = strtolower($role);

        
        $validRoles = ['admin', 'frontdesk', 'designer', 'production'];

        if (!in_array($rolePrefix, $validRoles)) {
            return $routeName;
        }

        return "{$rolePrefix}.{$routeName}";
    }

    
    protected function redirectToRoleRoute(string $routeName, $parameters = [], int $status = 302, array $headers = [])
    {
        return redirect()->route($this->roleRoute($routeName), $parameters, $status, $headers);
    }
}
