<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Payment;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ExpenseController extends Controller
{
    /**
     * Record an expense entry.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'category' => 'required|string|in:' . implode(',', Expense::CATEGORIES),
            'vendor' => 'nullable|string|max:150',
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'expense_date' => 'required|date',
            'payment_method' => 'required|string|in:' . implode(',', Payment::METHODS),
            'reference_number' => 'nullable|string|max:150',
            'ticket_id' => 'nullable|exists:tickets,id',
            'notes' => 'nullable|string|max:500',
        ]);

        $expense = Expense::create([
            ...$validated,
            'recorded_by' => Auth::id(),
        ]);

        UserActivityLog::log(
            Auth::id(),
            'expense_recorded',
            "Recorded expense of ₱" . number_format($expense->amount, 2) . " for {$expense->category}: {$expense->description}",
            $expense,
            $validated
        );

        $message = 'Expense recorded successfully.';

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $message,
                'expense' => $expense,
            ]);
        }

        return redirect()->back()->with('success', $message);
    }
}
