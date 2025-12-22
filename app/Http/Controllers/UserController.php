<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Permission;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;

class UserController extends Controller
{
    /**
     * Display a listing of users.
     */
    public function index()
    {
        $users = User::with(['permissions', 'workflowSteps', 'branch'])->orderBy('created_at', 'desc')->get();

        // Define available workflow steps
        $availableWorkflowSteps = [
            // 'design' => 'Design',
            'printing' => 'Printing',
            'lamination_heatpress' => 'Lamination/Heatpress',
            'cutting' => 'Cutting',
            'sewing' => 'Sewing',
            'dtf_press' => 'DTF Press',
            'qa' => 'Quality Assurance',
        ];

        return Inertia::render('Users', [
            'users' => $users,
            'availableRoles' => [
                // User::ROLE_ADMIN,
                User::ROLE_FRONTDESK,
                User::ROLE_DESIGNER,
                User::ROLE_PRODUCTION,
                User::ROLE_CASHIER,
            ],
            'availablePermissions' => Permission::all()->groupBy('module'),
            'availableWorkflowSteps' => $availableWorkflowSteps,
            'availableBranches' => \App\Models\Branch::where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(),
        ]);
    }

    /**
     * Get activity logs for a specific user
     */
    public function getActivityLogs(User $user)
    {
        $logs = $user->activityLogs()
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get();

        return response()->json(['data' => $logs]);
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|max:255|unique:users',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'role' => 'required|in:admin,FrontDesk,Designer,Production,Cashier',
            'branch_id' => 'nullable|exists:branches,id',
            'permissions' => 'nullable|array',
            'permissions.*' => 'boolean',
            'workflow_steps' => 'nullable|array',
            'workflow_steps.*' => 'string|in:design,printing,lamination_heatpress,cutting,sewing,dtf_press,qa',
            'is_active' => 'nullable|boolean',
            'is_head' => 'nullable|boolean',
            'can_only_print' => 'nullable|boolean',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'branch_id' => $validated['branch_id'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'is_head' => ($validated['role'] === 'Production' && isset($validated['is_head'])) ? $validated['is_head'] : false,
            'can_only_print' => ($validated['role'] === 'Production' && isset($validated['can_only_print'])) ? $validated['can_only_print'] : false,
        ]);

        // Sync permissions if provided
        if (isset($validated['permissions'])) {
            $this->syncUserPermissions($user, $validated['permissions']);
        }

        // Sync workflow steps if provided and user is Production or Production Head/Supervisor
        if (($user->isProduction() || $user->is_head) && isset($validated['workflow_steps'])) {
            // If user can only print, ensure workflow_steps only contains printing
            if ($user->can_only_print) {
                $validated['workflow_steps'] = ['printing'];
            }
            $user->syncWorkflowSteps($validated['workflow_steps']);
        }

        // Log user creation
        UserActivityLog::log(
            auth()->id(),
            'created_user',
            "Created new user: {$user->name} ({$user->email})",
            $user
        );

        return redirect()->back()->with('success', 'User created successfully.');
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|max:255|unique:users,email,' . $user->id,
            'password' => ['nullable', 'confirmed', Rules\Password::defaults()],
            'update_password' => 'nullable|boolean', // Toggle to update password
            'role' => 'required|in:admin,FrontDesk,Designer,Production,Cashier',
            'branch_id' => 'nullable|exists:branches,id',
            'permissions' => 'nullable|array',
            'permissions.*' => 'boolean',
            'workflow_steps' => 'nullable|array',
            'workflow_steps.*' => 'string|in:design,printing,lamination_heatpress,cutting,sewing,dtf_press,qa',
            'is_active' => 'nullable|boolean',
            'is_head' => 'nullable|boolean',
            'can_only_print' => 'nullable|boolean',
        ]);

        $oldData = [
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'branch_id' => $user->branch_id,
            'is_active' => $user->is_active,
            'is_head' => $user->is_head,
            'can_only_print' => $user->can_only_print,
        ];

        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'branch_id' => $validated['branch_id'] ?? null,
            'is_active' => $validated['is_active'] ?? $user->is_active,
            'is_head' => ($validated['role'] === 'Production' && isset($validated['is_head'])) ? $validated['is_head'] : false,
            'can_only_print' => ($validated['role'] === 'Production' && isset($validated['can_only_print'])) ? $validated['can_only_print'] : false,
        ]);

        // Update password only if update_password is true and password is provided
        if (!empty($validated['update_password']) && !empty($validated['password'])) {
            $user->update([
                'password' => Hash::make($validated['password']),
            ]);

            // Log password change
            UserActivityLog::log(
                auth()->id(),
                'updated_user_password',
                "Updated password for user: {$user->name}",
                $user
            );
        }

        // Log user update
        $changes = [];
        foreach ($oldData as $key => $oldValue) {
            if (isset($validated[$key]) && $validated[$key] != $oldValue) {
                $changes[$key] = ['old' => $oldValue, 'new' => $validated[$key]];
            }
        }

        if (!empty($changes)) {
            UserActivityLog::log(
                auth()->id(),
                'updated_user',
                "Updated user: {$user->name}",
                $user,
                $changes
            );
        }

        // Sync permissions if provided
        if (isset($validated['permissions'])) {
            $this->syncUserPermissions($user, $validated['permissions']);
        }

        // Sync workflow steps if provided and user is Production or Production Head/Supervisor
        if (($user->isProduction() || $user->is_head) && isset($validated['workflow_steps'])) {
            // If user can only print, ensure workflow_steps only contains printing
            if ($user->can_only_print) {
                $validated['workflow_steps'] = ['printing'];
            }
            $user->syncWorkflowSteps($validated['workflow_steps']);
        } elseif (!$user->isProduction() && !$user->is_head) {
            // Remove workflow steps if user is no longer Production or Production Head
            $user->workflowSteps()->delete();
        }

        return redirect()->back()->with('success', 'User updated successfully.');
    }

    /**
     * Remove the specified user.
     */
    public function destroy(User $user)
    {
        // Prevent deleting yourself
        if ($user->id === auth()->id()) {
            return redirect()->back()->withErrors(['error' => 'You cannot delete your own account.']);
        }

        $userName = $user->name;
        $userEmail = $user->email;

        // Log user deletion before deleting
        UserActivityLog::log(
            auth()->id(),
            'deleted_user',
            "Deleted user: {$userName} ({$userEmail})",
            null
        );

        $user->delete();

        return redirect()->back()->with('success', 'User deleted successfully.');
    }

    /**
     * Get all permissions grouped by module
     */
    public function getPermissions()
    {
        $permissions = Permission::orderBy('module')->orderBy('feature')->get();

        // Group permissions by module
        $grouped = $permissions->groupBy('module')->map(function ($perms) {
            return $perms->map(function ($perm) {
                return [
                    'id' => $perm->id,
                    'feature' => $perm->feature,
                    'label' => $perm->label,
                    'description' => $perm->description,
                ];
            });
        });

        return response()->json($grouped);
    }

    /**
     * Get a user's permissions
     */
    public function getUserPermissions(User $user)
    {
        $permissions = $user->permissions()->get()->pluck('id')->toArray();

        return response()->json($permissions);
    }

    /**
     * Sync user permissions
     */
    private function syncUserPermissions(User $user, array $permissions)
    {
        $sync = [];
        $role = $user->role;

        // Get all allowed permissions for this role
        // This ensures the user cannot be granted permissions not intended for their role
        $allowedPermissionIds = Permission::all()->filter(function ($p) use ($role) {
            if (empty($p->role)) {
                return true;
            }
            $allowedRoles = array_map('trim', explode(',', $p->role));
            return in_array($role, $allowedRoles);
        })->pluck('id')->toArray();

        foreach ($permissions as $permissionId => $granted) {
            if ($granted && in_array($permissionId, $allowedPermissionIds)) {
                $sync[$permissionId] = ['granted' => true];
            }
        }
        $user->permissions()->sync($sync);
    }
}
