<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Branch;

class BranchSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $branches = [
            [
                'name' => 'Cebu Branch',
                'code' => 'CEBU',
                'address' => 'Cebu City, Philippines',
                'phone' => null,
                'email' => null,
                'can_accept_orders' => true,
                'can_produce' => true,
                'is_default_production' => true, // Cebu is the default production branch
                'is_active' => true,
                'sort_order' => 1,
                'notes' => 'Main production facility and order acceptance center',
            ],
            [
                'name' => 'Sogod Branch',
                'code' => 'SOGOD',
                'address' => 'Sogod, Southern Leyte, Philippines',
                'phone' => null,
                'email' => null,
                'can_accept_orders' => true,
                'can_produce' => true,
                'is_default_production' => false,
                'is_active' => true,
                'sort_order' => 2,
                'notes' => 'Can accept orders and handle production',
            ],
            [
                'name' => 'Maasin Branch',
                'code' => 'MAASIN',
                'address' => 'Maasin City, Southern Leyte, Philippines',
                'phone' => null,
                'email' => null,
                'can_accept_orders' => true,
                'can_produce' => false, // Maasin can only accept orders, not produce
                'is_default_production' => false,
                'is_active' => true,
                'sort_order' => 3,
                'notes' => 'Order acceptance only - production handled by Cebu',
            ],
        ];

        foreach ($branches as $branch) {
            Branch::updateOrCreate(
                ['code' => $branch['code']],
                $branch
            );
        }

        $this->command->info('Branches seeded successfully!');
    }
}
