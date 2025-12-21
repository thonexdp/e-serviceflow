<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\PaymentDocument;
use App\Services\PaymentRecorder;
use Illuminate\Http\Request;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class PaymentController extends Controller
{
    public function __construct(protected PaymentRecorder $recorder) {}

    /**
     * Persist a payment transaction and optionally attach proofs.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'ticket_id' => 'nullable|exists:tickets,id',
            'customer_id' => 'nullable|exists:customers,id',
            'payer_name' => 'nullable|string|max:255',
            'payment_type' => 'required|string|in:' . implode(',', Payment::TYPES),
            'allocation' => 'nullable|string|in:' . implode(',', Payment::ALLOCATIONS),
            'payment_method' => 'required|string|in:' . implode(',', Payment::METHODS),
            'payment_date' => 'required|date',
            'amount' => 'required|numeric|min:0.01',
            'invoice_number' => 'nullable|string|max:100',
            'official_receipt_number' => 'nullable|string|max:100',
            'payment_reference' => 'nullable|string|max:150',
            'notes' => 'nullable|string|max:1000',
            'status' => 'nullable|string',
            'metadata' => 'nullable|array',
            'attachments.*' => 'file|mimes:jpg,jpeg,png,pdf|max:8192',
        ]);

        if (
            empty($validated['ticket_id']) &&
            empty($validated['customer_id']) &&
            empty($validated['payer_name'])
        ) {
            throw ValidationException::withMessages([
                'ticket_id' => 'Select a ticket or customer or specify a payer name.',
            ]);
        }

        $payment = $this->recorder->record(
            $validated,
            (array)$request->file('attachments', [])
        );

        $message = 'Payment recorded successfully.';

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $message,
                'payment' => $payment,
            ]);
        }

        $this->notifyFrontDeskPayment($payment, 'success');

        return redirect()->back()->with('success', $message);
    }

    /**
     * Clear a pending cheque payment.
     */
    public function clear(Payment $payment)
    {
        if ($payment->status !== 'pending') {
            return response()->json(['message' => 'Only pending payments can be cleared.'], 422);
        }

        $payment->update(['status' => 'posted']);

        return response()->json([
            'success' => true,
            'message' => 'Cheque cleared successfully.',
            'payment' => $payment->load('ticket')
        ]);
    }

    /**
     * Reject/Bounce a pending cheque payment.
     */
    public function reject(Request $request, Payment $payment)
    {
        if ($payment->status !== 'pending') {
            return response()->json(['message' => 'Only pending payments can be rejected.'], 422);
        }

        $validated = $request->validate([
            'notes' => 'nullable|string|max:500',
        ]);

        $payment->update([
            'status' => 'rejected',
            'notes' => $validated['notes'] ?? $payment->notes,
        ]);

        $this->notifyFrontDeskPayment($payment, 'rejected');

        return response()->json([
            'success' => true,
            'message' => 'Cheque rejected/bounced.',
            'payment' => $payment->load('ticket')
        ]);
    }

    /**
     * Download a payment attachment.
     */
    public function downloadDocument(PaymentDocument $document)
    {
        return Storage::disk('public')->download($document->file_path, $document->original_name);
    }

    /**
     * Notify Front Desk about payment status (success or rejected).
     */
    protected function notifyFrontDeskPayment(Payment $payment, string $statusType): void
    {
        $frontDeskUsers = User::where('role', User::ROLE_FRONTDESK)->get();

        if ($frontDeskUsers->isEmpty()) {
            return;
        }

        $ticket = $payment->ticket;
        $customerName = $payment->payer_name
            ?? ($payment->customer ? $payment->customer->firstname . ' ' . $payment->customer->lastname : 'Unknown');
        $amount = number_format($payment->amount, 2);

        $title = $statusType === 'success' ? 'Payment Received' : 'Payment Rejected';

        if ($statusType === 'success') {
            $formattedMethod = ucfirst(str_replace('_', ' ', $payment->payment_method));
            $message = "Payment of ₱{$amount} ({$formattedMethod}) received from {$customerName}.";
        } else {
            $message = "Payment of ₱{$amount} from {$customerName} was REJECTED. Reason: {$payment->notes}";
        }

        foreach ($frontDeskUsers as $user) {
            Notification::create([
                'user_id' => $user->id,
                'type' => 'payment_notification',
                'notifiable_id' => $payment->id,
                'notifiable_type' => Payment::class,
                'title' => $title,
                'message' => $message,
                'data' => [
                    'payment_id' => $payment->id,
                    'ticket_id' => $ticket ? $ticket->id : null,
                    'amount' => $payment->amount,
                    'status' => $statusType,
                ],
            ]);
        }
    }
}
