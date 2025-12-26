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
        // Get bank accounts - migrate from old single bank format if needed
        $bankAccounts = Setting::get('payment_bank_accounts', []);
        
        // Migration: If no bank accounts but old bank fields exist, convert them
        if (empty($bankAccounts)) {
            $oldBankName = Setting::get('payment_bank_name', '');
            $oldAccountName = Setting::get('payment_bank_account_name', '');
            $oldAccountNumber = Setting::get('payment_bank_account_number', '');
            
            if ($oldBankName || $oldAccountName || $oldAccountNumber) {
                $bankAccounts = [[
                    'bank_name' => $oldBankName,
                    'account_name' => $oldAccountName,
                    'account_number' => $oldAccountNumber,
                    'qrcode' => ''
                ]];
            }
        }

        // Convert QR code paths to URLs for admin display
        $bankAccountsWithUrls = array_map(function($account) {
            if (!empty($account['qrcode'])) {
                // Check if it's already a URL
                if (strpos($account['qrcode'], 'http') === 0 || strpos($account['qrcode'], '/storage/') === 0) {
                    // Already a URL, keep it as is
                    $account['qrcode'] = $account['qrcode'];
                } else {
                    // It's a storage path, convert to URL
                    $disk = config('filesystems.default');
                    if ($disk === 'gcs') {
                        $bucket = config('filesystems.disks.gcs.bucket');
                        $account['qrcode'] = "https://storage.googleapis.com/{$bucket}/{$account['qrcode']}";
                    } else {
                        // For local/public storage
                        $account['qrcode'] = "/storage/{$account['qrcode']}";
                    }
                }
            } else {
                $account['qrcode'] = '';
            }
            return $account;
        }, $bankAccounts);

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
            'payment_gcash_show_on_customer_page' => (function() {
                $value = Setting::get('payment_gcash_show_on_customer_page', true);
                // Convert string '0' or '1' to boolean, or keep boolean value
                if ($value === '0' || $value === 0 || $value === false) {
                    return false;
                }
                if ($value === '1' || $value === 1 || $value === true) {
                    return true;
                }
                // Default to true if value is unexpected
                return true;
            })(),
            'payment_bank_accounts' => $bankAccountsWithUrls,
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
        // Always set payment_gcash_show_on_customer_page if the field is present (even if '0')
        if ($request->has('payment_gcash_show_on_customer_page')) {
            $value = $request->payment_gcash_show_on_customer_page;
            // Convert to boolean: '1', 1, 'true', true = true, everything else = false
            $showOnCustomerPage = ($value === '1' || $value === 1 || $value === 'true' || $value === true);
            Setting::set('payment_gcash_show_on_customer_page', $showOnCustomerPage ? '1' : '0');
        } else {
            // If field is not present, default to false (unchecked)
            Setting::set('payment_gcash_show_on_customer_page', '0');
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

        // Payment - Bank Accounts
        if ($request->has('payment_bank_accounts')) {
            $bankAccounts = json_decode($request->payment_bank_accounts, true);
            
            // Get existing bank accounts from database to preserve QR code paths
            $existingBankAccounts = Setting::get('payment_bank_accounts', []);
            
            if (is_array($bankAccounts)) {
                // Handle QR code uploads for bank accounts
                foreach ($bankAccounts as $index => &$account) {
                    $qrcodeKey = "payment_bank_qrcode_{$index}";
                    
                    if ($request->hasFile($qrcodeKey)) {
                        // New QR code file uploaded - delete old one if exists
                        if (isset($existingBankAccounts[$index]['qrcode']) && !empty($existingBankAccounts[$index]['qrcode'])) {
                            $oldPath = $existingBankAccounts[$index]['qrcode'];
                            // Only delete if it's a storage path (not a URL)
                            if (strpos($oldPath, 'http') !== 0 && strpos($oldPath, '/storage/') !== 0) {
                                Storage::delete($oldPath);
                            }
                        }
                        
                        // Store new QR code
                        $path = $request->file($qrcodeKey)->store('settings/qrcodes');
                        $account['qrcode'] = $path;
                    } else {
                        // No new file upload - preserve existing QR code path from database
                        if (isset($existingBankAccounts[$index]['qrcode']) && !empty($existingBankAccounts[$index]['qrcode'])) {
                            $existingPath = $existingBankAccounts[$index]['qrcode'];
                            // Only use it if it's a storage path (not a URL)
                            if (strpos($existingPath, 'http') !== 0 && strpos($existingPath, '/storage/') !== 0) {
                                $account['qrcode'] = $existingPath;
                            } else {
                                // It's a URL, extract the path
                                if (strpos($existingPath, '/storage/') === 0) {
                                    $account['qrcode'] = substr($existingPath, 9);
                                } elseif (strpos($existingPath, 'storage.googleapis.com/') !== false) {
                                    $parts = explode('storage.googleapis.com/', $existingPath);
                                    $account['qrcode'] = isset($parts[1]) ? $parts[1] : '';
                                } else {
                                    $account['qrcode'] = '';
                                }
                            }
                        } else {
                            $account['qrcode'] = '';
                        }
                    }
                }
                
                Setting::set('payment_bank_accounts', $bankAccounts, 'json');
            }
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
        $showGcashOnCustomerPageValue = Setting::get('payment_gcash_show_on_customer_page', true);
        // Convert string '0' or '1' to boolean, or keep boolean value
        $showGcashOnCustomerPage = ($showGcashOnCustomerPageValue === '0' || $showGcashOnCustomerPageValue === 0 || $showGcashOnCustomerPageValue === false) ? false : true;

        // Get bank accounts
        $bankAccounts = Setting::get('payment_bank_accounts', []);
        
        // Migration: Convert old single bank format to array format for API
        if (empty($bankAccounts)) {
            $oldBankName = Setting::get('payment_bank_name', '');
            $oldAccountName = Setting::get('payment_bank_account_name', '');
            $oldAccountNumber = Setting::get('payment_bank_account_number', '');
            
            if ($oldBankName || $oldAccountName || $oldAccountNumber) {
                $bankAccounts = [[
                    'bank_name' => $oldBankName,
                    'account_name' => $oldAccountName,
                    'account_number' => $oldAccountNumber,
                    'qrcode' => ''
                ]];
            }
        }
        
        // Convert QR code paths to URLs for each bank account
        $bankAccountsWithUrls = array_map(function($account) {
            if (!empty($account['qrcode'])) {
                // Check if it's already a URL
                if (strpos($account['qrcode'], 'http') === 0 || strpos($account['qrcode'], '/storage/') === 0) {
                    // Already a URL, keep it as is
                    $account['qrcode'] = $account['qrcode'];
                } else {
                    // It's a storage path, convert to URL using Setting model logic
                    $disk = config('filesystems.default');
                    if ($disk === 'gcs') {
                        $bucket = config('filesystems.disks.gcs.bucket');
                        $account['qrcode'] = "https://storage.googleapis.com/{$bucket}/{$account['qrcode']}";
                    } else {
                        // For local/public storage
                        $account['qrcode'] = "/storage/{$account['qrcode']}";
                    }
                }
            } else {
                $account['qrcode'] = '';
            }
            return $account;
        }, $bankAccounts);

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
                        'show_on_customer_page' => $showGcashOnCustomerPage,
                    ],
                    'bank_accounts' => $bankAccountsWithUrls,
                ],
            ]
        ]);
    }
}
