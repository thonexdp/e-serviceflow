<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * The list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    /**
     * Render an exception into an HTTP response.
     */
    public function render($request, Throwable $e)
    {
        // For API routes, always return JSON
        if ($request->is('api/*')) {
            // Handle validation exceptions
            if ($e instanceof \Illuminate\Validation\ValidationException) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => $e->errors(),
                ], 422);
            }

            // Handle file upload errors (file too large, etc.)
            if ($e instanceof \Illuminate\Http\Exceptions\PostTooLargeException) {
                return response()->json([
                    'message' => 'File upload failed',
                    'errors' => [
                        'file' => ['The uploaded file is too large. Maximum size is 10MB.']
                    ]
                ], 413);
            }

            // Handle other exceptions
            return response()->json([
                'message' => $e->getMessage() ?: 'An error occurred',
                'errors' => [
                    'general' => [$e->getMessage() ?: 'Server error occurred']
                ]
            ], 500);
        }

        // For web routes, use Inertia error pages
        $response = parent::render($request, $e);
        $status = $response->getStatusCode();

        // Map status codes to Inertia error pages
        if (in_array($status, [401, 403, 404, 419, 429, 500, 503]) && !$request->expectsJson()) {
            return \Inertia\Inertia::render("Errors/{$status}")
                ->toResponse($request)
                ->setStatusCode($status);
        }

        return $response;
    }
}
