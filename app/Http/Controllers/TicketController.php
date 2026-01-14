<?php

/*!
 * Developed By: Antonio Jr De Paz
 * Built with: Laravel, Inertia, React
 * Year: 2025
 */


namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\TicketFile;
use App\Models\Customer;
use App\Models\JobCategory;
use App\Models\JobType;
use App\Models\Payment;
use App\Models\Notification;
use App\Models\User;
use App\Models\UserActivityLog;
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


    public function index(Request $request)
    {

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $query = Ticket::with(['customer', 'customerFiles', 'payments.documents', 'mockupFiles', 'assignedToUser', 'orderBranch', 'productionBranch']);


        if ($user && !$user->isAdmin()) {
            if ($user->branch_id) {

                if ($user->isFrontDesk() || $user->isCashier()) {
                    $query->where('order_branch_id', $user->branch_id);
                } elseif ($user->isProduction()) {
                    $query->where('production_branch_id', $user->branch_id);
                }
            } else {

                $query->whereRaw('1 = 0');
            }
        }


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


        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }


        if ($request->has('payment_status') && $request->payment_status) {
            $query->where('payment_status', $request->payment_status);
        }


        if ($request->has('customer_id') && $request->customer_id) {
            $query->where('customer_id', $request->customer_id);
        }


        if ($user->isAdmin() && $request->has('branch_id') && $request->branch_id) {
            $query->where('order_branch_id', $request->branch_id);
        }


        $dateRange = $request->get('date_range');
        $startDate = $request->get('start_date');
        $endDate = $request->get('end_date');


        if (!$request->has('date_range')) {
            $dateRange = 'last_30_days';
            $thirtyDaysAgo = now()->subDays(30)->format('Y-m-d');
            $today = now()->format('Y-m-d');
            $startDate = $thirtyDaysAgo;
            $endDate = $today;
        }


        if ($dateRange !== '') {
            if ($startDate) {
                $query->whereDate('created_at', '>=', $startDate);
            }

            if ($endDate) {
                $query->whereDate('created_at', '<=', $endDate);
            }
        }


        $orderBy = $request->get('order_by', 'due_date');
        $orderDir = $request->get('order_dir', 'asc');


        $allowedOrderBy = ['due_date', 'created_at', 'ticket_number', 'status', 'payment_status', 'total_amount'];
        if (!in_array($orderBy, $allowedOrderBy)) {
            $orderBy = 'due_date';
        }


        $orderDir = strtolower($orderDir) === 'desc' ? 'desc' : 'asc';

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
            ->orderBy($orderBy, $orderDir)
            ->paginate($request->get('per_page', 15));


        $customers = \App\Models\Customer::latest()->limit(10)->get();


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
                'branch_id' => $request->get('branch_id'),
                'date_range' => $dateRange,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'order_by' => $orderBy,
                'order_dir' => $orderDir,
            ],
            'branches' => $user->isAdmin() ? \App\Models\Branch::active()->get() : [],
            'customer_order_qrcode' => \App\Models\Setting::get('customer_order_qrcode', ''),
        ]);
    }


    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'description' => 'required|string',
            'job_type' => 'nullable|string|max:255',
            'job_type_id' => 'nullable|exists:job_types,id',
            'custom_workflow_steps' => 'nullable|array',
            'custom_workflow_steps.*' => 'string|in:printing,lamination_heatpress,cutting,sewing,dtf_press,embroidery,knitting,lasser_cutting,qa',
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
            'payment_method' => 'nullable|string|in:cash,gcash,bank_transfer,credit_card,check,government_ar',
            'status' => 'nullable|string|in:pending,ready_to_print,in_designer,in_production,completed,cancelled',
            'payment_status' => 'nullable|string|in:pending,partial,paid,awaiting_verification',
            'file' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
            'attachments.*' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
            'payment_proofs.*' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
            'initial_payment_reference' => 'nullable|string|max:150',
            'initial_payment_notes' => 'nullable|string|max:500',
            'initial_payment_or' => 'nullable|string|max:100',
            'order_branch_id' => 'nullable|exists:branches,id',
            'production_branch_id' => 'nullable|exists:branches,id',
            // Custom job type fields for "Others" category
            'custom_job_type_description' => 'nullable|string|max:255',
            'custom_price_mode' => 'nullable|string|in:per_item,fixed_total',
            'custom_price_per_item' => 'nullable|numeric|min:0',
            'custom_fixed_total' => 'nullable|numeric|min:0',
            'is_size_based' => 'nullable|boolean',
            'custom_width' => 'nullable|numeric|min:0',
            'custom_height' => 'nullable|numeric|min:0',
            'selected_color' => 'nullable|string|max:50',
            'design_description' => 'nullable|string',
        ]);

        $ticketData = $validated;

        // Note: custom_workflow_steps is now allowed for all tickets, not just "Others" category
        // We no longer clear workflow steps when job_type_id is set


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


        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $disk = app()->environment('production') ? 's3' : 'public';
            $path = Storage::disk($disk)->put('tickets/customer', $file, $disk === 's3' ? 'public' : []);
            $ticketData['file_path'] = $path;
        }

        $this->applyPricing($ticketData, $request);
        unset($ticketData['size_width'], $ticketData['size_height'], $ticketData['size_rate_id']);


        $ticket = Ticket::create($ticketData);

        UserActivityLog::log(
            Auth::id(),
            'ticket_created',
            "Created ticket #{$ticket->ticket_number} for customer " . ($ticket->customer ? $ticket->customer->full_name : 'Walk-in'),
            $ticket,
            $ticket->toArray()
        );

        if ($request->hasFile('file') && isset($path)) {
            TicketFile::create([
                'ticket_id' => $ticket->id,
                'file_name' => $request->file('file')->getClientOriginalName(),
                'file_path' => $path,
                'type' => 'customer',
            ]);
        }


        foreach ($request->file('attachments', []) as $attachment) {
            if (!$attachment) {
                continue;
            }
            $disk = app()->environment('production') ? 's3' : 'public';
            $storedPath = Storage::disk($disk)->put('tickets/customer', $attachment, $disk === 's3' ? 'public' : []);
            TicketFile::create([
                'ticket_id' => $ticket->id,
                'file_name' => $attachment->getClientOriginalName(),
                'file_path' => $storedPath,
                'type' => 'customer',
            ]);
        }


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



        if ($ticket->status === 'in_designer') {
            $this->notifyTicketCreated($ticket);
        }

        if ($ticket->status === 'pending') {
            $this->notifyCashierNewTicket($ticket);
        }

        return $this->redirectToRoleRoute('tickets.index', ['customer_id' => $ticket->customer_id])
            ->with('success', 'Ticket created successfully.');
    }


    public function update(Request $request, $id)
    {

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $ticket = Ticket::with('jobType')->findOrFail($id);


        if ($user && !$user->isAdmin()) {
            if ($user->branch_id) {

                if ($user->isFrontDesk() || $user->isCashier()) {
                    if ($ticket->order_branch_id !== $user->branch_id) {
                        abort(403, 'You do not have permission to edit this ticket. It belongs to a different branch.');
                    }
                } elseif ($user->isProduction()) {
                    if ($ticket->production_branch_id !== $user->branch_id) {
                        abort(403, 'You do not have permission to edit this ticket. Production is handled by a different branch.');
                    }
                }
            } else {

                abort(403, 'You do not have permission to edit tickets.');
            }
        }

        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'description' => 'required|string',
            'job_type' => 'nullable|string|max:255',
            'job_type_id' => 'nullable|exists:job_types,id',
            'custom_workflow_steps' => 'nullable|array',
            'custom_workflow_steps.*' => 'string|in:printing,lamination_heatpress,cutting,sewing,dtf_press,embroidery,knitting,lasser_cutting,qa',
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
            'payment_method' => 'nullable|string|in:cash,gcash,bank_transfer,credit_card,check,government_ar',
            'status' => 'nullable|string|in:pending,ready_to_print,in_designer,in_production,completed,cancelled',
            'payment_status' => 'nullable|string|in:pending,partial,paid,awaiting_verification',
            'file' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
            'attachments.*' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
            'payment_proofs.*' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
            'initial_payment_reference' => 'nullable|string|max:150',
            'initial_payment_notes' => 'nullable|string|max:500',
            'initial_payment_or' => 'nullable|string|max:100',
            'order_branch_id' => 'nullable|exists:branches,id',
            'production_branch_id' => 'nullable|exists:branches,id',
            // Custom job type fields for "Others" category
            'custom_job_type_description' => 'nullable|string|max:255',
            'custom_price_mode' => 'nullable|string|in:per_item,fixed_total',
            'custom_price_per_item' => 'nullable|numeric|min:0',
            'custom_fixed_total' => 'nullable|numeric|min:0',
            'is_size_based' => 'nullable|boolean',
            'custom_width' => 'nullable|numeric|min:0',
            'custom_height' => 'nullable|numeric|min:0',
            'selected_color' => 'nullable|string|max:50',
            'design_description' => 'nullable|string',
        ]);

        $ticketData = $validated;

        // Note: custom_workflow_steps is now allowed for all tickets, not just "Others" category
        // We no longer clear workflow steps when job_type_id is set
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


        if ($request->hasFile('file')) {
            if ($ticket->file_path) {
                $disk = app()->environment('production') ? 's3' : 'public';
                Storage::disk($disk)->delete($ticket->file_path);
            }
            $file = $request->file('file');
            $disk = app()->environment('production') ? 's3' : 'public';
            $path = Storage::disk($disk)->put('tickets/customer', $file, $disk === 's3' ? 'public' : []);
            $ticketData['file_path'] = $path;

            TicketFile::create([
                'ticket_id' => $ticket->id,
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'type' => 'customer',
            ]);
        }

        $this->applyPricing($ticketData, $request);
        unset($ticketData['size_width'], $ticketData['size_height'], $ticketData['size_rate_id']);

        // Determine workflow status for custom/Others category tickets
        // Check if this is a custom ticket (Others category or has custom_workflow_steps)
        $isCustomTicket = !empty($ticketData['custom_workflow_steps']) ||
            !empty($ticketData['custom_job_type_description']) ||
            (!isset($ticketData['job_type_id']) && isset($ticketData['job_type']));

        $isPendingOrInDesigner = $ticket->status === 'pending' || $ticket->status === 'in_designer';

        if ($isCustomTicket && !empty($ticketData['custom_workflow_steps'])) {
            // Check if printing workflow exists
            $workflowSteps = $ticketData['custom_workflow_steps'];
            $hasPrintingWorkflow = false;

            if (is_array($workflowSteps)) {
                $hasPrintingWorkflow = in_array('printing', $workflowSteps, true);
            }


            // Only update status/workflow if ticket is in a state that allows it
            // Don't override if ticket is already in_production, completed, or cancelled
            // if (!in_array($ticket->status, ['in_production', 'completed', 'cancelled'])) {
            if (!in_array($ticket->status, ['completed', 'cancelled'])) {
                // if ($hasPrintingWorkflow) {
                //     // Has printing: use ready_to_print status
                //     if ($ticket->status === 'pending' || $ticket->status === 'in_designer') {
                //         // Don't change status, let it flow naturally
                //     }
                // } else {
                // No printing: if status would be ready_to_print, change to in_production
                // and set the first workflow step
                // dd($hasPrintingWorkflow, $ticketData['status']);

                // if (isset($ticketData['status']) && $ticketData['status'] === 'ready_to_print') {
                if (isset($ticketData['status'])) {
                    if (!$isPendingOrInDesigner) {
                        if ($hasPrintingWorkflow) {
                            $ticketData['status'] = 'ready_to_print';
                        } else {
                            $ticketData['status'] = 'in_production';
                        }
                    }
                    // Get first workflow step
                    if (!empty($workflowSteps)) {
                        $stepOrder = [
                            'printing',
                            'lamination_heatpress',
                            'cutting',
                            'sewing',
                            'dtf_press',
                            'embroidery',
                            'knitting',
                            'lasser_cutting',
                            'qa'
                        ];
                        if (!$isPendingOrInDesigner) {
                            foreach ($stepOrder as $step) {
                                if (in_array($step, $workflowSteps, true)) {
                                    $ticketData['current_workflow_step'] = $step;
                                    break;
                                }
                            }
                        }
                    }
                    // }
                }
            }
        }

        $ticket->update($ticketData);

        UserActivityLog::log(
            Auth::id(),
            'ticket_updated',
            "Updated ticket #{$ticket->ticket_number}",
            $ticket,
            $ticketData
        );

        foreach ($request->file('attachments', []) as $attachment) {
            if (!$attachment) {
                continue;
            }
            $disk = app()->environment('production') ? 's3' : 'public';
            $storedPath = Storage::disk($disk)->put('tickets/customer', $attachment, $disk === 's3' ? 'public' : []);
            TicketFile::create([
                'ticket_id' => $ticket->id,
                'file_name' => $attachment->getClientOriginalName(),
                'file_path' => $storedPath,
                'type' => 'customer',
            ]);
        }

        return $this->redirectToRoleRoute('tickets.index', ['customer_id' => $ticket->customer_id])
            ->with('success', 'Ticket updated successfully.');
    }


    /**
     * Check if ticket can be deleted and get dependencies
     */
    public function checkDeletion($id)
    {
        $ticket = Ticket::findOrFail($id);
        $result = $ticket->canBeDeleted();
        return response()->json($result);
    }

    public function destroy($id)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $ticket = Ticket::findOrFail($id);


        if ($user && !$user->isAdmin()) {
            if ($user->branch_id) {

                if ($user->isFrontDesk() || $user->isCashier()) {
                    if ($ticket->order_branch_id !== $user->branch_id) {
                        abort(403, 'You do not have permission to delete this ticket. It belongs to a different branch.');
                    }
                } elseif ($user->isProduction()) {
                    abort(403, 'Production users do not have permission to delete tickets.');
                }
            } else {

                abort(403, 'You do not have permission to delete tickets.');
            }
        }

        // Check if can be deleted
        $check = $ticket->canBeDeleted();

        if (!$check['can_delete']) {
            return $this->redirectToRoleRoute('tickets.index')
                ->with('error', 'Cannot delete ticket. It is currently in progress or has active dependencies.');
        }


        if ($ticket->file_path) {
            Storage::disk('s3')->delete($ticket->file_path);
        }

        $ticket->delete();

        UserActivityLog::log(
            Auth::id(),
            'ticket_deleted',
            "Deleted ticket #{$ticket->ticket_number}",
            $ticket
        );

        return $this->redirectToRoleRoute('tickets.index')
            ->with('success', 'Ticket deleted successfully.');
    }

    protected function applyPricing(array &$validated, Request $request): void
    {
        $jobTypeId = $validated['job_type_id'] ?? null;
        $quantity = max((int)($validated['quantity'] ?? 1), 1);
        $validated['quantity'] = $quantity;

        $subtotal = 0;

        // Handle custom job types (Others category)
        if (!$jobTypeId && isset($validated['custom_job_type_description'])) {
            // This is a custom job type from "Others" category
            $customPriceMode = $validated['custom_price_mode'] ?? 'per_item';

            if ($customPriceMode === 'per_item') {
                $pricePerItem = (float)($validated['custom_price_per_item'] ?? 0);
                $subtotal = $pricePerItem * $quantity;
            } elseif ($customPriceMode === 'fixed_total') {
                $subtotal = (float)($validated['custom_fixed_total'] ?? 0);
            }

            // Store the custom job type description in the job_type field for display
            if (!empty($validated['custom_job_type_description'])) {
                $validated['job_type'] = $validated['custom_job_type_description'];
            }
        } elseif ($jobTypeId) {
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



    public function updateStatus(Request $request, $id)
    {
        $ticket = Ticket::findOrFail($id);
        $oldStatus = $ticket->status;

        $validated = $request->validate([
            'status' => 'required|in:pending,ready_to_print,in_designer,in_production,completed,cancelled,approved,rejected',
            'notes' => 'nullable|string|max:500',
            'design_status' => 'nullable|in:pending,in_designer,cancelled',
        ]);

        // Check if workflow steps are set when changing to "In Designer"
        // Only check for custom tickets (job_type_id is null) or "Others" category tickets
        if ($validated['status'] === 'in_designer') {
            // Determine if this is a custom/others ticket
            $isCustomTicket = !$ticket->job_type_id ||
                $ticket->custom_job_type_description ||
                (is_string($ticket->job_type) && !empty($ticket->job_type));

            // Only validate workflow steps for custom tickets
            if ($isCustomTicket) {
                $workflowSteps = $ticket->custom_workflow_steps;
                $hasWorkflowSteps = false;

                if ($workflowSteps) {
                    if (is_array($workflowSteps)) {
                        $hasWorkflowSteps = count($workflowSteps) > 0;
                    } elseif (is_object($workflowSteps)) {
                        $hasWorkflowSteps = count((array)$workflowSteps) > 0;
                    }
                }

                if (!$hasWorkflowSteps) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Production Workflow Template must be set before changing status to "In Designer". Please edit the ticket and set the workflow steps first.',
                    ], 422);
                }
            }
        }

        $ticket->status = $validated['status'];
        $ticket->design_status = $validated['status'] === 'in_designer' ? 'pending' : null;


        if (!empty($validated['notes'])) {
            $ticket->status_notes = $validated['notes'];
        }

        $ticket->save();

        UserActivityLog::log(
            Auth::id(),
            'ticket_status_updated',
            "Changed status of ticket #{$ticket->ticket_number} from {$oldStatus} to {$ticket->status}",
            $ticket,
            ['old_status' => $oldStatus, 'new_status' => $ticket->status, 'notes' => $validated['notes'] ?? null]
        );


        if ($oldStatus !== $ticket->status) {
            $this->notifyStatusChange($ticket, $oldStatus, $ticket->status);
        }

        return response()->json([
            'success' => true,
            'message' => 'Ticket status updated successfully',
            'ticket' => $ticket->fresh()
        ]);
    }


    public function updatePayment(Request $request, $id)
    {
        $ticket = Ticket::findOrFail($id);

        $validated = $request->validate([
            'amount_paid' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|in:cash,gcash,bank_transfer,credit_card,check,government_ar',
            'payment_date' => 'required|date',
            'allocation' => 'nullable|string|in:downpayment,balance,full,government_charge',
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


    public function verifyPayment(Request $request, $id)
    {
        $ticket = Ticket::findOrFail($id);

        $validated = $request->validate([
            'notes' => 'nullable|string|max:500',
            'total_amount' => 'nullable|numeric|min:0',
        ]);


        $unverifiedPayment = $ticket->payments()->where('amount', 0)->first();
        if ($unverifiedPayment) {
            $unverifiedPayment->update([
                'notes' => $validated['notes'] ?? $unverifiedPayment->notes,
                'recorded_by' => auth()->id(),
            ]);
        }




        if (isset($validated['total_amount']) && $validated['total_amount'] > 0) {
            $ticket->subtotal = $validated['total_amount'];
            $ticket->total_amount = $validated['total_amount'];
        }

        $ticket->payment_status = 'pending';
        $ticket->save();


        $ticket->refreshPaymentSummary();

        return response()->json([
            'success' => true,
            'message' => 'Payment verified successfully',
            'ticket' => $ticket->fresh(['payments.documents', 'customer'])
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
            'payment_status' => 'nullable|string|in:pending,partial,paid,awaiting_verification',
            'order_branch_id' => 'nullable|exists:branches,id',
            'production_branch_id' => 'nullable|exists:branches,id',
            // Custom job type fields for "Others" category
            'custom_job_type_description' => 'nullable|string|max:255',
            'custom_price_mode' => 'nullable|string|in:per_item,fixed_total',
            'custom_price_per_item' => 'nullable|numeric|min:0',
            'custom_fixed_total' => 'nullable|numeric|min:0',
            'is_size_based' => 'nullable|boolean',
            'custom_width' => 'nullable|numeric|min:0',
            'custom_height' => 'nullable|numeric|min:0',
            'selected_color' => 'nullable|string|max:50',
            'design_description' => 'nullable|string',
        ];
    }


    protected function notifyTicketCreated(Ticket $ticket): void
    {

        $designers = User::where('role', User::ROLE_DESIGNER)
            ->when($ticket->production_branch_id, function ($query) use ($ticket) {
                $query->where('branch_id', $ticket->production_branch_id);
            })
            ->get();
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
                    'branch_id' => $ticket->production_branch_id,
                ],
            ]);
        }


        event(new TicketStatusChanged(
            $ticket,
            'new',

            'in_designer',
            Auth::user(),
            $recipientIds,
            'ticket_created',
            $title,
            $message
        ));
    }


    protected function notifyStatusChange(Ticket $ticket, string $oldStatus, string $newStatus): void
    {
        /** @var \App\Models\User $triggeredBy */
        $triggeredBy = Auth::user();
        $recipientIds = [];
        $notificationType = '';
        $title = '';
        $message = '';


        switch ($newStatus) {
            case 'approved':

                $frontDeskUsers = User::where('role', User::ROLE_FRONTDESK)
                    ->when($ticket->order_branch_id, function ($query) use ($ticket) {
                        $query->where('branch_id', $ticket->order_branch_id);
                    })
                    ->get();
                $productionUsers = User::where('role', User::ROLE_PRODUCTION)
                    ->when($ticket->production_branch_id, function ($query) use ($ticket) {
                        $query->where('branch_id', $ticket->production_branch_id);
                    })
                    ->get();
                $recipientIds = $frontDeskUsers->pluck('id')->merge($productionUsers->pluck('id'))->toArray();
                $notificationType = 'ticket_approved';
                $title = 'Ticket Approved';
                $message = "Ticket {$ticket->ticket_number} has been approved by {$triggeredBy->name}.";
                break;

            case 'rejected':
            case 'cancelled':
                $frontDeskUsers = User::where('role', User::ROLE_FRONTDESK)
                    ->when($ticket->order_branch_id, function ($query) use ($ticket) {
                        $query->where('branch_id', $ticket->order_branch_id);
                    })
                    ->get();
                $recipientIds = $frontDeskUsers->pluck('id')->toArray();
                $notificationType = 'ticket_rejected';
                $title = 'Ticket ' . ucfirst($newStatus);
                $message = "Ticket {$ticket->ticket_number} has been {$newStatus} by {$triggeredBy->name}.";
                break;

            case 'in_production':
                $frontDeskUsers = User::where('role', User::ROLE_FRONTDESK)
                    ->when($ticket->order_branch_id, function ($query) use ($ticket) {
                        $query->where('branch_id', $ticket->order_branch_id);
                    })
                    ->get();
                $recipientIds = $frontDeskUsers->pluck('id')->toArray();
                $notificationType = 'ticket_in_production';
                $title = 'Ticket In Production';
                $message = "Ticket {$ticket->ticket_number} is now in production.";
                break;
            case 'in_designer':
                $frontDeskUsers = User::where('role', User::ROLE_DESIGNER)
                    ->when($ticket->production_branch_id, function ($query) use ($ticket) {
                        $query->where('branch_id', $ticket->production_branch_id);
                    })
                    ->get();
                $recipientIds = $frontDeskUsers->pluck('id')->toArray();
                $notificationType = 'ticket_in_designer';
                $title = 'Ticket In Designer';
                $message = "Ticket {$ticket->ticket_number} is now in designer.";
                break;
            case 'completed':
                $frontDeskUsers = User::where('role', User::ROLE_FRONTDESK)
                    ->when($ticket->order_branch_id, function ($query) use ($ticket) {
                        $query->where('branch_id', $ticket->order_branch_id);
                    })
                    ->get();
                $recipientIds = $frontDeskUsers->pluck('id')->toArray();
                $notificationType = 'ticket_completed';
                $title = 'Ticket Completed';
                $message = "Ticket {$ticket->ticket_number} has been completed.";
                break;
        }

        if (empty($recipientIds) || empty($notificationType)) {
            return;
        }


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
                    'order_branch_id' => $ticket->order_branch_id,
                    'production_branch_id' => $ticket->production_branch_id,
                ],
            ]);
        }


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


    protected function notifyCashierNewTicket(Ticket $ticket): void
    {

        $cashiers = User::where('role', User::ROLE_CASHIER)
            ->when($ticket->order_branch_id, function ($query) use ($ticket) {
                $query->where('branch_id', $ticket->order_branch_id);
            })
            ->get();

        if ($cashiers->isEmpty()) {
            return;
        }

        $title = 'New Pending Ticket';
        $message = "New ticket #{$ticket->ticket_number} created and is pending payment/action.";

        foreach ($cashiers as $cashier) {
            Notification::create([
                'user_id' => $cashier->id,
                'type' => 'ticket_created_pending',
                'notifiable_id' => $ticket->id,
                'notifiable_type' => Ticket::class,
                'title' => $title,
                'message' => $message,
                'data' => [
                    'ticket_id' => $ticket->id,
                    'ticket_number' => $ticket->ticket_number,
                    'status' => $ticket->status,
                    'order_branch_id' => $ticket->order_branch_id,
                ],
            ]);
        }
    }
    public function deliveryReceipts(Request $request)
    {
        return Inertia::render('DeliveryReceipts/Index', [
            'customer_order_qrcode' => \App\Models\Setting::get('customer_order_qrcode', ''),
        ]);
    }

    public function searchByTicketNumber(Request $request)
    {
        $ticketNo = trim($request->get('ticket_number'));


        if (!$ticketNo) {
            return response()->json(['message' => 'Ticket number is required'], 400);
        }

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $query = Ticket::with(['customer', 'jobType.category', 'orderBranch', 'productionBranch']);

        // Apply same branch restrictions as in index()
        if ($user && !$user->isAdmin()) {
            if ($user->branch_id) {
                if ($user->isFrontDesk() || $user->isCashier()) {
                    $query->where('order_branch_id', $user->branch_id);
                } elseif ($user->isProduction()) {
                    $query->where('production_branch_id', $user->branch_id);
                }
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        $ticket = (clone $query)->where('ticket_number', $ticketNo);

        if (is_numeric($ticketNo)) {
            $ticket->orWhere('id', $ticketNo);
        }

        $ticket = $ticket->first();

        // Fallback to partial match if exact match fails
        if (!$ticket) {
            $ticket = (clone $query)->where('ticket_number', 'like', '%' . $ticketNo . '%')->first();
        }

        if (!$ticket) {
            return response()->json(['message' => 'Ticket not found'], 404);
        }

        return response()->json([
            'ticket' => $ticket,
            'customer' => $ticket->customer
        ]);
    }
}
