import React, { useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Footer from "@/Components/Layouts/Footer";
import Modal from "@/Components/Main/Modal";
import JobTypeForm from "@/Components/JobTypes/JobTypeForm";
import JobCategoryForm from "@/Components/JobCategories/JobCategoryForm";
import DataTable from "@/Components/Common/DataTable";
import SearchBox from "@/Components/Common/SearchBox";
import FlashMessage from "@/Components/Common/FlashMessage";
import DeleteConfirmation from "@/Components/Common/DeleteConfirmation";
import FormInput from "@/Components/Common/FormInput";
import { formatPeso } from "@/Utils/currency";

export default function JobTypes({
    user = {},
    notifications = [],
    messages = [],
    jobTypes = { data: [] },
    categories = [],
    allcategories = [],
    filters = {},
}) {
    const { flash } = usePage().props;
    const [activeTab, setActiveTab] = useState("job_type");
    
    // Modal states
    const [openJobTypeModal, setJobTypeModalOpen] = useState(false);
    const [openCategoryModal, setCategoryModalOpen] = useState(false);
    const [openDeleteModal, setDeleteModalOpen] = useState(false);
    
    // Edit states
    const [editingJobType, setEditingJobType] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);
    
    // Delete state
    const [deleteConfig, setDeleteConfig] = useState({ id: null, type: null });
    const [loading, setLoading] = useState(false);

    const tabs = [
        { key: "job_type", label: "Job Types" },
        { key: "category", label: "Category" },
    ];

    // Modal Handlers
    const handleOpenJobTypeModal = (jobType = null) => {
        setEditingJobType(jobType);
        setJobTypeModalOpen(true);
    };

    const handleOpenCategoryModal = (category = null) => {
        setEditingCategory(category);
        setCategoryModalOpen(true);
    };

    const handleCloseModals = () => {
        setDeleteModalOpen(false);
        setJobTypeModalOpen(false);
        setCategoryModalOpen(false);
        setEditingJobType(null);
        setEditingCategory(null);
        setDeleteConfig({ id: null, type: null });
    };

    // Submit Handlers
    const handleJobTypeSubmit = (data) => {
        const url = editingJobType 
            ? `/job-types/${editingJobType.id}` 
            : "/job-types";
        const method = editingJobType ? "put" : "post";

        router[method](url, data, {
            onSuccess: handleCloseModals,
            preserveState: false,
            preserveScroll: true,
        });
    };

    const handleCategorySubmit = (data) => {
        const url = editingCategory 
            ? `/job-categories/${editingCategory.id}` 
            : "/job-categories";
        const method = editingCategory ? "put" : "post";

        router[method](url, data, {
            onSuccess: handleCloseModals,
            preserveState: false,
            preserveScroll: true,
        });
    };

    // Delete Handlers
    const handleOpenDeleteModal = (id, type) => {
        setDeleteConfig({ id, type });
        setDeleteModalOpen(true);
    };

    const handleDelete = () => {
        if (!deleteConfig.id) return;

        const url = deleteConfig.type === "category" 
            ? `/job-categories/${deleteConfig.id}` 
            : `/job-types/${deleteConfig.id}`;

        router.delete(url, {
            preserveScroll: true,
            preserveState: false,
            onBefore: () => setLoading(true),
            onSuccess: handleCloseModals,
            onError: () => setLoading(false),
            onFinish: () => setLoading(false),
        });
    };

    // Filter Handler
    const handleCategoryFilter = (e) => {
        const categoryId = e.target.value;
        router.get(
            "/job-types",
            { ...filters, category_id: categoryId || null },
            { preserveState: false, preserveScroll: true }
        );
    };

    // Table Columns
    const jobTypeColumns = [
        {
            label: "#",
            key: "index",
            render: (row, index) => {
                const { current_page = 1, per_page = 10 } = jobTypes;
                return (current_page - 1) * per_page + index + 1;
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
                if (row.price_tiers?.length > 0) {
                    return <div className="badge badge-info">Tiered by Qty</div>;
                }
                if (row.size_rates?.length > 0) {
                    return <div className="badge badge-primary">Size-Based</div>;
                }
                return `${ formatPeso(parseFloat(row.price).toFixed(2))} / ${row.price_by}`;
            },
        },
        {
            label: "Discount",
            key: "discount",
            render: (row) => (row.discount ? `${row.discount}%` : "N/A"),
        },
        {
            label: "Status",
            key: "is_active",
            render: (row) => (
                <span className={row.is_active ? "text-success" : "text-danger"}>
                    {row.is_active ? "Active" : "Inactive"}
                </span>
            ),
        },
    ];

    const categoryColumns = [
        {
            label: "#",
            key: "index",
            render: (row, index) => {
                const { current_page = 1, per_page = 10 } = categories;
                return (current_page - 1) * per_page + index + 1;
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
            render: (row) => row.created_at 
                ? new Date(row.created_at).toLocaleDateString() 
                : "N/A",
        },
    ];

    // Render Functions
    const renderJobTypesTab = () => (
        <div className="card">
            <div className="card-title">
                <div className="row mt-4 align-items-center">
                    <div className="col-md-3">
                        <SearchBox
                            placeholder="Search job types..."
                            initialValue={filters.search || ""}
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
                                ...allcategories.map((cat) => ({
                                    value: cat.id.toString(),
                                    label: cat.name,
                                })),
                            ]}
                        />
                    </div>
                    <div className="col-md-6 d-flex justify-content-end">
                        <button
                            type="button"
                            onClick={() => router.replace("/job-types")}
                            className="px-3 mr-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-600 hover:text-white focus:outline-none transition"
                        >
                            <i className="ti-reload"></i>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleOpenJobTypeModal()}
                            className="px-3 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                        >
                            <i className="ti-plus"></i> Add Job Type
                        </button>
                    </div>
                </div>
            </div>
            <div className="card-body">
                <DataTable
                    columns={jobTypeColumns}
                    data={jobTypes.data}
                    pagination={jobTypes}
                    onEdit={handleOpenJobTypeModal}
                    onDelete={(id) => handleOpenDeleteModal(id, "job_type")}
                    emptyMessage="No job types found."
                />
            </div>
        </div>
    );

    const renderCategoriesTab = () => (
        <div className="card">
            <div className="card-title">
                <div className="row mt-4 align-items-center">
                    <div className="col-md-5">
                        <SearchBox
                            placeholder="Search categories..."
                            initialValue={filters.search || ""}
                            route="/job-categories"
                        />
                    </div>
                    <div className="col-md-7 d-flex justify-content-end">
                        <button
                            type="button"
                            onClick={() => router.replace("/job-types")}
                            className="px-3 mr-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-600 hover:text-white focus:outline-none transition"
                        >
                            <i className="ti-reload"></i>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleOpenCategoryModal()}
                            className="px-3 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                        >
                            <i className="ti-plus"></i> Add Category
                        </button>
                    </div>
                </div>
            </div>
            <div className="card-body">
                <DataTable
                    columns={categoryColumns}
                    data={categories.data}
                    pagination={categories}
                    onEdit={handleOpenCategoryModal}
                    onDelete={(id) => handleOpenDeleteModal(id, "category")}
                    emptyMessage="No categories found."
                />
            </div>
        </div>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case "job_type":
                return renderJobTypesTab();
            case "category":
                return renderCategoriesTab();
            default:
                return null;
        }
    };

    return (
        <AdminLayout user={user} notifications={notifications} messages={messages}>
            <Head title="Job Types & Pricing" />
            
            {/* Flash Messages */}
            {flash?.success && <FlashMessage type="success" message={flash.success} />}
            {flash?.error && <FlashMessage type="error" message={flash.error} />}

            {/* Page Header */}
            <div className="row">
                <div className="col-lg-8 p-r-0 title-margin-right">
                    <div className="page-header">
                        <div className="page-title">
                            <h1>Job Types & Pricing <span>Management</span></h1>
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
                                <li className="breadcrumb-item active">Job Types & Pricing</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <Modal
                title={`Delete ${deleteConfig.type === "category" ? "Category" : "Job Type"}`}
                isOpen={openDeleteModal}
                onClose={handleCloseModals}
                size="md"
                submitButtonText={null}
            >
                <DeleteConfirmation
                    label={deleteConfig.type === "category" ? "category" : "job type"}
                    loading={loading}
                    onSubmit={handleDelete}
                    onCancel={handleCloseModals}
                />
            </Modal>

            {/* Job Type Modal */}
            <Modal
                title={editingJobType ? "Edit Job Type" : "Add Job Type"}
                isOpen={openJobTypeModal}
                onClose={handleCloseModals}
                size="4xl"
                submitButtonText={null}
            >
                <JobTypeForm
                    jobType={editingJobType}
                    allcategories={allcategories}
                    onSubmit={handleJobTypeSubmit}
                    onCancel={handleCloseModals}
                />
            </Modal>

            {/* Category Modal */}
            <Modal
                title={editingCategory ? "Edit Category" : "Add Category"}
                isOpen={openCategoryModal}
                onClose={handleCloseModals}
                size="md"
                submitButtonText={null}
            >
                <JobCategoryForm
                    category={editingCategory}
                    onSubmit={handleCategorySubmit}
                    onCancel={handleCloseModals}
                />
            </Modal>

            {/* Main Content */}
            <section id="main-content">
                <div className="content-wrap">
                    <div className="main">
                        <div className="container-fluid">
                            <div className="row">
                                <div className="col-lg-12">
                                    {/* Tab Controls */}
                                    <div className="card">
                                        <div className="card-body">
                                            <div className="tabs">
                                                <div className="tab-control">
                                                    {tabs.map((tab) => (
                                                        <button
                                                            key={tab.key}
                                                            className={`btn btn-sm m-r-3 ${
                                                                activeTab === tab.key
                                                                    ? "btn-primary"
                                                                    : "btn-light"
                                                            }`}
                                                            onClick={() => setActiveTab(tab.key)}
                                                        >
                                                            {tab.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tab Content */}
                                    <div className="m-t-10">{renderTabContent()}</div>
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