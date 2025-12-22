import React, { useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Modal from "@/Components/Main/Modal";
import DataTable from "@/Components/Common/DataTable";
import SearchBox from "@/Components/Common/SearchBox";
import FlashMessage from "@/Components/Common/FlashMessage";
import DeleteConfirmation from "@/Components/Common/DeleteConfirmation";
import FormInput from "@/Components/Common/FormInput";
import { formatPeso } from "@/Utils/currency";
import { useRoleApi } from "@/Hooks/useRoleApi";

export default function InventoryIndex({
    user = {},
    notifications = [],
    messages = [],
    stockItems = { data: [] },
    jobTypes = [],
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
    const [submitting, setSubmitting] = useState(false);
    const [adjustQuantity, setAdjustQuantity] = useState(0);
    const [adjustNotes, setAdjustNotes] = useState("");
    const [isAreaBased, setIsAreaBased] = useState(false);
    const { flash, auth, errors } = usePage().props;

    const isAdmin = auth?.user?.role === "admin";
    const { buildUrl } = useRoleApi();
    const handleOpenModal = (stockItem = null) => {
        setEditingStockItem(stockItem);
        setIsAreaBased(stockItem?.is_area_based || false);
        setStockModalOpen(true);
    };
    const hasPermission = (module, feature) => {
        if (auth.user.role === 'admin') return true;
        return auth.user.permissions && auth.user.permissions.includes(`${module}.${feature}`);
    };

    const handleCloseModal = () => {
        setStockModalOpen(false);
        setAdjustModalOpen(false);
        setDeleteModalOpen(false);
        setEditingStockItem(null);
        setSelectedStockItem(null);
        setAdjustQuantity(0);
        setAdjustNotes("");
        setIsAreaBased(false);
        setSubmitting(false);
        setLoading(false);
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
        data.is_active = data.is_active === "on" || data.is_active === true;
        data.is_area_based =
            data.is_area_based === "on" ||
            data.is_area_based === true ||
            isAreaBased;
        data.job_type_id = parseInt(data.job_type_id);
        data.current_stock = parseFloat(data.current_stock) || 0;
        data.minimum_stock_level = parseFloat(data.minimum_stock_level) || 0;
        data.maximum_stock_level = parseFloat(data.maximum_stock_level) || 0;
        data.unit_cost = parseFloat(data.unit_cost) || 0;

        // Handle area-based fields
        if (data.is_area_based) {
            data.length = parseFloat(data.length) || 0;
            data.width = parseFloat(data.width) || 0;
        } else {
            data.length = null;
            data.width = null;
        }



        if (editingStockItem) {

            router.put(buildUrl(`/inventory/${editingStockItem.id}`), data, {
                onBefore: () => setSubmitting(true),
                onSuccess: () => {
                    handleCloseModal();
                },
                onError: (errors) => {
                    setSubmitting(false);
                },
                onFinish: () => setSubmitting(false),
                preserveState: true, // Keep state so errors remain in modal
                preserveScroll: true,
            });
        } else {
            router.post(buildUrl("/inventory"), data, {
                onBefore: () => setSubmitting(true),
                onSuccess: () => {
                    handleCloseModal();
                },
                onError: (errors) => {
                    setSubmitting(false);
                },
                onFinish: () => setSubmitting(false),
                preserveState: true, // Keep state so errors remain in modal
                preserveScroll: true,
            });
        }
    };

    const handleAdjustStock = (e) => {
        e.preventDefault();
        if (!selectedStockItem) return;

        router.post(
            buildUrl(`/inventory/${selectedStockItem.id}/adjust`),
            {
                quantity: parseFloat(adjustQuantity),
                notes: adjustNotes,
            },
            {
                onBefore: () => setSubmitting(true),
                onSuccess: () => {
                    handleCloseModal();
                },
                onError: () => setSubmitting(false),
                onFinish: () => setSubmitting(false),
                preserveState: false,
                preserveScroll: true,
            }
        );
    };

    const handleDelete = (stockItemId) => {
        setSelectedID(stockItemId);
        setDeleteModalOpen(true);
    };

    const handleDeleteStockItem = () => {
        if (!selectedID) return;
        router.delete(buildUrl(`/inventory/${selectedID}`), {
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
        if (parseFloat(stockItem.current_stock) <= 0) {
            return <div className="badge badge-danger">Out of Stock</div>;
        } else if (parseFloat(stockItem.current_stock) <= parseFloat(stockItem.minimum_stock_level)) {
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
        {
            label: "Job Type",
            key: "job_type",
            render: (row) => row.job_type?.name || "N/A",
        },
        {
            label: "Dimensions",
            key: "dimensions",
            render: (row) => {
                if (row.is_area_based && row.length && row.width) {
                    return `${parseFloat(row.length).toFixed(2)} x ${parseFloat(
                        row.width
                    ).toFixed(2)} ${row.base_unit_of_measure}`;
                }
                return "-";
            },
        },
        {
            label: "Current Stock",
            key: "current_stock",
            render: (row) => (
                <div>
                    <strong>{parseFloat(row.current_stock).toFixed(2)}</strong>{" "}
                    {row.base_unit_of_measure}
                    {row.is_area_based && row.length && row.width && (
                        <div className="text-xs text-muted mt-1">
                            Area:{" "}
                            {(
                                parseFloat(row.length) * parseFloat(row.width)
                            ).toFixed(2)}{" "}
                            {row.base_unit_of_measure}² per piece
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Consumption",
            key: "consumption",
            render: (row) => {
                if (row.is_area_based && row.length && row.width) {
                    const stockArea =
                        parseFloat(row.length) * parseFloat(row.width);
                    return (
                        <div className="text-xs">
                            <div>
                                <strong>Stock Area:</strong>{" "}
                                {stockArea.toFixed(2)}{" "}
                                {row.base_unit_of_measure}²
                            </div>
                            <div className="text-muted mt-1">
                                <small>
                                    Consumption: Calculated by production area
                                </small>
                            </div>
                            <div className="text-muted">
                                <small>
                                    Formula: ceil(prod_area / stock_area) × qty
                                </small>
                            </div>
                        </div>
                    );
                }
                return (
                    <div className="text-xs text-muted">
                        <div>Standard: 1 piece per unit</div>
                        {row.production_consumptions &&
                            row.production_consumptions.length > 0 && (
                                <div className="mt-1">
                                    <small>
                                        Recent:{" "}
                                        {row.production_consumptions.length}{" "}
                                        consumption(s)
                                    </small>
                                </div>
                            )}
                    </div>
                );
            },
        },
        {
            label: "Min Level",
            key: "minimum_stock_level",
            adminOnly: true,
            render: (row) => (
                <div>
                    {parseFloat(row.minimum_stock_level).toFixed(2)}{" "}
                    {row.base_unit_of_measure}
                </div>
            ),
        },
        {
            label: "Unit Cost",
            key: "unit_cost",
            adminOnly: true,
            render: (row) => `${formatPeso(parseFloat(row.unit_cost).toFixed(2))}`,
        },
        {
            label: "Status",
            key: "status",
            render: (row) => getStockStatusBadge(row),
        },
        {
            label: "Actions",
            key: "actions",
            adminOnly: true,
            render: (row) => (
                <div className="btn-group">
                    <button
                        type="button"
                        className="btn btn-link btn-sm text-orange-500"
                        onClick={() =>
                            router.get(buildUrl(`/inventory/${row.id}/movements`))
                        }
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
    ].filter((col) => !col.adminOnly || isAdmin);

    return (
        <AdminLayout
            user={user}
            notifications={notifications}
            messages={messages}
        >
            <Head title="Inventory Management" />

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
                                <li className="breadcrumb-item active">
                                    Inventory
                                </li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stock Item Modal */}
            <Modal
                key={editingStockItem?.id || 'new-stock-item'}
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
                                error={errors?.sku}
                            />
                        </div>
                        <div className="col-md-6">
                            <FormInput
                                label="Name"
                                type="text"
                                name="name"
                                defaultValue={editingStockItem?.name}
                                required
                                error={errors?.name}
                            />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-10">
                            <FormInput
                                label="Description (Optional)"
                                type="textarea"
                                rows={2}
                                name="description"
                                defaultValue={editingStockItem?.description}
                                error={errors?.description}
                            />
                        </div>
                        <div className="col-md-2">
                            <FormInput
                                label="Active"
                                type="checkbox"
                                name="is_active"
                                defaultChecked={
                                    editingStockItem?.is_active !== false
                                }
                            />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-6">
                            <FormInput
                                label="Job Type"
                                type="select"
                                name="job_type_id"
                                defaultValue={editingStockItem?.job_type_id}
                                required
                                error={errors?.job_type_id}
                                options={[
                                    { value: "", label: "Select Job Type" },
                                    ...jobTypes.map((jt) => ({
                                        value: jt.id,
                                        label: jt.name,
                                    })),
                                ]}
                            />
                        </div>
                        <div className="col-md-3">
                            <FormInput
                                label="Base Unit of Measure"
                                type="text"
                                name="base_unit_of_measure"
                                defaultValue={
                                    editingStockItem?.base_unit_of_measure ||
                                    ""
                                }
                                required
                                placeholder="pcs, kg, liter, roll, sheet, sqm"
                                error={errors?.base_unit_of_measure}
                            />
                        </div>
                        <div className="col-md-3">
                            <FormInput
                                label="Unit Cost"
                                type="number"
                                name="unit_cost"
                                defaultValue={editingStockItem?.unit_cost || 0}
                                step="0.01"
                                min="0"
                                error={errors?.unit_cost}
                            />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-6">
                            <div className="mb-4">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        name="is_area_based"
                                        id="is_area_based"
                                        checked={isAreaBased}
                                        onChange={(e) => {
                                            setIsAreaBased(e.target.checked);
                                        }}
                                        className="h-4 w-4 text-orange-600 border-gray-300 rounded"
                                    />
                                    <label
                                        htmlFor="is_area_based"
                                        className="text-sm font-medium text-gray-700"
                                    >
                                        Area Based Material
                                    </label>
                                </div>
                                <small className="text-muted d-block mt-1">
                                    Check if this material is cut by area
                                    (tarpaulin, fabric, etc.)
                                </small>
                            </div>
                        </div>
                        {isAreaBased && (
                            <>
                                <div className="col-md-3">
                                    <FormInput
                                        label="Length"
                                        type="number"
                                        name="length"
                                        defaultValue={
                                            editingStockItem?.length || 0
                                        }
                                        step="0.01"
                                        min="0"
                                        required
                                        placeholder="Length in base unit"
                                        error={errors?.length}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <FormInput
                                        label="Width"
                                        type="number"
                                        name="width"
                                        defaultValue={
                                            editingStockItem?.width || 0
                                        }
                                        step="0.01"
                                        min="0"
                                        required
                                        placeholder="Width in base unit"
                                        error={errors?.width}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    <div className="row">
                        {!editingStockItem && (
                            <div className="col-md-4">
                                <FormInput
                                    label="Initial Stock"
                                    type="number"
                                    name="current_stock"
                                    defaultValue={
                                        editingStockItem?.current_stock || 0
                                    }
                                    step="0.01"
                                    min="0"
                                    error={errors?.current_stock}
                                />
                            </div>
                        )}
                        <div className="col-md-4">
                            <FormInput
                                label="Minimum Stock Level"
                                type="number"
                                name="minimum_stock_level"
                                defaultValue={
                                    editingStockItem?.minimum_stock_level || 0
                                }
                                step="0.01"
                                min="0"
                                error={errors?.minimum_stock_level}
                            />
                        </div>
                        <div className="col-md-4">
                            <FormInput
                                label="Maximum Stock Level"
                                type="number"
                                name="maximum_stock_level"
                                defaultValue={
                                    editingStockItem?.maximum_stock_level || 0
                                }
                                step="0.01"
                                min="0"
                                error={errors?.maximum_stock_level}
                            />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-6">
                            <FormInput
                                label="Supplier"
                                type="text"
                                name="supplier"
                                defaultValue={editingStockItem?.supplier}
                                error={errors?.supplier}
                            />
                        </div>
                        <div className="col-md-6">
                            <FormInput
                                label="Location"
                                type="text"
                                name="location"
                                defaultValue={editingStockItem?.location}
                                error={errors?.location}
                            />
                        </div>
                    </div>
                    <div className="d-flex justify-content-end gap-2 mt-3">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <i className="fa fa-spinner fa-spin"></i>{" "}
                                    {editingStockItem ? "Updating..." : "Creating..."}
                                </>
                            ) : (
                                <>
                                    <i className="ti-save"></i>{" "}
                                    {editingStockItem ? "Update" : "Create"}
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleCloseModal}
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Adjust Stock Modal */}
            <Modal
                key={selectedStockItem?.id || 'adjust-stock'}
                title={`Adjust Stock - ${selectedStockItem?.name}`}
                isOpen={openAdjustModal}
                onClose={handleCloseModal}
                size="lg"
            >
                {selectedStockItem && (
                    <form onSubmit={handleAdjustStock}>
                        <div className="mb-3">
                            <p>
                                <strong>Current Stock:</strong>{" "}
                                {selectedStockItem.current_stock}{" "}
                                {selectedStockItem.base_unit_of_measure}
                            </p>
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
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <i className="fa fa-spinner fa-spin"></i> Adjusting...
                                    </>
                                ) : (
                                    <>
                                        <i className="ti-save"></i> Adjust Stock
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleCloseModal}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            <Modal
                title={"Delete Stock"}
                isOpen={openDeleteModal}
                onClose={handleCloseModal}
                size="md"
                submitButtonText={null}
            >
                <DeleteConfirmation
                    label="stock"
                    loading={loading}
                    onSubmit={handleDeleteStockItem}
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
                                        <div className="card-title mt-3 d-flex justify-content-between align-items-center">
                                            <h4>Stock Items</h4>
                                            <div>
                                                {lowStockCount > 0 && (
                                                    <a
                                                        href="/inventory/low-stock"
                                                        className="btn btn-warning btn-sm mr-2"
                                                    >
                                                        <i className="ti-alert"></i>{" "}
                                                        Low Stock (
                                                        {lowStockCount})
                                                    </a>
                                                )}
                                                {isAdmin && (
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() =>
                                                            handleOpenModal()
                                                        }
                                                    >
                                                        <i className="ti-plus"></i>{" "}
                                                        Add Stock Item
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="card-body">
                                            <div className="row mt-4 align-items-center">
                                                <div className="col-md-4">
                                                    <SearchBox
                                                        placeholder="Search by SKU, name, or category..."
                                                        initialValue={
                                                            filters.search || ""
                                                        }
                                                        route="/inventory"
                                                    />
                                                </div>
                                                <div className="col-md-3">
                                                    <FormInput
                                                        label=""
                                                        type="select"
                                                        name="job_type_id"
                                                        value={
                                                            filters.job_type_id ||
                                                            ""
                                                        }
                                                        onChange={(e) => {
                                                            router.get(buildUrl("/inventory"),
                                                                {
                                                                    ...filters,
                                                                    job_type_id:
                                                                        e.target
                                                                            .value ||
                                                                        null,
                                                                },
                                                                {
                                                                    preserveState: false,
                                                                    preserveScroll: true,
                                                                }
                                                            );
                                                        }}
                                                        options={[
                                                            {
                                                                value: "",
                                                                label: "All Job Types",
                                                            },
                                                            ...jobTypes.map(
                                                                (jt) => ({
                                                                    value: jt.id,
                                                                    label: jt.name,
                                                                })
                                                            ),
                                                        ]}
                                                    />
                                                </div>
                                                <div className="col-md-3">
                                                    <FormInput
                                                        label=""
                                                        type="select"
                                                        name="stock_status"
                                                        value={
                                                            filters.stock_status ||
                                                            ""
                                                        }
                                                        onChange={(e) => {
                                                            router.get(buildUrl("/inventory"),
                                                                {
                                                                    ...filters,
                                                                    stock_status:
                                                                        e.target
                                                                            .value ||
                                                                        null,
                                                                },
                                                                {
                                                                    preserveState: false,
                                                                    preserveScroll: true,
                                                                }
                                                            );
                                                        }}
                                                        options={[
                                                            {
                                                                value: "",
                                                                label: "All Status",
                                                            },
                                                            {
                                                                value: "low",
                                                                label: "Low Stock",
                                                            },
                                                            {
                                                                value: "out",
                                                                label: "Out of Stock",
                                                            },
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

        </AdminLayout>
    );
}
