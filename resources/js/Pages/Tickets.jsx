// Pages/Tickets.jsx
import React, { useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Modal from "@/Components/Main/Modal";
import CustomerForm from "@/Components/Customers/CustomerForm";
import TicketForm from "@/Components/Tickets/TicketForm";
import DataTable from "@/Components/Common/DataTable";
import SearchBox from "@/Components/Common/SearchBox";
import FlashMessage from "@/Components/Common/FlashMessage";
import CustomerSearchBox from "@/Components/Common/CustomerSearchBox";
import axios from "axios";
import PreviewModal from "@/Components/Main/PreviewModal";
import DeleteConfirmation from "@/Components/Common/DeleteConfirmation";
import { formatPeso } from "@/Utils/currency";
import { useRoleApi } from "@/Hooks/useRoleApi";

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
    const [selectedID, setSelectedID] = useState(null);
    const [openDeleteModal, setDeleteModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { api, buildUrl } = useRoleApi();


    const [show, setShow] = useState(false);
    const [filepath, setFilepath] = useState("");

    const [statusFormData, setStatusFormData] = useState({
        status: "",
        notes: "",
    });

    const [paymentFormData, setPaymentFormData] = useState({
        ticket_id: null,
        amount: "",
        payment_method: "cash",
        payment_date: new Date().toISOString().slice(0, 10),
        allocation: "downpayment",
        official_receipt_number: "",
        payment_reference: "",
        notes: "",
        attachments: [],
    });

    const { flash, auth } = usePage().props;

    const isAllowedToAddCustomer =
        auth?.user?.role === "admin" || auth?.user?.role === "FrontDesk";


    const handleCustomerSubmit = async (formData) => {
        try {
            const { data } = await api.post(`/customers`, formData);

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
        const arrayKeyMap = {
            ticketAttachments: "attachments[]",
            paymentProofs: "payment_proofs[]",
        };

        Object.entries(data).forEach(([key, value]) => {
            if (key === "file" && value) {
                formData.append("file", value);
                return;
            }

            if (arrayKeyMap[key] && Array.isArray(value)) {
                value.forEach((file) => {
                    if (file instanceof File) {
                        formData.append(arrayKeyMap[key], file);
                    }
                });
                return;
            }

            if (value instanceof File) {
                formData.append(key, value);
                return;
            }

            if (Array.isArray(value)) {
                value.forEach((entry) => {
                    if (entry !== null && entry !== "") {
                        formData.append(`${key}[]`, entry);
                    }
                });
                return;
            }

            if (value !== null && value !== "") {
                formData.append(key, value);
            }
        });

        if (editingTicket) {
            formData.append("_method", "PUT");
            router.post(buildUrl(`tickets/${editingTicket.id}`), formData, {
                onSuccess: () => {
                    setTicketModalOpen(false);
                    setEditingTicket(null);
                },
                preserveScroll: true,
            });
        } else {
            router.post(buildUrl("tickets"), formData, {
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
            status: ticket.status || "pending",
            notes: "",
        });
        setStatusModalOpen(true);
    };

    const handlePreviewFile = (payment) => {
        setFilepath(payment?.documents[0]?.file_path);
        setShow(true);
    };


    // Open payment update modal
    const handleOpenPaymentModal = (ticket) => {
        console.log(ticket);
        setSelectedTicket(ticket);
        setPaymentFormData({
            ticket_id: ticket.id,
            amount: "",
            payment_method: "cash",
            payment_date: new Date().toISOString().slice(0, 10),
            allocation:
                ticket.payments && ticket.payments.length > 0
                    ? "balance"
                    : "downpayment",
            official_receipt_number: "",
            payment_reference: "",
            notes: "",
            attachments: [],
        });
        setPaymentModalOpen(true);
    };

    // Handle status update submission
    const handleStatusUpdate = async () => {
        if (!selectedTicket) return;

        setIsUpdating(true);
        try {
            await api.patch(
                `/tickets/${selectedTicket.id}/update-status`,
                statusFormData
            );

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

        if (!paymentFormData.amount) {
            alert("Please enter the payment amount.");
            return;
        }

        const formData = new FormData();
        formData.append("ticket_id", selectedTicket.id);
        formData.append("payment_method", paymentFormData.payment_method);
        formData.append("payment_date", paymentFormData.payment_date);
        formData.append("amount", paymentFormData.amount);
        if (paymentFormData.allocation) {
            formData.append("allocation", paymentFormData.allocation);
        }
        if (paymentFormData.official_receipt_number) {
            formData.append(
                "official_receipt_number",
                paymentFormData.official_receipt_number
            );
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

        setIsUpdating(true);
        try {
            await api.post("/payments", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setPaymentModalOpen(false);
            setSelectedTicket(null);
            router.reload({ preserveScroll: true });
        } catch (error) {
            console.error("Payment update failed:", error);
            alert(error.response?.data?.message || "Failed to record payment.");
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

    const handleConfirmDeleteTicket = () => {
        if (!selectedID) return;
        router.delete(buildUrl(`tickets/${selectedID}`), {
            preserveScroll: true,
            preserveState: false,

            onBefore: () => {
                setLoading(true);
            },
            onSuccess: () => {
                handleCloseModal();
                setLoading(false);
                toast.success(" Ticket deleted successfully.");
            },
            onError: (errors) => {
                setLoading(false);
                toast.error("Failed to delete ticket. Please try again.");
            },

            // Called always after success or error
            onFinish: () => {
                setLoading(false);
            },
        });
    };

    const handleCloseModal = () => {
        setDeleteModalOpen(false);
        setCustomerModalOpen(false);
        setEditingCustomer(null);
    };

    const handleDeleteTicket = (ticketId) => {
        setSelectedID(ticketId);
        setDeleteModalOpen(true);
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
        setStatusFormData({ status: "", notes: "" });
    };

    const closePaymentModal = () => {
        setPaymentModalOpen(false);
        setSelectedTicket(null);
        setPaymentFormData({
            ticket_id: null,
            amount: "",
            payment_method: "cash",
            payment_date: new Date().toISOString().slice(0, 10),
            allocation: "downpayment",
            official_receipt_number: "",
            payment_reference: "",
            notes: "",
            attachments: [],
        });
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
            render: (row) => (
                <div>
                    {row.quantity} Pcs
                    {row.free_quantity > 0 && (
                        <div className="text-success small">
                            <i className="ti-gift mr-1"></i>
                            + {row.free_quantity} Free
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Due Date",
            key: "due_date",
            render: (row) =>
                row.due_date
                    ? new Date(row.due_date).toLocaleDateString()
                    : "N/A",
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
                    {/* {row.payment_status !== "paid" && ( */}
                    <button
                        onClick={() => handleOpenPaymentModal(row)}
                        className="btn btn-sm btn-outline-primary ml-1"
                        style={{ padding: "2px 8px", fontSize: "11px" }}
                        title="Update Payment"
                    >
                        <i className={`ti-${row.payment_status === "paid" ? "eye" : "pencil"}`}></i>
                    </button>
                    {/* )} */}
                </div>
            ),
        },
        {
            label: "Status",
            key: "status",
            render: (row) => (
                <div>
                    {getStatusBadge(row.status)}
                    {row.status !== "completed" &&
                        row.status !== "cancelled" && (
                            <button
                                onClick={() => handleOpenStatusModal(row)}
                                className="btn btn-sm btn-outline-primary ml-1"
                                style={{ padding: "2px 8px", fontSize: "11px" }}
                                title="Update Status"
                            >
                                <i className="ti-pencil"></i>
                            </button>
                        )}
                </div>
            ),
        },
    ];
    return (
        <>
            <PreviewModal
                isOpen={show}
                onClose={() => setShow(false)}
                fileUrl={filepath}
                title="Document Preview"
            />
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
                title={`${editingTicket ? "Edit Ticket" : "Add Ticket"} - ${_selectedCustomer?.full_name
                    }`}
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
            <Modal
                title={"Delete Tickets"}
                isOpen={openDeleteModal}
                onClose={handleCloseModal}
                size="md"
                submitButtonText={null}
            >
                <DeleteConfirmation
                    label=" ticket"
                    loading={loading}
                    onSubmit={handleConfirmDeleteTicket}
                    onCancel={handleCloseModal}
                />
            </Modal>
            <AdminLayout
                user={user}
                notifications={notifications}
                messages={messages}
            >
                <Head title="Tickets" />

                {/* Flash Messages */}
                {flash?.success && (
                    <FlashMessage type="success" message={flash.success} />
                )}
                {flash?.error && (
                    <FlashMessage type="error" message={flash.error} />
                )}

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
                                    <li className="breadcrumb-item active">
                                        Tickets
                                    </li>
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
                                    <strong>Ticket:</strong>{" "}
                                    {selectedTicket.ticket_number}
                                    <br />
                                    <strong>Customer:</strong>{" "}
                                    {selectedTicket.customer
                                        ? `${selectedTicket.customer.firstname} ${selectedTicket.customer.lastname}`
                                        : "N/A"}
                                    <br />
                                    <strong>Current Status:</strong>{" "}
                                    {getStatusBadge(selectedTicket.status)}
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="status">
                                New Status{" "}
                                <span className="text-danger">*</span>
                            </label>
                            <select
                                id="status"
                                className="form-control"
                                value={statusFormData.status}
                                onChange={(e) =>
                                    setStatusFormData({
                                        ...statusFormData,
                                        status: e.target.value,
                                    })
                                }
                            >
                                <option value="pending">Pending</option>
                                <option value="in_production">
                                    In Production
                                </option>
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
                                onChange={(e) =>
                                    setStatusFormData({
                                        ...statusFormData,
                                        notes: e.target.value,
                                    })
                                }
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
                    title="Record Payment"
                    isOpen={openPaymentModal}
                    onClose={closePaymentModal}
                    size="4xl"
                    submitButtonText={null}
                >
                    <div className="modal-body">
                        {selectedTicket && (
                            <div className="mb-4 border rounded p-3 bg-light">
                                <div className="row">
                                    <div className="col-md-6">
                                        <p className="m-b-5">
                                            <strong>Ticket:</strong>{" "}
                                            {selectedTicket.ticket_number}
                                        </p>
                                        <p className="m-b-5">
                                            <strong>Customer:</strong>{" "}
                                            {selectedTicket.customer
                                                ? `${selectedTicket.customer.firstname} ${selectedTicket.customer.lastname}`
                                                : "Walk-in"}
                                        </p>
                                        <p className="m-b-0">
                                            <strong>Status:</strong>{" "}
                                            {getPaymentStatusBadge(
                                                selectedTicket.payment_status
                                            )}
                                        </p>
                                    </div>
                                    <div className="col-md-6">
                                        <p className="m-b-5">
                                            <strong>Total Amount:</strong>{" "}
                                            {formatPeso(
                                                selectedTicket.total_amount
                                            )}
                                        </p>
                                        <p className="m-b-5">
                                            <strong>Amount Paid:</strong>{" "}
                                            {formatPeso(
                                                selectedTicket.amount_paid
                                            )}
                                        </p>
                                        <p className="m-b-0 text-danger font-bold">
                                            <strong>Balance:</strong>{" "}
                                            {formatPeso(
                                                parseFloat(
                                                    selectedTicket.total_amount || 0
                                                ) -
                                                parseFloat(
                                                    selectedTicket.amount_paid ||
                                                    0
                                                )
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="row">
                            <div className="col-md-6">
                                <div className="form-group">
                                    <label>Payment Date</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={paymentFormData.payment_date}
                                        onChange={(e) =>
                                            setPaymentFormData({
                                                ...paymentFormData,
                                                payment_date: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Payment Method</label>
                                    <select
                                        className="form-control"
                                        value={paymentFormData.payment_method}
                                        onChange={(e) =>
                                            setPaymentFormData({
                                                ...paymentFormData,
                                                payment_method: e.target.value,
                                            })
                                        }
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="gcash">GCash</option>
                                        <option value="bank_transfer">
                                            Bank Transfer
                                        </option>
                                        <option value="credit_card">
                                            Credit Card
                                        </option>
                                        <option value="check">Check</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>
                                        Amount <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        min="0"
                                        step="0.01"
                                        placeholder="Enter amount"
                                        value={paymentFormData.amount}
                                        onChange={(e) =>
                                            setPaymentFormData({
                                                ...paymentFormData,
                                                amount: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Allocation</label>
                                    <select
                                        className="form-control"
                                        value={paymentFormData.allocation}
                                        onChange={(e) =>
                                            setPaymentFormData({
                                                ...paymentFormData,
                                                allocation: e.target.value,
                                            })
                                        }
                                    >
                                        <option value="downpayment">
                                            Downpayment
                                        </option>
                                        <option value="balance">Balance</option>
                                        <option value="full">Full Payment</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Official Receipt #</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="OR number"
                                        value={paymentFormData.official_receipt_number}
                                        onChange={(e) =>
                                            setPaymentFormData({
                                                ...paymentFormData,
                                                official_receipt_number:
                                                    e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Reference # / GCash Trace</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="GCash, bank reference, etc."
                                        value={paymentFormData.payment_reference}
                                        onChange={(e) =>
                                            setPaymentFormData({
                                                ...paymentFormData,
                                                payment_reference: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Notes</label>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        placeholder="Add any details about this payment..."
                                        value={paymentFormData.notes}
                                        onChange={(e) =>
                                            setPaymentFormData({
                                                ...paymentFormData,
                                                notes: e.target.value,
                                            })
                                        }
                                    ></textarea>
                                </div>
                                <div className="form-group">
                                    <label>Attachments (GCash / Bank proof)</label>
                                    <input
                                        type="file"
                                        className="form-control"
                                        multiple
                                        onChange={(e) =>
                                            setPaymentFormData({
                                                ...paymentFormData,
                                                attachments: Array.from(
                                                    e.target.files || []
                                                ),
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="col-md-6">
                                <h5 className="m-b-3">Payment History</h5>
                                <div className="border rounded p-3 payment-history">
                                    {selectedTicket?.payments &&
                                        selectedTicket.payments.length ? (
                                        selectedTicket.payments.map((payment) => (
                                            <div
                                                key={payment.id}
                                                className="border-bottom pb-2 mb-2"
                                            >
                                                <div className="d-flex justify-content-between">
                                                    <strong>
                                                        {formatPeso(payment.amount)}
                                                    </strong>
                                                    <span className="text-muted text-sm">
                                                        {new Date(
                                                            payment.payment_date
                                                        ).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {payment.payment_method?.replace(
                                                        "_",
                                                        " "
                                                    ) || "N/A"}
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
                                                    <p className="text-xs mt-1">
                                                        {payment.notes}
                                                    </p>
                                                )}
                                                {payment.documents?.length ? (
                                                    <>
                                                        <span className="badge badge-success">
                                                            {payment.documents.length}{" "}
                                                            attachment
                                                            {payment.documents.length > 1
                                                                ? "s"
                                                                : ""}
                                                        </span>
                                                        <button
                                                            onClick={() => handlePreviewFile(payment)}
                                                            className="btn btn-sm btn-outline-primary ml-1"
                                                            style={{ padding: "2px 8px", fontSize: "11px" }}
                                                            title="Photo preview"
                                                        >
                                                            <i className="ti-eye"></i>
                                                        </button>
                                                    </>

                                                ) : null}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-muted m-b-0">
                                            No payments recorded yet.
                                        </p>
                                    )}
                                </div>
                            </div>
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
                                        Save Payment
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
                                            onClick={() =>
                                                setCustomerModalOpen(true)
                                            }
                                            className="px-3 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 transition float-end"
                                        >
                                            <i className="ti-plus"></i> Add
                                            Customer
                                        </button>
                                    </div>
                                    <div className="card-body">
                                        <div className="basic-form">
                                            <div className="form-group">
                                                <p className="text-muted m-b-15 f-s-12">
                                                    Search customer here if
                                                    already registered.
                                                </p>
                                                <CustomerSearchBox
                                                    onSelect={(customer) =>
                                                        setSelectedCustomer(
                                                            customer
                                                        )
                                                    }
                                                    _selectedCustomer={
                                                        _selectedCustomer
                                                    }
                                                />
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
                                                                    <b>
                                                                        {
                                                                            _selectedCustomer.full_name
                                                                        }
                                                                    </b>
                                                                </span>
                                                            </label>
                                                        </li>
                                                        <li>
                                                            <label>
                                                                Phone:{" "}
                                                                <span>
                                                                    <b>
                                                                        {_selectedCustomer.phone ||
                                                                            "N/A"}
                                                                    </b>
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
                                                                    <b>
                                                                        {_selectedCustomer.email ||
                                                                            "N/A"}
                                                                    </b>
                                                                </span>
                                                            </label>
                                                        </li>
                                                        <li>
                                                            <label>
                                                                Address:{" "}
                                                                <span>
                                                                    <b>
                                                                        {_selectedCustomer.address ||
                                                                            "N/A"}
                                                                    </b>
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
                                            onClick={() =>
                                                setTicketModalOpen(true)
                                            }
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
                                            <i className="ti-plus"></i> Add
                                            Tickets
                                        </button>
                                    </div>
                                </div>
                                <div className="card-body">
                                    <div
                                        className="alert alert-info"
                                        role="alert"
                                    >
                                        <i className="fa fa-info-circle"></i>{" "}
                                        <strong>Quick Update:</strong> Click the
                                        pencil icon next to status or payment
                                        status to update them quickly.
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

            </AdminLayout>
        </>
    );
}
