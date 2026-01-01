<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
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


        $bankAccountsWithUrls = array_map(function ($account) {
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
            'payment_gcash_account_name' => Setting::get('payment_gcash_account_name', ''),
            'payment_gcash_number' => Setting::get('payment_gcash_number', ''),
            'payment_gcash_qrcode' => Setting::get('payment_gcash_qrcode', ''),
            'payment_gcash_show_on_customer_page' => (function () {
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
            'print_settings' => [
                'bank_account' => collect($bankAccountsWithUrls)->firstWhere('active_for_print', true)
            ]
        ];

        // Get branches from database
        $branches = Branch::orderBy('sort_order')->orderBy('name')->get();

        return Inertia::render('Admin/Settings', [
            'settings' => $settings,
            'branches' => $branches
        ]);
    }


    public function update(Request $request)
    {

        // Basic settings are now managed in Branches



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
                $disk = config('filesystems.default', 'public');
                if ($disk !== 'public') {
                    try {
                        Storage::disk($disk)->delete($rawValue);
                    } catch (\Exception $e) {
                        Log::warning("Failed to delete old GCash QR code: " . $e->getMessage());
                    }
                }
            }


            $disk = config('filesystems.default', 'public');
            $path = $request->file('payment_gcash_qrcode')->store('settings/qrcodes', $disk);
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
                                $disk = config('filesystems.default', 'public');
                                if ($disk !== 'public') {
                                    try {
                                        Storage::disk($disk)->delete($oldPath);
                                    } catch (\Exception $e) {
                                        Log::warning("Failed to delete old bank QR code: " . $e->getMessage());
                                    }
                                }
                            }
                        }


                        $disk = config('filesystems.default', 'public');
                        $path = $request->file($qrcodeKey)->store('settings/qrcodes', $disk);
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
                $disk = config('filesystems.default', 'public');
                if ($disk !== 'public') {
                    try {
                        Storage::disk($disk)->delete($rawValue);
                    } catch (\Exception $e) {
                        Log::warning("Failed to delete old customer order QR code: " . $e->getMessage());
                    }
                }
            }


            $disk = config('filesystems.default', 'public');
            $path = $request->file('customer_order_qrcode')->store('settings/qrcodes', $disk);
            Setting::set('customer_order_qrcode', $path, 'image');
        }


        if ($request->has('branches')) {
            $branchesData = json_decode($request->branches, true);
            if (is_array($branchesData)) {
                foreach ($branchesData as $index => $branchData) {
                    if (isset($branchData['id']) && $branchData['id']) {
                        // Update existing branch
                        $branch = Branch::find($branchData['id']);
                        if ($branch) {
                            $branch->update([
                                'name' => $branchData['name'] ?? '',
                                'phone' => $branchData['phone'] ?? '',
                                'email' => $branchData['email'] ?? '',
                                'facebook' => $branchData['facebook'] ?? '',
                                'address' => $branchData['address'] ?? '',
                                'business_hours' => $branchData['business_hours'] ?? null,
                                'sort_order' => $index,
                            ]);
                        }
                    } else {
                        // Create new branch - generate a unique code
                        $code = strtoupper(substr(str_replace(' ', '', $branchData['name'] ?? 'BR'), 0, 10)) . '_' . time();
                        Branch::create([
                            'name' => $branchData['name'] ?? 'New Branch',
                            'code' => $code,
                            'phone' => $branchData['phone'] ?? '',
                            'email' => $branchData['email'] ?? '',
                            'facebook' => $branchData['facebook'] ?? '',
                            'address' => $branchData['address'] ?? '',
                            'business_hours' => $branchData['business_hours'] ?? null,
                            'sort_order' => $index,
                            'can_accept_orders' => false,
                            'can_produce' => false,
                            'is_active' => true,
                        ]);
                    }
                }
            }
        }

        // Handle branch deletions
        if ($request->has('deleted_branch_ids')) {
            $deletedIds = json_decode($request->deleted_branch_ids, true);
            if (is_array($deletedIds) && !empty($deletedIds)) {
                Branch::whereIn('id', $deletedIds)->delete();
            }
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


        $bankAccountsWithUrls = array_map(function ($account) {
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

        // Get active branches from database
        $branches = Branch::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(function ($branch) {
                return [
                    'name' => $branch->name,
                    'phone' => $branch->phone,
                    'email' => $branch->email,
                    'facebook' => $branch->facebook,
                    'address' => $branch->address,
                    'business_hours' => $branch->business_hours,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'payment' => [
                    'gcash' => [
                        'account_name' => Setting::get('payment_gcash_account_name', ''),
                        'number' => Setting::get('payment_gcash_number', ''),
                        'qrcode' => $gcashQrcode,
                        'show_on_customer_page' => $showGcashOnCustomerPage,
                    ],
                    'bank_accounts' => $bankAccountsWithUrls,
                ],
                'branches' => $branches,
            ]
        ]);
    }
}
