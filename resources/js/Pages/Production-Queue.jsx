import React, { useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Footer from "@/Components/Layouts/Footer";
import Modal from "@/Components/Main/Modal";
import DataTable from "@/Components/Common/DataTable";
import SearchBox from "@/Components/Common/SearchBox";
import FlashMessage from "@/Components/Common/FlashMessage";
import FormInput from "@/Components/Common/FormInput";

export default function ProductionQueue({
    user = {},
    notifications = [],
    messages = [],
    tickets = { data: [] },
    filters = {},
}) {
    const [openViewModal, setViewModalOpen] = useState(false);
    const [openUpdateModal, setUpdateModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [producedQuantity, setProducedQuantity] = useState(0);
    const [loading, setLoading] = useState(false);
    const { flash } = usePage().props;

    const handleView = (ticket) => {
        setSelectedTicket(ticket);
        setViewModalOpen(true);
    };

    const handleUpdate = (ticket) => {
        setSelectedTicket(ticket);
        setProducedQuantity(ticket.produced_quantity || 0);
        setUpdateModalOpen(true);
    };

    const handleCloseModals = () => {
        setViewModalOpen(false);
        setUpdateModalOpen(false);
        setSelectedTicket(null);
        setProducedQuantity(0);
    };

    const handleStartProduction = (ticketId) => {
        setLoading(true);
        router.post(`/production/${ticketId}/start`, {}, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                setLoading(false);
            },
            onError: () => {
                setLoading(false);
            },
        });
    };

    const handleUpdateProgress = () => {
        if (!selectedTicket) return;

        const quantity = parseInt(producedQuantity) || 0;
        if (quantity < 0 || quantity > selectedTicket.quantity) {
            alert(`Quantity must be between 0 and ${selectedTicket.quantity}`);
            return;
        }

        setLoading(true);
        const status = quantity >= selectedTicket.quantity ? 'completed' : 'in_production';

        router.post(`/production/${selectedTicket.id}/update`, {
            produced_quantity: quantity,
            status: status,
        }, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                handleCloseModals();
                setLoading(false);
            },
            onError: () => {
                setLoading(false);
            },
        });
    };

    const handleMarkCompleted = (ticketId) => {
        if (!confirm("Mark this ticket as completed?")) return;

        setLoading(true);
        router.post(`/production/${ticketId}/complete`, {}, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                setLoading(false);
            },
            onError: () => {
                setLoading(false);
            },
        });
    };

    const handleQuickAdd = (amount) => {
        const current = parseInt(producedQuantity) || 0;
        const newValue = Math.min(current + amount, selectedTicket?.quantity || 0);
        setProducedQuantity(newValue);
    };

    const getStatusBadge = (status) => {
        const classes = {
            ready_to_print: "badge-info",
            in_production: "badge-warning",
            completed: "badge-success",
            pending: "badge-secondary",
        };
        const labels = {
            ready_to_print: "Ready to Print",
            in_production: "In Progress",
            completed: "Completed",
            pending: "Pending",
        };
        return (
            <span className={`badge ${classes[status] || "badge-secondary"}`}>
                {labels[status] || status?.toUpperCase() || "PENDING"}
            </span>
        );
    };

    const getActionButton = (ticket) => {
        if (ticket.status === "ready_to_print") {
            return (
                <div className="btn-group">
                    <button
                        type="button"
                        className="btn btn-link btn-sm text-blue-500"
                        onClick={() => handleView(ticket)}
                    >
                        <i className="ti-eye"></i> View
                    </button>
                    <button
                        type="button"
                        className="btn btn-link btn-sm text-green-500"
                        onClick={() => handleStartProduction(ticket.id)}
                        disabled={loading}
                    >
                        <i className="ti-play"></i> Start
                    </button>
                </div>
            );
        } else if (ticket.status === "in_production") {
            return (
                <div className="btn-group">
                    <button
                        type="button"
                        className="btn btn-link btn-sm text-blue-500"
                        onClick={() => handleUpdate(ticket)}
                    >
                        <i className="ti-pencil"></i> Update
                    </button>
                    {ticket.produced_quantity >= ticket.quantity && (
                        <button
                            type="button"
                            className="btn btn-link btn-sm text-success"
                            onClick={() => handleMarkCompleted(ticket.id)}
                            disabled={loading}
                        >
                            <i className="ti-check"></i> Complete
                        </button>
                    )}
                </div>
            );
        } else if (ticket.status === "completed") {
            return (
                <span className="text-success">
                    <i className="ti-check"></i> Completed
                </span>
            );
        } else {
            return (
                <button
                    type="button"
                    className="btn btn-link btn-sm text-blue-500"
                    onClick={() => handleView(ticket)}
                >
                    <i className="ti-eye"></i> View
                </button>
            );
        }
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
            label: "Quantity",
            key: "quantity",
            render: (row) => (
                <span>
                    <b className={row.produced_quantity >= row.quantity ? "text-success" : "text-warning"}>
                        {row.produced_quantity || 0}
                    </b>
                    {" / "}
                    <b>{row.quantity}</b>
                </span>
            ),
        },
        {
            label: "Status",
            key: "status",
            render: (row) => getStatusBadge(row.status),
        },
        {
            label: "Due Date",
            key: "due_date",
            render: (row) =>
                row.due_date ? new Date(row.due_date).toLocaleDateString() : "N/A",
        },
        {
            label: "Action",
            key: "action",
            render: (row) => getActionButton(row),
        },
    ];

    const mockupFiles = selectedTicket?.mockup_files || [];

    return (
        <AdminLayout
            user={user}
            notifications={notifications}
            messages={messages}
        >
            <Head title="Production Queue" />

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
                                Production Queue <span>Management</span>
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
                                <li className="breadcrumb-item active">Production Queue</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            {/* View Modal */}
            <Modal
                title={`Ticket Details - #${selectedTicket?.ticket_number}`}
                isOpen={openViewModal}
                onClose={handleCloseModals}
                size="5xl"
            >
                {selectedTicket && (
                    <div>
                        <div className="row mb-4">
                            <div className="col-md-6">
                                <h5>
                                    Customer: <b>{selectedTicket.customer?.firstname} {selectedTicket.customer?.lastname}</b>
                                </h5>
                                <h5>
                                    Description: <b>{selectedTicket.description}</b>
                                </h5>
                                <p>
                                    Status: {getStatusBadge(selectedTicket.status)}
                                </p>
                            </div>
                            <div className="col-md-6">
                                <p>
                                    <strong>Quantity:</strong> {selectedTicket.produced_quantity || 0} / {selectedTicket.quantity}
                                </p>
                                <p>
                                    <strong>Due Date:</strong> {selectedTicket.due_date ? new Date(selectedTicket.due_date).toLocaleDateString() : "N/A"}
                                </p>
                                {selectedTicket.size_value && (
                                    <p>
                                        <strong>Size:</strong> {selectedTicket.size_value} {selectedTicket.size_unit || ""}
                                    </p>
                                )}
                            </div>
                        </div>

                        <hr className="my-3" />

                        <div className="mb-4">
                            <h6>Design Files:</h6>
                            {mockupFiles.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="table table-sm table-bordered">
                                        <thead>
                                            <tr>
                                                <th>Filename</th>
                                                <th>Uploaded</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mockupFiles.map((file) => (
                                                <tr key={file.id}>
                                                    <td>{file.filename}</td>
                                                    <td>{new Date(file.created_at).toLocaleDateString()}</td>
                                                    <td>
                                                        <a
                                                            href={`/mock-ups/files/${file.id}/download`}
                                                            target="_blank"
                                                            className="btn btn-link btn-sm text-blue-500"
                                                        >
                                                            <i className="ti-download"></i> Download
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-muted">No design files available</p>
                            )}
                        </div>

                        {selectedTicket.status === "ready_to_print" && (
                            <div className="d-flex justify-content-end gap-2">
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={() => {
                                        handleCloseModals();
                                        handleStartProduction(selectedTicket.id);
                                    }}
                                    disabled={loading}
                                >
                                    <i className="ti-play"></i> Start Production
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleCloseModals}
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Update Progress Modal */}
            <Modal
                title={`Update Production - Ticket #${selectedTicket?.ticket_number}`}
                isOpen={openUpdateModal}
                onClose={handleCloseModals}
                size="4xl"
            >
                {selectedTicket && (
                    <div>
                        <div className="mb-4">
                            <h4>
                                Description: <b>{selectedTicket.description}</b>
                            </h4>
                            <p>
                                Status: {getStatusBadge(selectedTicket.status)}
                            </p>
                        </div>

                        <hr className="my-3" />

                        <div className="mb-4">
                            <div className="row align-items-center">
                                <div className="col-md-12 mb-3">
                                    <h3 className="text-lg font-semibold">
                                        Produced so far:{" "}
                                        <span className={producedQuantity >= selectedTicket.quantity ? "text-success" : "text-warning"}>
                                            {producedQuantity} / {selectedTicket.quantity}
                                        </span>
                                    </h3>
                                    <div className="progress mt-2" style={{ height: "25px" }}>
                                        <div
                                            className={`progress-bar ${
                                                producedQuantity >= selectedTicket.quantity
                                                    ? "bg-success"
                                                    : "bg-warning"
                                            }`}
                                            role="progressbar"
                                            style={{
                                                width: `${(producedQuantity / selectedTicket.quantity) * 100}%`,
                                            }}
                                        >
                                            {Math.round((producedQuantity / selectedTicket.quantity) * 100)}%
                                        </div>
                                    </div>
                                </div>

                                <div className="col-md-5">
                                    <FormInput
                                        label="Produced Quantity"
                                        type="number"
                                        name="produced_quantity"
                                        value={producedQuantity}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            setProducedQuantity(Math.min(val, selectedTicket.quantity));
                                        }}
                                        placeholder="0"
                                        min="0"
                                        max={selectedTicket.quantity}
                                        required
                                    />
                                </div>

                                <div className="col-md-7">
                                    <label className="block text-sm font-medium mb-2">Quick Add:</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => handleQuickAdd(1)}
                                        >
                                            <i className="ti-plus"></i> +1
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => handleQuickAdd(2)}
                                        >
                                            <i className="ti-plus"></i> +2
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => handleQuickAdd(5)}
                                        >
                                            <i className="ti-plus"></i> +5
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => handleQuickAdd(10)}
                                        >
                                            <i className="ti-plus"></i> +10
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary btn-sm"
                                            onClick={() => setProducedQuantity(selectedTicket.quantity)}
                                        >
                                            Set to Max
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr className="my-3" />

                        <div className="d-flex justify-content-end gap-2">
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleUpdateProgress}
                                disabled={loading}
                            >
                                {loading ? (
                                    <span>
                                        <i className="ti-reload mr-2 animate-spin"></i> Saving...
                                    </span>
                                ) : (
                                    <span>
                                        <i className="ti-save"></i> Save Progress
                                    </span>
                                )}
                            </button>
                            {producedQuantity >= selectedTicket.quantity && (
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={() => {
                                        handleUpdateProgress();
                                    }}
                                    disabled={loading}
                                >
                                    <i className="ti-check"></i> Mark Completed
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleCloseModals}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <section id="main-content">
                <div className="content-wrap">
                    <div className="main">
                        <div className="container-fluid">
                            <div className="row">
                                <div className="col-lg-12">
                                    <div className="card">
                                        <div className="card-title mt-3">
                                            <h4>Production Queue</h4>
                                        </div>
                                        <div className="card-body">
                                            <div className="row mt-4 align-items-center">
                                                <div className="col-md-5">
                                                    <SearchBox
                                                        placeholder="Search tickets..."
                                                        initialValue={filters.search || ""}
                                                        route="/production"
                                                    />
                                                </div>
                                                <div className="col-md-4">
                                                    <FormInput
                                                        label=""
                                                        type="select"
                                                        name="status"
                                                        value={filters.status || "all"}
                                                        onChange={(e) => {
                                                            router.get("/production", {
                                                                ...filters,
                                                                status: e.target.value === "all" ? null : e.target.value
                                                            }, {
                                                                preserveState: false,
                                                                preserveScroll: true,
                                                            });
                                                        }}
                                                        options={[
                                                            { value: "all", label: "All Status" },
                                                            { value: "ready_to_print", label: "Ready to Print" },
                                                            { value: "in_production", label: "In Progress" },
                                                            { value: "completed", label: "Completed" },
                                                        ]}
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-4">
                                                <DataTable
                                                    columns={ticketColumns}
                                                    data={tickets.data}
                                                    pagination={tickets}
                                                    emptyMessage="No tickets ready for production."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </AdminLayout>
    );
}
