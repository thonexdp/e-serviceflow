<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PublicTicketController extends Controller
{
    /**
     * Search for a ticket by ticket number (public endpoint).
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function search(Request $request)
    {
        $request->validate([
            'ticket_number' => 'required|string|max:255',
        ]);

        $ticketNumber = $request->input('ticket_number');

        // Search for the ticket
        $ticket = Ticket::where('ticket_number', $ticketNumber)
            ->with([
                'customer:id,firstname,lastname,email,phone',
                'jobType:id,name',
                'mockupFiles',
                'payments' => function ($query) {
                    $query->where('status', 'posted')
                        ->orderBy('payment_date', 'desc');
                }
            ])
            ->first();

        if (!$ticket) {
            return response()->json([
                'success' => false,
                'message' => 'Ticket not found. Please check your tracking number and try again.',
            ], 404);
        }

        // Transform the ticket data for the frontend
        $orderData = $this->transformTicketData($ticket);

        return response()->json([
            'success' => true,
            'data' => $orderData,
        ]);
    }

    /**
     * Transform ticket data to match the frontend structure.
     * 
     * @param Ticket $ticket
     * @return array
     */
    private function transformTicketData(Ticket $ticket): array
    {
        // Calculate payment information
        $totalAmount = (float) $ticket->total_amount;
        $amountPaid = (float) $ticket->amount_paid;
        $balance = max($totalAmount - $amountPaid, 0);

        // Determine payment status label
        $paymentStatusLabel = 'Pending';
        if ($ticket->payment_status === 'paid') {
            $paymentStatusLabel = 'Paid';
        } elseif ($ticket->payment_status === 'partial') {
            $paymentStatusLabel = 'Partially Paid';
        }

        // Build timeline based on ticket status
        $timeline = $this->buildTimeline($ticket);

        // Build order items array
        $items = [];
        if ($ticket->jobType) {
            $specifications = [];

            if ($ticket->full_size) {
                $specifications[] = $ticket->full_size;
            }

            if ($ticket->description) {
                $specifications[] = $ticket->description;
            }

            $items[] = [
                'name' => $ticket->jobType->name ?? $ticket->job_type,
                'quantity' => $ticket->quantity ? "{$ticket->quantity} pcs" : 'N/A',
                'specifications' => implode(', ', $specifications) ?: 'No specifications',
            ];
        }

        return [
            'ticketNumber' => $ticket->ticket_number,
            'customer' => [
                'name' => $ticket->customer ? $ticket->customer->full_name : 'N/A',
                'email' => $ticket->customer->email ?? 'N/A',
                'phone' => $ticket->customer->phone ?? 'N/A',
            ],
            'orderDetails' => [
                'items' => $items,
                'orderDate' => $ticket->created_at->format('F d, Y'),
                'expectedCompletion' => $ticket->due_date ? $ticket->due_date->format('F d, Y') : 'TBD',
            ],
            'payment' => [
                'totalAmount' => $totalAmount,
                'amountPaid' => $amountPaid,
                'balance' => $balance,
                'status' => $paymentStatusLabel,
            ],
            'status' => $this->getStatusLabel($ticket->status),
            'design_status' => $ticket->design_status,
            'designer' => $ticket->assignedToUser ? $ticket->assignedToUser->name : null,
            'approved_mockups' => ($ticket->design_status === 'approved' && $ticket->mockupFiles->count() > 0)
                ? $ticket->mockupFiles->map(fn($f) => [
                    'id' => $f->id,
                    'url' => $f->file_path,
                    'name' => $f->file_name
                ])
                : [],
            'current_workflow_step' => $ticket->status === 'in_production' ? $ticket->current_workflow_step : null,
            'timeline' => $timeline,
        ];
    }

    /**
     * Build timeline array based on ticket status.
     * 
     * @param Ticket $ticket
     * @return array
     */
    private function buildTimeline(Ticket $ticket): array
    {
        $currentStatus = $ticket->status;

        // Define the standard workflow stages
        $stages = [
            'pending' => 'Ticket Created',
            'designing' => 'Design In Progress',
            'approved' => 'Design Approved',
            'in_production' => 'In Production',
            'ready' => 'Ready for Pickup',
            'completed' => 'Completed',
        ];

        // Map status to stage order
        $statusOrder = [
            'pending' => 0,
            'designing' => 1,
            'approved' => 2,
            'in_production' => 3,
            'ready' => 4,
            'completed' => 5,
        ];

        $currentOrder = $statusOrder[$currentStatus] ?? 0;

        $timeline = [];
        $index = 0;

        foreach ($stages as $statusKey => $stageName) {
            $stageOrder = $statusOrder[$statusKey];

            $status = 'pending';
            $date = '';

            if ($stageOrder < $currentOrder) {
                $status = 'completed';
                // For completed stages, we could add actual dates if tracked
                $date = ''; // Could be enhanced with actual timestamps
            } elseif ($stageOrder === $currentOrder) {
                $status = 'current';
                $date = $ticket->updated_at->format('M d, g:i A');
            }

            $timeline[] = [
                'stage' => $stageName,
                'status' => $status,
                'date' => $date,
            ];

            $index++;
        }

        return $timeline;
    }

    /**
     * Get human-readable status label.
     * 
     * @param string $status
     * @return string
     */
    private function getStatusLabel(string $status): string
    {
        $labels = [
            'pending' => 'Pending',
            'designing' => 'Design In Progress',
            'approved' => 'Design Approved',
            'in_production' => 'In Production',
            'ready' => 'Ready for Pickup',
            'completed' => 'Completed',
            'cancelled' => 'Cancelled',
        ];

        return $labels[$status] ?? ucfirst($status);
    }
}
