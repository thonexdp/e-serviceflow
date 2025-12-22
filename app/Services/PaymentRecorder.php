<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Payment;
use App\Models\PaymentDocument;
use App\Models\Ticket;
use App\Models\UserActivityLog;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PaymentRecorder
{
    /**
     * Create a payment entry along with attachments if provided.
     *
     * @param  array<string, mixed>  $payload
     * @param  array<int, UploadedFile>  $attachments
     */
    public function record(array $payload, array $attachments = []): Payment
    {
        return DB::transaction(function () use ($payload, $attachments) {
            $ticket = null;
            if (!empty($payload['ticket_id'])) {
                $ticket = Ticket::with('customer')->findOrFail($payload['ticket_id']);

                // If discount is provided, update the ticket's discount and total amount
                if (isset($payload['discount'])) {
                    $oldDiscount = $ticket->discount;
                    $ticket->discount = (float)$payload['discount'];
                    $subtotal = (float)($ticket->subtotal ?? 0);
                    if ($subtotal > 0) {
                        $discountAmount = $subtotal * ($ticket->discount / 100);
                        $ticket->total_amount = round($subtotal - $discountAmount, 2);
                        $ticket->save();

                        // Log discount change
                        if ($oldDiscount != $ticket->discount) {
                            UserActivityLog::log(
                                Auth::id(),
                                'ticket_discount_updated',
                                "Updated discount for Ticket #{$ticket->ticket_number} from {$oldDiscount}% to {$ticket->discount}% during payment.",
                                $ticket,
                                ['old_discount' => $oldDiscount, 'new_discount' => $ticket->discount]
                            );
                        }

                        $ticket->refresh();
                    }
                }
            }

            $customerId = $payload['customer_id'] ?? $ticket?->customer_id;
            $customer = $customerId ? Customer::find($customerId) : null;

            $payerType = $customer ? 'customer' : 'walk_in';
            $payerName = $customer
                ? ($customer->full_name ?? trim("{$customer->firstname} {$customer->lastname}"))
                : ($payload['payer_name'] ?? 'Walk-in');

            $balanceBefore = $ticket ? $ticket->outstanding_balance : null;
            $balanceAfter = $ticket && $balanceBefore !== null
                ? max($balanceBefore - (float)$payload['amount'], 0)
                : null;

            $payment = Payment::create([
                'ticket_id' => $ticket?->id,
                'customer_id' => $customer?->id,
                'recorded_by' => Auth::id(),
                'invoice_number' => $payload['invoice_number'] ?? null,
                'official_receipt_number' => $payload['official_receipt_number'] ?? null,
                'payment_reference' => $payload['payment_reference'] ?? null,
                'payer_type' => $payerType,
                'payer_name' => $payerName,
                'payment_type' => $payload['payment_type'] ?? 'collection',
                'allocation' => $payload['allocation'] ?? null,
                'payment_method' => $payload['payment_method'],
                'amount' => $payload['amount'],
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'payment_date' => $payload['payment_date'],
                'status' => $payload['status'] ?? 'posted',
                'notes' => $payload['notes'] ?? null,
                'metadata' => $payload['metadata'] ?? null,
            ]);

            // Log payment recording
            UserActivityLog::log(
                Auth::id(),
                'payment_recorded',
                "Recorded payment of ₱" . number_format($payload['amount'], 2) . " for " . ($ticket ? "Ticket #{$ticket->ticket_number}" : "Customer {$payerName}"),
                $payment,
                $payload
            );

            foreach ($attachments as $file) {
                if (!$file instanceof UploadedFile) {
                    continue;
                }
                $storedPath = \Illuminate\Support\Facades\Storage::put('payments', $file);
                PaymentDocument::create([
                    'payment_id' => $payment->id,
                    'uploaded_by' => Auth::id(),
                    'original_name' => $file->getClientOriginalName(),
                    'file_path' => $storedPath,
                    'mime_type' => $file->getClientMimeType(),
                    'file_size' => $file->getSize(),
                ]);
            }

            return $payment->load(['ticket.customer', 'customer', 'documents']);
        });
    }
}
