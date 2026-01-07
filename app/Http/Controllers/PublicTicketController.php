<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PublicTicketController extends Controller
{

    public function search(Request $request)
    {
        $request->validate([
            'ticket_number' => 'required|string|max:255',
        ]);

        $ticketNumber = $request->input('ticket_number');


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


        $orderData = $this->transformTicketData($ticket);

        return response()->json([
            'success' => true,
            'data' => $orderData,
        ]);
    }


    private function transformTicketData(Ticket $ticket): array
    {

        $totalAmount = (float) $ticket->total_amount;
        $amountPaid = (float) $ticket->amount_paid;
        $balance = max($totalAmount - $amountPaid, 0);
        
        // Discount information
        $originalPrice = (float) ($ticket->original_price ?? $totalAmount);
        $discountPercentage = (float) ($ticket->discount_percentage ?? $ticket->discount ?? 0);
        $discountAmount = (float) ($ticket->discount_amount ?? 0);


        $paymentStatusLabel = 'Pending';
        if ($ticket->payment_status === 'paid') {
            $paymentStatusLabel = 'Paid';
        } elseif ($ticket->payment_status === 'partial') {
            $paymentStatusLabel = 'Partially Paid';
        }


        $timeline = $this->buildTimeline($ticket);


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
                'originalPrice' => $originalPrice,
                'discountPercentage' => $discountPercentage,
                'discountAmount' => $discountAmount,
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


    private function buildTimeline(Ticket $ticket): array
    {
        $currentStatus = $ticket->status;


        // Define stages for the public timeline
        $stages = [
            'pending' => 'Ticket Created',
            'designing' => 'Design in Progress',
            'approved' => 'Design is approved',
            'in_production' => 'In Production',
            'ready' => 'Ready for Pickup',
            'completed' => 'Completed',
        ];

        // Map ticket statuses to timeline stage indices
        $statusOrder = [
            'pending' => 0,
            'in_designer' => 1,
            'ready_to_print' => 2,
            'in_production' => 3,
            'ready' => 4,
            'completed' => 5,
            // Aliases for backward compatibility or other status keys
            'designing' => 1,
            'approved' => 2,
        ];

        $currentOrder = $statusOrder[$currentStatus] ?? 0;

        // Pull progress forward based on design_status
        if ($ticket->design_status === 'pending' && $currentOrder < 1) {
            $currentOrder = 1;
        } elseif ($ticket->design_status === 'approved' && $currentOrder < 2) {
            $currentOrder = 2;
        }

        $timeline = [];
        $index = 0;

        foreach ($stages as $statusKey => $stageName) {
            $stageOrder = $statusOrder[$statusKey];

            $status = 'pending';
            $date = '';

            if ($stageOrder < $currentOrder) {
                $status = 'completed';

                $date = '';
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


    private function getStatusLabel(string $status): string
    {
        $labels = [
            'pending' => 'Pending',
            'in_designer' => 'Design in Progress',
            'designing' => 'Design in Progress',
            'ready_to_print' => 'Design is approved',
            'approved' => 'Design is approved',
            'in_production' => 'In Production',
            'ready' => 'Ready for Pickup',
            'completed' => 'Completed',
            'cancelled' => 'Cancelled',
        ];

        return $labels[$status] ?? ucfirst(str_replace('_', ' ', $status));
    }
}
