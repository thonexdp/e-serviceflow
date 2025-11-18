// Pages/Tickets.jsx
import React, { useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Footer from "@/Components/Layouts/Footer";
import Modal from "@/Components/Main/Modal";
import CustomerForm from "@/Components/Customers/CustomerForm";
import TicketForm from "@/Components/Tickets/TicketForm";
import DataTable from "@/Components/Common/DataTable";
import SearchBox from "@/Components/Common/SearchBox";
import FlashMessage from "@/Components/Common/FlashMessage";
import CustomerSearchBox from "@/Components/Common/CustomerSearchBox";
import axios from "axios";

export default function Tickets({
    user = {},
    notifications = [],
    messages = [],
    customers = { data: [] },
    tickets = { data: [] },
    selectedCustomer = null,
    filters = {},
}) {
    const [openCustomerModal, setCustomerModalOpen] = useState(false);
    const [openTicketModal, setTicketModalOpen] = useState(false);
    const [openStatusModal, setStatusModalOpen] = useState(false);
    const [openPaymentModal, setPaymentModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [editingTicket, setEditingTicket] = useState(null);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [_selectedCustomer, setSelectedCustomer] = useState(selectedCustomer);
    const [isUpdating, setIsUpdating] = useState(false);

    // Status modal form state
    const [statusFormData, setStatusFormData] = useState({
        status: '',
        notes: ''
    });

    // Payment modal form state
    const [paymentFormData, setPaymentFormData] = useState({
        payment_status: '',
        amount_paid: '',
        payment_method: 'cash',
        payment_notes: ''
    });

    const { flash, auth } = usePage().props;

    const isAllowedToAddCustomer = auth?.user?.role === "Admin" || auth?.user?.role === "FrontDesk";

    const handleCustomerSubmit = async (formData) => {
        try {
            const { data } = await axios.post("/customers", formData);

            if (data.success) {
                setSelectedCustomer({
                    ...data?.customer,
                    full_name: `${data?.customer?.firstname} ${data?.customer?.lastname}`,
                });
            }
            setCustomerModalOpen(false);
        } catch (error) {
            console.error("Add failed:", error, error.response?.data);
        } finally {
            setCustomerModalOpen(false);
        }
    };

    const handleTicketSubmit = (data) => {
        const formData = new FormData();
        Object.keys(data).forEach((key) => {
            if (key === "file" && data[key]) {
                formData.append("file", data[key]);
            } else if (data[key] !== null && data[key] !== "") {
                formData.append(key, data[key]);
            }
        });

        if (editingTicket) {
            formData.append("_method", "PUT");
            router.post(`/tickets/${editingTicket.id}`, formData, {
                onSuccess: () => {
                    setTicketModalOpen(false);
                    setEditingTicket(null);
                },
                preserveScroll: true,
            });
        } else {
            router.post("/tickets", formData, {
                onSuccess: () => {
                    setTicketModalOpen(false);
                },
                preserveScroll: true,
            });
        }
    };

    // Open status update modal
    const handleOpenStatusModal = (ticket) => {
        setSelectedTicket(ticket);
        setStatusFormData({
            status: ticket.status || 'pending',
            notes: ''
        });
        setStatusModalOpen(true);
    };

    // Open payment update modal
    const handleOpenPaymentModal = (ticket) => {
        console.log(ticket);
        setSelectedTicket(ticket);
        const remainingBalance = parseFloat(ticket.total_amount || 0) - parseFloat(ticket.amount_paid || 0);
        setPaymentFormData({
            payment_status: ticket.payment_status || 'pending',
            amount_paid: '',
            payment_method: 'cash',
            payment_notes: ''
        });
        setPaymentModalOpen(true);
    };

    // Handle status update submission
    const handleStatusUpdate = async () => {
        if (!selectedTicket) return;

        setIsUpdating(true);
        try {
            await axios.patch(`/tickets/${selectedTicket.id}/update-status`, statusFormData);
            
            setStatusModalOpen(false);
            setSelectedTicket(null);
            router.reload({ preserveScroll: true });
        } catch (error) {
            console.error("Status update failed:", error);
            alert(error.response?.data?.message || "Failed to update status");
        } finally {
            setIsUpdating(false);
        }
    };

    // Handle payment update submission
    const handlePaymentUpdate = async () => {
        if (!selectedTicket) return;

        // Validation
        if (paymentFormData.payment_status !== 'pending' && !paymentFormData.amount_paid) {
            alert("Please enter the payment amount");
            return;
        }

        setIsUpdating(true);
        try {
            await axios.patch(`/tickets/${selectedTicket.id}/update-payment`, paymentFormData);
            
            setPaymentModalOpen(false);
            setSelectedTicket(null);
            router.reload({ preserveScroll: true });
        } catch (error) {
            console.error("Payment update failed:", error);
            alert(error.response?.data?.message || "Failed to update payment");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleEditCustomer = (customer) => {
        setEditingCustomer(customer);
        setCustomerModalOpen(true);
    };

    const handleEditTicket = (ticket) => {
        console.log(ticket);
        setEditingTicket(ticket);
        setTicketModalOpen(true);
    };

    const handleDeleteCustomer = (customerId) => {
        if (confirm("Are you sure you want to delete this customer?")) {
            router.delete(`/customers/${customerId}`, {
                preserveScroll: true,
            });
        }
    };

    const handleDeleteTicket = (ticketId) => {
        if (confirm("Are you sure you want to delete this ticket?")) {
            router.delete(`/tickets/${ticketId}`, {
                preserveScroll: true,
            });
        }
    };

    const closeCustomerModal = () => {
        setCustomerModalOpen(false);
        setEditingCustomer(null);
    };

    const closeTicketModal = () => {
        setTicketModalOpen(false);
        setEditingTicket(null);
    };

    const closeStatusModal = () => {
        setStatusModalOpen(false);
        setSelectedTicket(null);
        setStatusFormData({ status: '', notes: '' });
    };

    const closePaymentModal = () => {
        setPaymentModalOpen(false);
        setSelectedTicket(null);
        setPaymentFormData({ payment_status: '', amount_paid: '', payment_method: 'cash', payment_notes: '' });
    };

    const getStatusBadge = (status) => {
        const classes = {
            pending: "badge-warning",
            in_production: "badge-info",
            completed: "badge-success",
            cancelled: "badge-danger",
        };
        return (
            <div className={`badge ${classes[status] || "badge-secondary"}`}>
                {status?.replace("_", " ").toUpperCase() || "PENDING"}
            </div>
        );
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

    // Define table columns
    const ticketColumns = [
        {
            label: "#",
            key: "index",
            render: (row, index) =>
                (tickets.current_page - 1) * tickets.per_page + index + 1,
        },
        { label: "Ticket ID", key: "ticket_number" },
        {
            label: "Customer",
            key: "customer",
            render: (row) =>
                row.customer
                    ? `${row.customer.firstname} ${row.customer.lastname}`
                    : "N/A",
        },
        { label: "Description", key: "description" },
        {
            label: "Qty",
            key: "quantity",
            render: (row) => `${row.quantity} Pcs`,
        },
        {
            label: "Due Date",
            key: "due_date",
            render: (row) =>
                row.due_date ? new Date(row.due_date).toLocaleDateString() : "N/A",
        },
        {
            label: "Amount",
            key: "total_amount",
            render: (row) => (
                <b>
                    ₱{" "}
                    {parseFloat(row.total_amount || 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}
                </b>
            ),
        },
        {
            label: "Payment Status",
            key: "payment_status",
            render: (row) => (
                <div>
                    {getPaymentStatusBadge(row.payment_status)}
                    <button
                        onClick={() => handleOpenPaymentModal(row)}
                        className="btn btn-sm btn-outline-primary ml-1"
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                        title="Update Payment"
                    >
                        <i className="ti-pencil"></i>
                    </button>
                </div>
            ),
        },
        {
            label: "Status",
            key: "status",
            render: (row) => (
                <div>
                    {getStatusBadge(row.status)}
                    <button
                        onClick={() => handleOpenStatusModal(row)}
                        className="btn btn-sm btn-outline-primary ml-1"
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                        title="Update Status"
                    >
                        <i className="ti-pencil"></i>
                    </button>
                </div>
            ),
        },
    ];

    return (
        <>
        {/* Customer Modal */}
            <Modal
                title={editingCustomer ? "Edit Customer" : "Add Customer"}
                isOpen={openCustomerModal}
                onClose={closeCustomerModal}
                size="2xl"
                submitButtonText={null}
            >
                <CustomerForm
                    jsonReturn={true}
                    customer={editingCustomer}
                    onSubmit={handleCustomerSubmit}
                    onCancel={closeCustomerModal}
                />
            </Modal>

            {/* Ticket Modal */}
            <Modal
                title={`${editingTicket ? "Edit Ticket" : "Add Ticket"} - ${_selectedCustomer?.full_name}`}
                isOpen={openTicketModal}
                onClose={closeTicketModal}
                size="7xl"
                submitButtonText={null}
            >
                <TicketForm
                    ticket={editingTicket}
                    customerId={_selectedCustomer?.id}
                    onSubmit={handleTicketSubmit}
                    onCancel={closeTicketModal}
                />
            </Modal>
        <AdminLayout user={user} notifications={notifications} messages={messages}>
            <Head title="Tickets" />

            {/* Flash Messages */}
            {flash?.success && <FlashMessage type="success" message={flash.success} />}
            {flash?.error && <FlashMessage type="error" message={flash.error} />}

            <div className="row">
                <div className="col-lg-8 p-r-0 title-margin-right">
                    <div className="page-header">
                        <div className="page-title">
                            <h1>
                                Tickets <span>Management</span>
                            </h1>
                        </div>
                    </div>
                </div>
                <div className="col-lg-4 p-l-0 title-margin-left">
                    <div className="page-header">
                        <div className="page-title">
                            <ol className="breadcrumb">
                                <li className="breadcrumb-item">
                                    <a href="/dashboard">Dashboard</a>
                                </li>
                                <li className="breadcrumb-item active">Tickets</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            

            {/* Status Update Modal */}
            <Modal
                title="Update Ticket Status"
                isOpen={openStatusModal}
                onClose={closeStatusModal}
                size="lg"
                submitButtonText={null}
            >
                <div className="modal-body">
                    {selectedTicket && (
                        <div className="mb-3">
                            <div className="alert alert-info">
                                <strong>Ticket:</strong> {selectedTicket.ticket_number}<br />
                                <strong>Customer:</strong> {selectedTicket.customer ? `${selectedTicket.customer.firstname} ${selectedTicket.customer.lastname}` : 'N/A'}<br />
                                <strong>Current Status:</strong> {getStatusBadge(selectedTicket.status)}
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="status">New Status <span className="text-danger">*</span></label>
                        <select
                            id="status"
                            className="form-control"
                            value={statusFormData.status}
                            onChange={(e) => setStatusFormData({ ...statusFormData, status: e.target.value })}
                        >
                            <option value="pending">Pending</option>
                            <option value="in_production">In Production</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="notes">Notes (Optional)</label>
                        <textarea
                            id="notes"
                            className="form-control"
                            rows="3"
                            placeholder="Add any notes about this status change..."
                            value={statusFormData.notes}
                            onChange={(e) => setStatusFormData({ ...statusFormData, notes: e.target.value })}
                        ></textarea>
                    </div>

                    <div className="modal-footer border-top pt-3">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={closeStatusModal}
                            disabled={isUpdating}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleStatusUpdate}
                            disabled={isUpdating}
                        >
                            {isUpdating ? (
                                <>
                                    <i className="fa fa-spinner fa-spin mr-2"></i>
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <i className="ti-check mr-2"></i>
                                    Update Status
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Payment Update Modal */}
            <Modal
                title="Update Payment Status"
                isOpen={openPaymentModal}
                onClose={closePaymentModal}
                size="lg"
                submitButtonText={null}
            >
                <div className="modal-body">
                    {selectedTicket && (
                        <div className="mb-3">
                            <div className="alert alert-info">
                                <strong>Ticket:</strong> {selectedTicket.ticket_number}<br />
                                <strong>Customer:</strong> {selectedTicket.customer ? `${selectedTicket.customer.firstname} ${selectedTicket.customer.lastname}` : 'N/A'}<br />
                                <strong>Total Amount:</strong> ₱{parseFloat(selectedTicket.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}<br />
                                <strong>Amount Paid:</strong> ₱{parseFloat(selectedTicket.amount_paid || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}<br />
                                <strong>Balance:</strong> <span className="text-danger font-weight-bold">₱{(parseFloat(selectedTicket.total_amount || 0) - parseFloat(selectedTicket.amount_paid || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span><br />
                                <strong>Current Payment Status:</strong> {getPaymentStatusBadge(selectedTicket.payment_status)}
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="payment_status">Payment Status <span className="text-danger">*</span></label>
                        <select
                            id="payment_status"
                            className="form-control"
                            value={paymentFormData.payment_status}
                            onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_status: e.target.value })}
                        >
                            <option value="pending">Pending</option>
                            <option value="partial">Partial Payment</option>
                            <option value="paid">Fully Paid</option>
                        </select>
                    </div>

                    {paymentFormData.payment_status !== 'pending' && (
                        <>
                            <div className="form-group">
                                <label htmlFor="amount_paid">Amount Paid <span className="text-danger">*</span></label>
                                <input
                                    type="number"
                                    id="amount_paid"
                                    className="form-control"
                                    placeholder="Enter amount"
                                    step="0.01"
                                    min="0"
                                    value={paymentFormData.amount_paid}
                                    onChange={(e) => setPaymentFormData({ ...paymentFormData, amount_paid: e.target.value })}
                                />
                                {selectedTicket && paymentFormData.amount_paid && (
                                    <small className="text-muted">
                                        New Balance: ₱{(parseFloat(selectedTicket.total_amount || 0) - parseFloat(selectedTicket.amount_paid || 0) - parseFloat(paymentFormData.amount_paid || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    </small>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="payment_method">Payment Method</label>
                                <select
                                    id="payment_method"
                                    className="form-control"
                                    value={paymentFormData.payment_method}
                                    onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method: e.target.value })}
                                >
                                    <option value="cash">Cash</option>
                                    <option value="gcash">GCash</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="credit_card">Credit Card</option>
                                    <option value="check">Check</option>
                                </select>
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label htmlFor="payment_notes">Payment Notes (Optional)</label>
                        <textarea
                            id="payment_notes"
                            className="form-control"
                            rows="3"
                            placeholder="Add any notes about this payment..."
                            value={paymentFormData.payment_notes}
                            onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_notes: e.target.value })}
                        ></textarea>
                    </div>

                    <div className="modal-footer border-top pt-3">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={closePaymentModal}
                            disabled={isUpdating}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-success"
                            onClick={handlePaymentUpdate}
                            disabled={isUpdating}
                        >
                            {isUpdating ? (
                                <>
                                    <i className="fa fa-spinner fa-spin mr-2"></i>
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <i className="ti-check mr-2"></i>
                                    Update Payment
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            <section id="main-content">
                {/* Customer Search and Add Section */}
                {isAllowedToAddCustomer && (
                    <div className="row">
                        <div className="col-lg-6">
                            <div className="card">
                                <div className="card-title">
                                    <h4>Search Customer</h4>
                                    <button
                                        type="button"
                                        onClick={() => setCustomerModalOpen(true)}
                                        className="px-3 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 transition float-end"
                                    >
                                        <i className="ti-plus"></i> Add Customer
                                    </button>
                                </div>
                                <div className="card-body">
                                    <div className="basic-form">
                                        <div className="form-group">
                                            <p className="text-muted m-b-15 f-s-12">
                                                Search customer here if already registered.
                                            </p>
                                            <CustomerSearchBox onSelect={(customer) => setSelectedCustomer(customer)} _selectedCustomer={_selectedCustomer} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {_selectedCustomer && (
                            <div className="col-lg-6">
                                <div className="card">
                                    <div className="card-title">
                                        <h6>Customer Details</h6>
                                    </div>
                                    <div className="card-body mt-3">
                                        <div className="row">
                                            <div className="col-lg-6">
                                                <ul>
                                                    <li>
                                                        <label>
                                                            Name:{" "}
                                                            <span>
                                                                <b>{_selectedCustomer.full_name}</b>
                                                            </span>
                                                        </label>
                                                    </li>
                                                    <li>
                                                        <label>
                                                            Phone:{" "}
                                                            <span>
                                                                <b>{_selectedCustomer.phone || "N/A"}</b>
                                                            </span>
                                                        </label>
                                                    </li>
                                                </ul>
                                            </div>
                                            <div className="col-lg-6">
                                                <ul>
                                                    <li>
                                                        <label>
                                                            Email:{" "}
                                                            <span>
                                                                <b>{_selectedCustomer.email || "N/A"}</b>
                                                            </span>
                                                        </label>
                                                    </li>
                                                    <li>
                                                        <label>
                                                            Address:{" "}
                                                            <span>
                                                                <b>{_selectedCustomer.address || "N/A"}</b>
                                                            </span>
                                                        </label>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tickets Section */}
                <div className="row">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-title">
                                <h4>Tickets</h4>
                                <div className="button-list float-end">
                                        <button
                                            type="button"
                                            onClick={() => setTicketModalOpen(true)}
                                            disabled={!_selectedCustomer}
                                            className="
                                                px-3 mb-2 py-2.5 text-sm font-medium rounded-md transition
                                                text-white bg-blue-700 hover:bg-blue-500
                                                focus:outline-none focus:ring-2 focus:ring-blue-300
                                                disabled:bg-gray-300
                                                disabled:text-gray-500
                                                disabled:cursor-not-allowed
                                                disabled:hover:bg-gray-300
                                            "
                                        >
                                            <i className="ti-plus"></i> Add Tickets
                                        </button>
                                    </div>
                            </div>
                            <div className="card-body">
                                <div className="alert alert-info" role="alert">
                                    <i className="fa fa-info-circle"></i> <strong>Quick Update:</strong> Click the pencil icon next to status or payment status to update them quickly.
                                </div>
                                <DataTable
                                    columns={ticketColumns}
                                    data={tickets.data}
                                    pagination={tickets}
                                    onEdit={handleEditTicket}
                                    onDelete={handleDeleteTicket}
                                    emptyMessage="No tickets found."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </AdminLayout>
        </>
    );
}