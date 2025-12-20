import React, { useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router } from "@inertiajs/react";
import Modal from "@/Components/Main/Modal";
import PreviewModal from "@/Components/Main/PreviewModal";
import CustomerSearchBox from "@/Components/Common/CustomerSearchBox";
import CardStatistics from "@/Components/Common/CardStatistics";
import { formatPeso } from "@/Utils/currency";
import { formatDate } from "@/Utils/formatDate";

export default function FrontDesk({
    user = {},
    notifications = [],
    messages = [],
    statistics = {
        newTickets: 0,
        newOnlineOrders: 0,
        paymentPending: 0,
        completed: 0,
        inProgress: 0,
    },
    newOnlineOrders = { data: [], links: [], meta: {} },
    recentTicketsToday = { data: [], links: [], meta: {} },
    filters = { date_range: "this_month" },
}) {
    const [refreshing, setRefreshing] = useState(false);
    const [dateRange, setDateRange] = useState(
        filters.date_range || "this_month"
    );
    const [search, setSearch] = useState(filters.search || "");
    const [orderBy, setOrderBy] = useState(filters.order_by || "created_at");
    const [orderDir, setOrderDir] = useState(filters.order_dir || "desc");

    // Recent Tickets Search and Sort
    const [recentSearch, setRecentSearch] = useState(filters.recent_search || "");
    const [recentOrderBy, setRecentOrderBy] = useState(filters.recent_order_by || "created_at");
    const [recentOrderDir, setRecentOrderDir] = useState(filters.recent_order_dir || "desc");

    const [openPaymentModal, setOpenPaymentModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [paymentFormData, setPaymentFormData] = useState({
        ticket_id: "",
        amount: "",
        payment_method: "cash",
        payment_date: new Date().toISOString().slice(0, 10),
        allocation: "downpayment",
        official_receipt_number: "",
        payment_reference: "",
        notes: "",
        attachments: [],
    });
    const [isUpdating, setIsUpdating] = useState(false);

    // Preview Modal
    const [previewModal, setPreviewModal] = useState({ isOpen: false, fileUrl: null });
    const [openVerifyModal, setOpenVerifyModal] = useState(false);
    const [verifyFormData, setVerifyFormData] = useState({
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
        router.get(
            "/frontdesk/",
            { date_range: range, search, order_by: orderBy, order_dir: orderDir, recent_search: recentSearch, recent_order_by: recentOrderBy, recent_order_dir: recentOrderDir },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleSearch = (value) => {
        setSearch(value);
        router.get(
            "/frontdesk/",
            { date_range: dateRange, search: value, order_by: orderBy, order_dir: orderDir, recent_search: recentSearch, recent_order_by: recentOrderBy, recent_order_dir: recentOrderDir },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleOrderBy = (field) => {
        const newDir = orderBy === field && orderDir === "desc" ? "asc" : "desc";
        setOrderBy(field);
        setOrderDir(newDir);
        router.get(
            "/frontdesk/",
            { date_range: dateRange, search, order_by: field, order_dir: newDir, recent_search: recentSearch, recent_order_by: recentOrderBy, recent_order_dir: recentOrderDir },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    // Recent Tickets Handlers
    const handleRecentSearch = (value) => {
        setRecentSearch(value);
        router.get(
            "/frontdesk/",
            { date_range: dateRange, search, order_by: orderBy, order_dir: orderDir, recent_search: value, recent_order_by: recentOrderBy, recent_order_dir: recentOrderDir },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleRecentOrderBy = (field) => {
        const newDir = recentOrderBy === field && recentOrderDir === "desc" ? "asc" : "desc";
        setRecentOrderBy(field);
        setRecentOrderDir(newDir);
        router.get(
            "/frontdesk/",
            { date_range: dateRange, search, order_by: orderBy, order_dir: orderDir, recent_search: recentSearch, recent_order_by: field, recent_order_dir: newDir },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleViewTicket = (ticketId) => {
        router.visit(`/frontdesk/tickets/${ticketId}`);
    };

    const handlePreviewFile = (file) => {
        setPreviewModal({ isOpen: true, fileUrl: file.file_path });
    };

    const handleOpenPaymentModal = (ticket) => {
        setSelectedTicket(ticket);
        const balance = parseFloat(ticket.outstanding_balance || ticket.total_amount || 0);
        setPaymentFormData({
            ticket_id: ticket.id,
            amount: balance > 0 ? balance.toString() : "",
            payment_method: "cash",
            payment_date: new Date().toISOString().slice(0, 10),
            allocation: ticket.payments && ticket.payments.length > 0 ? "balance" : "downpayment",
            official_receipt_number: "",
            payment_reference: "",
            notes: "",
            attachments: [],
        });
        setOpenPaymentModal(true);
    };

    const handlePaymentFormChange = (field, value) => {
        setPaymentFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleOpenVerifyModal = (ticket) => {
        setSelectedTicket(ticket);
        setVerifyFormData({
            notes: "",
        });
        setOpenVerifyModal(true);
    };

    const closeVerifyModal = () => {
        setOpenVerifyModal(false);
        setSelectedTicket(null);
    };

    const handleVerifyPayment = async () => {
        setIsUpdating(true);
        try {
            // Using the api instance if available or just router
            router.patch(`/tickets/${selectedTicket.id}/verify-payment`, verifyFormData, {
                onSuccess: () => {
                    closeVerifyModal();
                    refreshDashboard();
                },
                onError: (errors) => {
                    alert(errors.message || "Failed to verify order.");
                }
            });
        } catch (error) {
            console.error("Verification failed", error);
            alert("Failed to verify order. Please try again.");
        } finally {
            setIsUpdating(false);
        }
    };


    const handleRecordPayment = async () => {
        if (!selectedTicket || !paymentFormData.amount) {
            alert("Please enter the payment amount.");
            return;
        }

        setIsUpdating(true);
        const formData = new FormData();
        formData.append("ticket_id", selectedTicket.id);
        formData.append("payment_method", paymentFormData.payment_status === "paid" ? "cash" : paymentFormData.payment_method);
        formData.append("payment_date", paymentFormData.payment_date);
        formData.append("amount", paymentFormData.amount);
        formData.append("allocation", paymentFormData.allocation);
        if (paymentFormData.official_receipt_number) {
            formData.append("official_receipt_number", paymentFormData.official_receipt_number);
        }
        if (paymentFormData.payment_reference) {
            formData.append("payment_reference", paymentFormData.payment_reference);
        }
        if (paymentFormData.notes) {
            formData.append("notes", paymentFormData.notes);
        }
        formData.append("payment_type", "collection");

        paymentFormData.attachments.forEach((file) => {
            formData.append("attachments[]", file);
        });

        try {
            router.post("/frontdesk/payments", formData, {
                onSuccess: () => {
                    setOpenPaymentModal(false);
                    setSelectedTicket(null);
                    refreshDashboard();
                },
                onError: (errors) => {
                    alert(errors.message || "Failed to record payment.");
                },
            });
        } catch (error) {
            console.error("Payment recording failed:", error);
            alert("Failed to record payment. Please try again.");
        } finally {
            setIsUpdating(false);
        }
    };


    const getStatusBadgeClass = (status) => {
        const statusMap = {
            pending: "badge-warning",
            in_production: "badge-info",
            ready_to_print: "badge-info",
            completed: "badge-success",
            cancelled: "badge-danger",
        };
        return `badge ${statusMap[status] || "badge-secondary"}`;
    };

    const getPaymentStatusBadge = (ticket) => {
        const { payment_status: status, payment_method } = ticket;
        const classes = {
            pending: "badge-warning",
            partial: "badge-info",
            paid: "badge-success",
            awaiting_verification: "badge-secondary",
        };

        if (status === 'awaiting_verification') {
            const isWalkin = payment_method === 'cash' || payment_method === 'walkin';
            return (
                <div className={`badge ${isWalkin ? "badge-dark" : "badge-secondary"}`}>
                    {isWalkin ? 'WALK-IN ORDER' : 'AWAITING VERIFICATION'}
                </div>
            );
        }

        return (
            <div className={`badge ${classes[status] || "badge-secondary"}`}>
                {status?.toUpperCase() || "PENDING"}
            </div>
        );
    };

    return (
        <AdminLayout
            user={user}
            notifications={notifications}
            messages={messages}
        >
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
                                <li className="breadcrumb-item active">
                                    Front Desk
                                </li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            <Modal
                title="Payment History"
                isOpen={openPaymentModal}
                onClose={() => {
                    setOpenPaymentModal(false);
                    setSelectedTicket(null);
                }}
                size="4xl"
                submitButtonText={null}
            >
                {selectedTicket && (
                    <div className="modal-body">
                        <div className="mb-4 border rounded p-3 bg-light">
                            <div className="row">
                                <div className="col-md-6">
                                    <p className="m-b-5">
                                        <strong>Ticket:</strong> {selectedTicket.ticket_number}
                                    </p>
                                    <p className="m-b-5">
                                        <strong>Customer:</strong>{" "}
                                        {selectedTicket.customer
                                            ? `${selectedTicket.customer.firstname} ${selectedTicket.customer.lastname}`
                                            : "Walk-in"}
                                    </p>
                                    <p className="m-b-0">
                                        <strong>Status:</strong>{" "}
                                        {getPaymentStatusBadge(selectedTicket)}
                                    </p>
                                </div>
                                <div className="col-md-6">
                                    <p className="m-b-5">
                                        <strong>Total Amount:</strong>{" "}
                                        {formatPeso(selectedTicket.total_amount)}
                                    </p>
                                    <p className="m-b-5">
                                        <strong>Amount Paid:</strong>{" "}
                                        {formatPeso(selectedTicket.amount_paid || 0)}
                                    </p>
                                    <p className="m-b-0 text-danger font-bold">
                                        <strong>Balance:</strong>{" "}
                                        {formatPeso(selectedTicket.outstanding_balance || selectedTicket.total_amount)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-12">
                                <h5 className="m-b-3">Payment History</h5>
                                <div className="alert alert-info mb-3">
                                    <i className="ti-info-alt mr-2"></i>
                                    <strong>Note:</strong> This is a read-only view. To record new payments, please use the <strong>Payments & Finance</strong> module.
                                </div>
                                <div className="border rounded p-3 payment-history">
                                    {selectedTicket.payments && selectedTicket.payments.length ? (
                                        selectedTicket.payments.map((payment) => (
                                            <div key={payment.id} className="border-bottom pb-2 mb-2">
                                                <div className="d-flex justify-content-between">
                                                    <strong>{formatPeso(payment.amount)}</strong>
                                                    <span className="text-muted text-sm">
                                                        {new Date(payment.payment_date).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {payment.payment_method?.replace("_", " ") || "N/A"}
                                                    {payment.official_receipt_number && (
                                                        <> • OR {payment.official_receipt_number}</>
                                                    )}
                                                </div>
                                                {payment.payment_reference && (
                                                    <div className="text-xs text-gray-500">
                                                        Ref: {payment.payment_reference}
                                                    </div>
                                                )}
                                                {payment.notes && (
                                                    <p className="text-xs mt-1">{payment.notes}</p>
                                                )}
                                                {payment.documents?.length ? (
                                                    <div className="mt-2">
                                                        <span className="badge badge-success">
                                                            {payment.documents.length} attachment{payment.documents.length > 1 ? "s" : ""}
                                                        </span>
                                                        <button
                                                            onClick={() => handlePreviewFile(payment.documents[0])}
                                                            className="btn btn-sm btn-outline-primary ml-1"
                                                            style={{ padding: "2px 8px", fontSize: "11px" }}
                                                            title="Preview Proof"
                                                        >
                                                            <i className="ti-eye"></i>
                                                        </button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-muted m-b-0">No payments recorded yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer border-top pt-3">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                    setOpenPaymentModal(false);
                                    setSelectedTicket(null);
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Preview Modal */}
            <PreviewModal
                isOpen={previewModal.isOpen}
                onClose={() => setPreviewModal({ isOpen: false, fileUrl: null })}
                fileUrl={previewModal.fileUrl}
                title="File Preview"
            />

            {/* Verify Payment Modal */}
            <Modal
                title="Verify Order & Payment"
                isOpen={openVerifyModal}
                onClose={closeVerifyModal}
                size="lg"
                submitButtonText={null}
            >
                <div className="modal-body">
                    {selectedTicket && (
                        <div className={`alert ${selectedTicket.payment_method === 'cash' ? 'alert-info' : 'alert-warning'} mb-4`}>
                            <h6 className="alert-heading f-s-14">
                                <i className="ti-info-alt mr-2"></i>
                                {selectedTicket.payment_method === 'cash'
                                    ? 'Walk-in order confirmation'
                                    : 'Verification required for online payment'}
                            </h6>
                            <p className="mb-0 small">
                                Ticket: <strong>{selectedTicket.ticket_number}</strong><br />
                                Total Amount: <strong>{formatPeso(selectedTicket.total_amount)}</strong>
                                {selectedTicket.payment_method === 'cash' && (
                                    <><br />Confirm this order once the customer arrives at the branch.</>
                                )}
                            </p>
                        </div>
                    )}

                    <div className="form-group mb-4">
                        <label className="form-label f-s-13">Verification Notes (Optional)</label>
                        <textarea
                            className="form-control"
                            rows="2"
                            value={verifyFormData.notes}
                            onChange={(e) => setVerifyFormData({ ...verifyFormData, notes: e.target.value })}
                            placeholder="Add any notes for the cashier or designers..."
                        ></textarea>
                    </div>

                    <div className="modal-footer border-top pt-3 px-0">
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={closeVerifyModal}
                            disabled={isUpdating}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={handleVerifyPayment}
                            disabled={isUpdating}
                        >
                            {isUpdating ? (
                                <>
                                    <i className="fa fa-spinner fa-spin mr-1"></i> Verifying...
                                </>
                            ) : (
                                <>
                                    <i className="ti-check mr-1"></i> Confirm & Release to Cashier
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            <section id="main-content">
                {/* Date Filter Section */}
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-200">
                        <button
                            onClick={refreshDashboard}
                            className="btn btn-sm btn-link"
                            disabled={refreshing}
                        >
                            <i className={`ti-reload ${refreshing ? "animate-spin" : ""}`}></i>
                            {refreshing ? " Refreshing..." : " Refresh"}
                        </button> |
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
                            {Array.from({ length: new Date().getFullYear() - 2024 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                                <option key={year} value={`year_${year}`}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <CardStatistics
                        label="New Orders"
                        statistics={statistics.newTickets}
                        icon="ti-printer"
                        color="bg-primary"
                    />
                    <CardStatistics
                        label="Pending Payment"
                        statistics={statistics.paymentPending}
                        icon="ti-credit-card"
                        color="bg-warning"
                    />
                    <CardStatistics
                        label="Completed"
                        statistics={statistics.completed}
                        icon="ti-check-box"
                        color="bg-success"

                    />
                    <CardStatistics
                        label="In Progress"
                        statistics={statistics.inProgress}
                        icon="ti-reload"
                        color="bg-info"
                    />
                </div>

                {/* New/Online Orders to Confirm */}
                <div className="row mb-4">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-title pr">
                                <div className="flex justify-between items-center">
                                    <h4>Pending/ New/ Online Orders to Confirm</h4>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Search by ticket #, customer, description..."
                                            value={search}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            style={{ width: "300px" }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table student-data-table m-t-20">
                                        <thead>
                                            <tr>
                                                <th>
                                                    {/* <button
                                                        onClick={() => handleOrderBy("ticket_number")}
                                                        className="btn-link p-0 border-0 bg-transparent"
                                                    > */}
                                                    Ticket ID {orderBy === "ticket_number" && (orderDir === "asc" ? "↑" : "↓")}
                                                    {/* </button> */}
                                                </th>
                                                <th>
                                                    {/* <button
                                                        onClick={() => handleOrderBy("customer")}
                                                        className="btn-link p-0 border-0 bg-transparent"
                                                    > */}
                                                    Customer {orderBy === "customer" && (orderDir === "asc" ? "↑" : "↓")}
                                                    {/* </button> */}
                                                </th>
                                                <th>Description</th>
                                                <th>Amount</th>
                                                <th>Payment Status</th>
                                                <th>Files</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {newOnlineOrders.data && newOnlineOrders.data.length > 0 ? (
                                                newOnlineOrders.data.map((ticket) => (
                                                    <tr key={ticket.id}>
                                                        <td>{ticket.ticket_number}</td>
                                                        <td>
                                                            {ticket.customer
                                                                ? `${ticket.customer.name}`
                                                                : "Unknown"}
                                                            {ticket.customer?.email && (
                                                                <div className="text-xs text-gray-500">{ticket.customer.email}</div>
                                                            )}
                                                        </td>
                                                        <td>{ticket.description}</td>
                                                        <td>{formatPeso(ticket.total_amount)}</td>
                                                        <td>{getPaymentStatusBadge(ticket)}</td>
                                                        <td>
                                                            {ticket.customer_files && ticket.customer_files.length > 0 ? (
                                                                <>
                                                                    <span className="text-xs text-gray-500">
                                                                        Proof of payment
                                                                    </span>
                                                                    <button
                                                                        onClick={() => handlePreviewFile(ticket.customer_files[0])}
                                                                        className="btn btn-sm btn-outline-primary ml-1"
                                                                        style={{ padding: "2px 8px", fontSize: "11px" }}
                                                                        title="Photo preview"
                                                                    >
                                                                        <i className="ti-eye"></i>
                                                                    </button>
                                                                </>
                                                                // <button type="button" class="btn btn-sm btn-link btn-flat m-b-10 m-l-5" onClick={() => handlePreviewFile(ticket.customer_files[0])}> <i className="ti ti-eye"></i> Preview</button>
                                                            ) : (
                                                                <span className="text-gray-400">No files</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <button
                                                                className="btn btn-sm btn-success btn-flat"
                                                                onClick={() => handleOpenVerifyModal(ticket)}
                                                            >
                                                                <i className="ti-check-box"></i> Verify
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="7" className="text-center text-gray-400">
                                                        No orders found
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Pagination */}
                                {newOnlineOrders.links && newOnlineOrders.links.length > 3 && (
                                    <div className="d-flex justify-content-end mt-3">
                                        <nav>
                                            <ul className="pagination">
                                                {newOnlineOrders.links.map((link, index) => (
                                                    <li
                                                        key={index}
                                                        className={`page-item ${link.active ? "active" : ""} ${!link.url ? "disabled" : ""}`}
                                                    >
                                                        <button
                                                            className="page-link"
                                                            onClick={() => {
                                                                if (link.url) {
                                                                    router.visit(link.url, {
                                                                        preserveState: true,
                                                                        preserveScroll: true,
                                                                    });
                                                                }
                                                            }}
                                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                                        />
                                                    </li>
                                                ))}
                                            </ul>
                                        </nav>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Tickets (Today) */}
                <div className="row">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-title pr">
                                <div className="flex justify-between items-center">
                                    <h4>RECENT TICKETS (Today)</h4>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Search by ticket #, customer, description..."
                                            value={recentSearch}
                                            onChange={(e) => handleRecentSearch(e.target.value)}
                                            style={{ width: "300px" }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table student-data-table m-t-20">
                                        <thead>
                                            <tr>
                                                <th>
                                                    <button
                                                        onClick={() => handleRecentOrderBy("ticket_number")}
                                                        className="btn-link p-0 border-0 bg-transparent text-left w-100"
                                                        style={{ textDecoration: "none" }}
                                                    >
                                                        Ticket ID {recentOrderBy === "ticket_number" && (recentOrderDir === "asc" ? "↑" : "↓")}
                                                    </button>
                                                </th>
                                                <th>Customer</th>
                                                <th>Description</th>
                                                <th>
                                                    <button
                                                        onClick={() => handleRecentOrderBy("outstanding_balance")}
                                                        className="btn-link p-0 border-0 bg-transparent text-left w-100"
                                                        style={{ textDecoration: "none" }}
                                                    >
                                                        Balance {recentOrderBy === "outstanding_balance" && (recentOrderDir === "asc" ? "↑" : "↓")}
                                                    </button>
                                                </th>
                                                <th>
                                                    <button
                                                        onClick={() => handleRecentOrderBy("due_date")}
                                                        className="btn-link p-0 border-0 bg-transparent text-left w-100"
                                                        style={{ textDecoration: "none" }}
                                                    >
                                                        Due Date {recentOrderBy === "due_date" && (recentOrderDir === "asc" ? "↑" : "↓")}
                                                    </button>
                                                </th>
                                                <th>
                                                    <button
                                                        onClick={() => handleRecentOrderBy("status")}
                                                        className="btn-link p-0 border-0 bg-transparent text-left w-100"
                                                        style={{ textDecoration: "none" }}
                                                    >
                                                        Status {recentOrderBy === "status" && (recentOrderDir === "asc" ? "↑" : "↓")}
                                                    </button>
                                                </th>
                                                <th>
                                                    <button
                                                        onClick={() => handleRecentOrderBy("payment_status")}
                                                        className="btn-link p-0 border-0 bg-transparent text-left w-100"
                                                        style={{ textDecoration: "none" }}
                                                    >
                                                        Payment Status {recentOrderBy === "payment_status" && (recentOrderDir === "asc" ? "↑" : "↓")}
                                                    </button>
                                                </th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentTicketsToday.data && recentTicketsToday.data.length > 0 ? (
                                                recentTicketsToday.data.map((ticket) => (
                                                    <tr key={ticket.id}>
                                                        <td>{ticket.ticket_number}</td>
                                                        <td>
                                                            {ticket.customer
                                                                ? ticket.customer.full_name
                                                                : "Walk-in"}
                                                        </td>
                                                        <td>
                                                            <div className="text-truncate" style={{ maxWidth: "200px" }} title={ticket.description}>
                                                                {ticket.description}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className="font-weight-bold text-danger">
                                                                {formatPeso(ticket.outstanding_balance || ticket.total_amount)}
                                                            </span>
                                                        </td>
                                                        <td>{formatDate(ticket.due_date)}</td>
                                                        <td>
                                                            <div className={getStatusBadgeClass(ticket.status)}>
                                                                {ticket.status?.replace("_", " ").toUpperCase() || "PENDING"}
                                                            </div>
                                                        </td>
                                                        <td>{getPaymentStatusBadge(ticket)}</td>
                                                        <td>
                                                            <button
                                                                onClick={() => handleOpenPaymentModal(ticket)}
                                                                className="btn btn-sm btn-outline-primary ml-1"
                                                                style={{ padding: "2px 8px", fontSize: "11px" }}
                                                                title="View Payment History"
                                                            >
                                                                <i className="ti-eye"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="8" className="text-center text-gray-400">
                                                        {recentSearch ? "No tickets found matching your search" : "No tickets found for today"}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Pagination */}
                                {recentTicketsToday.links && recentTicketsToday.links.length > 3 && (
                                    <div className="d-flex justify-content-end mt-3">
                                        <nav>
                                            <ul className="pagination">
                                                {recentTicketsToday.links.map((link, index) => (
                                                    <li
                                                        key={index}
                                                        className={`page-item ${link.active ? "active" : ""} ${!link.url ? "disabled" : ""}`}
                                                    >
                                                        <button
                                                            className="page-link"
                                                            onClick={() => {
                                                                if (link.url) {
                                                                    router.visit(link.url, {
                                                                        preserveState: true,
                                                                        preserveScroll: true,
                                                                    });
                                                                }
                                                            }}
                                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                                        />
                                                    </li>
                                                ))}
                                            </ul>
                                        </nav>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </AdminLayout>
    );
}
