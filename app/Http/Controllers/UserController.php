<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Permission;
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
        $users = User::with('permissions')->orderBy('created_at', 'desc')->get();

        return Inertia::render('Users', [
            'users' => $users,
            'availableRoles' => [
                User::ROLE_ADMIN,
                User::ROLE_FRONTDESK,
                User::ROLE_DESIGNER,
                User::ROLE_PRODUCTION,
            ],
            'availablePermissions' => Permission::all()->groupBy('module'),
        ]);
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'role' => 'required|in:admin,FrontDesk,Designer,Production',
            'permissions' => 'nullable|array',
            'permissions.*' => 'boolean',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
        ]);

        // Sync permissions if provided
        if (isset($validated['permissions'])) {
            $this->syncUserPermissions($user, $validated['permissions']);
        }

        return redirect()->back()->with('success', 'User created successfully.');
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'password' => ['nullable', 'confirmed', Rules\Password::defaults()],
            'role' => 'required|in:admin,FrontDesk,Designer,Production',
            'permissions' => 'nullable|array',
            'permissions.*' => 'boolean',
        ]);

        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
        ]);

        // Update password if provided
        if (!empty($validated['password'])) {
            $user->update([
                'password' => Hash::make($validated['password']),
            ]);
        }

        // Sync permissions if provided
        if (isset($validated['permissions'])) {
            $this->syncUserPermissions($user, $validated['permissions']);
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
        foreach ($permissions as $permissionId => $granted) {
            if ($granted) {
                $sync[$permissionId] = ['granted' => true];
            }
        }
        $user->permissions()->sync($sync);
    }
}
