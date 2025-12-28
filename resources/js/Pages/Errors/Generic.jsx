import { Link, Head } from '@inertiajs/react';

export default function GenericError({ status = 500 }) {
  const errorMessages = {
    401: {
      title: 'Unauthorized',
      description: 'You need to be authenticated to access this resource. Please log in to continue.'
    },
    419: {
      title: 'Page Expired',
      description: 'Your session has expired. Please refresh the page and try again.'
    },
    429: {
      title: 'Too Many Requests',
      description: 'You\'re making too many requests. Please slow down and try again in a few moments.'
    },
    default: {
      title: 'Something Went Wrong',
      description: 'An unexpected error occurred. Please try again or contact support if the problem persists.'
    }
  };

  const error = errorMessages[status] || errorMessages.default;

  return (
    <>
            <Head title={`${status} - ${error.title}`} />
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="max-w-2xl w-full text-center">
                    {/* Error icon */}
                    <div className="mb-8">
                        <svg className="w-24 h-24 mx-auto text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>

                    {/* Error code */}
                    <h1 className="text-9xl font-bold text-gray-200 mb-4">
                        {status}
                    </h1>

                    {/* Message */}
                    <h2 className="text-3xl font-semibold text-gray-800 mb-4">
                        {error.title}
                    </h2>
                    <p className="text-lg text-gray-600 mb-8">
                        {error.description}
                    </p>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        {status === 419 ?
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors">

                                Refresh Page
                            </button> :

            <Link
              href="/"
              className="px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors">

                                Go to Homepage
                            </Link>
            }
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