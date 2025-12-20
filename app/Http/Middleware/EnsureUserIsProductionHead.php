<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsProductionHead
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth()->user();

        if (!$user) {
            return redirect()->route('login');
        }

        // Allow admin or production head
        if ($user->role === 'admin') {
            return $next($request);
        }

        if ($user->role !== 'Production' || !$user->is_head) {
            abort(403, 'Access denied. This area is restricted to Production Head or Admin only.');
        }

        return $next($request);
    }
}

