<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\TicketFile;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class MockupsController extends Controller
{
    /**
     * Display a listing of tickets for mock-ups.
     */
    public function index(Request $request)
    {
        $query = Ticket::with(['customer', 'jobType.category', 'files']);

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

        $tickets = $query->latest()->paginate($request->get('per_page', 15));

        return Inertia::render('Mock-ups', [
            'tickets' => $tickets,
            'filters' => $request->only(['search', 'design_status']),
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
            $path = $file->store('tickets/mockups', 'public');
            
            TicketFile::create([
                'ticket_id' => $ticket->id,
                'filename' => $file->getClientOriginalName(),
                'filepath' => $path,
                'type' => 'mockup',
            ]);

            $uploadedFiles[] = [
                'filename' => $file->getClientOriginalName(),
                'filepath' => $path,
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

        $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        $ticket->update([
            'design_status' => 'approved',
            'design_notes' => $request->notes,
            'status' => 'ready_to_print', // Set status to ready for production
        ]);

        return redirect()->back()->with('success', 'Design approved successfully.');
    }

    /**
     * Request revision.
     */
    public function requestRevision(Request $request, $id)
    {
        $ticket = Ticket::findOrFail($id);

        $request->validate([
            'notes' => 'required|string|max:1000',
        ]);

        $ticket->update([
            'design_status' => 'revision_requested',
            'design_notes' => $request->notes,
        ]);

        return redirect()->back()->with('success', 'Revision requested successfully.');
    }

    /**
     * Download file.
     */
    public function downloadFile($id)
    {
        $file = TicketFile::findOrFail($id);

        if (!Storage::disk('public')->exists($file->filepath)) {
            abort(404);
        }

        return Storage::disk('public')->download($file->filepath, $file->filename);
    }
}
