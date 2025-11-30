import { useState } from 'react';
import { Search, Package, Phone, Mail, MapPin, Plus, CheckCircle, Clock, Printer, Truck } from 'lucide-react';
import axios from 'axios';
import { router } from '@inertiajs/react';

export default function PrintShoppeLanding() {
    const [trackingNumber, setTrackingNumber] = useState('');
    const [orderData, setOrderData] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async () => {
        if (!trackingNumber.trim()) {
            setError('Please enter a tracking number');
            return;
        }

        setIsSearching(true);
        setError(null);
        setOrderData(null);

        try {
            const response = await axios.post('/api/public/tickets/search', {
                ticket_number: trackingNumber.trim(),
            });

            if (response.data.success) {
                setOrderData(response.data.data);
            } else {
                setError(response.data.message || 'Ticket not found');
            }
        } catch (err) {
            if (err.response && err.response.status === 404) {
                setError('Ticket not found. Please check your tracking number and try again.');
            } else if (err.response && err.response.data && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError('An error occurred while searching. Please try again.');
            }
            console.error('Search error:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const getStatusIcon = (status) => {
        if (status === 'completed') return <CheckCircle className="w-6 h-6 text-green-600" />;
        if (status === 'current') return <Clock className="w-6 h-6 text-blue-600" />;
        return <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>;
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center">
                            <img src="/images/logo.jpg" alt="RC PrintShoppe" className="w-12 h-12 rounded-full" />
                        </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">RC PrintShoppe</h1>
                                <p className="text-sm text-gray-600">Track Your Order</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Search Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Package className="w-5 h-5 text-indigo-600" />
                                <h2 className="text-xl font-semibold text-gray-900">Track Your Order</h2>
                            </div>
                            <p className="text-gray-600 mb-4 text-sm">Enter your tracking number to view order status</p>

                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        value={trackingNumber}
                                        onChange={(e) => setTrackingNumber(e.target.value)}
                                        placeholder="Enter tracking number (e.g., TKT-000001)"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                </div>
                                <button
                                    onClick={handleSearch}
                                    disabled={isSearching || !trackingNumber}
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
                                >
                                    <Search className="w-5 h-5" />
                                    {isSearching ? 'Searching...' : 'Track'}
                                </button>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}
                        </div>

                        {/* Order Results */}
                        {orderData && (
                            <>
                                {/* Timeline */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Order Progress</h3>
                                    <div className="space-y-4">
                                        {orderData.timeline.map((item, index) => (
                                            <div key={index} className="flex gap-4">
                                                <div className="flex flex-col items-center">
                                                    {getStatusIcon(item.status)}
                                                    {index < orderData.timeline.length - 1 && (
                                                        <div className={`w-0.5 h-16 mt-2 ${item.status === 'completed' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                                                    )}
                                                </div>
                                                <div className="flex-1 pb-8">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className={`font-semibold ${item.status === 'current' ? 'text-blue-600' : item.status === 'completed' ? 'text-gray-900' : 'text-gray-400'}`}>
                                                            {item.stage}
                                                        </h4>
                                                        {item.date && (
                                                            <span className="text-sm text-gray-500">{item.date}</span>
                                                        )}
                                                    </div>
                                                    {item.status === 'current' && (
                                                        <p className="text-sm text-gray-600 mt-1">Your order is currently being processed</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Order Details */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h3>

                                    <div className="space-y-4">
                                        {/* Ticket Number */}
                                        <div className="flex justify-between py-2 border-b border-gray-100">
                                            <span className="text-gray-600">Ticket Number</span>
                                            <span className="font-semibold text-gray-900">{orderData.ticketNumber}</span>
                                        </div>

                                        {/* Customer Info */}
                                        <div className="py-2 border-b border-gray-100">
                                            <p className="text-gray-600 mb-2">Customer Information</p>
                                            <div className="space-y-1 text-sm">
                                                <p className="font-medium text-gray-900">{orderData.customer.name}</p>
                                                <p className="text-gray-600">{orderData.customer.email}</p>
                                                <p className="text-gray-600">{orderData.customer.phone}</p>
                                            </div>
                                        </div>

                                        {/* Order Items */}
                                        <div className="py-2 border-b border-gray-100">
                                            <p className="text-gray-600 mb-2">Items</p>
                                            {orderData.orderDetails.items.map((item, index) => (
                                                <div key={index} className="mb-2 text-sm">
                                                    <p className="font-medium text-gray-900">{item.name} - {item.quantity}</p>
                                                    <p className="text-gray-600">{item.specifications}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Dates */}
                                        <div className="flex justify-between py-2 border-b border-gray-100">
                                            <span className="text-gray-600">Order Date</span>
                                            <span className="font-medium text-gray-900">{orderData.orderDetails.orderDate}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-gray-100">
                                            <span className="text-gray-600">Expected Completion</span>
                                            <span className="font-medium text-gray-900">{orderData.orderDetails.expectedCompletion}</span>
                                        </div>

                                        {/* Payment Info */}
                                        <div className="pt-4 space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Total Amount</span>
                                                <span className="font-medium text-gray-900">₱{orderData.payment.totalAmount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Amount Paid</span>
                                                <span className="font-medium text-green-600">₱{orderData.payment.amountPaid.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between pt-2 border-t border-gray-200">
                                                <span className="font-semibold text-gray-900">Balance Due</span>
                                                <span className="font-bold text-red-600">₱{orderData.payment.balance.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">Payment Status</span>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${orderData.payment.status === 'Paid' ? 'bg-green-100 text-green-700' :
                                                    orderData.payment.status === 'Partially Paid' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                    {orderData.payment.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* New Order Button */}
                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl shadow-sm p-6 text-white">
                            <h3 className="text-lg font-semibold mb-2">Need Printing Services?</h3>
                            <p className="text-indigo-100 text-sm mb-4">Create a new order and get professional printing solutions</p>
                            <button className="w-full bg-white text-indigo-600 px-4 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                            onClick={() => router.visit('/orders', { preserveState: true, preserveScroll: true, replace: true })}
                            >
                                <Plus className="w-5 h-5" />
                                Create New Order
                            </button>
                        </div>

                        {/* Contact Us */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Us</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Phone className="w-5 h-5 text-indigo-600 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Phone</p>
                                        <p className="text-sm text-gray-600">+63 917 123 4567</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Mail className="w-5 h-5 text-indigo-600 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Email</p>
                                        <p className="text-sm text-gray-600">info@rcprintshoppe.com</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-indigo-600 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Address</p>
                                        <p className="text-sm text-gray-600">Paranaque City, Metro Manila, Philippines</p>
                                    </div>
                                </div>
                            </div>
                            <button className="w-full mt-4 bg-indigo-50 text-indigo-600 px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-100 transition-colors text-sm">
                                Send us a message
                            </button>
                        </div>

                        {/* Business Hours */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Business Hours</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Monday - Friday</span>
                                    <span className="font-medium text-gray-900">8AM - 6PM</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Saturday</span>
                                    <span className="font-medium text-gray-900">9AM - 3PM</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Sunday</span>
                                    <span className="font-medium text-gray-900">Closed</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <p className="text-center text-sm text-gray-600">
                        © 2025 RC PrintShoppe. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}