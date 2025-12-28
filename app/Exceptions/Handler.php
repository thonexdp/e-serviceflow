<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;

class Handler extends ExceptionHandler
{
    
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            
        });
    }

    
    public function render($request, Throwable $e)
    {
        
        if ($request->is('api/*')) {
            
            if ($e instanceof \Illuminate\Validation\ValidationException) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => $e->errors(),
                ], 422);
            }

            
            if ($e instanceof \Illuminate\Http\Exceptions\PostTooLargeException) {
                return response()->json([
                    'message' => 'File upload failed',
                    'errors' => [
                        'file' => ['The uploaded file is too large. Maximum size is 10MB.']
                    ]
                ], 413);
            }

            
            return response()->json([
                'message' => $e->getMessage() ?: 'An error occurred',
                'errors' => [
                    'general' => [$e->getMessage() ?: 'Server error occurred']
                ]
            ], 500);
        }

        
        $response = parent::render($request, $e);
        $status = $response->getStatusCode();

        
        if (in_array($status, [401, 403, 404, 419, 429, 500, 503]) && !$request->expectsJson()) {
            return \Inertia\Inertia::render("Errors/{$status}")
                ->toResponse($request)
                ->setStatusCode($status);
        }

        return $response;
    }
}
