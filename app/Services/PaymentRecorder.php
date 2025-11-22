<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Payment;
use App\Models\PaymentDocument;
use App\Models\Ticket;
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

            foreach ($attachments as $file) {
                if (!$file instanceof UploadedFile) {
                    continue;
                }
                $storedPath = $file->store('payments', 'public');
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

