import React, { useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Footer from "@/Components/Layouts/Footer";
import Modal from "@/Components/Main/Modal";
import DataTable from "@/Components/Common/DataTable";
import SearchBox from "@/Components/Common/SearchBox";
import FlashMessage from "@/Components/Common/FlashMessage";
import DeleteConfirmation from "@/Components/Common/DeleteConfirmation";
import FormInput from "@/Components/Common/FormInput";

export default function InventoryIndex({
    user = {},
    notifications = [],
    messages = [],
    stockItems = { data: [] },
    categories = [],
    lowStockCount = 0,
    filters = {},
}) {
    const [openStockModal, setStockModalOpen] = useState(false);
    const [openAdjustModal, setAdjustModalOpen] = useState(false);
    const [openDeleteModal, setDeleteModalOpen] = useState(false);
    const [editingStockItem, setEditingStockItem] = useState(null);
    const [selectedStockItem, setSelectedStockItem] = useState(null);
    const [selectedID, setSelectedID] = useState(null);
    const [loading, setLoading] = useState(false);
    const [adjustQuantity, setAdjustQuantity] = useState(0);
    const [adjustNotes, setAdjustNotes] = useState("");
    const { flash } = usePage().props;

    const handleOpenModal = (stockItem = null) => {
        setEditingStockItem(stockItem);
        setStockModalOpen(true);
    };

    const handleCloseModal = () => {
        setStockModalOpen(false);
        setAdjustModalOpen(false);
        setDeleteModalOpen(false);
        setEditingStockItem(null);
        setSelectedStockItem(null);
        setAdjustQuantity(0);
        setAdjustNotes("");
    };

    const handleOpenAdjustModal = (stockItem) => {
        setSelectedStockItem(stockItem);
        setAdjustModalOpen(true);
    };

    const handleStockItemSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        // Convert boolean and numeric fields
        data.is_active = data.is_active === 'on' || data.is_active === true;
        data.current_stock = parseFloat(data.current_stock) || 0;
        data.minimum_stock_level = parseFloat(data.minimum_stock_level) || 0;
        data.maximum_stock_level = parseFloat(data.maximum_stock_level) || 0;
        data.unit_cost = parseFloat(data.unit_cost) || 0;

        if (editingStockItem) {
            router.put(`/inventory/${editingStockItem.id}`, data, {
                onSuccess: () => {
                    handleCloseModal();
                },
                preserveState: false,
                preserveScroll: true,
            });
        } else {
            router.post("/inventory", data, {
                onSuccess: () => {
                    handleCloseModal();
                },
                preserveState: false,
                preserveScroll: true,
            });
        }
    };

    const handleAdjustStock = (e) => {
        e.preventDefault();
        if (!selectedStockItem) return;

        router.post(`/inventory/${selectedStockItem.id}/adjust`, {
            quantity: parseFloat(adjustQuantity),
            notes: adjustNotes,
        }, {
            onSuccess: () => {
                handleCloseModal();
            },
            preserveState: false,
            preserveScroll: true,
        });
    };

    const handleDelete = (stockItemId) => {
        setSelectedID(stockItemId);
        setDeleteModalOpen(true);
    };

    const handleDeleteStockItem = () => {
        if (!selectedID) return;
        router.delete(`/inventory/${selectedID}`, {
            preserveScroll: true,
            preserveState: false,
            onBefore: () => setLoading(true),
            onSuccess: () => {
                handleCloseModal();
                setLoading(false);
            },
            onError: () => setLoading(false),
            onFinish: () => setLoading(false),
        });
    };

    const getStockStatusBadge = (stockItem) => {
        if (stockItem.current_stock <= 0) {
            return <div className="badge badge-danger">Out of Stock</div>;
        } else if (stockItem.current_stock <= stockItem.minimum_stock_level) {
            return <div className="badge badge-warning">Low Stock</div>;
        }
        return <div className="badge badge-success">In Stock</div>;
    };

    const stockItemColumns = [
        {
            label: "#",
            key: "index",
            render: (row, index) =>
                (stockItems.current_page - 1) * stockItems.per_page + index + 1,
        },
        { label: "SKU", key: "sku" },
        { label: "Name", key: "name" },
        { label: "Category", key: "category" },
        {
            label: "Current Stock",
            key: "current_stock",
            render: (row) => (
                <div>
                    {parseFloat(row.current_stock).toFixed(2)} {row.base_unit_of_measure}
                </div>
            ),
        },
        {
            label: "Min Level",
            key: "minimum_stock_level",
            render: (row) => (
                <div>{parseFloat(row.minimum_stock_level).toFixed(2)} {row.base_unit_of_measure}</div>
            ),
        },
        {
            label: "Unit Cost",
            key: "unit_cost",
            render: (row) => `$${parseFloat(row.unit_cost).toFixed(2)}`,
        },
        {
            label: "Status",
            key: "status",
            render: (row) => getStockStatusBadge(row),
        },
        {
            label: "Actions",
            key: "actions",
            render: (row) => (
                <div className="btn-group">
                    <button
                        type="button"
                        className="btn btn-link btn-sm text-blue-500"
                        onClick={() => router.get(`/inventory/${row.id}/movements`)}
                    >
                        <i className="ti-eye"></i> Movements
                    </button>
                    <button
                        type="button"
                        className="btn btn-link btn-sm text-warning"
                        onClick={() => handleOpenAdjustModal(row)}
                    >
                        <i className="ti-pencil"></i> Adjust
                    </button>
                    <button
                        type="button"
                        className="btn btn-link btn-sm text-primary"
                        onClick={() => handleOpenModal(row)}
                    >
                        <i className="ti-pencil"></i> Edit
                    </button>
                    <button
                        type="button"
                        className="btn btn-link btn-sm text-danger"
                        onClick={() => handleDelete(row.id)}
                    >
                        <i className="ti-trash"></i> Delete
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AdminLayout user={user} notifications={notifications} messages={messages}>
            <Head title="Inventory Management" />

            {flash?.success && <FlashMessage type="success" message={flash.success} />}
            {flash?.error && <FlashMessage type="error" message={flash.error} />}

            <div className="row">
                <div className="col-lg-8 p-r-0 title-margin-right">
                    <div className="page-header">
                        <div className="page-title">
                            <h1>
                                Inventory <span>Management</span>
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
                                <li className="breadcrumb-item active">Inventory</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stock Item Modal */}
            <Modal
                title={editingStockItem ? "Edit Stock Item" : "Add Stock Item"}
                isOpen={openStockModal}
                onClose={handleCloseModal}
                size="4xl"
            >
                <form onSubmit={handleStockItemSubmit}>
                    <div className="row">
                        <div className="col-md-6">
                            <FormInput
                                label="SKU"
                                type="text"
                                name="sku"
                                defaultValue={editingStockItem?.sku}
                                required
                                disabled={!!editingStockItem}
                            />
                        </div>
                        <div className="col-md-6">
                            <FormInput
                                label="Name"
                                type="text"
                                name="name"
                                defaultValue={editingStockItem?.name}
                                required
                            />
                        </div>
                        <div className="col-md-12">
                            <FormInput
                                label="Description"
                                type="textarea"
                                name="description"
                                defaultValue={editingStockItem?.description}
                            />
                        </div>
                        <div className="col-md-6">
                            <FormInput
                                label="Category"
                                type="text"
                                name="category"
                                defaultValue={editingStockItem?.category}
                                placeholder="e.g., Paper, Ink, Binding"
                            />
                        </div>
                        <div className="col-md-6">
                            <FormInput
                                label="Base Unit of Measure"
                                type="text"
                                name="base_unit_of_measure"
                                defaultValue={editingStockItem?.base_unit_of_measure || "pcs"}
                                required
                                placeholder="pcs, kg, liter, roll, sheet"
                            />
                        </div>
                        {!editingStockItem && (
                            <div className="col-md-6">
                                <FormInput
                                    label="Initial Stock"
                                    type="number"
                                    name="current_stock"
                                    defaultValue={editingStockItem?.current_stock || 0}
                                    step="0.01"
                                    min="0"
                                />
                            </div>
                        )}
                        <div className="col-md-6">
                            <FormInput
                                label="Minimum Stock Level"
                                type="number"
                                name="minimum_stock_level"
                                defaultValue={editingStockItem?.minimum_stock_level || 0}
                                step="0.01"
                                min="0"
                            />
                        </div>
                        <div className="col-md-6">
                            <FormInput
                                label="Maximum Stock Level"
                                type="number"
                                name="maximum_stock_level"
                                defaultValue={editingStockItem?.maximum_stock_level || 0}
                                step="0.01"
                                min="0"
                            />
                        </div>
                        <div className="col-md-6">
                            <FormInput
                                label="Unit Cost"
                                type="number"
                                name="unit_cost"
                                defaultValue={editingStockItem?.unit_cost || 0}
                                step="0.01"
                                min="0"
                            />
                        </div>
                        <div className="col-md-6">
                            <FormInput
                                label="Supplier"
                                type="text"
                                name="supplier"
                                defaultValue={editingStockItem?.supplier}
                            />
                        </div>
                        <div className="col-md-6">
                            <FormInput
                                label="Location"
                                type="text"
                                name="location"
                                defaultValue={editingStockItem?.location}
                            />
                        </div>
                        <div className="col-md-6">
                            <FormInput
                                label="Active"
                                type="checkbox"
                                name="is_active"
                                defaultChecked={editingStockItem?.is_active !== false}
                            />
                        </div>
                    </div>
                    <div className="d-flex justify-content-end gap-2 mt-3">
                        <button type="submit" className="btn btn-primary">
                            <i className="ti-save"></i> {editingStockItem ? "Update" : "Create"}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                            Cancel
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Adjust Stock Modal */}
            <Modal
                title={`Adjust Stock - ${selectedStockItem?.name}`}
                isOpen={openAdjustModal}
                onClose={handleCloseModal}
                size="lg"
            >
                {selectedStockItem && (
                    <form onSubmit={handleAdjustStock}>
                        <div className="mb-3">
                            <p><strong>Current Stock:</strong> {selectedStockItem.current_stock} {selectedStockItem.base_unit_of_measure}</p>
                        </div>
                        <FormInput
                            label="Adjustment Quantity"
                            type="number"
                            name="quantity"
                            value={adjustQuantity}
                            onChange={(e) => setAdjustQuantity(e.target.value)}
                            step="0.01"
                            required
                            placeholder="Positive for increase, negative for decrease"
                        />
                        <FormInput
                            label="Notes"
                            type="textarea"
                            name="notes"
                            value={adjustNotes}
                            onChange={(e) => setAdjustNotes(e.target.value)}
                        />
                        <div className="d-flex justify-content-end gap-2 mt-3">
                            <button type="submit" className="btn btn-primary">
                                <i className="ti-save"></i> Adjust Stock
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            <Modal
                title={"Delete Customer"}
                isOpen={openDeleteModal}
                onClose={handleCloseModal}
                size="md"
                submitButtonText={null}
            >
               <DeleteConfirmation
                isOpen={openDeleteModal}
                onClose={handleCloseModal}
                onConfirm={handleDeleteStockItem}
                loading={loading}
                title="Delete Stock Item"
                message="Are you sure you want to delete this stock item? This action cannot be undone."
            />
            </Modal>

            

            <section id="main-content">
                <div className="content-wrap">
                    <div className="main">
                        <div className="container-fluid">
                            <div className="row">
                                <div className="col-lg-12">
                                    <div className="card">
                                        <div className="card-title mt-3 d-flex justify-content-between align-items-center">
                                            <h4>Stock Items</h4>
                                            <div>
                                                {lowStockCount > 0 && (
                                                    <a
                                                        href="/inventory/low-stock"
                                                        className="btn btn-warning btn-sm mr-2"
                                                    >
                                                        <i className="ti-alert"></i> Low Stock ({lowStockCount})
                                                    </a>
                                                )}
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => handleOpenModal()}
                                                >
                                                    <i className="ti-plus"></i> Add Stock Item
                                                </button>
                                            </div>
                                        </div>
                                        <div className="card-body">
                                            <div className="row mt-4 align-items-center">
                                                <div className="col-md-4">
                                                    <SearchBox
                                                        placeholder="Search by SKU, name, or category..."
                                                        initialValue={filters.search || ""}
                                                        route="/inventory"
                                                    />
                                                </div>
                                                <div className="col-md-3">
                                                    <FormInput
                                                        label=""
                                                        type="select"
                                                        name="category"
                                                        value={filters.category || ""}
                                                        onChange={(e) => {
                                                            router.get("/inventory", {
                                                                ...filters,
                                                                category: e.target.value || null,
                                                            }, {
                                                                preserveState: false,
                                                                preserveScroll: true,
                                                            });
                                                        }}
                                                        options={[
                                                            { value: "", label: "All Categories" },
                                                            ...categories.map((cat) => ({
                                                                value: cat,
                                                                label: cat,
                                                            })),
                                                        ]}
                                                    />
                                                </div>
                                                <div className="col-md-3">
                                                    <FormInput
                                                        label=""
                                                        type="select"
                                                        name="stock_status"
                                                        value={filters.stock_status || ""}
                                                        onChange={(e) => {
                                                            router.get("/inventory", {
                                                                ...filters,
                                                                stock_status: e.target.value || null,
                                                            }, {
                                                                preserveState: false,
                                                                preserveScroll: true,
                                                            });
                                                        }}
                                                        options={[
                                                            { value: "", label: "All Status" },
                                                            { value: "low", label: "Low Stock" },
                                                            { value: "out", label: "Out of Stock" },
                                                        ]}
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-4">
                                                <DataTable
                                                    columns={stockItemColumns}
                                                    data={stockItems.data}
                                                    pagination={stockItems}
                                                    emptyMessage="No stock items found."
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

