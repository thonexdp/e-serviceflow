<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $module, string $feature): Response
    {
        $user = $request->user();

        if (!$user) {
            return redirect()->route('login');
        }

        // Admin bypass - admins have all permissions
        if ($user->isAdmin()) {
            return $next($request);
        }

        // Check if user has the required permission
        if (!$user->hasPermission($module, $feature)) {
            abort(403, 'You do not have permission to perform this action.');
        }

        return $next($request);
    }
}
