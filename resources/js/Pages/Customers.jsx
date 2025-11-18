// Pages/Customers.jsx
import React, { useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Footer from "@/Components/Layouts/Footer";
import Modal from "@/Components/Main/Modal";
import CustomerForm from "@/Components/Customers/CustomerForm";
import DataTable from "@/Components/Common/DataTable";
import SearchBox from "@/Components/Common/SearchBox";
import FlashMessage from "@/Components/Common/FlashMessage";
import DeleteConfirmation from "@/Components/Common/DeleteConfirmation";

export default function Customers({
    user = {},
    notifications = [],
    messages = [],
    customers = { data: [] },
    filters = {},
}) {
    const [openCustomerModal, setCustomerModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [selectedID, setSelectedID] = useState(null);
    const [loading, setLoading] = useState(false);

    const [openDeleteModal, setDeleteModalOpen] = useState(false);
    const { flash } = usePage().props;

    const handleOpenModal = (customer = null) => {
        setEditingCustomer(customer);
        setCustomerModalOpen(true);
    };

    const handleCloseModal = () => {
        setDeleteModalOpen(false);
        setCustomerModalOpen(false);
        setEditingCustomer(null);
    };

    const handleCustomerSubmit = (data) => {
        console.log('handleCustomerSubmit', data);
        if (editingCustomer) {
            router.put(`/customers/${editingCustomer.id}`, data, {
                onSuccess: () => {
                    handleCloseModal();
                },
                preserveState: false,
                preserveScroll: true,
            });
        } else {
            router.post("/customers", data, {
                onSuccess: () => {
                    handleCloseModal();
                },
                preserveState: false,
                preserveScroll: true,
            });
        }
    };

    const handleDelete = (customerId) => {
        setSelectedID(customerId);
        setDeleteModalOpen(true);
    };

    const handleDeleteCustomer = () => {
        if (!selectedID) return;
        router.delete(`/customers/${selectedID}`, {
            preserveScroll: true,
             preserveState: false,

            onBefore: () => {
                setLoading(true);
            },
            onSuccess: () => {
                handleCloseModal();
                setLoading(false);
                toast.success("Customer deleted successfully.");
            },
            onError: (errors) => {
                setLoading(false);
                toast.error("Failed to delete customer. Please try again.");
            },

            // Called always after success or error
            onFinish: () => {
                setLoading(false);
            },
        });
    };

    // Define table columns
    const customerColumns = [
        {
            label: "#",
            key: "index",
            render: (row, index) => {
                if (customers.current_page && customers.per_page) {
                    return (
                        (customers.current_page - 1) * customers.per_page +
                        index +
                        1
                    );
                }
                return index + 1;
            },
        },
        {
            label: "Name",
            key: "name",
            render: (row) => `${row.firstname} ${row.lastname}`,
        },
        {
            label: "Phone",
            key: "phone",
            render: (row) => row.phone || "N/A",
        },
        {
            label: "Email",
            key: "email",
            render: (row) => row.email || "N/A",
        },
        {
            label: "Facebook",
            key: "facebook",
            render: (row) => row.facebook || "N/A",
        },
        {
            label: "Address",
            key: "address",
            render: (row) => row.address || "N/A",
        },
    ];

    return (
        <AdminLayout
            user={user}
            notifications={notifications}
            messages={messages}
        >
            <Head title="Customers" />
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
                                Customers <span>Management</span>
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
                                    Customers
                                </li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            {/* Customer Modal */}
            <Modal
                title={"Delete Customer"}
                isOpen={openDeleteModal}
                onClose={handleCloseModal}
                size="md"
                submitButtonText={null}
            >
                <DeleteConfirmation
                    label="customer"
                    loading={loading}
                    onSubmit={handleDeleteCustomer}
                    onCancel={handleCloseModal}
                />
            </Modal>

            <Modal
                title={editingCustomer ? "Edit Customer" : "Add Customer"}
                isOpen={openCustomerModal}
                onClose={handleCloseModal}
                size="4xl"
                submitButtonText={null}
            >
                <CustomerForm
                    customer={editingCustomer}
                    onSubmit={handleCustomerSubmit}
                    onCancel={handleCloseModal}
                />
            </Modal>

            <section id="main-content">
                <div className="content-wrap">
                    <div className="main">
                        <div className="container-fluid">
                            <div className="row">
                                <div className="col-lg-12">
                                    <div className="card">
                                        <div className="card-title mt-3">
                                            <h4>Customer Lists</h4>
                                        </div>
                                        <div className="card-body">
                                            <div className="row mt-4 align-items-center">
                                                <div className="col-md-5">
                                                    <SearchBox
                                                        placeholder="Search customers..."
                                                        initialValue={
                                                            filters.search || ""
                                                        }
                                                        route="/customers"
                                                    />
                                                </div>

                                                <div className="col-md-7 d-flex justify-content-end">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            router.replace("/customers")
                                                        }
                                                        className="px-3 mr-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-600 hover:text-white focus:outline-none transition"
                                                    >
                                                        <i className="ti-reload"></i>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleOpenModal()
                                                        }
                                                        className="px-3 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                                                    >
                                                        <i className="ti-plus"></i>{" "}
                                                        Add Customer
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-4">
                                                <DataTable
                                                    columns={customerColumns}
                                                    data={customers.data}
                                                    pagination={customers}
                                                    onEdit={handleOpenModal}
                                                    onDelete={handleDelete}
                                                    emptyMessage="No customers found."
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
