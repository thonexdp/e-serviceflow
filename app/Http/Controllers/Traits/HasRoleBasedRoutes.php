<?php

namespace App\Http\Controllers\Traits;

use Illuminate\Support\Facades\Auth;

trait HasRoleBasedRoutes
{
    /**
     * Get the route name with the current user's role prefix
     *
     * @param string $routeName The base route name (e.g., 'tickets.index')
     * @return string The role-prefixed route name (e.g., 'admin.tickets.index')
     */
    protected function roleRoute(string $routeName): string
    {
        $role = Auth::user()?->role;

        if (!$role) {
            return $routeName;
        }

        $rolePrefix = strtolower($role);

        // Valid roles that have route prefixes
        $validRoles = ['admin', 'frontdesk', 'designer', 'production'];

        if (!in_array($rolePrefix, $validRoles)) {
            return $routeName;
        }

        return "{$rolePrefix}.{$routeName}";
    }

    /**
     * Redirect to a role-based route
     *
     * @param string $routeName The base route name
     * @param mixed $parameters Route parameters
     * @param int $status HTTP status code
     * @param array $headers Additional headers
     * @return \Illuminate\Http\RedirectResponse
     */
    protected function redirectToRoleRoute(string $routeName, $parameters = [], int $status = 302, array $headers = [])
    {
        return redirect()->route($this->roleRoute($routeName), $parameters, $status, $headers);
    }
}
