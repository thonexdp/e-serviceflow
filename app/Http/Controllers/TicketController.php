<?php


namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\TicketFile;
use App\Models\Customer;
use App\Models\JobCategory;
use App\Models\JobType;
use App\Models\Payment;
use App\Models\Notification;
use App\Models\User;
use App\Services\PaymentRecorder;
use App\Events\TicketStatusChanged;
use App\Http\Controllers\Traits\HasRoleBasedRoutes;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class TicketController extends BaseCrudController
{
    use HasRoleBasedRoutes;

    protected $model = Ticket::class;
    protected $resourceName = 'tickets';
    protected $viewPath = 'Tickets';

    public function __construct(protected PaymentRecorder $paymentRecorder)
    {
        parent::__construct();
    }

    /**
     * Display a listing of tickets.
     */
    public function index(Request $request)
    {
        $query = Ticket::with(['customer', 'customerFiles', 'payments.documents']);

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

        // Filter by customer
        if ($request->has('customer_id') && $request->customer_id) {
            $query->where('customer_id', $request->customer_id);
        }

        // Default to Last 30 Days if no date range is specified
        $dateRange = $request->get('date_range');
        $startDate = $request->get('start_date');
        $endDate = $request->get('end_date');

        // If no date_range parameter exists at all, set default to last_30_days
        if (!$request->has('date_range')) {
            $dateRange = 'last_30_days';
            $thirtyDaysAgo = now()->subDays(30)->format('Y-m-d');
            $today = now()->format('Y-m-d');
            $startDate = $thirtyDaysAgo;
            $endDate = $today;
        }

        // Filter by date range (only if date_range is not explicitly empty)
        if ($dateRange !== '') {
            if ($startDate) {
                $query->whereDate('created_at', '>=', $startDate);
            }

            if ($endDate) {
                $query->whereDate('created_at', '<=', $endDate);
            }
        }

        $tickets = $query->with('jobType.category')
            ->orderByRaw("
                CASE status
                    WHEN 'pending' THEN 1
                    WHEN 'in_designer' THEN 2
                    WHEN 'in_production' THEN 3
                    WHEN 'completed' THEN 4
                    WHEN 'cancelled' THEN 5
                    ELSE 5
                END
            ")
            ->latest()->paginate($request->get('per_page', 15));

        // Get customers for dropdown/search
        $customers = \App\Models\Customer::latest()->limit(10)->get();

        // Get job categories and types for ticket form
        $jobCategories = JobCategory::with(['jobTypes' => function ($query) {
            $query->where('is_active', true)
                ->with(['priceTiers', 'sizeRates', 'promoRules'])
                ->orderBy('sort_order')
                ->orderBy('name');
        }])->orderBy('name')->get();

        return Inertia::render('Tickets', [
            'tickets' => $tickets,
            'customers' => $customers,
            'jobCategories' => $jobCategories,
            'selectedCustomer' => $request->get('customer_id') ? \App\Models\Customer::find($request->get('customer_id')) : null,
            'filters' => [
                'search' => $request->get('search'),
                'status' => $request->get('status'),
                'payment_status' => $request->get('payment_status'),
                'date_range' => $dateRange,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
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
            'free_quantity' => 'nullable|integer|min:0',
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
            'status' => 'nullable|string|in:pending,ready_to_print,in_designer,in_production,completed,cancelled',
            'payment_status' => 'nullable|string|in:pending,partial,paid',
            'file' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
            'attachments.*' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
            'payment_proofs.*' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
            'initial_payment_reference' => 'nullable|string|max:150',
            'initial_payment_notes' => 'nullable|string|max:500',
            'initial_payment_or' => 'nullable|string|max:100',
        ]);

        $ticketData = $validated;

        // Remove request-only fields before persisting
        $transientKeys = [
            'attachments',
            'payment_proofs',
            'initial_payment_reference',
            'initial_payment_notes',
            'initial_payment_or',
        ];
        foreach ($transientKeys as $key) {
            unset($ticketData[$key]);
        }

        // Handle legacy single file upload
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->store('tickets/customer', 'public');
            $ticketData['file_path'] = $path;
        }

        $this->applyPricing($ticketData, $request);
        unset($ticketData['size_width'], $ticketData['size_height'], $ticketData['size_rate_id']);


        $ticket = Ticket::create($ticketData);

        if ($request->hasFile('file') && isset($path)) {
            TicketFile::create([
                'ticket_id' => $ticket->id,
                'filename' => $request->file('file')->getClientOriginalName(),
                'filepath' => $path,
                'type' => 'customer',
            ]);
        }

        // Store any additional attachments
        foreach ($request->file('attachments', []) as $attachment) {
            if (!$attachment) {
                continue;
            }
            $storedPath = $attachment->store('tickets/customer', 'public');
            TicketFile::create([
                'ticket_id' => $ticket->id,
                'filename' => $attachment->getClientOriginalName(),
                'filepath' => $storedPath,
                'type' => 'customer',
            ]);
        }

        // Record initial payment if downpayment is provided
        $downpaymentAmount = (float)($ticketData['downpayment'] ?? 0);
        if ($downpaymentAmount > 0) {
            $this->paymentRecorder->record(
                [
                    'ticket_id' => $ticket->id,
                    'payment_method' => $ticketData['payment_method'] ?? 'cash',
                    'amount' => $downpaymentAmount,
                    'payment_date' => now()->toDateString(),
                    'allocation' => 'downpayment',
                    'payment_reference' => $validated['initial_payment_reference'] ?? null,
                    'official_receipt_number' => $validated['initial_payment_or'] ?? null,
                    'notes' => $validated['initial_payment_notes'] ?? 'Recorded during ticket creation.',
                    'payment_type' => 'collection',
                ],
                (array)$request->file('payment_proofs', [])
            );
        }

        // Notify designers when ticket is created (status: pending)
        // if ($ticket->status === 'pending') {
        if ($ticket->status === 'in_designer') {
            $this->notifyTicketCreated($ticket);
        }

        return $this->redirectToRoleRoute('tickets.index')
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
            'free_quantity' => 'nullable|integer|min:0',
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
            'status' => 'nullable|string|in:pending,ready_to_print,in_designer,in_production,completed,cancelled',
            'payment_status' => 'nullable|string|in:pending,partial,paid',
            'file' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
            'attachments.*' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
            'payment_proofs.*' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
            'initial_payment_reference' => 'nullable|string|max:150',
            'initial_payment_notes' => 'nullable|string|max:500',
            'initial_payment_or' => 'nullable|string|max:100',
        ]);

        $ticketData = $validated;
        $transientKeys = [
            'attachments',
            'payment_proofs',
            'initial_payment_reference',
            'initial_payment_notes',
            'initial_payment_or',
        ];
        foreach ($transientKeys as $key) {
            unset($ticketData[$key]);
        }

        // Handle file upload
        if ($request->hasFile('file')) {
            if ($ticket->file_path) {
                Storage::disk('public')->delete($ticket->file_path);
            }
            $file = $request->file('file');
            $path = $file->store('tickets/customer', 'public');
            $ticketData['file_path'] = $path;

            TicketFile::create([
                'ticket_id' => $ticket->id,
                'filename' => $file->getClientOriginalName(),
                'filepath' => $path,
                'type' => 'customer',
            ]);
        }

        $this->applyPricing($ticketData, $request);
        unset($ticketData['size_width'], $ticketData['size_height'], $ticketData['size_rate_id']);

        $ticket->update($ticketData);

        foreach ($request->file('attachments', []) as $attachment) {
            if (!$attachment) {
                continue;
            }
            $storedPath = $attachment->store('tickets/customer', 'public');
            TicketFile::create([
                'ticket_id' => $ticket->id,
                'filename' => $attachment->getClientOriginalName(),
                'filepath' => $storedPath,
                'type' => 'customer',
            ]);
        }

        return $this->redirectToRoleRoute('tickets.index')
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

        return $this->redirectToRoleRoute('tickets.index')
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
        $oldStatus = $ticket->status;

        $validated = $request->validate([
            'status' => 'required|in:pending,ready_to_print,in_designer,in_production,completed,cancelled,approved,rejected',
            'notes' => 'nullable|string|max:500',
        ]);

        // Update the status
        $ticket->status = $validated['status'];

        // If there are notes, you can save them (add a notes field to your tickets table)
        if (!empty($validated['notes'])) {
            $ticket->status_notes = $validated['notes'];
        }

        $ticket->save();

        // Notify users about status change
        if ($oldStatus !== $ticket->status) {
            $this->notifyStatusChange($ticket, $oldStatus, $ticket->status);
        }

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
            'amount_paid' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|in:' . implode(',', Payment::METHODS),
            'payment_date' => 'required|date',
            'allocation' => 'nullable|string|in:' . implode(',', Payment::ALLOCATIONS),
            'payment_reference' => 'nullable|string|max:150',
            'official_receipt_number' => 'nullable|string|max:100',
            'payment_notes' => 'nullable|string|max:500',
            'attachments.*' => 'file|mimes:jpg,jpeg,png,pdf|max:8192',
        ]);

        $payment = $this->paymentRecorder->record(
            [
                'ticket_id' => $ticket->id,
                'payment_method' => $validated['payment_method'],
                'amount' => $validated['amount_paid'],
                'payment_date' => $validated['payment_date'],
                'allocation' => $validated['allocation'] ?? null,
                'payment_reference' => $validated['payment_reference'] ?? null,
                'official_receipt_number' => $validated['official_receipt_number'] ?? null,
                'notes' => $validated['payment_notes'] ?? null,
                'payment_type' => 'collection',
            ],
            (array)$request->file('attachments', [])
        );

        $ticket->refresh()->load(['payments.documents', 'customer']);

        return response()->json([
            'success' => true,
            'message' => 'Payment recorded successfully',
            'ticket' => $ticket,
            'payment' => $payment,
            'new_balance' => $ticket->outstanding_balance,
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
            'free_quantity' => 'nullable|integer|min:0',
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
            'status' => 'nullable|string|in:pending,ready_to_print,in_designer,in_production,completed,cancelled',
            'payment_status' => 'nullable|string|in:pending,partial,paid',
        ];
    }

    /**
     * Notify designers when a new ticket is created (status: pending)
     */
    protected function notifyTicketCreated(Ticket $ticket): void
    {
        $designers = User::where('role', User::ROLE_DESIGNER)->get();
        $recipientIds = $designers->pluck('id')->toArray();

        if (empty($recipientIds)) {
            return;
        }

        $title = 'New Ticket Created';
        $message = "Ticket {$ticket->ticket_number} has been created and requires your review.";

        foreach ($designers as $designer) {
            Notification::create([
                'user_id' => $designer->id,
                'type' => 'ticket_created',
                'notifiable_id' => $ticket->id,
                'notifiable_type' => Ticket::class,
                'title' => $title,
                'message' => $message,
                'data' => [
                    'ticket_id' => $ticket->id,
                    'ticket_number' => $ticket->ticket_number,
                    'status' => $ticket->status,
                ],
            ]);
        }

        // Broadcast event
        event(new TicketStatusChanged(
            $ticket,
            'new',
            // 'pending',
            'in_designer',
            Auth::user(),
            $recipientIds,
            'ticket_created',
            $title,
            $message
        ));
    }

    /**
     * Notify users about ticket status changes
     */
    protected function notifyStatusChange(Ticket $ticket, string $oldStatus, string $newStatus): void
    {
        $triggeredBy = Auth::user();
        $recipientIds = [];
        $notificationType = '';
        $title = '';
        $message = '';

        // Determine recipients and notification content based on status change
        switch ($newStatus) {
            case 'approved':
                // Notify FrontDesk and Production
                $frontDeskUsers = User::where('role', User::ROLE_FRONTDESK)->get();
                $productionUsers = User::where('role', User::ROLE_PRODUCTION)->get();
                $recipientIds = $frontDeskUsers->pluck('id')->merge($productionUsers->pluck('id'))->toArray();
                $notificationType = 'ticket_approved';
                $title = 'Ticket Approved';
                $message = "Ticket {$ticket->ticket_number} has been approved by {$triggeredBy->name}.";
                break;

            case 'rejected':
            case 'cancelled':
                // Notify FrontDesk
                $frontDeskUsers = User::where('role', User::ROLE_FRONTDESK)->get();
                $recipientIds = $frontDeskUsers->pluck('id')->toArray();
                $notificationType = 'ticket_rejected';
                $title = 'Ticket ' . ucfirst($newStatus);
                $message = "Ticket {$ticket->ticket_number} has been {$newStatus} by {$triggeredBy->name}.";
                break;

            case 'in_production':
                // Notify FrontDesk (optional)
                $frontDeskUsers = User::where('role', User::ROLE_FRONTDESK)->get();
                $recipientIds = $frontDeskUsers->pluck('id')->toArray();
                $notificationType = 'ticket_in_production';
                $title = 'Ticket In Production';
                $message = "Ticket {$ticket->ticket_number} is now in production.";
                break;

            case 'completed':
                // Notify FrontDesk (optional)
                $frontDeskUsers = User::where('role', User::ROLE_FRONTDESK)->get();
                $recipientIds = $frontDeskUsers->pluck('id')->toArray();
                $notificationType = 'ticket_completed';
                $title = 'Ticket Completed';
                $message = "Ticket {$ticket->ticket_number} has been completed.";
                break;
        }

        if (empty($recipientIds) || empty($notificationType)) {
            return;
        }

        // Create notifications for all recipients
        $users = User::whereIn('id', $recipientIds)->get();
        foreach ($users as $user) {
            Notification::create([
                'user_id' => $user->id,
                'type' => $notificationType,
                'notifiable_id' => $ticket->id,
                'notifiable_type' => Ticket::class,
                'title' => $title,
                'message' => $message,
                'data' => [
                    'ticket_id' => $ticket->id,
                    'ticket_number' => $ticket->ticket_number,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                ],
            ]);
        }

        // Broadcast event
        event(new TicketStatusChanged(
            $ticket,
            $oldStatus,
            $newStatus,
            $triggeredBy,
            $recipientIds,
            $notificationType,
            $title,
            $message
        ));
    }
}
