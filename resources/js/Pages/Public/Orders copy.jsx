import { useState } from 'react';
import TicketForm from '@/Components/Tickets/TicketForm';
import { Head } from '@inertiajs/react';

export default function PublicOrderForm() {
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleTicketSubmit = async (data) => {
        console.log("Submitting public order:", data);
        // TODO: Implement backend endpoint for public ticket creation
        // For now, simulate success
        setTimeout(() => {
            setIsSubmitted(true);
            window.scrollTo(0, 0);
        }, 1000);
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Head title="Order Received" />

                {/* Header */}
                <header className="bg-white shadow-sm border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <img src="/images/logo.jpg" alt="RC PrintShoppe" className="w-6 h-6" />
                            </div>
                            <h1 className="text-xl font-bold text-gray-900">RC PrintShoppe</h1>
                        </div>
                    </div>
                </header>

                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md w-full border border-gray-200">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Received!</h2>
                        <p className="text-gray-600 mb-8">Thank you for your order. We have received your details and will contact you shortly to confirm.</p>

                        <div className="space-y-3">
                            <button
                                onClick={() => setIsSubmitted(false)}
                                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                            >
                                Place Another Order
                            </button>
                            <a
                                href="/"
                                className="block w-full bg-white text-gray-700 px-6 py-3 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-colors"
                            >
                                Return to Home
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Head title="Place Order" />

            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <img src="/images/logo.jpg" alt="RC PrintShoppe" className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">RC PrintShoppe</h1>
                                <p className="text-xs text-gray-600">Place Your Order</p>
                            </div>
                        </div>
                        <a href="/" className="text-sm text-gray-600 hover:text-indigo-600 font-medium">
                            Back to Home
                        </a>
                    </div>
                </div>
            </header>

            <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-900">New Order Request</h2>
                            <p className="text-gray-500 text-sm mt-1">Please fill out the form below with your order details.</p>
                        </div>

                        <div className="p-6">
                            <TicketForm
                                isPublic={true}
                                hasPermission={() => false}
                                onSubmit={handleTicketSubmit}
                                onCancel={() => window.location.href = '/'}
                            />
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <p className="text-center text-sm text-gray-600">
                        © 2025 RC PrintShoppe. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}