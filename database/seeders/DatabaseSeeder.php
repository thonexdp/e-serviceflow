<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            BranchSeeder::class,
            SettingsSeeder::class,
            UserSeeder::class,
            CustomerSeeder::class,
            JobDataSeeder::class,
            // InventorySeeder::class, // Add inventory seeder
        ]);
    }
}
