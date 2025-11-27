<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permission;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            // Tickets Module
            ['module' => 'tickets', 'feature' => 'read', 'label' => 'View Tickets', 'description' => 'Can view tickets and ticket details'],
            ['module' => 'tickets', 'feature' => 'create', 'label' => 'Create Tickets', 'description' => 'Can create new tickets'],
            ['module' => 'tickets', 'feature' => 'update', 'label' => 'Edit Tickets', 'description' => 'Can edit ticket information'],
            ['module' => 'tickets', 'feature' => 'delete', 'label' => 'Delete Tickets', 'description' => 'Can delete tickets'],
            ['module' => 'tickets', 'feature' => 'price_edit', 'label' => 'Edit Ticket Prices', 'description' => 'Can modify ticket pricing'],

            // Customers Module
            ['module' => 'customers', 'feature' => 'read', 'label' => 'View Customers', 'description' => 'Can view customer information'],
            ['module' => 'customers', 'feature' => 'create', 'label' => 'Create Customers', 'description' => 'Can add new customers'],
            ['module' => 'customers', 'feature' => 'update', 'label' => 'Edit Customers', 'description' => 'Can edit customer information'],
            ['module' => 'customers', 'feature' => 'delete', 'label' => 'Delete Customers', 'description' => 'Can delete customers'],

            // Inventory Module
            ['module' => 'inventory', 'feature' => 'read', 'label' => 'View Inventory', 'description' => 'Can view inventory items'],
            ['module' => 'inventory', 'feature' => 'create', 'label' => 'Create Inventory', 'description' => 'Can add new inventory items'],
            ['module' => 'inventory', 'feature' => 'update', 'label' => 'Edit Inventory', 'description' => 'Can edit inventory items'],
            ['module' => 'inventory', 'feature' => 'delete', 'label' => 'Delete Inventory', 'description' => 'Can delete inventory items'],
            ['module' => 'inventory', 'feature' => 'price_edit', 'label' => 'Edit Inventory Prices', 'description' => 'Can modify inventory item prices'],

            // Job Types Module
            ['module' => 'job_types', 'feature' => 'read', 'label' => 'View Job Types', 'description' => 'Can view job types'],
            ['module' => 'job_types', 'feature' => 'create', 'label' => 'Create Job Types', 'description' => 'Can add new job types'],
            ['module' => 'job_types', 'feature' => 'update', 'label' => 'Edit Job Types', 'description' => 'Can edit job types'],
            ['module' => 'job_types', 'feature' => 'delete', 'label' => 'Delete Job Types', 'description' => 'Can delete job types'],
            ['module' => 'job_types', 'feature' => 'price_edit', 'label' => 'Edit Job Type Prices', 'description' => 'Can modify job type pricing'],

            // Finance Module
            ['module' => 'finance', 'feature' => 'read', 'label' => 'View Finance', 'description' => 'Can view financial data'],
            ['module' => 'finance', 'feature' => 'create', 'label' => 'Create Transactions', 'description' => 'Can create financial transactions'],
            ['module' => 'finance', 'feature' => 'update', 'label' => 'Edit Transactions', 'description' => 'Can edit financial transactions'],
            ['module' => 'finance', 'feature' => 'delete', 'label' => 'Delete Transactions', 'description' => 'Can delete financial transactions'],

            // Production Module
            ['module' => 'production', 'feature' => 'read', 'label' => 'View Production Queue', 'description' => 'Can view production queue'],
            ['module' => 'production', 'feature' => 'update', 'label' => 'Update Production', 'description' => 'Can update production status'],

            // Mock-ups/Design Module
            ['module' => 'mockups', 'feature' => 'read', 'label' => 'View Designs', 'description' => 'Can view design mockups'],
            ['module' => 'mockups', 'feature' => 'create', 'label' => 'Upload Designs', 'description' => 'Can upload design mockups'],
            ['module' => 'mockups', 'feature' => 'update', 'label' => 'Edit Designs', 'description' => 'Can edit/approve design mockups'],
            ['module' => 'mockups', 'feature' => 'delete', 'label' => 'Delete Designs', 'description' => 'Can delete design mockups'],

            // Purchase Orders Module
            ['module' => 'purchase_orders', 'feature' => 'read', 'label' => 'View Purchase Orders', 'description' => 'Can view purchase orders'],
            ['module' => 'purchase_orders', 'feature' => 'create', 'label' => 'Create Purchase Orders', 'description' => 'Can create purchase orders'],
            ['module' => 'purchase_orders', 'feature' => 'update', 'label' => 'Edit Purchase Orders', 'description' => 'Can edit purchase orders'],
            ['module' => 'purchase_orders', 'feature' => 'delete', 'label' => 'Delete Purchase Orders', 'description' => 'Can delete purchase orders'],

            // Reports Module
            ['module' => 'reports', 'feature' => 'read', 'label' => 'View Reports', 'description' => 'Can view reports and analytics'],

            // Settings Module
            ['module' => 'settings', 'feature' => 'read', 'label' => 'View Settings', 'description' => 'Can view system settings'],
            ['module' => 'settings', 'feature' => 'update', 'label' => 'Edit Settings', 'description' => 'Can modify system settings'],

            // Users Module (for managing other users)
            ['module' => 'users', 'feature' => 'read', 'label' => 'View Users', 'description' => 'Can view user list'],
            ['module' => 'users', 'feature' => 'create', 'label' => 'Create Users', 'description' => 'Can create new users'],
            ['module' => 'users', 'feature' => 'update', 'label' => 'Edit Users', 'description' => 'Can edit user information'],
            ['module' => 'users', 'feature' => 'delete', 'label' => 'Delete Users', 'description' => 'Can delete users'],
        ];

        foreach ($permissions as $permission) {
            Permission::updateOrCreate(
                ['module' => $permission['module'], 'feature' => $permission['feature']],
                $permission
            );
        }

        $this->command->info('Permissions seeded successfully!');
    }
}
