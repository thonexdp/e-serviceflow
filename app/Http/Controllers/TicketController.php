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
        $query = Ticket::with('customer');

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

        $tickets = $query->with('jobType.category')->latest()->paginate($request->get('per_page', 15));
        
        // Get customers for dropdown/search
        $customers = \App\Models\Customer::latest()->limit(10)->get();

        // Get job categories and types for ticket form
        $jobCategories = JobCategory::with(['jobTypes' => function($query) {
            $query->where('is_active', true)->orderBy('sort_order')->orderBy('name');
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

    protected function getValidationRules(string $action, $model = null): array
    {
        return [
            'customer_id' => 'required|exists:customers,id',
            'description' => 'required|string',
            'job_type' => 'nullable|string|max:255',
            'job_type_id' => 'nullable|exists:job_types,id',
            'quantity' => 'nullable|integer|min:1',
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

