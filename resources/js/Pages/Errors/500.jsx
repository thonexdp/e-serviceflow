import { Link, Head } from '@inertiajs/react';

export default function Error500() {
    return (
        <>
            <Head title="500 - Server Error" />
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="max-w-2xl w-full text-center">
                    {/* Error icon */}
                    <div className="mb-8">
                        <svg className="w-24 h-24 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>

                    {/* Error code */}
                    <h1 className="text-9xl font-bold text-gray-200 mb-4">
                        500
                    </h1>

                    {/* Message */}
                    <h2 className="text-3xl font-semibold text-gray-800 mb-4">
                        Internal Server Error
                    </h2>
                    <p className="text-lg text-gray-600 mb-8">
                        Something went wrong on our end. We've been notified and are working to fix it. Please try again later.
                    </p>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Try Again
                        </button>
                        <Link
                            href="/auth/login"
                            className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Go to Homepage
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
