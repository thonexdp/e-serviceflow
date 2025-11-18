// Pages/JobTypes.jsx
import React, { useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Footer from "@/Components/Layouts/Footer";
import Modal from "@/Components/Main/Modal";
import JobTypeForm from "@/Components/JobTypes/JobTypeForm";
import DataTable from "@/Components/Common/DataTable";
import SearchBox from "@/Components/Common/SearchBox";
import FlashMessage from "@/Components/Common/FlashMessage";
import DeleteConfirmation from "@/Components/Common/DeleteConfirmation";
import FormInput from "@/Components/Common/FormInput";

export default function JobTypes({
    user = {},
    notifications = [],
    messages = [],
    jobTypes = { data: [] },
    categories = [],
    filters = {},
}) {
    const [openJobTypeModal, setJobTypeModalOpen] = useState(false);
    const [editingJobType, setEditingJobType] = useState(null);
    const [selectedID, setSelectedID] = useState(null);
    const [loading, setLoading] = useState(false);
    const [openDeleteModal, setDeleteModalOpen] = useState(false);
    const { flash } = usePage().props;

    const handleOpenModal = (jobType = null) => {
        setEditingJobType(jobType);
        setJobTypeModalOpen(true);
    };

    const handleCloseModal = () => {
        setDeleteModalOpen(false);
        setJobTypeModalOpen(false);
        setEditingJobType(null);
    };

    const handleJobTypeSubmit = (data) => {
        if (editingJobType) {
            router.put(`/job-types/${editingJobType.id}`, data, {
                onSuccess: () => {
                    handleCloseModal();
                },
                preserveState: false,
                preserveScroll: true,
            });
        } else {
            router.post("/job-types", data, {
                onSuccess: () => {
                    handleCloseModal();
                },
                preserveState: false,
                preserveScroll: true,
            });
        }
    };

    const handleDelete = (jobTypeId) => {
        setSelectedID(jobTypeId);
        setDeleteModalOpen(true);
    };

    const handleDeleteJobType = () => {
        if (!selectedID) return;
        router.delete(`/job-types/${selectedID}`, {
            preserveScroll: true,
            preserveState: false,
            onBefore: () => {
                setLoading(true);
            },
            onSuccess: () => {
                handleCloseModal();
                setLoading(false);
            },
            onError: (errors) => {
                setLoading(false);
            },
            onFinish: () => {
                setLoading(false);
            },
        });
    };

    const handleCategoryFilter = (e) => {
        const categoryId = e.target.value;
        router.get("/job-types", { ...filters, category_id: categoryId || null }, {
            preserveState: false,
            preserveScroll: true,
        });
    };

    // Define table columns
    const jobTypeColumns = [
        {
            label: "#",
            key: "index",
            render: (row, index) => {
                if (jobTypes.current_page && jobTypes.per_page) {
                    return (
                        (jobTypes.current_page - 1) * jobTypes.per_page +
                        index +
                        1
                    );
                }
                return index + 1;
            },
        },
        {
            label: "Category",
            key: "category",
            render: (row) => row.category?.name || "N/A",
        },
        {
            label: "Name",
            key: "name",
            render: (row) => row.name,
        },
        {
            label: "Pricing",
            key: "price",
            render: (row) => {
                if (row.price_tiers && row.price_tiers.length > 0) {
                    return <div className="badge badge-info">Tiered by Qty</div>;
                }
                if (row.size_rates && row.size_rates.length > 0) {
                    return <div className="badge badge-primary">Size-Based</div>;
                }
                return `₱${parseFloat(row.price).toFixed(2)} / ${row.price_by}`;
            },
        },
        {
            label: "Discount",
            key: "discount",
            render: (row) => row.discount ? `${row.discount}%` : "N/A",
        },
        {
            label: "Status",
            key: "is_active",
            render: (row) => (
                <span className={` ${row.is_active ? 'text-success' : 'text-danger'}`}>
                    {row.is_active ? 'Active' : 'Inactive'}
                </span>
            ),
        },
    ];

    return (
        <AdminLayout
            user={user}
            notifications={notifications}
            messages={messages}
        >
            <Head title="Job Types & Pricing" />
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
                                Job Types & Pricing <span>Management</span>
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
                                    Job Types & Pricing
                                </li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Modal */}
            <Modal
                title={"Delete Job Type"}
                isOpen={openDeleteModal}
                onClose={handleCloseModal}
                size="md"
                submitButtonText={null}
            >
                <DeleteConfirmation
                    label="job type"
                    loading={loading}
                    onSubmit={handleDeleteJobType}
                    onCancel={handleCloseModal}
                />
            </Modal>

            {/* Job Type Modal */}
            <Modal
                title={editingJobType ? "Edit Job Type" : "Add Job Type"}
                isOpen={openJobTypeModal}
                onClose={handleCloseModal}
                size="4xl"
                submitButtonText={null}
            >
                <JobTypeForm
                    jobType={editingJobType}
                    categories={categories}
                    onSubmit={handleJobTypeSubmit}
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
                                            <h4>Job Types & Pricing Lists</h4>
                                        </div>
                                        <div className="card-body">
                                            <div className="row mt-4 align-items-center">
                                                <div className="col-md-3">
                                                    <SearchBox
                                                        placeholder="Search job types..."
                                                        initialValue={
                                                            filters.search || ""
                                                        }
                                                        route="/job-types"
                                                    />
                                                </div>

                                                <div className="col-md-3">
                                                    <FormInput
                                                        label=""
                                                        type="select"
                                                        name="category_filter"
                                                        value={filters.category_id || ""}
                                                        onChange={handleCategoryFilter}
                                                        options={[
                                                            { value: "", label: "All Categories" },
                                                            ...categories.map(cat => ({
                                                                value: cat.id.toString(),
                                                                label: cat.name
                                                            }))
                                                        ]}
                                                    />
                                                </div>

                                                <div className="col-md-6 d-flex justify-content-end">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            router.visit("/job-categories")
                                                        }
                                                        className="px-3 mr-2 text-sm font-medium text-green-600 border border-green-600 rounded-md hover:bg-green-600 hover:text-white focus:outline-none transition"
                                                    >
                                                        <i className="ti-settings"></i> Manage Categories
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            router.replace("/job-types")
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
                                                        Add Job Type
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-4">
                                                <DataTable
                                                    columns={jobTypeColumns}
                                                    data={jobTypes.data}
                                                    pagination={jobTypes}
                                                    onEdit={handleOpenModal}
                                                    onDelete={handleDelete}
                                                    emptyMessage="No job types found."
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

