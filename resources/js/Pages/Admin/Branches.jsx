import React, { useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Modal from "@/Components/Main/Modal";
import DataTable from "@/Components/Common/DataTable";
import SearchBox from "@/Components/Common/SearchBox";
import FlashMessage from "@/Components/Common/FlashMessage";
import FormInput from "@/Components/Common/FormInput";
import Confirmation from "@/Components/Common/Confirmation";

export default function Branches({
    user = {},
    notifications = [],
    messages = [],
    branches = { data: [] },
    filters = {}
}) {
    const [openModal, setOpenModal] = useState(false);
    const [openDeleteModal, setDeleteModalOpen] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        address: "",
        phone: "",
        email: "",
        can_accept_orders: true,
        can_produce: true,
        is_default_production: false,
        is_active: true,
        sort_order: 0,
        notes: "",
        facebook: "",
        business_hours: {
            monday_friday: "",
            saturday: "",
            sunday: ""
        }
    });
    const [loading, setLoading] = useState(false);
    const { flash } = usePage().props;

    const handleCreate = () => {
        setSelectedBranch(null);
        setFormData({
            name: "",
            code: "",
            address: "",
            phone: "",
            email: "",
            can_accept_orders: true,
            can_produce: true,
            is_default_production: false,
            is_active: true,
            sort_order: 0,
            notes: "",
            facebook: "",
            business_hours: {
                monday_friday: "",
                saturday: "",
                sunday: ""
            }
        });
        setOpenModal(true);
    };

    const handleEdit = (branch) => {
        setSelectedBranch(branch);
        setFormData({
            name: branch.name || "",
            code: branch.code || "",
            address: branch.address || "",
            phone: branch.phone || "",
            email: branch.email || "",
            can_accept_orders: branch.can_accept_orders ?? true,
            can_produce: branch.can_produce ?? true,
            is_default_production: branch.is_default_production ?? false,
            is_active: branch.is_active ?? true,
            sort_order: branch.sort_order || 0,
            notes: branch.notes || "",
            facebook: branch.facebook || "",
            business_hours: branch.business_hours || {
                monday_friday: "",
                saturday: "",
                sunday: ""
            }
        });
        setOpenModal(true);
    };

    const handleDelete = (branch) => {
        setSelectedBranch(branch);
        setDeleteModalOpen(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
        setDeleteModalOpen(false);
        setSelectedBranch(null);
        setLoading(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);

        const url = selectedBranch ?
            `/admin/branches/${selectedBranch.id}` :
            "/admin/branches";
        const method = selectedBranch ? "put" : "post";

        router[method](url, formData, {
            preserveScroll: true,
            onSuccess: () => {
                handleCloseModal();
            },
            onError: () => {
                setLoading(false);
            },
            onFinish: () => {
                setLoading(false);
            }
        });
    };

    const confirmDelete = () => {
        if (!selectedBranch) return;

        setLoading(true);
        router.delete(`/admin/branches/${selectedBranch.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                handleCloseModal();
            },
            onError: () => {
                setLoading(false);
            },
            onFinish: () => {
                setLoading(false);
            }
        });
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === "checkbox" ? checked : value
        });
    };

    const handleBusinessHoursChange = (day, value) => {
        setFormData({
            ...formData,
            business_hours: {
                ...formData.business_hours,
                [day]: value
            }
        });
    };


    const branchColumns = [
        {
            label: "#",
            key: "index",
            render: (row, index) =>
                (branches.current_page - 1) * branches.per_page + index + 1
        },
        { label: "Name", key: "name" },
        { label: "Code", key: "code" },
        {
            label: "Contact", key: "contact", render: (row) => (
                <div className="small">
                    {row.phone && <div><i className="fa fa-phone mr-1"></i> {row.phone}</div>}
                    {row.email && <div><i className="fa fa-envelope mr-1"></i> {row.email}</div>}
                    {row.facebook && <div><i className="fa fa-facebook mr-1"></i> {row.facebook}</div>}
                </div>
            )
        },
        { label: "Address", key: "address", render: (row) => row.address || "-" },
        {
            label: "Hours", key: "hours", render: (row) => (
                <div className="small text-muted">
                    {row.business_hours?.monday_friday && <div>M-F: {row.business_hours.monday_friday}</div>}
                    {row.business_hours?.saturday && <div>Sat: {row.business_hours.saturday}</div>}
                    {row.business_hours?.sunday && <div>Sun: {row.business_hours.sunday}</div>}
                </div>
            )
        },
        {
            label: "Capabilities",
            key: "capabilities",
            render: (row) =>
                <div>
                    {row.can_accept_orders &&
                        <span className="badge badge-info mr-1">Accept Orders</span>
                    }
                    {row.can_produce &&
                        <span className="badge badge-success mr-1">Production</span>
                    }
                    {row.is_default_production &&
                        <span className="badge badge-warning">Default Production</span>
                    }
                </div>

        },
        {
            label: "Status",
            key: "is_active",
            render: (row) =>
                <span className={`badge ${row.is_active ? "badge-success" : "badge-secondary"}`}>
                    {row.is_active ? "Active" : "Inactive"}
                </span>

        },
        {
            label: "Action",
            key: "action",
            render: (row) =>
                <div className="btn-group">
                    <button
                        type="button"
                        className="btn btn-link btn-sm text-orange-500"
                        onClick={() => handleEdit(row)}>

                        <i className="ti-pencil"></i> Edit
                    </button>
                    <button
                        type="button"
                        className="btn btn-link btn-sm text-red-500"
                        onClick={() => handleDelete(row)}>

                        <i className="ti-trash"></i> Delete
                    </button>
                </div>

        }];


    return (
        <AdminLayout
            user={user}
            notifications={notifications}
            messages={messages}>

            <Head title="Branch Management" />

            {/* Flash Messages */}
            {flash?.success &&
                <FlashMessage type="success" message={flash.success} />
            }
            {flash?.error &&
                <FlashMessage type="error" message={flash.error} />
            }

            <div className="row">
                <div className="col-lg-8 p-r-0 title-margin-right">
                    <div className="page-header">
                        <div className="page-title">
                            <h1>
                                Branch <span>Management</span>
                            </h1>
                        </div>
                    </div>
                </div>
                <div className="col-lg-4 p-l-0 title-margin-left">
                    <div className="page-header">
                        <div className="page-title">
                            <ol className="breadcrumb">
                                <li className="breadcrumb-item">
                                    <a href="/admin">Dashboard</a>
                                </li>
                                <li className="breadcrumb-item active">Branches</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create/Edit Modal */}
            <Modal
                title={selectedBranch ? "Edit Branch" : "Create New Branch"}
                isOpen={openModal}
                onClose={handleCloseModal}
                size="3xl">

                <form onSubmit={handleSubmit}>
                    <div className="row">
                        <div className="col-md-6">
                            <FormInput
                                label="Branch Name"
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g., Cebu Branch"
                                required />

                        </div>
                        <div className="col-md-6">
                            <FormInput
                                label="Branch Code"
                                type="text"
                                name="code"
                                value={formData.code}
                                onChange={handleChange}
                                placeholder="e.g., CEBU"
                                required />

                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-12">
                            <FormInput
                                label="Address"
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                placeholder="Branch address" />

                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-6">
                            <FormInput
                                label="Phone"
                                type="text"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="Contact number" />

                        </div>
                        <div className="col-md-6">
                            <FormInput
                                label="Email"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="branch@example.com" />

                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-12">
                            <h5 className="mb-3">Branch Capabilities</h5>
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-4">
                            <div className="form-check mb-3">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="can_accept_orders"
                                    name="can_accept_orders"
                                    checked={formData.can_accept_orders}
                                    onChange={handleChange} />

                                <label className="form-check-label" htmlFor="can_accept_orders">
                                    Can Accept Orders
                                </label>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="form-check mb-3">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="can_produce"
                                    name="can_produce"
                                    checked={formData.can_produce}
                                    onChange={handleChange} />

                                <label className="form-check-label" htmlFor="can_produce">
                                    Can Produce
                                </label>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="form-check mb-3">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="is_default_production"
                                    name="is_default_production"
                                    checked={formData.is_default_production}
                                    onChange={handleChange} />

                                <label className="form-check-label" htmlFor="is_default_production">
                                    Default Production Branch
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-6">
                            <div className="form-check mb-3">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="is_active"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleChange} />

                                <label className="form-check-label" htmlFor="is_active">
                                    Active
                                </label>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <FormInput
                                label="Sort Order"
                                type="number"
                                name="sort_order"
                                value={formData.sort_order}
                                onChange={handleChange}
                                placeholder="0"
                                min="0" />

                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-12">
                            <FormInput
                                label="Notes"
                                type="textarea"
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                placeholder="Additional notes about this branch"
                                rows={3} />

                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-12">
                            <FormInput
                                label="Facebook"
                                type="text"
                                name="facebook"
                                value={formData.facebook}
                                onChange={handleChange}
                                placeholder="rcprintshoppe.branch" />
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-12">
                            <h5 className="mb-3">Business Hours</h5>
                        </div>
                        <div className="col-md-4">
                            <FormInput
                                label="Monday - Friday"
                                type="text"
                                value={formData.business_hours.monday_friday}
                                onChange={(e) => handleBusinessHoursChange("monday_friday", e.target.value)}
                                placeholder="8AM - 6PM" />
                        </div>
                        <div className="col-md-4">
                            <FormInput
                                label="Saturday"
                                type="text"
                                value={formData.business_hours.saturday}
                                onChange={(e) => handleBusinessHoursChange("saturday", e.target.value)}
                                placeholder="9AM - 3PM" />
                        </div>
                        <div className="col-md-4">
                            <FormInput
                                label="Sunday"
                                type="text"
                                value={formData.business_hours.sunday}
                                onChange={(e) => handleBusinessHoursChange("sunday", e.target.value)}
                                placeholder="Closed" />
                        </div>
                    </div>

                    <div className="d-flex justify-content-end gap-2 mt-4">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleCloseModal}>

                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}>

                            {loading ? "Saving..." : selectedBranch ? "Update" : "Create"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                title="Delete Branch"
                isOpen={openDeleteModal}
                onClose={handleCloseModal}
                size="md">

                <Confirmation
                    description={`Are you sure you want to delete "${selectedBranch?.name}"?`}
                    subtitle="This action cannot be undone."
                    label="Delete"
                    cancelLabel="Cancel"
                    onCancel={handleCloseModal}
                    onSubmit={confirmDelete}
                    loading={loading}
                    color="danger"
                    showIcon={true} />

            </Modal>

            <section id="main-content">
                <div className="content-wrap">
                    <div className="main">
                        <div className="container-fluid">
                            <div className="row">
                                <div className="col-lg-12">
                                    <div className="card">
                                        <div className="card-title mt-3">
                                            <h4>Branches</h4>
                                        </div>
                                        <div className="card-body">
                                            <div className="row mt-4 align-items-center">
                                                <div className="col-md-8">
                                                    <SearchBox
                                                        placeholder="Search branches..."
                                                        initialValue={filters.search || ""}
                                                        route="/admin/branches" />

                                                </div>
                                                <div className="col-md-4 text-right">
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary"
                                                        onClick={handleCreate}>

                                                        <i className="ti-plus"></i> Add Branch
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-4">
                                                <DataTable
                                                    columns={branchColumns}
                                                    data={branches.data}
                                                    pagination={branches}
                                                    emptyMessage="No branches found." />

                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </AdminLayout>);

}