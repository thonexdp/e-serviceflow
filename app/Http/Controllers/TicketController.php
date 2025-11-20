<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\TicketFile;
use App\Models\Customer;
use App\Models\JobCategory;
use App\Models\JobType;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TicketController extends BaseCrudController
{
    protected $model = Ticket::class;
    protected $resourceName = 'tickets';
    protected $viewPath = 'Tickets';

    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Display a listing of tickets.
     */
    public function index(Request $request)
    {
        $query = Ticket::with('customer', 'customerFiles');

        // Apply search
        if ($request->has('search') && $request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('ticket_number', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%')
                    ->orWhereHas('customer', function ($customerQuery) use ($request) {
                        $customerQuery->where('firstname', 'like', '%' . $request->search . '%')
                            ->orWhere('lastname', 'like', '%' . $request->search . '%');
                    });
            });
        }

        // Filter by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Filter by payment status
        if ($request->has('payment_status') && $request->payment_status) {
            $query->where('payment_status', $request->payment_status);
        }

        $tickets = $query->with('jobType.category')
            ->orderByRaw("
                CASE status
                    WHEN 'pending' THEN 1
                    WHEN 'in_production' THEN 2
                    WHEN 'completed' THEN 3
                    WHEN 'cancelled' THEN 4
                    ELSE 5
                END
            ")
            ->latest()->paginate($request->get('per_page', 15));

        // Get customers for dropdown/search
        $customers = \App\Models\Customer::latest()->limit(10)->get();

        // Get job categories and types for ticket form
        $jobCategories = JobCategory::with(['jobTypes' => function ($query) {
            $query->where('is_active', true)
                ->with(['priceTiers', 'sizeRates'])
                ->orderBy('sort_order')
                ->orderBy('name');
        }])->orderBy('name')->get();

        return Inertia::render('Tickets', [
            'tickets' => $tickets,
            'customers' => $customers,
            'jobCategories' => $jobCategories,
            'selectedCustomer' => $request->get('customer_id') ? \App\Models\Customer::find($request->get('customer_id')) : null,
            'filters' => $request->only(['search', 'status', 'payment_status']),
        ]);
    }

    /**
     * Store a newly created ticket.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'description' => 'required|string',
            'job_type' => 'nullable|string|max:255',
            'job_type_id' => 'nullable|exists:job_types,id',
            'quantity' => 'nullable|integer|min:1',
            'size_rate_id' => 'nullable|exists:job_type_size_rates,id',
            'size_width' => 'nullable|numeric|min:0',
            'size_height' => 'nullable|numeric|min:0',
            'size_value' => 'nullable|string|max:50',
            'size_unit' => 'nullable|string|max:10',
            'due_date' => 'nullable|date',
            'total_amount' => 'nullable|numeric|min:0',
            'subtotal' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'downpayment' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|string|in:cash,gcash,bank_account',
            'status' => 'nullable|string|in:pending,ready_to_print,in_production,completed,cancelled',
            'payment_status' => 'nullable|string|in:pending,partial,paid',
            'file' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
        ]);

        // Handle file upload
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->store('tickets/customer', 'public');
            $validated['file_path'] = $path;
        }

        $this->applyPricing($validated, $request);
        unset($validated['size_width'], $validated['size_height'], $validated['size_rate_id']);
        $ticket = Ticket::create($validated);

        // Save file to ticket_files if file was uploaded
        if ($request->hasFile('file')) {
            TicketFile::create([
                'ticket_id' => $ticket->id,
                'filename' => $request->file('file')->getClientOriginalName(),
                'filepath' => $path,
                'type' => 'customer',
            ]);
        }

        return redirect()
            ->route('tickets.index')
            ->with('success', 'Ticket created successfully.');
    }

    /**
     * Update the specified ticket.
     */
    public function update(Request $request, $id)
    {
        $ticket = Ticket::findOrFail($id);

        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'description' => 'required|string',
            'job_type' => 'nullable|string|max:255',
            'job_type_id' => 'nullable|exists:job_types,id',
            'quantity' => 'nullable|integer|min:1',
            'size_rate_id' => 'nullable|exists:job_type_size_rates,id',
            'size_width' => 'nullable|numeric|min:0',
            'size_height' => 'nullable|numeric|min:0',
            'size_value' => 'nullable|string|max:50',
            'size_unit' => 'nullable|string|max:10',
            'due_date' => 'nullable|date',
            'total_amount' => 'nullable|numeric|min:0',
            'subtotal' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'downpayment' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|string|in:cash,gcash,bank_account',
            'status' => 'nullable|string|in:pending,ready_to_print,in_production,completed,cancelled',
            'payment_status' => 'nullable|string|in:pending,partial,paid',
            'file' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
        ]);

        // Handle file upload
        if ($request->hasFile('file')) {
            // Delete old file if exists
            if ($ticket->file_path) {
                Storage::disk('public')->delete($ticket->file_path);
            }
            $file = $request->file('file');
            $path = $file->store('tickets/customer', 'public');
            $validated['file_path'] = $path;

            // Save new file to ticket_files
            TicketFile::create([
                'ticket_id' => $ticket->id,
                'filename' => $file->getClientOriginalName(),
                'filepath' => $path,
                'type' => 'customer',
            ]);
        }

        $this->applyPricing($validated, $request);
        unset($validated['size_width'], $validated['size_height'], $validated['size_rate_id']);

        $ticket->update($validated);

        return redirect()
            ->route('tickets.index')
            ->with('success', 'Ticket updated successfully.');
    }

    /**
     * Remove the specified ticket.
     */
    public function destroy($id)
    {
        $ticket = Ticket::findOrFail($id);

        // Delete associated file
        if ($ticket->file_path) {
            Storage::disk('public')->delete($ticket->file_path);
        }

        $ticket->delete();

        return redirect()
            ->route('tickets.index')
            ->with('success', 'Ticket deleted successfully.');
    }

    protected function applyPricing(array &$validated, Request $request): void
    {
        $jobTypeId = $validated['job_type_id'] ?? null;
        $quantity = max((int)($validated['quantity'] ?? 1), 1);
        $validated['quantity'] = $quantity;

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
                        $validated['size_unit'] = $sizeRate->dimension_unit;
                        $validated['size_value'] = $sizeRate->calculation_method === 'length'
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
            $subtotal = (float)($validated['subtotal'] ?? 0);
        }

        $validated['subtotal'] = round($subtotal, 2);

        $discountPercent = isset($validated['discount']) ? (float)$validated['discount'] : 0;
        $discountAmount = $discountPercent > 0 ? $subtotal * ($discountPercent / 100) : 0;

        $validated['total_amount'] = round($subtotal - $discountAmount, 2);
    }


    /**
     * Update ticket status with notes
     */
    public function updateStatus(Request $request, $id)
    {
        $ticket = Ticket::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:pending,ready_to_print,in_production,completed,cancelled',
            'notes' => 'nullable|string|max:500',
        ]);

        // Update the status
        $ticket->status = $validated['status'];

        // If there are notes, you can save them (add a notes field to your tickets table)
        if (!empty($validated['notes'])) {
            $ticket->status_notes = $validated['notes'];
        }

        $ticket->save();

        // Optional: Log the status change
        // StatusChangeLog::create([
        //     'ticket_id' => $ticket->id,
        //     'user_id' => auth()->id(),
        //     'old_status' => $ticket->getOriginal('status'),
        //     'new_status' => $validated['status'],
        //     'notes' => $validated['notes'],
        // ]);

        return response()->json([
            'success' => true,
            'message' => 'Ticket status updated successfully',
            'ticket' => $ticket->fresh()
        ]);
    }

    /**
     * Update payment status with payment details
     */
    public function updatePayment(Request $request, $id)
    {
        $ticket = Ticket::findOrFail($id);

        $validated = $request->validate([
            'payment_status' => 'required|in:pending,partial,paid',
            'amount_paid' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|in:cash,gcash,bank_transfer,credit_card,check',
            'payment_notes' => 'nullable|string|max:500',
        ]);

        // Update payment status
        $ticket->payment_status = $validated['payment_status'];

        // If amount is provided, add it to the total amount paid
        if (!empty($validated['amount_paid']) && $validated['amount_paid'] > 0) {
            $currentPaid = $ticket->amount_paid ?? 0;
            $ticket->amount_paid = $currentPaid + $validated['amount_paid'];

            // Check if fully paid and update status accordingly
            if ($ticket->amount_paid >= $ticket->total_amount) {
                $ticket->payment_status = 'paid';
            } elseif ($ticket->amount_paid > 0) {
                $ticket->payment_status = 'partial';
            }
        }

        $ticket->save();

        // Optional: Create payment transaction record
        // PaymentTransaction::create([
        //     'ticket_id' => $ticket->id,
        //     'user_id' => auth()->id(),
        //     'amount' => $validated['amount_paid'],
        //     'payment_method' => $validated['payment_method'],
        //     'payment_notes' => $validated['payment_notes'],
        //     'balance_before' => $ticket->total_amount - ($currentPaid ?? 0),
        //     'balance_after' => $ticket->total_amount - $ticket->amount_paid,
        // ]);

        return response()->json([
            'success' => true,
            'message' => 'Payment updated successfully',
            'ticket' => $ticket->fresh(),
            'new_balance' => $ticket->total_amount - $ticket->amount_paid
        ]);
    }

    protected function getValidationRules(string $action, $model = null): array
    {
        return [
            'customer_id' => 'required|exists:customers,id',
            'description' => 'required|string',
            'job_type' => 'nullable|string|max:255',
            'job_type_id' => 'nullable|exists:job_types,id',
            'quantity' => 'nullable|integer|min:1',
            'size_rate_id' => 'nullable|exists:job_type_size_rates,id',
            'size_width' => 'nullable|numeric|min:0',
            'size_height' => 'nullable|numeric|min:0',
            'size_value' => 'nullable|string|max:50',
            'size_unit' => 'nullable|string|max:10',
            'due_date' => 'nullable|date',
            'total_amount' => 'nullable|numeric|min:0',
            'subtotal' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'downpayment' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|string|in:cash,gcash,bank_account',
            'status' => 'nullable|string|in:pending,ready_to_print,in_production,completed,cancelled',
            'payment_status' => 'nullable|string|in:pending,partial,paid',
        ];
    }
}
