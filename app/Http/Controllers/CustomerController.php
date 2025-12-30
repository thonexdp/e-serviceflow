<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CustomerController extends Controller
{
    
    public function index(Request $request)
    {
        $customers = Customer::query()
            ->when($request->search, function ($query, $search) {
                $normalizedSearch = Customer::normalizePhone($search);
                $query->where(function ($q) use ($search, $normalizedSearch) {
                    $q->where('firstname', 'like', "%{$search}%")
                        ->orWhere('lastname', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%")
                        ->orWhere('facebook', 'like', "%{$search}%")
                        ->orWhere('address', 'like', "%{$search}%");
                    
                    if ($normalizedSearch) {
                        $q->orWhere('normalized_phone', 'like', "%{$normalizedSearch}%");
                    }
                });
            })
            ->latest()
            ->paginate(20);
        

        return Inertia::render('Customers', [
            'customers' => $customers,
            'filters' => $request->only(['search']),
        ]);
    }

    public function search(Request $request)
    {
        $q = $request->get('q', '');
        $normalizedQ = Customer::normalizePhone($q);
        
        $customers = Customer::query()
            ->where('firstname', 'like', "%{$q}%")
            ->orWhere('lastname', 'like', "%{$q}%")
            ->orWhere('email', 'like', "%{$q}%")
            ->orWhere('phone', 'like', "%{$q}%")
            ->orWhere('facebook', 'like', "%{$q}%")
            ->when($normalizedQ, function ($query) use ($normalizedQ) {
                $query->orWhere('normalized_phone', 'like', "%{$normalizedQ}%");
            })
            ->limit(10)
            ->get(['id', 'firstname', 'lastname', 'email', 'phone', 'address', 'facebook'])
            ->map(function ($customer) {
                $customer->full_name = "{$customer->firstname} {$customer->lastname}";
                return $customer;
            });

        return response()->json($customers);
    }


    
    public function store(Request $request)
    {
        $validated = $request->validate([
            'firstname' => 'required|string|max:255',
            'lastname' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'facebook' => 'required|string|max:255',
            // 'email' => 'nullable|email|max:255|unique:customers,email',
            'address' => 'nullable|string|max:500',
        ]);

        // Add normalized phone
        $validated['normalized_phone'] = Customer::normalizePhone($validated['phone'] ?? null);

        if($request->has('return_json') && $request->return_json) {
            $customer = Customer::create($validated);
            return response()->json([
                'success' => true,
                'message' => 'Customer created successfully!',
                'customer' => $customer,
            ]);
        }
        Customer::create($validated);

        return redirect()->back()->with('success', 'Customer created successfully!');
    }

    
    public function update(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'firstname' => 'required|string|max:255',
            'lastname' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255|unique:customers,email,' . $customer->id,
            'facebook' => 'required|string|max:255',
            'address' => 'nullable|string|max:500',
        ]);

        // Add normalized phone
        $validated['normalized_phone'] = Customer::normalizePhone($validated['phone'] ?? null);

        $customer->update($validated);

        return redirect()->back()->with('success', 'Customer updated successfully!');
    }

    
    public function destroy(Customer $customer)
    {
        try {
            $customer->delete();
            return redirect()->back()->with('success', 'Customer deleted successfully!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to delete customer. They may have associated tickets.');
        }
    }
}
