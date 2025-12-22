<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class SettingsController extends Controller
{
    /**
     * Display the settings page
     */
    public function index()
    {
        $settings = [
            'contact_phone' => Setting::get('contact_phone', ''),
            'contact_email' => Setting::get('contact_email', ''),
            'contact_facebook' => Setting::get('contact_facebook', ''),
            'contact_address' => Setting::get('contact_address', ''),
            'business_hours' => Setting::get('business_hours', [
                'monday_friday' => '8AM - 6PM',
                'saturday' => '9AM - 3PM',
                'sunday' => 'Closed'
            ]),
            'payment_gcash_account_name' => Setting::get('payment_gcash_account_name', ''),
            'payment_gcash_number' => Setting::get('payment_gcash_number', ''),
            'payment_gcash_qrcode' => Setting::get('payment_gcash_qrcode', ''),
            'payment_bank_name' => Setting::get('payment_bank_name', ''),
            'payment_bank_account_name' => Setting::get('payment_bank_account_name', ''),
            'payment_bank_account_number' => Setting::get('payment_bank_account_number', ''),
            'customer_order_qrcode' => Setting::get('customer_order_qrcode', ''),
        ];


        return Inertia::render('Admin/Settings', [
            'settings' => $settings
        ]);
    }

    /**
     * Update settings
     */
    public function update(Request $request)
    {
        // Contact Information
        if ($request->has('contact_phone')) {
            Setting::set('contact_phone', $request->contact_phone);
        }
        if ($request->has('contact_email')) {
            Setting::set('contact_email', $request->contact_email);
        }
        if ($request->has('contact_facebook')) {
            Setting::set('contact_facebook', $request->contact_facebook);
        }
        if ($request->has('contact_address')) {
            Setting::set('contact_address', $request->contact_address);
        }

        // Business Hours
        if ($request->has('business_hours')) {
            Setting::set('business_hours', $request->business_hours, 'json');
        }

        // Payment - GCash
        if ($request->has('payment_gcash_account_name')) {
            Setting::set('payment_gcash_account_name', $request->payment_gcash_account_name);
        }
        if ($request->has('payment_gcash_number')) {
            Setting::set('payment_gcash_number', $request->payment_gcash_number);
        }

        // Payment - GCash QR Code Upload
        if ($request->hasFile('payment_gcash_qrcode')) {
            // Delete old QR code if exists
            $oldQRCode = Setting::where('key', 'payment_gcash_qrcode')->first();
            if ($oldQRCode && $oldQRCode->value) {
                // Get the raw value from database to delete the actual file
                $rawValue = $oldQRCode->getRawOriginal('value');
                Storage::delete($rawValue);
            }

            // Store new QR code using the default disk (GCS in production, public locally)
            $path = $request->file('payment_gcash_qrcode')->store('settings/qrcodes');
            Setting::set('payment_gcash_qrcode', $path, 'image');
        }

        // Payment - Bank
        if ($request->has('payment_bank_name')) {
            Setting::set('payment_bank_name', $request->payment_bank_name);
        }
        if ($request->has('payment_bank_account_name')) {
            Setting::set('payment_bank_account_name', $request->payment_bank_account_name);
        }
        if ($request->has('payment_bank_account_number')) {
            Setting::set('payment_bank_account_number', $request->payment_bank_account_number);
        }

        // Customer Order QR Code Upload
        if ($request->hasFile('customer_order_qrcode')) {
            // Delete old QR code if exists
            $oldQRCode = Setting::where('key', 'customer_order_qrcode')->first();
            if ($oldQRCode && $oldQRCode->value) {
                $rawValue = $oldQRCode->getRawOriginal('value');
                Storage::delete($rawValue);
            }

            // Store new QR code
            $path = $request->file('customer_order_qrcode')->store('settings/qrcodes');
            Setting::set('customer_order_qrcode', $path, 'image');
        }

        return redirect()->back()->with('success', 'Settings updated successfully!');
    }

    /**
     * Get public settings (for non-authenticated users)
     */
    public function getPublicSettings()
    {
        // Get business hours - support dynamic structure
        $businessHours = Setting::get('business_hours', [
            'monday_friday' => '8AM - 6PM',
            'saturday' => '9AM - 3PM',
            'sunday' => 'Closed'
        ]);

        // Ensure business_hours is always an array
        if (!is_array($businessHours)) {
            $businessHours = [
                'monday_friday' => '8AM - 6PM',
                'saturday' => '9AM - 3PM',
                'sunday' => 'Closed'
            ];
        }

        // Get GCash QR code - Setting model handles URL conversion for image types
        $gcashQrcode = Setting::get('payment_gcash_qrcode', '');

        return response()->json([
            'success' => true,
            'data' => [
                'contact' => [
                    'phone' => Setting::get('contact_phone', ''),
                    'email' => Setting::get('contact_email', ''),
                    'facebook' => Setting::get('contact_facebook', ''),
                    'address' => Setting::get('contact_address', ''),
                ],
                'business_hours' => $businessHours,
                'payment' => [
                    'gcash' => [
                        'account_name' => Setting::get('payment_gcash_account_name', ''),
                        'number' => Setting::get('payment_gcash_number', ''),
                        'qrcode' => $gcashQrcode,
                    ],
                    'bank' => [
                        'bank_name' => Setting::get('payment_bank_name', ''),
                        'account_name' => Setting::get('payment_bank_account_name', ''),
                        'account_number' => Setting::get('payment_bank_account_number', ''),
                    ],
                ],
            ]
        ]);
    }
}
