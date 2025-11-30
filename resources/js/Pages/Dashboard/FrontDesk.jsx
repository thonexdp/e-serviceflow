import React, { useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router } from "@inertiajs/react";
import Modal from "@/Components/Main/Modal";
import CustomerSearchBox from "@/Components/Common/CustomerSearchBox";

export default function FrontDesk({
    user = {},
    notifications = [],
    messages = [],
    statistics = {
        newTickets: 0,
        paymentPending: 0,
        completed: 0,
        inProgress: 0,
    },
    ticketsByStatus = {
        pendingPayment: [],
        inProgress: [],
        readyForPickup: [],
        completed: [],
    },
    allTickets = [],
    payments = [],
    filters = { date_range: 'this_month' }
}) {

    const [refreshing, setRefreshing] = useState(false);
    const [dateRange, setDateRange] = useState(filters.date_range || 'this_month');

    // Modal States
    const [openPaymentModal, setOpenPaymentModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [paymentForm, setPaymentForm] = useState({
        ticketId: "",
        customerId: "",
        customerName: "",
        amountDue: 0,
        paymentAmount: "",
        paymentMethod: "cash",
        notes: "",
    });

    const refreshDashboard = () => {
        setRefreshing(true);
        router.reload({
            onFinish: () => setRefreshing(false),
        });
    };

    const handleDateRangeChange = (range) => {
        setDateRange(range);
        router.get('/dashboard', { date_range: range }, {
            preserveState: true,
            preserveScroll: true,
            replace: true
        });
    };

    // ============================================
    // PAYMENT MODAL HANDLERS
    // ============================================
    const openPaymentModalWithData = (payment) => {
        setSelectedPayment(payment);
        setPaymentForm({
            ticketId: payment.ticketId,
            customerId: payment.customer.id,
            customerName: payment.customer.name,
            amountDue: payment.amountDue,
            paymentAmount: payment.amountDue.toString(),
            paymentMethod: "cash",
            notes: "",
        });
        setOpenPaymentModal(true);
    };

    const handlePaymentFormChange = (field, value) => {
        setPaymentForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleRecordPayment = async () => {
        // TODO: Implement actual payment recording via API
        // For now, we'll just log it and close the modal
        console.log("Recording payment:", paymentForm);

        // Example of how to submit using router
        // router.post(`/tickets/${paymentForm.ticketId}/payments`, paymentForm, {
        //     onSuccess: () => {
        //         setOpenPaymentModal(false);
        //         // Success notification handled by flash messages
        //     }
        // });

        alert("Payment recording endpoint not yet connected in this view. Please use the Tickets page.");
        setOpenPaymentModal(false);
    };

    // ============================================
    // TICKET HANDLERS
    // ============================================
    const handleTicketClick = (ticketId) => {
        router.visit(`/tickets/${ticketId}`);
    };

    const handleViewTicket = (ticketId) => {
        router.visit(`/tickets/${ticketId}`);
    };

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
        }).format(amount);
    };

    const formatDate = (date) => {
        if (!date) return "-";
        return new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const getStatusBadgeClass = (color) => {
        const colorMap = {
            primary: "badge-primary",
            warning: "badge-warning",
            info: "badge-info",
            success: "badge-success",
            danger: "badge-danger",
            secondary: "badge-secondary",
        };
        return `badge ${colorMap[color] || "badge-secondary"}`;
    };

    const getPaymentStatusBadge = (status) => {
        const classes = {
            pending: "badge-warning",
            partial: "badge-info",
            paid: "badge-success",
        };
        return (
            <div className={`badge ${classes[status] || "badge-secondary"}`}>
                {status?.toUpperCase() || "PENDING"}
            </div>
        );
    };
    return (
        <AdminLayout user={user} notifications={notifications} messages={messages}>
            <Head title="Front Desk Dashboard" />

            {/* Page Header */}
            <div className="row">
                <div className="col-lg-8 p-r-0 title-margin-right">
                    <div className="page-header">
                        <div className="page-title">
                            <h1>
                                Front Desk <span>Dashboard</span>
                            </h1>
                        </div>
                    </div>
                </div>
                <div className="col-lg-4 p-l-0 title-margin-left">
                    <div className="page-header">
                        <div className="page-title">
                            <ol className="breadcrumb">
                                <li className="breadcrumb-item">
                                    <a href="#">Dashboard</a>
                                </li>
                                <li className="breadcrumb-item active">Front Desk</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            <Modal
                title="Record Payment"
                isOpen={openPaymentModal}
                onClose={() => setOpenPaymentModal(false)}
                onSave={handleRecordPayment}
                size="3xl"
                submitButtonText="Record Payment"
            >
                <div className="space-y-4">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold mb-2">
                            Record Payment for Ticket {selectedPayment?.trackingNumber}
                        </h3>
                        <hr />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Customer
                            </label>
                            <input
                                type="text"
                                className="w-full border rounded-md p-2 bg-gray-50"
                                value={paymentForm.customerName}
                                disabled
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Amount Due
                            </label>
                            <input
                                type="text"
                                className="w-full border rounded-md p-2 bg-gray-50"
                                value={formatCurrency(paymentForm.amountDue)}
                                disabled
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Payment Amount <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                className="w-full border rounded-md p-2"
                                placeholder="0.00"
                                value={paymentForm.paymentAmount}
                                onChange={(e) =>
                                    handlePaymentFormChange("paymentAmount", e.target.value)
                                }
                                step="0.01"
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Payment Method <span className="text-red-500">*</span>
                            </label>
                            <select
                                className="w-full border rounded-md p-2"
                                value={paymentForm.paymentMethod}
                                onChange={(e) =>
                                    handlePaymentFormChange("paymentMethod", e.target.value)
                                }
                            >
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="gcash">GCash</option>
                                <option value="bank_transfer">Bank Transfer</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Notes (Optional)
                        </label>
                        <textarea
                            className="w-full border rounded-md p-2"
                            placeholder="Add any notes about this payment..."
                            rows="3"
                            value={paymentForm.notes}
                            onChange={(e) =>
                                handlePaymentFormChange("notes", e.target.value)
                            }
                        />
                    </div>
                </div>
            </Modal>

            <section id="main-content">
                {/* Date Filter Section */}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-200">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <select
                            className="text-sm font-medium text-gray-700 border-none bg-transparent focus:ring-0 p-0 pr-6 cursor-pointer"
                            value={dateRange}
                            onChange={(e) => handleDateRangeChange(e.target.value)}
                        >
                            <option value="today">Today</option>
                            <option value="this_week">This Week</option>
                            <option value="this_month">This Month</option>
                            <option value="last_30_days">Last 30 Days</option>
                            <option value="this_year">This Year</option>
                        </select>
                    </div>
                </div>
                {/* Statistics Cards - Compact */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">New Orders</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{statistics.newTickets}</p>
                                <div className="flex items-center mt-2 text-xs">
                                    <span className="text-green-600 font-semibold flex items-center">
                                        <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                        12%
                                    </span>
                                    <span className="text-gray-400 ml-1">vs last month</span>
                                </div>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending Payment</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{statistics.paymentPending}</p>
                                <div className="flex items-center mt-2 text-xs">
                                    <span className="text-red-600 font-semibold flex items-center">
                                        <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        5%
                                    </span>
                                    <span className="text-gray-400 ml-1">vs last month</span>
                                </div>
                            </div>
                            <div className="bg-red-50 p-3 rounded-lg">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Completed</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{statistics.completed}</p>
                                <div className="flex items-center mt-2 text-xs">
                                    <span className="text-green-600 font-semibold flex items-center">
                                        <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                        8%
                                    </span>
                                    <span className="text-gray-400 ml-1">vs last month</span>
                                </div>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">In Progress</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{statistics.inProgress}</p>
                                <div className="flex items-center mt-2 text-xs">
                                    <span className="text-green-600 font-semibold flex items-center">
                                        <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                        15%
                                    </span>
                                    <span className="text-gray-400 ml-1">vs last month</span>
                                </div>
                            </div>
                            <div className="bg-yellow-50 p-3 rounded-lg">
                                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>



                <div className="row">
                    <div className="col-lg-3">
                        <div className="card bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">New Orders</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">{statistics.newTickets}</p>
                                    <div className="flex items-center mt-2 text-xs">
                                        <span className="text-green-600 font-semibold flex items-center">
                                            <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                            </svg>
                                            12%
                                        </span>
                                        <span className="text-gray-400 ml-1">vs last month</span>
                                    </div>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-lg">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-9">
                        <div className="card">
                            <div className="card-title pr">
                                <div className="flex justify-between items-center">
                                    <h4>New/ Online Orders to Confirm</h4>
                                    <button
                                        onClick={refreshDashboard}
                                        className="btn btn-sm btn-primary"
                                        disabled={refreshing}
                                    >
                                        <i className={`ti-reload ${refreshing ? 'animate-spin' : ''}`}></i>
                                        {refreshing ? ' Refreshing...' : ' Refresh'}
                                    </button>
                                    <div className="basic-form">
                                        <div className="form-group">
                                            <CustomerSearchBox

                                            />
                                        </div>
                                    </div>

                                </div>
                            </div>
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table student-data-table m-t-20">
                                        <thead>
                                            <tr>
                                                <th>Ticket ID</th>
                                                <th>Customer</th>
                                                <th>Description</th>
                                                <th>Files</th>
                                                <th>Payment</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>1DTSYDS</td>
                                                <td>John Doe</td>
                                                <td>Mugs</td>
                                                <td>
                                                    <button className="btn btn-sm btn-primary">Preview</button>
                                                </td>
                                                <td>GCash</td>
                                                <td>
                                                    <button className="btn btn-sm btn-primary">View</button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* All Tickets Table */}
                <div className="row">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-title pr">
                                <div className="flex justify-between items-center">
                                    <h4>RECENT TICKETS (Today)</h4>
                                    <button
                                        onClick={refreshDashboard}
                                        className="btn btn-sm btn-primary"
                                        disabled={refreshing}
                                    >
                                        <i className={`ti-reload ${refreshing ? 'animate-spin' : ''}`}></i>
                                        {refreshing ? ' Refreshing...' : ' Refresh'}
                                    </button>
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table student-data-table m-t-20">
                                        <thead>
                                            <tr>
                                                <th>Ticket ID</th>
                                                <th>Customer</th>
                                                <th>Description</th>
                                                <th>Balance</th>
                                                <th>Due Date</th>
                                                <th>Status</th>
                                                <th>Payment Status</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allTickets.length > 0 ? (
                                                allTickets.map((ticket) => (
                                                    <tr key={ticket.id}>
                                                        <td>
                                                            {ticket.trackingNumber}
                                                        </td>
                                                        <td>{ticket.customer.firstname}</td>
                                                        <td>{ticket.description}</td>
                                                        <td>{ticket.balance}</td>
                                                        <td>{formatDate(ticket.dueDate)}</td>
                                                        <td>
                                                            <div className={getStatusBadgeClass(ticket.statusColor)}>
                                                                {ticket.statusLabel}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className={getPaymentStatusBadge(ticket.statusColor)}>
                                                                {ticket.statusLabel}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            {ticket.status !== "paid" && (
                                                                <button
                                                                    className="btn btn-sm btn-primary"
                                                                    onClick={() => handleViewTicket(ticket.id)}
                                                                >
                                                                    Payment
                                                                </button>
                                                            )}

                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="6" className="text-center text-gray-400">
                                                        No tickets found
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </AdminLayout>
    );
}
