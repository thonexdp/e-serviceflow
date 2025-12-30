import { useState, useEffect } from 'react';
import { Search, Package, Phone, Mail, MapPin, Plus, CheckCircle, Clock, Printer, Truck } from 'lucide-react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import { formatPeso } from '@/Utils/currency';

export default function PrintShoppeLanding() {
    const [trackingNumber, setTrackingNumber] = useState('');
    const [orderData, setOrderData] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState(null);
    const [settings, setSettings] = useState(null);
    const [branches, setBranches] = useState([]);
    const [showSuggestion, setShowSuggestion] = useState(false);
    const [ticketHistory, setTicketHistory] = useState([]);
    const [inputFocused, setInputFocused] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
    const [activeBranchIndex, setActiveBranchIndex] = useState(0);


    useEffect(() => {
        const lastTicket = localStorage.getItem('rc_printshop_last_ticket');
        if (lastTicket) {
            setTrackingNumber(lastTicket);
            setShowSuggestion(true);
        }


        try {
            const history = JSON.parse(localStorage.getItem('rc_printshop_ticket_history') || '[]');
            setTicketHistory(history);
        } catch (e) {
            console.error('Error loading ticket history:', e);
        }
    }, []);


    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await axios.get('/api/public/settings');
                if (response.data.success) {
                    const data = response.data.data;
                    setSettings(data);
                    // Extract branches separately
                    if (data.branches) {
                        setBranches(data.branches);
                    }
                }
            } catch (err) {
                console.error('Error fetching settings:', err);
            }
        };
        fetchSettings();
    }, []);

    const handleSearch = async () => {
        if (!trackingNumber.trim()) {
            setError('Please enter a tracking number');
            return;
        }

        setIsSearching(true);
        setError(null);
        setOrderData(null);
        setShowSuggestion(false);

        try {
            const response = await axios.post('/api/public/tickets/search', {
                ticket_number: trackingNumber.trim()
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

    const handleSelectTicket = (ticketNumber) => {
        setTrackingNumber(ticketNumber);
        setInputFocused(false);
        setSelectedSuggestionIndex(-1);
        setShowSuggestion(false);
    };

    const handleKeyDown = (e) => {
        if (!inputFocused || ticketHistory.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedSuggestionIndex((prev) =>
                prev < ticketHistory.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedSuggestionIndex((prev) => prev > 0 ? prev - 1 : -1);
        } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
            e.preventDefault();
            handleSelectTicket(ticketHistory[selectedSuggestionIndex].ticket_number);
        } else if (e.key === 'Escape') {
            setInputFocused(false);
            setSelectedSuggestionIndex(-1);
        }
    };

    const getRelativeTime = (timestamp) => {
        const now = new Date();
        const then = new Date(timestamp);
        const diffMs = now - then;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return then.toLocaleDateString();
    };

    const getStatusIcon = (status) => {
        if (status === 'completed') return <CheckCircle className="w-6 h-6 text-green-600" />;
        if (status === 'current') return <Clock className="w-6 h-6 text-orange-600" />;
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
                                <Package className="w-5 h-5 text-orange-600" />
                                <h2 className="text-xl font-semibold text-gray-900">Track Your Order</h2>
                            </div>
                            <p className="text-gray-600 mb-4 text-sm">Enter your tracking number to view order status</p>

                            {ticketHistory.length > 0 && !inputFocused &&
                                <div className="mb-3 flex items-center gap-2 text-xs text-orange-600">
                                    <Clock className="w-4 h-4" />
                                    <span>Click the input to see your {ticketHistory.length} recent ticket{ticketHistory.length > 1 ? 's' : ''}</span>
                                </div>
                            }

                            <div className="flex gap-2 sm:gap-3">
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={trackingNumber}
                                        onChange={(e) => setTrackingNumber(e.target.value)}
                                        onFocus={() => {
                                            setInputFocused(true);
                                            setSelectedSuggestionIndex(-1);
                                        }}
                                        onBlur={() => {

                                            setTimeout(() => setInputFocused(false), 200);
                                        }}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Enter tracking number (e.g., RC-ABC123)"
                                        className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && selectedSuggestionIndex < 0) {
                                                handleSearch();
                                            }
                                        }} />


                                    {/* Ticket History Dropdown */}
                                    {inputFocused && ticketHistory.length > 0 &&
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                            <div className="p-2">
                                                <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1 mb-1">
                                                    Recent Tickets
                                                </div>
                                                {ticketHistory.map((ticket, index) =>
                                                    <button
                                                        key={index}
                                                        onClick={() => handleSelectTicket(ticket.ticket_number)}
                                                        className={`w-full text-left px-3 py-2 rounded-md hover:bg-orange-50 transition-colors ${selectedSuggestionIndex === index ? 'bg-orange-50' : ''}`
                                                        }>

                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-semibold text-sm text-gray-900 truncate">
                                                                    {ticket.ticket_number}
                                                                </div>
                                                                <div className="text-xs text-gray-500 truncate">
                                                                    {ticket.customer_name}
                                                                </div>
                                                            </div>
                                                            <div className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                                                {getRelativeTime(ticket.created_at)}
                                                            </div>
                                                        </div>
                                                    </button>
                                                )}

                                                {/* Clear History Button */}
                                                <div className="border-t border-gray-200 mt-2 pt-2">
                                                    <button
                                                        onClick={() => {
                                                            localStorage.removeItem('rc_printshop_ticket_history');
                                                            setTicketHistory([]);
                                                            setInputFocused(false);
                                                        }}
                                                        className="w-full text-center px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-md transition-colors font-medium">

                                                        Clear History
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    }
                                </div>
                                <button
                                    onClick={handleSearch}
                                    disabled={isSearching || !trackingNumber}
                                    className="px-3 py-2 sm:px-6 sm:py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2 font-medium transition-colors text-sm sm:text-base whitespace-nowrap">

                                    <Search className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                    <span className="hidden xs:inline">{isSearching ? 'Searching...' : 'Track'}</span>
                                    <span className="xs:hidden">{isSearching ? '...' : ''}</span>
                                </button>
                            </div>

                            {/* Suggestion Message */}
                            {showSuggestion && !orderData && !error &&
                                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-green-800">
                                            <strong>Your recent order is ready to track!</strong> We've auto-filled your ticket number <strong>{trackingNumber}</strong>. Click "Track" to view your order status.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowSuggestion(false);
                                            localStorage.removeItem('rc_printshop_last_ticket');
                                        }}
                                        className="flex-shrink-0 text-green-600 hover:text-green-800">

                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            }

                            {/* Error Message */}
                            {error &&
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            }
                        </div>

                        {/* Order Results */}
                        {orderData &&
                            <>
                                {/* Timeline */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900">Order Progress</h3>
                                        {orderData.design_status === 'pending' && (
                                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-bold border border-orange-100 animate-pulse">
                                                <div className="w-1.5 h-1.5 rounded-full bg-orange-600"></div>
                                                Design in Progress
                                            </span>
                                        )}
                                        {orderData.design_status === 'approved' && (
                                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-600 text-xs font-bold border border-green-100">
                                                <CheckCircle className="w-3 h-3" />
                                                Design is approved
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        {orderData.timeline.map((item, index) =>
                                            <div key={index} className="flex gap-4">
                                                <div className="flex flex-col items-center">
                                                    {getStatusIcon(item.status)}
                                                    {index < orderData.timeline.length - 1 &&
                                                        <div className={`w-0.5 h-16 mt-2 ${item.status === 'completed' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                                                    }
                                                </div>
                                                <div className="flex-1 pb-8">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className={`font-semibold ${item.status === 'current' ? 'text-orange-600' : item.status === 'completed' ? 'text-gray-900' : 'text-gray-400'}`}>
                                                            {item.stage}
                                                        </h4>
                                                        {item.date &&
                                                            <span className="text-sm text-gray-500">{item.date}</span>
                                                        }
                                                    </div>
                                                    {index === 3 && item.status === 'current' &&
                                                        <span className="text-sm text-gray-500"> <i className='ti ti-reload mr-2'></i> <i>{orderData.current_workflow_step}</i> </span>
                                                    }

                                                    {item.status === 'current' &&
                                                        <p className="text-sm text-gray-600 mt-1">Your order is currently being processed</p>
                                                    }
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Approved Designs */}
                                {orderData.approved_mockups && orderData.approved_mockups.length > 0 &&
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                                <div className="p-2 bg-green-100 rounded-lg">
                                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                                </div>
                                                Approved Design
                                            </h3>
                                            {/* <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                       Ready for Production
                    </span> */}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {orderData.approved_mockups.map((mockup) =>
                                                <div key={mockup.id} className="group relative bg-gray-50 rounded-xl border border-gray-100 p-2 transition-all hover:shadow-md hover:border-orange-200">
                                                    <div className="aspect-square w-full overflow-hidden rounded-lg bg-white relative">
                                                        <img
                                                            src={mockup.url}
                                                            alt={mockup.name}
                                                            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 cursor-zoom-in"
                                                            onClick={() => window.open(mockup.url, '_blank')} />

                                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="bg-white/90 backdrop-blur p-1.5 rounded-lg shadow-sm">
                                                                <Search className="w-4 h-4 text-orange-600" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 px-1 pb-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-xs font-medium text-gray-700 truncate" title={mockup.name}>
                                                                {mockup.name}
                                                            </p>
                                                            <div className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold text-green-600">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></div>
                                                                VERIFIED
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {/* <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-100 flex items-center justify-between gap-4">
                     <p className="text-xs text-orange-700 flex items-start gap-2">
                         <Printer className="w-4 h-4 mt-0.5 flex-shrink-0" />
                         <span>This design has been approved and is scheduled for production. Any further changes may affect your expected completion date.</span>
                     </p>
                     {orderData.designer && (
                         <div className="flex-shrink-0 text-right">
                             <p className="text-[10px] text-orange-400 uppercase font-bold tracking-wider">Designer</p>
                             <p className="text-xs font-semibold text-orange-900">{orderData.designer}</p>
                         </div>
                     )}
                  </div> */}
                                    </div>
                                }

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
                                            {orderData.orderDetails.items.map((item, index) =>
                                                <div key={index} className="mb-2 text-sm">
                                                    <p className="font-medium text-gray-900">{item.name} - {item.quantity}</p>
                                                    <p className="text-gray-600">{item.specifications}</p>
                                                </div>
                                            )}
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
                                                <span className="font-medium text-gray-900">{formatPeso(orderData.payment.totalAmount.toFixed(2))}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Amount Paid</span>
                                                <span className="font-medium text-green-600">{formatPeso(orderData.payment.amountPaid.toFixed(2))}</span>
                                            </div>
                                            <div className="flex justify-between pt-2 border-t border-gray-200">
                                                <span className="font-semibold text-gray-900">Balance Due</span>
                                                <span className="font-bold text-red-600">{formatPeso(orderData.payment.balance.toFixed(2))}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">Payment Status</span>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${orderData.payment.status === 'Paid' ? 'bg-green-100 text-green-700' :
                                                    orderData.payment.status === 'Partially Paid' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'}`
                                                }>
                                                    {orderData.payment.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        }
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* New Order Button */}
                        <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl shadow-sm p-6 text-white">
                            <h3 className="text-lg font-semibold mb-2">Need Printing Services?</h3>
                            <p className="text-orange-100 text-sm mb-4">Create a new order and get professional printing solutions</p>
                            <button className="w-full bg-white text-orange-600 px-4 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
                                onClick={() => router.visit('/orders', { preserveState: true, preserveScroll: true, replace: true })}>

                                <Plus className="w-5 h-5" />
                                Create New Order
                            </button>
                        </div>

                        {/* Our Branches */}
                        {branches && branches.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-hidden">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">Our Branches</h3>
                                    <div className="flex gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                                        <button
                                            onClick={() => setActiveBranchIndex(Math.max(0, activeBranchIndex - 1))}
                                            disabled={activeBranchIndex === 0}
                                            className="p-1 rounded text-gray-400 disabled:opacity-30 hover:bg-white hover:text-orange-600 transition-all"
                                        >
                                            <Search className="w-3 h-3 rotate-[-90deg]" />
                                        </button>
                                        <button
                                            onClick={() => setActiveBranchIndex(Math.min(branches.length - 1, activeBranchIndex + 1))}
                                            disabled={activeBranchIndex === branches.length - 1}
                                            className="p-1 rounded text-gray-400 disabled:opacity-30 hover:bg-white hover:text-orange-600 transition-all"
                                        >
                                            <Search className="w-3 h-3 rotate-[90deg]" />
                                        </button>
                                    </div>
                                </div>

                                {/* Tabs Navigation */}
                                <div className="flex gap-2 overflow-x-auto pb-4 mb-6 -mx-1 px-1 scrollbar-hide no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                    {branches.map((branch, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setActiveBranchIndex(index)}
                                            className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 border-2 flex-shrink-0 ${activeBranchIndex === index
                                                ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-200 scale-105"
                                                : "bg-white border-gray-100 text-gray-500 hover:border-orange-200 hover:bg-orange-50"
                                                }`}
                                        >
                                            {branch.name || `Branch ${index + 1}`}
                                        </button>
                                    ))}
                                </div>

                                {/* Active Branch Content */}
                                <div className="transition-all duration-500 ease-in-out">
                                    {branches[activeBranchIndex] && (
                                        <div key={activeBranchIndex} className="animate-in fade-in slide-in-from-right-4 duration-300">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="font-extrabold text-gray-900 text-base">
                                                    {branches[activeBranchIndex].name}
                                                </h4>
                                                {activeBranchIndex === 0 && (
                                                    <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                        Main Office
                                                    </span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="space-y-3">
                                                    {branches[activeBranchIndex].phone && (
                                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50/50 border border-orange-100/50 hover:bg-orange-50 transition-colors">
                                                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0">
                                                                <Phone className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-bold text-orange-800/50 uppercase tracking-tight">Contact Number</p>
                                                                <p className="text-xs font-semibold text-gray-800">{branches[activeBranchIndex].phone}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {branches[activeBranchIndex].email && (
                                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/50 border border-blue-100/50 hover:bg-blue-50 transition-colors">
                                                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                                                <Mail className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-bold text-blue-800/50 uppercase tracking-tight">Email Address</p>
                                                                <p className="text-xs font-semibold text-gray-800">{branches[activeBranchIndex].email}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {branches[activeBranchIndex].facebook && (
                                                        <a
                                                            href="https://www.facebook.com/rcprintshoppe"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="block"
                                                        >
                                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100/50 hover:bg-indigo-50 transition-colors cursor-pointer">
                                                                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                                                    </svg>
                                                                </div>

                                                                <div>
                                                                    <p className="text-[10px] font-bold text-indigo-800/50 uppercase tracking-tight">
                                                                        Facebook
                                                                    </p>
                                                                    <p className="text-xs font-semibold text-gray-800">
                                                                        {branches[activeBranchIndex].facebook}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </a>
                                                    )}


                                                    {branches[activeBranchIndex].address && (
                                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-50/50 border border-rose-100/50 hover:bg-rose-50 transition-colors">
                                                            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                                                                <MapPin className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-bold text-rose-800/50 uppercase tracking-tight">Office Address</p>
                                                                <p className="text-xs font-semibold text-gray-800 leading-tight">{branches[activeBranchIndex].address}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {branches[activeBranchIndex].business_hours && (branches[activeBranchIndex].business_hours.monday_friday || branches[activeBranchIndex].business_hours.saturday || branches[activeBranchIndex].business_hours.sunday) && (
                                                    <div className="mt-2 p-4 rounded-xl bg-gray-50 border border-gray-100">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                            <Clock className="w-3 h-3 text-orange-500" />
                                                            Operating Schedule
                                                        </p>
                                                        <div className="space-y-2">
                                                            {branches[activeBranchIndex].business_hours.monday_friday && (
                                                                <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100/50 shadow-sm">
                                                                    <span className="text-[11px] font-bold text-gray-500">Mon - Fri</span>
                                                                    <span className="text-[11px] font-black text-gray-800">{branches[activeBranchIndex].business_hours.monday_friday}</span>
                                                                </div>
                                                            )}
                                                            {branches[activeBranchIndex].business_hours.saturday && (
                                                                <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100/50 shadow-sm">
                                                                    <span className="text-[11px] font-bold text-gray-500">Saturday</span>
                                                                    <span className="text-[11px] font-black text-gray-800">{branches[activeBranchIndex].business_hours.saturday}</span>
                                                                </div>
                                                            )}
                                                            {branches[activeBranchIndex].business_hours.sunday && (
                                                                <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100/50 shadow-sm">
                                                                    <span className="text-[11px] font-bold text-gray-500">Sunday</span>
                                                                    <span className="text-[11px] font-black text-gray-800">{branches[activeBranchIndex].business_hours.sunday}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    disabled={true}
                                    className="w-full mt-6 bg-gradient-to-r from-orange-600 to-orange-500 text-white px-4 py-3 rounded-xl font-bold text-sm transition-all hover:shadow-lg hover:shadow-orange-200 active:scale-[0.98]"
                                >
                                    Send us a message
                                </button>
                            </div>
                        )}

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
        </div>);

}