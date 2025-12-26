import { Link, Head } from '@inertiajs/react';

export default function Error403() {
  return (
    <>
            <Head title="403 - Access Forbidden" />
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="max-w-2xl w-full text-center">
                    {/* Error icon */}
                    <div className="mb-8">
                        <svg className="w-24 h-24 mx-auto text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>

                    {/* Error code */}
                    <h1 className="text-9xl font-bold text-gray-200 mb-4">
                        403
                    </h1>

                    {/* Message */}
                    <h2 className="text-3xl font-semibold text-gray-800 mb-4">
                        Access Forbidden
                    </h2>
                    <p className="text-lg text-gray-600 mb-8">
                        You don't have permission to access this resource. Please contact your administrator if you believe this is an error.
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