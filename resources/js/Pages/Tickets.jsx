// Pages/Tickets.jsx
import React, { useState, useEffect } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Modal from "@/Components/Main/Modal";
import CustomerForm from "@/Components/Customers/CustomerForm";
import TicketForm from "@/Components/Tickets/TicketForm";
import DataTable from "@/Components/Common/DataTable";
import SearchBox from "@/Components/Common/SearchBox";
import FlashMessage from "@/Components/Common/FlashMessage";
import CustomerSearchBox from "@/Components/Common/CustomerSearchBox";
import DateRangeFilter from "@/Components/Common/DateRangeFilter";
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
    const [openVerifyModal, setVerifyModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [editingTicket, setEditingTicket] = useState(null);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [_selectedCustomer, setSelectedCustomer] = useState(selectedCustomer);
    const [isUpdating, setIsUpdating] = useState(false);
    const [selectedID, setSelectedID] = useState(null);
    const [openDeleteModal, setDeleteModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { api, buildUrl } = useRoleApi();
    const { flash, auth } = usePage().props;
    const [error, setError] = useState(null);
    const [verifyFormData, setVerifyFormData] = useState({
        notes: "",
    });


    useEffect(() => {
        setSelectedCustomer(selectedCustomer);
    }, [selectedCustomer]);

    const [localSearch, setLocalSearch] = useState(filters.search || "");

    useEffect(() => {
        setLocalSearch(filters.search || "");
    }, [filters.search]);

    const handleFilterChange = (key, value) => {
        const newFilters = {
            search: filters.search,
            status: filters.status,
            payment_status: filters.payment_status,
            customer_id: _selectedCustomer?.id,
            [key]: value,
        };

        // Clean up empty values
        Object.keys(newFilters).forEach(k => {
            if (newFilters[k] === '' || newFilters[k] === null || newFilters[k] === undefined) {
                delete newFilters[k];
            }
        });

        router.get(buildUrl("tickets"), newFilters, {
            preserveState: true,
            preserveScroll: true,
            replace: true
        });
    };


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


    const hasPermission = (module, feature) => {
        if (auth.user.role === 'admin') return true;
        return auth.user.permissions && auth.user.permissions.includes(`${module}.${feature}`);
    };


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
        setError("");
        if (!selectedTicket) return;

        if (!paymentFormData.amount) {
            setError("Please enter the payment amount.")
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
        setSelectedCustomer(ticket?.customer);
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

    const handleOpenVerifyModal = (ticket) => {
        setSelectedTicket(ticket);
        setVerifyFormData({
            notes: "",
        });
        setVerifyModalOpen(true);
    };

    const closeVerifyModal = () => {
        setVerifyModalOpen(false);
        setSelectedTicket(null);
    };

    const handleVerifyPayment = async () => {
        setIsUpdating(true);
        try {
            await api.patch(`/tickets/${selectedTicket.id}/verify-payment`, verifyFormData);

            closeVerifyModal();
            router.reload({ preserveScroll: true });
        } catch (error) {
            console.error("Verification failed", error);
            alert(error.response?.data?.message || "Failed to verify payment. Please check your data.");
        } finally {
            setIsUpdating(false);
        }
    };

    const getStatusBadge = (status) => {
        const classes = {
            pending: "badge-primary",
            in_designer: "badge-warning",
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

    const getPaymentStatusBadge = (row) => {
        const { payment_status: status, payment_method } = row;
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

    const ticketColumns = [
        {
            label: "#",
            key: "index",
            render: (row, index) =>
                (tickets.current_page - 1) * tickets.per_page + index + 1,
        },
        {
            label: "Design",
            key: "mockup_files",
            render: (row) => {
                const mockupFiles = row.mockup_files || [];
                const customerFiles = row.customer_files || [];

                const latestMockup = mockupFiles.length > 0 ? mockupFiles[mockupFiles.length - 1] : null;
                const latestCustomerFile = customerFiles.length > 0 ? customerFiles[customerFiles.length - 1] : null;

                const displayFile = latestMockup || latestCustomerFile;
                const isApproved = row.design_status === 'approved';
                const isMockup = !!latestMockup;

                if (!displayFile) {
                    return (
                        <div className="text-center">
                            <span className="badge badge-pill badge-light text-muted" style={{ fontSize: '9px' }}>
                                NO DESIGN
                            </span>
                        </div>
                    );
                }

                return (
                    <div className="text-center">
                        <div
                            className="position-relative d-inline-block p-1 border rounded bg-white shadow-sm"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                                setFilepath(displayFile.file_path);
                                setShow(true);
                            }}
                        >
                            <img
                                src={displayFile.file_path}
                                alt="Design"
                                style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '4px' }}
                            />
                            <div className="position-absolute" style={{ top: '-6px', right: '-6px' }}>
                                {isMockup ? (
                                    isApproved ? (
                                        <span className="badge badge-success border border-white shadow-sm" style={{ borderRadius: '50%', padding: '2px 4px' }} title="Approved Mockup">
                                            <i className="ti-check" style={{ fontSize: '8px' }}></i>
                                        </span>
                                    ) : (
                                        <span className="badge badge-warning border border-white shadow-sm" style={{ borderRadius: '50%', padding: '2px 4px' }} title="Pending Mockup">
                                            <i className="ti-timer" style={{ fontSize: '8px' }}></i>
                                        </span>
                                    )
                                ) : (
                                    <span className="badge badge-info border border-white shadow-sm" style={{ borderRadius: '50%', padding: '2px 4px' }} title="Customer Attachment">
                                        <i className="ti-clip" style={{ fontSize: '8px' }}></i>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            }
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
                <div className="d-flex align-items-center">
                    {getPaymentStatusBadge(row)}
                    {row.payment_status === 'awaiting_verification' && (
                        <button
                            onClick={() => handleOpenVerifyModal(row)}
                            className="btn btn-sm btn-success ml-1"
                            style={{ padding: "2px 8px", fontSize: "11px" }}
                            title="Verify Payment"
                        >
                            <i className="ti-check-box"></i> Verify
                        </button>
                    )}
                    <button
                        onClick={() => handleOpenPaymentModal(row)}
                        className="btn btn-sm btn-outline-primary ml-1"
                        style={{ padding: "2px 8px", fontSize: "11px" }}
                        title="View Payment History"
                    >
                        <i className="ti-eye"></i>
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

                    {row.current_workflow_step && row.status !== "completed" && (
                        <div className="text-secondary small">
                            <i className="ti-time mr-1"></i>
                            <i>{row.current_workflow_step}</i>
                        </div>
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
                staticBackdrop={true}
            >
                <TicketForm
                    ticket={editingTicket}
                    hasPermission={hasPermission}
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
                    <div className="col-lg-6 p-r-0 title-margin-right">
                        <div className="page-header">
                            <div className="page-title">
                                <h1>
                                    Tickets <span>Management</span>
                                </h1>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-6 p-l-0 title-margin-left">
                        <div className="page-header">
                            <div className="page-title">
                                <ol className="breadcrumb">
                                    <li className="breadcrumb-item">
                                        <a href="/dashboard">Dashboard</a>
                                    </li>
                                    <li className="breadcrumb-item active">
                                        Tickets
                                    </li>
                                    {/* <li className="breadcrumb-item">
                                        <a href="#" className="text-blue-500" onClick={() => {
                                            router.get(buildUrl("tickets"));
                                        }}>
                                            <i className="ti-reload"></i> Refresh
                                        </a>
                                    </li> */}
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
                                <option value="in_designer">In Designer</option>
                                {/* <option value="in_production">In Production</option> */}
                                {/* <option value="completed">Completed</option> */}
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
                                className="btn btn-secondary btn-sm"
                                onClick={closeStatusModal}
                                disabled={isUpdating}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary btn-sm"
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

                {/* Payment Update Modal - READ ONLY */}
                <Modal
                    title="Payment History"
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
                                                selectedTicket
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
                            <div className="col-md-12">
                                <h5 className="m-b-3">Payment History</h5>
                                <div className="alert alert-info mb-3">
                                    <i className="ti-info-alt mr-2"></i>
                                    <strong>Note:</strong> This is a read-only view. To record new payments, please use the <strong>Payments & Finance</strong> module.
                                </div>
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
                                className="btn btn-secondary btn-sm"
                                onClick={closePaymentModal}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </Modal>

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
                    {/* Customer Search and Add Section */}
                    {hasPermission('customers', 'create') && (
                        <div className="row">
                            <div className="col-lg-6">
                                <div className="card">
                                    <div className="card-title">
                                        <h4>Search Customer</h4>
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm float-end"
                                            onClick={() => setCustomerModalOpen(true)}
                                        >
                                            <i className="ti-plus text-xs"></i> Add Customer
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
                                                    onSelect={(customer) => {
                                                        setSelectedCustomer(customer);
                                                        handleFilterChange('customer_id', customer.id);
                                                    }}
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
                                        {/* <button
                                            className="btn btn-outline-secondary btn-block"
                                            onClick={() => {
                                                setDateRange('');
                                                setCustomStartDate('');
                                                setCustomEndDate('');
                                                setShowCustomDateInputs(false);
                                                router.get(buildUrl("tickets"));
                                            }}
                                            style={{ height: '42px' }}
                                        >
                                            Reset
                                        </button> */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                router.get(buildUrl("tickets"));
                                            }}
                                            className="btn btn-sm btn-outline-info mr-2"
                                            title="Refresh"
                                        >
                                            <i className="ti-reload"></i>
                                        </button>

                                        {hasPermission('tickets', 'create') && (

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setTicketModalOpen(true)
                                                }
                                                disabled={!_selectedCustomer}
                                                className="btn btn-sm btn-primary"
                                            >
                                                <i className="ti-plus text-xs"></i> Add
                                                Tickets
                                            </button>
                                        )}

                                    </div>
                                </div>
                                <div className="card-body">
                                    <div className="row mb-4">
                                        <div className="col-md-3">
                                            <div className="input-group">
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Search tickets..."
                                                    value={localSearch}
                                                    onChange={(e) => setLocalSearch(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleFilterChange('search', localSearch)}
                                                    onBlur={() => handleFilterChange('search', localSearch)}
                                                />
                                                <div className="input-group-append">
                                                    <button
                                                        className="btn btn-primary"
                                                        type="button"
                                                        onClick={() => handleFilterChange('search', localSearch)}
                                                        style={{ height: '42px' }}
                                                    >
                                                        <i className="ti-search"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-2">
                                            <select
                                                className="form-control"
                                                value={filters.status || ''}
                                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                            >
                                                <option value="">All Status</option>
                                                <option value="pending">Pending</option>
                                                <option value="in_designer">In Designer</option>
                                                <option value="in_production">In Production</option>
                                                <option value="completed">Completed</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                        <div className="col-md-2">
                                            <select
                                                className="form-control"
                                                value={filters.payment_status || ''}
                                                onChange={(e) => handleFilterChange('payment_status', e.target.value)}
                                            >
                                                <option value="">All Payment Status</option>
                                                <option value="pending">Pending</option>
                                                <option value="partial">Partial</option>
                                                <option value="paid">Paid</option>
                                                <option value="awaiting_verification">Awaiting Verification</option>
                                            </select>
                                        </div>
                                        <DateRangeFilter
                                            filters={filters}
                                            route="tickets"
                                            buildUrl={buildUrl}
                                        />
                                        <div className="col-md-2">
                                        </div>
                                    </div>

                                    {/* Active Filters Indicator */}
                                    {(filters.search || filters.status || filters.payment_status || filters.date_range) && (
                                        <div className="row mb-3">
                                            <div className="col-12">
                                                <div className="alert alert-light border p-2">
                                                    <small className="text-muted mr-2">
                                                        <i className="ti-filter mr-1"></i>
                                                        <strong>Active Filters:</strong>
                                                    </small>
                                                    {filters.search && (
                                                        <span className="badge badge-info mr-2">
                                                            Search: {filters.search}
                                                        </span>
                                                    )}
                                                    {filters.status && (
                                                        <span className="badge badge-info mr-2">
                                                            Status: {filters.status}
                                                        </span>
                                                    )}
                                                    {filters.payment_status && (
                                                        <span className="badge badge-info mr-2">
                                                            Payment: {filters.payment_status}
                                                        </span>
                                                    )}
                                                    {filters.date_range && (
                                                        <span className="badge badge-primary mr-2">
                                                            <i className="ti-calendar mr-1"></i>
                                                            {filters.date_range === 'custom'
                                                                ? `Custom: ${filters.start_date} to ${filters.end_date}`
                                                                : filters.date_range === 'last_30_days'
                                                                    ? 'Last 30 Days'
                                                                    : `Year: ${filters.date_range}`
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="alert alert-info" role="alert">
                                        <i className="fa fa-info-circle"></i>{" "}
                                        <strong>Note:</strong> Update the status using the pencil icon.
                                        Set it to <strong>In Designer</strong> once the job is ready to proceed with design review.
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
                </section >

            </AdminLayout >
        </>
    );
}
