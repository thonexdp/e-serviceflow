// Pages/JobCategories.jsx
import React, { useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Footer from "@/Components/Layouts/Footer";
import Modal from "@/Components/Main/Modal";
import JobCategoryForm from "@/Components/JobCategories/JobCategoryForm";
import DataTable from "@/Components/Common/DataTable";
import SearchBox from "@/Components/Common/SearchBox";
import FlashMessage from "@/Components/Common/FlashMessage";
import DeleteConfirmation from "@/Components/Common/DeleteConfirmation";

export default function JobCategories({
    user = {},
    notifications = [],
    messages = [],
    categories = { data: [] },
    filters = {},
}) {
    const [openCategoryModal, setCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [selectedID, setSelectedID] = useState(null);
    const [loading, setLoading] = useState(false);
    const [openDeleteModal, setDeleteModalOpen] = useState(false);
    const { flash } = usePage().props;

    const handleOpenModal = (category = null) => {
        setEditingCategory(category);
        setCategoryModalOpen(true);
    };

    const handleCloseModal = () => {
        setDeleteModalOpen(false);
        setCategoryModalOpen(false);
        setEditingCategory(null);
    };

    const handleCategorySubmit = (data) => {
        if (editingCategory) {
            router.put(`/job-categories/${editingCategory.id}`, data, {
                onSuccess: () => {
                    handleCloseModal();
                },
                preserveState: false,
                preserveScroll: true,
            });
        } else {
            router.post("/job-categories", data, {
                onSuccess: () => {
                    handleCloseModal();
                },
                preserveState: false,
                preserveScroll: true,
            });
        }
    };

    const handleDelete = (categoryId) => {
        setSelectedID(categoryId);
        setDeleteModalOpen(true);
    };

    const handleDeleteCategory = () => {
        if (!selectedID) return;
        router.delete(`/job-categories/${selectedID}`, {
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

    // Define table columns
    const categoryColumns = [
        {
            label: "#",
            key: "index",
            render: (row, index) => {
                if (categories.current_page && categories.per_page) {
                    return (
                        (categories.current_page - 1) * categories.per_page +
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
            render: (row) => row.name,
        },
        {
            label: "Created At",
            key: "created_at",
            render: (row) => {
                if (row.created_at) {
                    return new Date(row.created_at).toLocaleDateString();
                }
                return "N/A";
            },
        },
    ];

    return (
        <AdminLayout
            user={user}
            notifications={notifications}
            messages={messages}
        >
            <Head title="Job Categories" />
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
                                Job Categories <span>Management</span>
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
                                    Job Categories
                                </li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Modal */}
            <Modal
                title={"Delete Category"}
                isOpen={openDeleteModal}
                onClose={handleCloseModal}
                size="md"
                submitButtonText={null}
            >
                <DeleteConfirmation
                    label="category"
                    loading={loading}
                    onSubmit={handleDeleteCategory}
                    onCancel={handleCloseModal}
                />
            </Modal>

            {/* Category Modal */}
            <Modal
                title={editingCategory ? "Edit Category" : "Add Category"}
                isOpen={openCategoryModal}
                onClose={handleCloseModal}
                size="md"
                submitButtonText={null}
            >
                <JobCategoryForm
                    category={editingCategory}
                    onSubmit={handleCategorySubmit}
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
                                            <h4>Category Lists</h4>
                                        </div>
                                        <div className="card-body">
                                            <div className="row mt-4 align-items-center">
                                                <div className="col-md-5">
                                                    <SearchBox
                                                        placeholder="Search categories..."
                                                        initialValue={
                                                            filters.search || ""
                                                        }
                                                        route="/job-categories"
                                                    />
                                                </div>

                                                <div className="col-md-7 d-flex justify-content-end">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            router.visit("/job-types")
                                                        }
                                                        className="px-3 mr-2 text-sm font-medium text-purple-600 border border-purple-600 rounded-md hover:bg-purple-600 hover:text-white focus:outline-none transition"
                                                    >
                                                        <i className="ti-stamp"></i> Job Types
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            router.replace("/job-categories")
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
                                                        Add Category
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-4">
                                                <DataTable
                                                    columns={categoryColumns}
                                                    data={categories.data}
                                                    pagination={categories}
                                                    onEdit={handleOpenModal}
                                                    onDelete={handleDelete}
                                                    emptyMessage="No categories found."
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

