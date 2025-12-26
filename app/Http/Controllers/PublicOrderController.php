<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Ticket;
use App\Models\TicketFile;
use App\Models\JobType;
use App\Models\User;
use App\Models\Notification;
use App\Events\TicketStatusChanged;
use App\Services\PaymentRecorder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class PublicOrderController extends Controller
{
    public function __construct(protected PaymentRecorder $paymentRecorder) {}

    
    public function findOrCreateCustomer(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email|max:255',
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'nullable|string|max:20',
            'customer_facebook' => 'nullable|string|max:255',
        ]);

        
        $nameParts = explode(' ', trim($validated['customer_name']), 2);
        $firstname = $nameParts[0] ?? '';
        $lastname = $nameParts[1] ?? '';

        
        $customer = Customer::where('email', $validated['email'])->first();

        if ($customer) {
            
            $updateData = [];
            if ($firstname) $updateData['firstname'] = $firstname;
            if ($lastname) $updateData['lastname'] = $lastname;
            if (isset($validated['customer_phone']) && $validated['customer_phone']) {
                $updateData['phone'] = $validated['customer_phone'];
            }
            if (isset($validated['customer_facebook']) && $validated['customer_facebook']) {
                $updateData['facebook'] = $validated['customer_facebook'];
            }
            if (!empty($updateData)) {
                $customer->update($updateData);
            }
        } else {
            
            $customer = Customer::create([
                'firstname' => $firstname,
                'lastname' => $lastname,
                'email' => $validated['email'],
                'phone' => $validated['customer_phone'] ?? null,
                'facebook' => $validated['customer_facebook'] ?? '',
            ]);
        }

        return response()->json([
            'success' => true,
            'customer' => $customer,
        ]);
    }

    
    public function storeOrder(Request $request)
    {

        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'branch_id' => 'required|exists:branches,id',
            'description' => 'required|string',
            'job_type_id' => 'required|exists:job_types,id',
            'quantity' => 'required|integer|min:1',
            'free_quantity' => 'nullable|integer|min:0',
            'size_rate_id' => 'nullable|exists:job_type_size_rates,id',
            'size_width' => 'nullable|numeric|min:0',
            'size_height' => 'nullable|numeric|min:0',
            'size_value' => 'nullable|string|max:50',
            'size_unit' => 'nullable|string|max:10',
            'due_date' => 'required|date|after_or_equal:today',
            'subtotal' => 'nullable|numeric|min:0',
            'total_amount' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|string|in:walkin,gcash,bank',
            'file' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
            'attachments.*' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
            'payment_proofs.*' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
        ]);

        $paymentMethod = $validated['payment_method'] ?? 'walkin';

        
        $selectedBranch = \App\Models\Branch::find($validated['branch_id']);

        
        if (!$selectedBranch || !$selectedBranch->can_accept_orders || !$selectedBranch->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'The selected branch cannot accept orders at this time.',
            ], 422);
        }

        
        
        $productionBranchId = $selectedBranch->can_produce
            ? $selectedBranch->id
            : \App\Models\Branch::where('is_default_production', true)->value('id');

        
        
        
        
        $paymentStatus = 'awaiting_verification';

        $ticketData = [
            'customer_id' => $validated['customer_id'],
            'order_branch_id' => $validated['branch_id'],
            'production_branch_id' => $productionBranchId,
            'description' => $validated['description'],
            'job_type_id' => $validated['job_type_id'],
            'quantity' => $validated['quantity'],
            'free_quantity' => $validated['free_quantity'] ?? 0,
            'due_date' => $validated['due_date'],
            'subtotal' => $validated['subtotal'] ?? 0,
            'total_amount' => $validated['total_amount'] ?? $validated['subtotal'] ?? 0,
            'payment_method' => $paymentMethod === 'walkin' ? 'cash' : $paymentMethod,
            'payment_status' => $paymentStatus,
            'status' => 'pending',
        ];

        
        if (isset($validated['size_value'])) {
            $ticketData['size_value'] = $validated['size_value'];
        }
        if (isset($validated['size_unit'])) {
            $ticketData['size_unit'] = $validated['size_unit'];
        }

        
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = Storage::put('tickets/customer', $file);
            $ticketData['file_path'] = $path;
        }

        
        $this->applyPricing($ticketData, $request);

        
        unset($ticketData['size_width'], $ticketData['size_height'], $ticketData['size_rate_id']);

        $ticket = Ticket::create($ticketData);

        
        if ($request->hasFile('file') && isset($path)) {
            TicketFile::create([
                'ticket_id' => $ticket->id,
                'file_name' => $request->file('file')->getClientOriginalName(),
                'file_path' => $path,
                'type' => 'customer',
            ]);
        }

        
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments', []) as $attachment) {
                if (!$attachment) {
                    continue;
                }
                $storedPath = Storage::put('tickets/customer', $attachment);
                TicketFile::create([
                    'ticket_id' => $ticket->id,
                    'file_name' => $attachment->getClientOriginalName(),
                    'file_path' => $storedPath,
                    'type' => 'customer',
                ]);
            }
        }

        
        if ($request->hasFile('payment_proofs') && ($paymentMethod === 'gcash' || $paymentMethod === 'bank')) {
            $this->paymentRecorder->record(
                [
                    'ticket_id' => $ticket->id,
                    'payment_method' => $paymentMethod,
                    'amount' => 0, 
                    'payment_date' => now()->toDateString(),
                    'allocation' => 'downpayment',
                    'notes' => 'Payment proof uploaded during order submission.',
                    'payment_type' => 'collection',
                ],
                $request->file('payment_proofs', [])
            );
        }

        
        try {
            
            $frontDeskUsers = User::where('role', User::ROLE_FRONTDESK)
                ->where('is_active', true)
                ->where('branch_id', $validated['branch_id']) 
                ->get();

            if ($frontDeskUsers->isNotEmpty()) {
                $customerName = $ticket->customer->full_name ?? 'Unknown Customer';
                $ticketNumber = $ticket->ticket_number;
                $branchName = $selectedBranch->name ?? 'Branch';

                
                $notificationTitle = 'New Order from Customer';
                $notificationMessage = "{$customerName} has created a new order ({$ticketNumber}) for {$branchName}";

                
                foreach ($frontDeskUsers as $user) {
                    Notification::create([
                        'user_id' => $user->id,
                        'type' => 'order_created',
                        'notifiable_id' => $ticket->id,
                        'notifiable_type' => Ticket::class,
                        'title' => $notificationTitle,
                        'message' => $notificationMessage,
                        'read' => false,
                        'data' => [
                            'ticket_id' => $ticket->id,
                            'ticket_number' => $ticketNumber,
                            'customer_name' => $customerName,
                            'total_amount' => $ticket->total_amount,
                            'branch_id' => $validated['branch_id'],
                            'branch_name' => $branchName,
                        ],
                    ]);
                }

                
                
                $systemUser = $frontDeskUsers->first();
                $userIds = $frontDeskUsers->pluck('id')->toArray();

                event(new TicketStatusChanged(
                    $ticket,
                    'new',
                    'pending',
                    $systemUser, 
                    $userIds,
                    'order_created',
                    $notificationTitle,
                    $notificationMessage
                ));

                Log::info('Notification sent to frontdesk users', [
                    'ticket_id' => $ticket->id,
                    'frontdesk_users_count' => $frontDeskUsers->count(),
                ]);
            }
        } catch (\Exception $e) {
            
            Log::error('Failed to send notification to frontdesk users', [
                'ticket_id' => $ticket->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Order submitted successfully! We will contact you shortly.',
            'ticket' => $ticket->load('customer'),
            'ticket_number' => $ticket->ticket_number,
        ]);
    }

    
    protected function applyPricing(array &$ticketData, Request $request): void
    {
        $jobTypeId = $ticketData['job_type_id'] ?? null;
        $quantity = max((int)($ticketData['quantity'] ?? 1), 1);
        $ticketData['quantity'] = $quantity;

        $subtotal = 0;

        if ($jobTypeId) {
            $jobType = JobType::with(['priceTiers', 'sizeRates'])->find($jobTypeId);

            if ($jobType) {
                if ($jobType->sizeRates->isNotEmpty()) {
                    $sizeRateId = $request->input('size_rate_id');
                    $sizeRate = $jobType->sizeRates->firstWhere('id', $sizeRateId)
                        ?? $jobType->sizeRates->firstWhere('is_default', true)
                        ?? $jobType->sizeRates->first();

                    $width = (float)$request->input('size_width', 0);
                    $height = (float)$request->input('size_height', 0);

                    if ($sizeRate && $width > 0 && ($sizeRate->calculation_method === 'length' || $height > 0)) {
                        $measurement = $sizeRate->calculation_method === 'length'
                            ? $width
                            : $width * $height;
                        $subtotal = $measurement * (float)$sizeRate->rate * $quantity;
                        $ticketData['size_unit'] = $sizeRate->dimension_unit;
                        $ticketData['size_value'] = $sizeRate->calculation_method === 'length'
                            ? "{$width} {$sizeRate->dimension_unit}"
                            : "{$width} x {$height}";
                    }
                } elseif ($jobType->priceTiers->isNotEmpty()) {
                    $tier = $jobType->priceTiers
                        ->sortBy('min_quantity')
                        ->filter(function ($tier) use ($quantity) {
                            return $quantity >= $tier->min_quantity &&
                                (!$tier->max_quantity || $quantity <= $tier->max_quantity);
                        })
                        ->last();

                    $unitPrice = $tier ? (float)$tier->price : (float)$jobType->price;
                    $subtotal = $unitPrice * $quantity;
                } else {
                    $subtotal = (float)$jobType->price * $quantity;
                }
            }
        }

        if ($subtotal <= 0) {
            $subtotal = (float)($ticketData['subtotal'] ?? 0);
        }

        $ticketData['subtotal'] = round($subtotal, 2);
        $ticketData['total_amount'] = round($subtotal, 2);
    }
}
