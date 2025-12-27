<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class SettingsController extends Controller
{
    
    public function index()
    {
        
        $bankAccounts = Setting::get('payment_bank_accounts', []);
        
        
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

        
        $bankAccountsWithUrls = array_map(function($account) {
            if (!empty($account['qrcode'])) {
                
                if (strpos($account['qrcode'], 'http') === 0 || strpos($account['qrcode'], '/storage/') === 0) {
                    
                    $account['qrcode'] = $account['qrcode'];
                } else {
                    
                    $disk = config('filesystems.default');
                    if ($disk === 'gcs') {
                        $bucket = config('filesystems.disks.gcs.bucket');
                        $account['qrcode'] = "https://storage.googleapis.com/{$bucket}/{$account['qrcode']}";
                    } else {
                        
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
                
                if ($value === '0' || $value === 0 || $value === false) {
                    return false;
                }
                if ($value === '1' || $value === 1 || $value === true) {
                    return true;
                }
                
                return true;
            })(),
            'payment_bank_accounts' => $bankAccountsWithUrls,
            'customer_order_qrcode' => Setting::get('customer_order_qrcode', ''),
        ];


        return Inertia::render('Admin/Settings', [
            'settings' => $settings
        ]);
    }

    
    public function update(Request $request)
    {
        
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

        
        if ($request->has('business_hours')) {
            Setting::set('business_hours', $request->business_hours, 'json');
        }

        
        if ($request->has('payment_gcash_account_name')) {
            Setting::set('payment_gcash_account_name', $request->payment_gcash_account_name);
        }
        if ($request->has('payment_gcash_number')) {
            Setting::set('payment_gcash_number', $request->payment_gcash_number);
        }
        
        if ($request->has('payment_gcash_show_on_customer_page')) {
            $value = $request->payment_gcash_show_on_customer_page;
            
            $showOnCustomerPage = ($value === '1' || $value === 1 || $value === 'true' || $value === true);
            Setting::set('payment_gcash_show_on_customer_page', $showOnCustomerPage ? '1' : '0');
        } else {
            
            Setting::set('payment_gcash_show_on_customer_page', '0');
        }

        
        if ($request->hasFile('payment_gcash_qrcode')) {
            
            $oldQRCode = Setting::where('key', 'payment_gcash_qrcode')->first();
            if ($oldQRCode && $oldQRCode->value) {
                
                $rawValue = $oldQRCode->getRawOriginal('value');
                \storage()->delete($rawValue);
            }

            
            $path = $request->file('payment_gcash_qrcode')->store('settings/qrcodes', \storage_disk());
            Setting::set('payment_gcash_qrcode', $path, 'image');
        }

        
        if ($request->has('payment_bank_accounts')) {
            $bankAccounts = json_decode($request->payment_bank_accounts, true);
            
            
            $existingBankAccounts = Setting::get('payment_bank_accounts', []);
            
            if (is_array($bankAccounts)) {
                
                foreach ($bankAccounts as $index => &$account) {
                    $qrcodeKey = "payment_bank_qrcode_{$index}";
                    
                    if ($request->hasFile($qrcodeKey)) {
                        
                        if (isset($existingBankAccounts[$index]['qrcode']) && !empty($existingBankAccounts[$index]['qrcode'])) {
                            $oldPath = $existingBankAccounts[$index]['qrcode'];
                            
                            if (strpos($oldPath, 'http') !== 0 && strpos($oldPath, '/storage/') !== 0) {
                                \storage()->delete($oldPath);
                            }
                        }
                        
                        
                        $path = $request->file($qrcodeKey)->store('settings/qrcodes', \storage_disk());
                        $account['qrcode'] = $path;
                    } else {
                        
                        if (isset($existingBankAccounts[$index]['qrcode']) && !empty($existingBankAccounts[$index]['qrcode'])) {
                            $existingPath = $existingBankAccounts[$index]['qrcode'];
                            
                            if (strpos($existingPath, 'http') !== 0 && strpos($existingPath, '/storage/') !== 0) {
                                $account['qrcode'] = $existingPath;
                            } else {
                                
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

        
        if ($request->hasFile('customer_order_qrcode')) {
            
            $oldQRCode = Setting::where('key', 'customer_order_qrcode')->first();
            if ($oldQRCode && $oldQRCode->value) {
                $rawValue = $oldQRCode->getRawOriginal('value');
                \storage()->delete($rawValue);
            }

            
            $path = $request->file('customer_order_qrcode')->store('settings/qrcodes', \storage_disk());
            Setting::set('customer_order_qrcode', $path, 'image');
        }

        return redirect()->back()->with('success', 'Settings updated successfully!');
    }

    
    public function getPublicSettings()
    {
        
        $businessHours = Setting::get('business_hours', [
            'monday_friday' => '8AM - 6PM',
            'saturday' => '9AM - 3PM',
            'sunday' => 'Closed'
        ]);

        
        if (!is_array($businessHours)) {
            $businessHours = [
                'monday_friday' => '8AM - 6PM',
                'saturday' => '9AM - 3PM',
                'sunday' => 'Closed'
            ];
        }

        
        $gcashQrcode = Setting::get('payment_gcash_qrcode', '');
        $showGcashOnCustomerPageValue = Setting::get('payment_gcash_show_on_customer_page', true);
        
        $showGcashOnCustomerPage = ($showGcashOnCustomerPageValue === '0' || $showGcashOnCustomerPageValue === 0 || $showGcashOnCustomerPageValue === false) ? false : true;

        
        $bankAccounts = Setting::get('payment_bank_accounts', []);
        
        
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
        
        
        $bankAccountsWithUrls = array_map(function($account) {
            if (!empty($account['qrcode'])) {
                
                if (strpos($account['qrcode'], 'http') === 0 || strpos($account['qrcode'], '/storage/') === 0) {
                    
                    $account['qrcode'] = $account['qrcode'];
                } else {
                    
                    $disk = config('filesystems.default');
                    if ($disk === 'gcs') {
                        $bucket = config('filesystems.disks.gcs.bucket');
                        $account['qrcode'] = "https://storage.googleapis.com/{$bucket}/{$account['qrcode']}";
                    } else {
                        
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
