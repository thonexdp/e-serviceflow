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
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [editingTicket, setEditingTicket] = useState(null);
    const [_selectedCustomer, setSelectedCustomer] = useState(selectedCustomer);

    const { flash } = usePage().props;

    // Handle customer form submission
    // const handleCustomerSubmit = (data) => {
    //     if (editingCustomer) {
    //         router.put(`/customers/${editingCustomer.id}`, data, {
    //             onSuccess: () => {
    //                 setCustomerModalOpen(false);
    //                 setEditingCustomer(null);
    //             },
    //             preserveScroll: true,
    //         });
    //     } else {
    //         router.post("/customers", data, {
    //             onSuccess: () => {
    //                 setCustomerModalOpen(false);
    //             },
    //             preserveScroll: true,
    //         });
    //     }
    // };

    const handleCustomerSubmit = async (formData) => {
        try {
            //setLoading(true);
            const { data } = await axios.post("/customers", formData);

            if(data.success){
               setSelectedCustomer({
                    ...data?.customer,
                    full_name: `${data?.customer?.firstname} ${data?.customer?.lastname}`,
                });
            }
            setCustomerModalOpen(false);
        } catch (error) {
            console.error("Add failed:",error, error.response?.data);
           // toast.error("Failed to add customer.");
        } finally {
           setCustomerModalOpen(false);
        }
        };

    // Handle ticket form submission
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

    const handleEditCustomer = (customer) => {
        setEditingCustomer(customer);
        setCustomerModalOpen(true);
    };

    const handleEditTicket = (ticket) => {
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

    const getStatusBadge = (status) => {
        const classes = {
            pending: "badge-warning",
            in_production: "badge-info",
            completed: "badge-success",
            cancelled: "badge-danger",
        };
        return (
            <span className={`badge ${classes[status] || "badge-secondary"}`}>
                {status?.replace("_", " ").toUpperCase() || "PENDING"}
            </span>
        );
    };

    const getPaymentStatusBadge = (status) => {
        const classes = {
            pending: "badge-warning",
            partial: "badge-info",
            paid: "badge-success",
        };
        return (
            <span className={`badge ${classes[status] || "badge-secondary"}`}>
                {status?.toUpperCase() || "PENDING"}
            </span>
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
            render: (row) => getPaymentStatusBadge(row.payment_status),
        },
        {
            label: "Status",
            key: "status",
            render: (row) => getStatusBadge(row.status),
        },
    ];

    return (
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

            {/* Customer Modal */}
            <Modal
                title={editingCustomer ? "Edit Customer" : "Add Customer"}
                isOpen={openCustomerModal}
                onClose={closeCustomerModal}
                size="5xl"
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
                title={editingTicket ? "Edit Ticket" : "Add Ticket"}
                isOpen={openTicketModal}
                onClose={closeTicketModal}
                size="5xl"
                submitButtonText={null}
            >
                <TicketForm
                    ticket={editingTicket}
                    customerId={_selectedCustomer?.id}
                    onSubmit={handleTicketSubmit}
                    onCancel={closeTicketModal}
                />
            </Modal>

            <section id="main-content">
                {/* Customer Search and Add Section */}
                <div className="row">
                    <div className="col-lg-6">
                        <div className="card">
                            <div className="card-title">
                                <h4>Search Customer</h4>
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
                    <div className="col-md-3">
                        <div className="card">
                            <div className="card-body">
                                <button
                                    type="button"
                                    onClick={() => setCustomerModalOpen(true)}
                                    className="px-5 py-2.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                                >
                                    <i className="ti-plus"></i>Add Customer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Customer Details Section */}
                {_selectedCustomer && (
                    <div className="row">
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
                    </div>
                )}

                {/* Tickets Section */}
                <div className="row">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="row">
                                <div className="col-lg-5">
                                    <h3>
                                        <b>Job Ticket Section</b>
                                    </h3>
                                    {_selectedCustomer && (
                                        <label className="mt-2">
                                            Job Ticket for Client:{" "}
                                            <b>{_selectedCustomer.full_name}</b>
                                        </label>
                                    )}
                                </div>
                                <div className="col-lg-7">
                                    <div className="button-list float-end">
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-flat btn-sm btn-addon m-b-10 m-l-5"
                                            onClick={() => setTicketModalOpen(true)}
                                            disabled={!_selectedCustomer}
                                        >
                                            <i className="ti-plus"></i>Add Tickets
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="card-title">
                                <h4>Tickets</h4>
                            </div>
                            <div className="card-body">
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
    );
}