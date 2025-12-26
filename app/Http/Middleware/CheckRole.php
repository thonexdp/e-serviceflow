<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        if (!$request->user()) {
            return redirect()->route('login');
        }

        
        $allowedRoles = [];
        foreach ($roles as $role) {
            
            $roleParts = explode(',', $role);
            foreach ($roleParts as $part) {
                $allowedRoles[] = trim($part);
            }
        }
        
        
        $allowedRoles = array_filter($allowedRoles);

        if (empty($allowedRoles) || !in_array($request->user()->role, $allowedRoles)) {
            abort(403, 'Unauthorized action.');
        }

        return $next($request);
    }
}
