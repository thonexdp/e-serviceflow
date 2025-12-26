<?php


namespace App\Http\Controllers;

use App\Http\Controllers\Traits\HasRoleBasedRoutes;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;

abstract class BaseCrudController extends Controller
{
    use HasRoleBasedRoutes;

    protected $model;
    protected $resourceName;
    protected $viewPath;

    public function __construct()
    {
        $this->resourceName = $this->getResourceName();
        $this->viewPath = $this->getViewPath();
    }

    
    public function index(Request $request)
    {
        $query = $this->model::query();

        
        if ($request->has('search') && $request->search) {
            $query = $this->applySearch($query, $request->search);
        }

        
        $query = $this->applyFilters($query, $request);

        
        $items = $query->paginate($request->get('per_page', 15));

        return Inertia::render($this->viewPath . '/Index', [
            $this->resourceName => $items,
            'filters' => $request->only(['search']),
        ]);
    }

    
    public function create()
    {
        return Inertia::render($this->viewPath . '/Create', [
            'formData' => $this->getFormData(),
        ]);
    }

    
    public function store(Request $request)
    {
        $validated = $request->validate($this->getValidationRules('store'));

        $item = $this->model::create($validated);

        return $this->redirectToRoleRoute($this->resourceName . '.index')
            ->with('success', ucfirst($this->resourceName) . ' created successfully.');
    }

    
    public function show($id)
    {
        $item = $this->model::findOrFail($id);

        return Inertia::render($this->viewPath . '/Show', [
            $this->resourceName => $item,
        ]);
    }

    
    public function edit($id)
    {
        $item = $this->model::findOrFail($id);

        return Inertia::render($this->viewPath . '/Edit', [
            $this->resourceName => $item,
            'formData' => $this->getFormData($item),
        ]);
    }

    
    public function update(Request $request, $id)
    {
        $item = $this->model::findOrFail($id);

        $validated = $request->validate($this->getValidationRules('update', $item));

        $item->update($validated);

        return $this->redirectToRoleRoute($this->resourceName . '.index')
            ->with('success', ucfirst($this->resourceName) . ' updated successfully.');
    }

    
    public function destroy($id)
    {
        $item = $this->model::findOrFail($id);
        $item->delete();

        return $this->redirectToRoleRoute($this->resourceName . '.index')
            ->with('success', ucfirst($this->resourceName) . ' deleted successfully.');
    }

    
    abstract protected function getValidationRules(string $action, $model = null): array;

    
    protected function applySearch($query, string $search)
    {
        return $query;
    }

    
    protected function applyFilters($query, Request $request)
    {
        return $query;
    }

    
    protected function getFormData($model = null): array
    {
        return [];
    }

    
    protected function getResourceName(): string
    {
        $className = class_basename($this);
        return Str::kebab(str_replace('Controller', '', $className));
    }

    
    protected function getViewPath(): string
    {
        return Str::studly($this->resourceName);
    }
}




