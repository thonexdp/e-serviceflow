<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BranchController extends Controller
{
    
    public function index(Request $request)
    {
        
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized access to branch management.');
        }

        $query = Branch::query();

        
        if ($request->has('search') && $request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('code', 'like', '%' . $request->search . '%')
                    ->orWhere('address', 'like', '%' . $request->search . '%');
            });
        }

        
        if ($request->has('is_active') && $request->is_active !== null && $request->is_active !== '') {
            $query->where('is_active', $request->is_active);
        }

        $branches = $query->orderBy('sort_order')
            ->orderBy('name')
            ->paginate($request->get('per_page', 15));

        return Inertia::render('Admin/Branches', [
            'branches' => $branches,
            'filters' => $request->only(['search', 'is_active']),
        ]);
    }

    
    public function store(Request $request)
    {
        
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized access to branch management.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:branches,name',
            'code' => 'required|string|max:20|unique:branches,code',
            'address' => 'nullable|string|max:500',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'can_accept_orders' => 'boolean',
            'can_produce' => 'boolean',
            'is_default_production' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        
        if ($validated['is_default_production'] ?? false) {
            Branch::where('is_default_production', true)->update(['is_default_production' => false]);
        }

        $branch = Branch::create($validated);

        UserActivityLog::log(
            auth()->id(),
            'created_branch',
            "Created new branch: {$branch->name} ({$branch->code})",
            $branch
        );

        return redirect()->route('admin.branches.index')
            ->with('success', 'Branch created successfully.');
    }

    
    public function update(Request $request, Branch $branch)
    {
        
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized access to branch management.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:branches,name,' . $branch->id,
            'code' => 'required|string|max:20|unique:branches,code,' . $branch->id,
            'address' => 'nullable|string|max:500',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'can_accept_orders' => 'boolean',
            'can_produce' => 'boolean',
            'is_default_production' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        
        if ($validated['is_default_production'] ?? false) {
            Branch::where('id', '!=', $branch->id)
                ->where('is_default_production', true)
                ->update(['is_default_production' => false]);
        }

        $branch->update($validated);

        UserActivityLog::log(
            auth()->id(),
            'updated_branch',
            "Updated branch: {$branch->name}",
            $branch,
            $validated
        );

        return redirect()->route('admin.branches.index')
            ->with('success', 'Branch updated successfully.');
    }

    
    public function destroy(Branch $branch)
    {
        
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized access to branch management.');
        }

        
        if ($branch->users()->count() > 0) {
            return redirect()->route('admin.branches.index')
                ->with('error', 'Cannot delete branch with assigned users. Please reassign users first.');
        }

        
        if ($branch->orderedTickets()->count() > 0 || $branch->productionTickets()->count() > 0) {
            return redirect()->route('admin.branches.index')
                ->with('error', 'Cannot delete branch with existing tickets.');
        }

        $branchName = $branch->name;
        $branchCode = $branch->code;
        $branch->delete();

        UserActivityLog::log(
            auth()->id(),
            'deleted_branch',
            "Deleted branch: {$branchName} ({$branchCode})",
            null
        );

        return redirect()->route('admin.branches.index')
            ->with('success', 'Branch deleted successfully.');
    }

    
    public function getActiveBranches()
    {
        $branches = Branch::active()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json($branches);
    }

    
    public function getOrderBranches()
    {
        $branches = Branch::active()
            ->canAcceptOrders()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json($branches);
    }

    
    public function getProductionBranches()
    {
        $branches = Branch::active()
            ->canProduce()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json($branches);
    }
}
