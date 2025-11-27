# User Management & Permissions System

## Overview

This application now has a comprehensive User Management system with role-based access control (RBAC) and granular permissions.

## Features

### 1. **User Roles**

The system supports the following roles:

-   **Admin** - Full access to all features (bypasses permission checks)
-   **FrontDesk** - Front desk operations
-   **Designer** - Design and mockup management
-   **Production** - Production queue and inventory

### 2. **Granular Permissions**

Each module has specific permissions:

-   **read** - View/List items
-   **create** - Create new items
-   **update** - Edit existing items
-   **delete** - Delete items
-   **price_edit** - Modify pricing (for applicable modules)

### 3. **Available Modules**

-   Tickets
-   Customers
-   Inventory
-   Job Types
-   Finance
-   Production
-   Mockups/Designs
-   Purchase Orders
-   Reports
-   Settings
-   Users

## How to Use

### Managing Users (Admin Only)

1. **Access User Management**

    - Navigate to: `/admin/users`
    - Or click "Users Management" in the admin sidebar

2. **Create a New User**

    - Click "Add User" button
    - Fill in user details (name, email, password, role)
    - Select permissions by module
    - Click "Create User"

3. **Edit User**

    - Click "Edit" next to the user
    - Modify user details and/or permissions
    - Click "Update User"

4. **Delete User**
    - Click "Delete" next to the user
    - Confirm deletion (you cannot delete yourself)

### Permission Management

**Granting Permissions:**

-   When creating/editing a user, scroll to the Permissions section
-   Permissions are grouped by module
-   Use "Toggle All" to quickly select/deselect all permissions for a module
-   Check individual permissions as needed

**Permission Types:**

-   **Read**: View module data
-   **Create**: Add new items to the module
-   **Update**: Edit existing items in the module
-   **Delete**: Remove items from the module
-   **Price Edit**: Modify pricing (available for tickets, inventory, job types)

### Using Permissions in Code

#### In Controllers

**Option 1: Use the HasPermissionCheck Trait**

```php
use App\Http\Traits\HasPermissionCheck;

class MyController extends Controller
{
    use HasPermissionCheck;

    public function index()
    {
        // Check if user can read tickets
        if (!$this->canRead('tickets')) {
            abort(403, 'No permission to view tickets');
        }

        // Or authorize (will automatically abort if no permission)
        $this->authorizePermission('tickets', 'read');

        // Your code here...
    }

    public function store(Request $request)
    {
        $this->authorizePermission('tickets', 'create');

        // Create ticket...
    }

    public function update(Request $request, $id)
    {
        $this->authorizePermission('tickets', 'update');

        // Update ticket...
    }

    public function destroy($id)
    {
        $this->authorizePermission('tickets', 'delete');

        // Delete ticket...
    }
}
```

**Option 2: Use User Model Methods**

```php
public function someMethod()
{
    $user = auth()->user();

    if ($user->hasPermission('inventory', 'price_edit')) {
        // Allow price editing
    }
}
```

#### In Routes (Middleware)

Register the middleware in `app/Http/Kernel.php`:

```php
protected $middlewareAliases = [
    // ... other middleware
    'permission' => \App\Http\Middleware\CheckPermission::class,
];
```

Then use in routes:

```php
Route::middleware(['auth', 'permission:tickets,update'])
    ->put('/tickets/{id}', [TicketController::class, 'update']);
```

#### In Blade/Inertia Views

**Pass permissions to frontend:**

```php
// In controller
return Inertia::render('SomePage', [
    'permissions' => [
        'canCreate' => auth()->user()->hasPermission('tickets', 'create'),
        'canUpdate' => auth()->user()->hasPermission('tickets', 'update'),
        'canDelete' => auth()->user()->hasPermission('tickets', 'delete'),
        'canEditPrice' => auth()->user()->hasPermission('tickets', 'price_edit'),
    ]
]);
```

**In React component:**

```jsx
export default function TicketsPage({ auth, permissions }) {
    return (
        <div>
            {permissions.canCreate && (
                <button onClick={handleCreate}>Create Ticket</button>
            )}

            {permissions.canEditPrice && <input type="number" name="price" />}
        </div>
    );
}
```

## Database Structure

### Tables

**permissions**

-   `id` - Primary key
-   `module` - Module name (e.g., 'tickets', 'customers')
-   `feature` - Feature name (e.g., 'read', 'create', 'update', 'delete', 'price_edit')
-   `label` - Human-readable label
-   `description` - Permission description
-   Unique constraint on `[module, feature]`

**user_permissions**

-   `id` - Primary key
-   `user_id` - Foreign key to users
-   `permission_id` - Foreign key to permissions
-   `granted` - Boolean (true/false)
-   Unique constraint on `[user_id, permission_id]`

## API Endpoints

### User Management

-   `GET /admin/users` - List all users
-   `POST /admin/users` - Create a new user
-   `PUT /admin/users/{user}` - Update a user
-   `DELETE /admin/users/{user}` - Delete a user

### Permissions

-   `GET /admin/permissions` - Get all permissions grouped by module
-   `GET /admin/users/{user}/permissions` - Get a user's permission IDs

## Best Practices

1. **Admin Bypass**: Admin users automatically have all permissions. Don't assign individual permissions to admin users.

2. **Granular Control**: Use the permission system for fine-grained access control. For example:

    - FrontDesk can read inventory but not modify it
    - Designer can only work with mockups
    - Production can update production queue but not delete tickets

3. **Frontend Checks**: Always check permissions in the frontend to hide/disable UI elements, BUT also enforce permissions in the backend for security.

4. **Default Permissions**: When creating users with specific roles, consider creating permission templates/presets for each role.

## Adding New Modules/Permissions

1. Add permissions to the seeder:

```php
// In database/seeders/PermissionSeeder.php
$permissions = [
    // ... existing permissions

    // New Module
    ['module' => 'new_module', 'feature' => 'read', 'label' => 'View New Module', 'description' => '...'],
    ['module' => 'new_module', 'feature' => 'create', 'label' => 'Create in New Module', 'description' => '...'],
    // ... etc
];
```

2. Run the seeder:

```bash
php artisan db:seed --class=PermissionSeeder
```

3. Use the permissions in your controllers and views as shown above.

## Migration Commands

```bash
# Run migrations
php artisan migrate

# Seed permissions
php artisan db:seed --class=PermissionSeeder

# Rollback (if needed)
php artisan migrate:rollback
```

## Security Notes

-   **Never trust frontend checks alone** - Always verify permissions on the backend
-   **Admin users bypass all checks** - Be careful who you assign admin role to
-   **Permission checks happen per-request** - Permissions are checked fresh on each request
-   **Use HTTPS** - Protect user credentials and session data

## Troubleshooting

**Issue: User has permission but still getting 403**

-   Check that the permission module and feature names match exactly
-   Verify the user's permissions in the database
-   Clear application cache: `php artisan cache:clear`

**Issue: Admin user being blocked**

-   Verify the user's role is exactly 'admin' (case-sensitive)
-   Check that `isAdmin()` method is working correctly

**Issue: Permissions not appearing for user**

-   Ensure permissions were seeded: `php artisan db:seed --class=PermissionSeeder`
-   Check user_permissions table for the user's entries
-   Verify the relationship is loaded: `User::with('permissions')->find($id)`
