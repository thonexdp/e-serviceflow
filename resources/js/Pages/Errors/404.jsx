import { Link, Head } from '@inertiajs/react';

export default function Error404() {
  return (
    <>
            <Head title="404 - Page Not Found" />
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="max-w-2xl w-full text-center">
                    {/* Error icon */}
                    <div className="mb-8">
                        <svg className="w-24 h-24 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>

                    {/* Error code */}
                    <h1 className="text-9xl font-bold text-gray-200 mb-4">
                        404
                    </h1>

                    {/* Message */}
                    <h2 className="text-3xl font-semibold text-gray-800 mb-4">
                        Page Not Found
                    </h2>
                    <p className="text-lg text-gray-600 mb-8">
                        Sorry, the page you're looking for doesn't exist or has been moved.
                    </p>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link
              href="/"
              className="px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors">

                            Go to Homepage
                        </Link>
                        <button
              onClick={() => window.history.back()}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">

                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        </>);

}