<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\PaymentDocument;
use App\Services\PaymentRecorder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class PaymentController extends Controller
{
    public function __construct(protected PaymentRecorder $recorder)
    {
    }

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

        return redirect()->back()->with('success', $message);
    }

    /**
     * Download a payment attachment.
     */
    public function downloadDocument(PaymentDocument $document)
    {
        return Storage::disk('public')->download($document->file_path, $document->original_name);
    }
}
