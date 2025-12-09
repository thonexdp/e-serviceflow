<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Setting;

class SettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Contact Information
        Setting::set('contact_phone', '+63 917 123 4567');
        Setting::set('contact_email', 'info@rcprintshoppe.com');
        Setting::set('contact_facebook', 'rcprintshoppe');
        Setting::set('contact_address', 'Paranaque City, Metro Manila, Philippines');

        // Business Hours
        Setting::set('business_hours', [
            'monday_friday' => '8AM - 6PM',
            'saturday' => '9AM - 3PM',
            'sunday' => 'Closed'
        ], 'json');

        // Payment - GCash
        Setting::set('payment_gcash_account_name', 'RC PrintShoppe');
        Setting::set('payment_gcash_number', '0912 345 6789');
        Setting::set('payment_gcash_qrcode', ''); // Will be uploaded via admin panel

        // Payment - Bank
        Setting::set('payment_bank_name', 'BDO (Banco de Oro)');
        Setting::set('payment_bank_account_name', 'RC PrintShoppe');
        Setting::set('payment_bank_account_number', '1234 5678 9012');
    }
}
