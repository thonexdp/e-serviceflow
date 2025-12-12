import { Link, Head } from '@inertiajs/react';

export default function Error503() {
    return (
        <>
            <Head title="503 - Service Unavailable" />
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="max-w-2xl w-full text-center">
                    {/* Error icon */}
                    <div className="mb-8">
                        <svg className="w-24 h-24 mx-auto text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>

                    {/* Error code */}
                    <h1 className="text-9xl font-bold text-gray-200 mb-4">
                        503
                    </h1>

                    {/* Message */}
                    <h2 className="text-3xl font-semibold text-gray-800 mb-4">
                        Service Unavailable
                    </h2>
                    <p className="text-lg text-gray-600 mb-8">
                        We're currently performing scheduled maintenance. We'll be back online shortly. Thank you for your patience!
                    </p>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
