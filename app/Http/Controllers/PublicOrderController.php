<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Ticket;
use App\Models\TicketFile;
use App\Models\JobType;
use App\Services\PaymentRecorder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PublicOrderController extends Controller
{
    public function __construct(protected PaymentRecorder $paymentRecorder)
    {
    }

    /**
     * Find or create a customer by email
     */
    public function findOrCreateCustomer(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email|max:255',
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'nullable|string|max:20',
            'customer_facebook' => 'nullable|string|max:255',
        ]);

        // Split name into firstname and lastname
        $nameParts = explode(' ', trim($validated['customer_name']), 2);
        $firstname = $nameParts[0] ?? '';
        $lastname = $nameParts[1] ?? '';

        // Try to find existing customer by email
        $customer = Customer::where('email', $validated['email'])->first();

        if ($customer) {
            // Update customer info if provided (only update if new values are provided)
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
            // Create new customer
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

    /**
     * Store a public order (create ticket)
     */
    public function storeOrder(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'description' => 'required|string',
            'job_type_id' => 'required|exists:job_types,id',
            'quantity' => 'required|integer|min:1',
            'free_quantity' => 'nullable|integer|min:0',
            'size_rate_id' => 'nullable|exists:job_type_size_rates,id',
            'size_width' => 'nullable|numeric|min:0',
            'size_height' => 'nullable|numeric|min:0',
            'size_value' => 'nullable|string|max:50',
            'size_unit' => 'nullable|string|max:10',
            'due_date' => 'required|date',
            'subtotal' => 'nullable|numeric|min:0',
            'total_amount' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|string|in:walkin,gcash,bank',
            'file' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
            'payment_proofs.*' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
        ]);

        $paymentMethod = $validated['payment_method'] ?? 'walkin';
        $paymentStatus = ($paymentMethod === 'walkin') ? 'pending' : 'pending';
        
        $ticketData = [
            'customer_id' => $validated['customer_id'],
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

        // Handle size values
        if (isset($validated['size_value'])) {
            $ticketData['size_value'] = $validated['size_value'];
        }
        if (isset($validated['size_unit'])) {
            $ticketData['size_unit'] = $validated['size_unit'];
        }

        // Handle file upload
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->store('tickets/customer', 'public');
            $ticketData['file_path'] = $path;
        }

        // Apply pricing calculation
        $this->applyPricing($ticketData, $request);

        // Remove transient fields
        unset($ticketData['size_width'], $ticketData['size_height'], $ticketData['size_rate_id']);

        $ticket = Ticket::create($ticketData);

        // Store file as ticket attachment
        if ($request->hasFile('file') && isset($path)) {
            TicketFile::create([
                'ticket_id' => $ticket->id,
                'filename' => $request->file('file')->getClientOriginalName(),
                'filepath' => $path,
                'type' => 'customer',
            ]);
        }

        // Record initial payment if payment proofs are provided
        if ($request->hasFile('payment_proofs') && ($paymentMethod === 'gcash' || $paymentMethod === 'bank')) {
            $this->paymentRecorder->record(
                [
                    'ticket_id' => $ticket->id,
                    'payment_method' => $paymentMethod,
                    'amount' => 0, // Will be updated by frontdesk
                    'payment_date' => now()->toDateString(),
                    'allocation' => 'downpayment',
                    'notes' => 'Payment proof uploaded during order submission.',
                    'payment_type' => 'collection',
                ],
                $request->file('payment_proofs', [])
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Order submitted successfully! We will contact you shortly.',
            'ticket' => $ticket->load('customer'),
            'ticket_number' => $ticket->ticket_number,
        ]);
    }

    /**
     * Apply pricing calculation (similar to TicketController)
     */
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

