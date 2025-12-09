<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\TicketFile;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class MockupsController extends Controller
{
    /**
     * Display a listing of tickets for mock-ups.
     */
    public function index(Request $request)
    {
        $query = Ticket::with(['customer', 'jobType.category', 'files'])->whereNotNull('design_status');

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

        // Filter by design status
        if ($request->has('design_status') && $request->design_status && $request->design_status !== 'all') {
            $query->where('design_status', $request->design_status);
        }

        // Date range filtering
        $dateRange = $request->get('date_range');
        $startDate = $request->get('start_date');
        $endDate = $request->get('end_date');

        // Filter by date range (only if date_range is not explicitly empty)
        if ($dateRange !== '' && $dateRange !== null) {
            if ($startDate) {
                $query->whereDate('created_at', '>=', $startDate);
            }

            if ($endDate) {
                $query->whereDate('created_at', '<=', $endDate);
            }
        }

        $tickets = $query->latest('updated_at')->paginate($request->get('per_page', 15));

        return Inertia::render('Mock-ups', [
            'tickets' => $tickets,
            'filters' => [
                'search' => $request->get('search'),
                'design_status' => $request->get('design_status'),
                'date_range' => $dateRange,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }

    /**
     * Get ticket details with files.
     */
    public function show($id)
    {
        $ticket = Ticket::with(['customer', 'jobType.category', 'files'])
            ->findOrFail($id);

        return response()->json($ticket);
    }

    /**
     * Upload mock-up files.
     */
    public function uploadMockup(Request $request, $id)
    {
        $ticket = Ticket::findOrFail($id);

        $request->validate([
            'files' => 'required|array|min:1',
            'files.*' => 'file|mimes:jpg,jpeg,png,pdf|max:10240',
            'notes' => 'nullable|string|max:1000',
        ]);

        $uploadedFiles = [];

        // Handle file array - Laravel converts files[] to files array
        $files = [];
        if ($request->hasFile('files')) {
            $files = is_array($request->file('files')) ? $request->file('files') : [$request->file('files')];
        }

        foreach ($files as $file) {
            $path = Storage::put('tickets/mockups', $file);

            TicketFile::create([
                'ticket_id' => $ticket->id,
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'type' => 'mockup',
            ]);

            $uploadedFiles[] = [
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
            ];
        }

        // Update ticket status
        $ticket->update([
            'design_status' => 'mockup_uploaded',
            'design_notes' => $request->notes,
        ]);

        return redirect()->back()->with('success', 'Mock-up files uploaded successfully.');
    }

    /**
     * Approve design.
     */
    public function approve(Request $request, $id)
    {
        $ticket = Ticket::findOrFail($id);
        $oldStatus = $ticket->status;

        $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        $ticket->update([
            'design_status' => 'approved',
            'design_notes' => $request->notes,
            'status' => 'ready_to_print', // Set status to ready for production
        ]);

        // Refresh ticket to get latest data
        $ticket->refresh();

        // Notify FrontDesk and Production
        $this->notifyStatusChange($ticket, $oldStatus, 'ready_to_print');

        return redirect()->back()->with('success', 'Design approved successfully.');
    }

    /**
     * Request revision.
     */
    public function requestRevision(Request $request, $id)
    {
        $ticket = Ticket::findOrFail($id);
        $oldStatus = $ticket->status;

        $request->validate([
            'notes' => 'required|string|max:1000',
        ]);

        $ticket->update([
            'design_status' => 'revision_requested',
            'design_notes' => $request->notes,
            'status' => 'rejected', // Set status to rejected
        ]);

        // Notify FrontDesk
        $this->notifyStatusChange($ticket, $oldStatus, 'rejected');

        return redirect()->back()->with('success', 'Revision requested successfully.');
    }

    /**
     * Download file.
     */
    public function downloadFile($id)
    {
        $file = TicketFile::findOrFail($id);

        if (!Storage::exists($file->file_path)) {
            abort(404);
        }

        return Storage::download($file->file_path, $file->file_name);
    }

    /**
     * Notify users about ticket status changes (shared with TicketController logic)
     */
    protected function notifyStatusChange(Ticket $ticket, string $oldStatus, string $newStatus): void
    {
        $triggeredBy = Auth::user();

        if (!$triggeredBy) {
            Log::warning('Cannot send notification: No authenticated user');
            return;
        }

        $recipientIds = [];
        $notificationType = '';
        $title = '';
        $message = '';

        // Determine recipients and notification content based on status change
        switch ($newStatus) {
            case 'approved':
            case 'ready_to_print':
                // Notify FrontDesk and Production
                $frontDeskUsers = \App\Models\User::where('role', \App\Models\User::ROLE_FRONTDESK)->get();
                $productionUsers = \App\Models\User::where('role', \App\Models\User::ROLE_PRODUCTION)->get();
                $recipientIds = $frontDeskUsers->pluck('id')->merge($productionUsers->pluck('id'))->unique()->toArray();

                $notificationType = 'ticket_approved';
                $title = 'Ticket Approved';
                $message = "Ticket {$ticket->ticket_number} has been approved by {$triggeredBy->name} and is ready for production.";
                break;

            case 'rejected':
            case 'cancelled':
                // Notify FrontDesk
                $frontDeskUsers = \App\Models\User::where('role', \App\Models\User::ROLE_FRONTDESK)->get();
                $recipientIds = $frontDeskUsers->pluck('id')->toArray();
                $notificationType = 'ticket_rejected';
                $title = 'Ticket ' . ucfirst($newStatus);
                $message = "Ticket {$ticket->ticket_number} has been {$newStatus} by {$triggeredBy->name}.";
                break;
        }

        if (empty($recipientIds) || empty($notificationType)) {
            Log::warning("No recipients or notification type for status change: {$oldStatus} -> {$newStatus}");
            return;
        }

        Log::info("Sending notifications for ticket {$ticket->id}: {$oldStatus} -> {$newStatus}", [
            'recipients' => $recipientIds,
            'type' => $notificationType
        ]);

        // Create notifications for all recipients
        $users = \App\Models\User::whereIn('id', $recipientIds)->get();
        foreach ($users as $user) {
            try {
                \App\Models\Notification::create([
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
            } catch (\Exception $e) {
                Log::error("Failed to create notification for user {$user->id}: " . $e->getMessage());
            }
        }

        // Broadcast event
        try {
            event(new \App\Events\TicketStatusChanged(
                $ticket->fresh(), // Ensure we have the latest ticket data
                $oldStatus,
                $newStatus,
                $triggeredBy,
                $recipientIds,
                $notificationType,
                $title,
                $message
            ));
            Log::info("Broadcast event sent for ticket {$ticket->id}");
        } catch (\Exception $e) {
            Log::error("Failed to broadcast event for ticket {$ticket->id}: " . $e->getMessage());
        }
    }
}
