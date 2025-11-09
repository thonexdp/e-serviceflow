<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        if (!$request->user()) {
            return redirect()->route('login');
        }

        // Flatten roles array and handle comma-separated values
        $allowedRoles = [];
        foreach ($roles as $role) {
            // Split by comma if present, otherwise use the role as-is
            $roleParts = explode(',', $role);
            foreach ($roleParts as $part) {
                $allowedRoles[] = trim($part);
            }
        }
        
        // Remove empty values
        $allowedRoles = array_filter($allowedRoles);

        if (empty($allowedRoles) || !in_array($request->user()->role, $allowedRoles)) {
            abort(403, 'Unauthorized action.');
        }

        return $next($request);
    }
}
