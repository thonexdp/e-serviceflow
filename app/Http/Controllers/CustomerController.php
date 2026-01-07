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
        
        // Split search terms by space
        $terms = array_filter(explode(' ', trim($q)));
        
        $customers = Customer::query()
            ->where(function ($query) use ($q, $normalizedQ, $terms) {
                // Search in individual fields with the full query
                $query->where('firstname', 'like', "%{$q}%")
                    ->orWhere('lastname', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%")
                    ->orWhere('phone', 'like', "%{$q}%")
                    ->orWhere('facebook', 'like', "%{$q}%");
                
                // Search in normalized phone
                if ($normalizedQ) {
                    $query->orWhere('normalized_phone', 'like', "%{$normalizedQ}%");
                }
                
                // If multiple terms, search across firstname and lastname
                if (count($terms) >= 2) {
                    foreach ($terms as $i => $term1) {
                        // Try matching any term in firstname and any other term in lastname
                        $query->orWhere(function ($q) use ($terms, $i, $term1) {
                            $q->where('firstname', 'like', "%{$term1}%");
                            foreach ($terms as $j => $term2) {
                                if ($i !== $j) {
                                    $q->where('lastname', 'like', "%{$term2}%");
                                }
                            }
                        });
                        
                        // Try matching any term in lastname and any other term in firstname
                        $query->orWhere(function ($q) use ($terms, $i, $term1) {
                            $q->where('lastname', 'like', "%{$term1}%");
                            foreach ($terms as $j => $term2) {
                                if ($i !== $j) {
                                    $q->where('firstname', 'like', "%{$term2}%");
                                }
                            }
                        });
                    }
                }
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

    /**
     * Check if customer can be deleted and get dependencies
     */
    public function checkDeletion(Customer $customer)
    {
        $result = $customer->canBeDeleted();
        return response()->json($result);
    }
    
    public function destroy(Customer $customer)
    {
        // Check if can be deleted
        $check = $customer->canBeDeleted();
        
        if (!$check['can_delete']) {
            return redirect()->back()->with('error', 'Cannot delete customer. They have active tickets or orders.');
        }

        try {
            $customer->delete();
            return redirect()->back()->with('success', 'Customer deleted successfully!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to delete customer. They may have associated tickets.');
        }
    }
}
