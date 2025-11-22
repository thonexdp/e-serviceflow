<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;

abstract class BaseCrudController extends Controller
{
    protected $model;
    protected $resourceName;
    protected $viewPath;

    public function __construct()
    {
        $this->resourceName = $this->getResourceName();
        $this->viewPath = $this->getViewPath();
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = $this->model::query();

        // Apply search if provided
        if ($request->has('search') && $request->search) {
            $query = $this->applySearch($query, $request->search);
        }

        // Apply filters
        $query = $this->applyFilters($query, $request);

        // Get paginated results
        $items = $query->paginate($request->get('per_page', 15));

        return Inertia::render($this->viewPath . '/Index', [
            $this->resourceName => $items,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render($this->viewPath . '/Create', [
            'formData' => $this->getFormData(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate($this->getValidationRules('store'));

        $item = $this->model::create($validated);

        return redirect()
            ->route($this->resourceName . '.index')
            ->with('success', ucfirst($this->resourceName) . ' created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $item = $this->model::findOrFail($id);

        return Inertia::render($this->viewPath . '/Show', [
            $this->resourceName => $item,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit($id)
    {
        $item = $this->model::findOrFail($id);

        return Inertia::render($this->viewPath . '/Edit', [
            $this->resourceName => $item,
            'formData' => $this->getFormData($item),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $item = $this->model::findOrFail($id);

        $validated = $request->validate($this->getValidationRules('update', $item));

        $item->update($validated);

        return redirect()
            ->route($this->resourceName . '.index')
            ->with('success', ucfirst($this->resourceName) . ' updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $item = $this->model::findOrFail($id);
        $item->delete();

        return redirect()
            ->route($this->resourceName . '.index')
            ->with('success', ucfirst($this->resourceName) . ' deleted successfully.');
    }

    /**
     * Get validation rules for the resource.
     */
    abstract protected function getValidationRules(string $action, $model = null): array;

    /**
     * Apply search to the query.
     */
    protected function applySearch($query, string $search)
    {
        return $query;
    }

    /**
     * Apply filters to the query.
     */
    protected function applyFilters($query, Request $request)
    {
        return $query;
    }

    /**
     * Get form data for create/edit forms.
     */
    protected function getFormData($model = null): array
    {
        return [];
    }

    /**
     * Get resource name from class name.
     */
    protected function getResourceName(): string
    {
        $className = class_basename($this);
        return Str::kebab(str_replace('Controller', '', $className));
    }

    /**
     * Get view path from resource name.
     */
    protected function getViewPath(): string
    {
        return Str::studly($this->resourceName);
    }
}


















