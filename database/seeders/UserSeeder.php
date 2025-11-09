<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create Admin user
        User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'role' => User::ROLE_ADMIN,
            'email_verified_at' => now(),
        ]);

        // Create FrontDesk user
        User::create([
            'name' => 'FrontDesk User',
            'email' => 'frontdesk@example.com',
            'password' => Hash::make('password'),
            'role' => User::ROLE_FRONTDESK,
            'email_verified_at' => now(),
        ]);

        // Create Designer user
        User::create([
            'name' => 'Designer User',
            'email' => 'designer@example.com',
            'password' => Hash::make('password'),
            'role' => User::ROLE_DESIGNER,
            'email_verified_at' => now(),
        ]);

        // Create Production user
        User::create([
            'name' => 'Production User',
            'email' => 'production@example.com',
            'password' => Hash::make('password'),
            'role' => User::ROLE_PRODUCTION,
            'email_verified_at' => now(),
        ]);
    }
}
