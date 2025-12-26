<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    
    protected $rootView = 'app';

    
    public function version(Request $request): string|null
    {
        return parent::version($request);
    }

    
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'role' => $request->user()->role,
                    'permissions' => $request->user()->isAdmin()
                        ? ['*']
                        : $request->user()->permissions()
                        ->wherePivot('granted', true)
                        ->get()
                        ->map(fn($p) => $p->module . '.' . $p->feature)
                        ->toArray(),
                    'workflow_steps' => ($request->user()->isProduction() || $request->user()->is_head)
                        ? $request->user()->getAssignedWorkflowSteps()
                        : [],
                    'is_production' => $request->user()->isProduction(),
                    'is_head' => $request->user()->is_head ?? false,
                    'can_only_print' => $request->user()->can_only_print ?? false,
                    'branch_id' => $request->user()->branch_id,
                    'branch' => $request->user()->branch ? [
                        'id' => $request->user()->branch->id,
                        'name' => $request->user()->branch->name,
                        'code' => $request->user()->branch->code,
                        'can_accept_orders' => $request->user()->branch->can_accept_orders,
                        'can_produce' => $request->user()->branch->can_produce,
                    ] : null,
                ] : null,
            ],
            'flash' => [
                'success' => fn() => $request->session()->get('success'),
                'error'   => fn() => $request->session()->get('error'),
            ],
        ];
    }
}
