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
  filters = {}
}) {
  const [openStockModal, setStockModalOpen] = useState(false);
  const [openAdjustModal, setAdjustModalOpen] = useState(false);
  const [openDeleteModal, setDeleteModalOpen] = useState(false);
  const [openReportModal, setReportModalOpen] = useState(false);
  const [editingStockItem, setEditingStockItem] = useState(null);
  const [selectedStockItem, setSelectedStockItem] = useState(null);
  const [selectedID, setSelectedID] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [adjustQuantity, setAdjustQuantity] = useState(0);
  const [adjustNotes, setAdjustNotes] = useState("");
  const [isAreaBased, setIsAreaBased] = useState(false);
  const [isGarment, setIsGarment] = useState(false);
  const [selectedJobTypes, setSelectedJobTypes] = useState([]);
  const { flash, auth, errors } = usePage().props;
  const [isRefreshing, setIsRefreshing] = useState(false);
  

  const isAdmin = auth?.user?.role === "admin";
  const { buildUrl } = useRoleApi();
  const handleOpenModal = (stockItem = null) => {
    setEditingStockItem(stockItem);
    setIsAreaBased(stockItem?.is_area_based || false);
    setIsGarment(stockItem?.is_garment || false);
    // Initialize selected job types - handle both array and single job_type_id
    if (stockItem) {
      if (Array.isArray(stockItem.job_types)) {
        setSelectedJobTypes(stockItem.job_types.map(jt => jt.id));
      } else if (stockItem.job_type_id) {
        setSelectedJobTypes([stockItem.job_type_id]);
      } else {
        setSelectedJobTypes([]);
      }
    } else {
      setSelectedJobTypes([]);
    }
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
    setReportModalOpen(false);
    setEditingStockItem(null);
    setSelectedStockItem(null);
    setAdjustQuantity(0);
    setAdjustNotes("");
    setIsAreaBased(false);
    setIsGarment(false);
    setSelectedJobTypes([]);
    setSubmitting(false);
    setLoading(false);
  };

  const handleOpenAdjustModal = (stockItem) => {
    if (!hasPermission('inventory', 'adjust')) {
      alert('You do not have permission to adjust stock.');
      return;
    }
    setSelectedStockItem(stockItem);
    setAdjustQuantity(0);
    setAdjustNotes("");
    setAdjustModalOpen(true);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);

    router.visit(buildUrl("inventory"), {
      preserveState: false,
      preserveScroll: true,
      onFinish: () => setIsRefreshing(false)
    });

  };
  

  const handleStockItemSubmit = (e) => {
    e.preventDefault();
    
    // Validate job types selection for non-garment items
    if (!isGarment && selectedJobTypes.length === 0) {
      alert('Please select at least one job type for this item.');
      return;
    }
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);



    data.is_active = data.is_active === "on" || data.is_active === true;
    data.is_area_based =
      data.is_area_based === "on" ||
      data.is_area_based === true ||
      isAreaBased;
    data.is_garment =
      data.is_garment === "on" ||
      data.is_garment === true ||
      isGarment;

    // Send array of job type IDs instead of single ID
    data.job_type_ids = selectedJobTypes.length > 0 ? selectedJobTypes : [];
    delete data.job_type_id; // Remove the old single field if it exists
    data.current_stock = parseFloat(data.current_stock) || 0;
    data.minimum_stock_level = parseFloat(data.minimum_stock_level) || 0;
    data.maximum_stock_level = parseFloat(data.maximum_stock_level) || 0;
    data.unit_cost = parseFloat(data.unit_cost) || 0;


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
        preserveState: true,
        preserveScroll: true
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
        preserveState: true,
        preserveScroll: true
      });
    }
  };

  const handleAdjustStock = (e) => {
    e.preventDefault();
    if (!selectedStockItem) return;

    if (!hasPermission('inventory', 'adjust')) {
      alert('You do not have permission to adjust stock.');
      return;
    }

    let quantity = parseFloat(adjustQuantity);


    if (hasPermission('inventory', 'adjust') && !hasPermission('inventory', 'manage')) {
      if (quantity > 0) {
        quantity = -quantity;
      }
    }

    router.post(
      buildUrl(`/inventory/${selectedStockItem.id}/adjust`),
      {
        quantity: quantity,
        notes: adjustNotes
      },
      {
        onBefore: () => setSubmitting(true),
        onSuccess: () => {
          handleCloseModal();
        },
        onError: () => setSubmitting(false),
        onFinish: () => setSubmitting(false),
        preserveState: false,
        preserveScroll: true
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
      onFinish: () => setLoading(false)
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

  const parseNumber = (value) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getStockCategory = (stockItem) => {
    const currentStock = parseNumber(stockItem?.current_stock);
    const minLevel = parseNumber(stockItem?.minimum_stock_level);

    if (currentStock <= 0) return "out";
    if (currentStock <= minLevel) return "critical";
    return "in";
  };

  const applyStockStatusFilter = (status) => {
    handleCloseModal();
    router.get(
      buildUrl("/inventory"),
      {
        ...filters,
        stock_status: status || null
      },
      {
        preserveState: false,
        preserveScroll: true
      }
    );
  };

  const visibleStockItems = Array.isArray(stockItems?.data) ? stockItems.data : [];
  const outOfStockItems = visibleStockItems.filter((item) => getStockCategory(item) === "out");
  const criticalStockItems = visibleStockItems.filter((item) => getStockCategory(item) === "critical");
  const inStockItems = visibleStockItems.filter((item) => getStockCategory(item) === "in");
  const totalVisibleQty = visibleStockItems.reduce(
    (sum, item) => sum + parseNumber(item?.current_stock),
    0
  );
  const canViewCost = isAdmin || hasPermission("inventory", "manage");
  const totalVisibleValue = visibleStockItems.reduce(
    (sum, item) => sum + parseNumber(item?.current_stock) * parseNumber(item?.unit_cost),
    0
  );

  const stockItemColumns = [
    {
      label: "#",
      key: "index",
      render: (row, index) =>
        (stockItems.current_page - 1) * stockItems.per_page + index + 1
    },
    { label: "SKU", key: "sku" },
    { label: "Name", key: "name" },
    { label: "Description", key: "description" },
    {
      label: "Job Types",
      key: "job_types",
      render: (row) => {
        // Handle both array of job_types and single job_type for backward compatibility
        if (Array.isArray(row.job_types) && row.job_types.length > 0) {
          return (
            <div className="flex flex-wrap gap-1">
              {row.job_types.map((jt, index) => (
                <b key={index}>
                  {jt.name}
                </b>
              ))}
            </div>
          );
        } else if (row.job_type?.name) {
          return <b>{row.job_type.name}</b>;
        }
        return <b className="text-muted">N/A</b>;
      }
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
      }
    },
    {
      label: "Current Stock",
      key: "current_stock",
      render: (row) =>
        <div>
          <strong>{parseFloat(row.current_stock).toFixed(2)}</strong>{" "}
          {row.base_unit_of_measure}
          {row.is_area_based && row.length && row.width &&
            <div className="text-xs text-muted mt-1">
              Area:{" "}
              {(
                parseFloat(row.length) * parseFloat(row.width)).
                toFixed(2)}{" "}
              {row.base_unit_of_measure}² per piece
            </div>
          }
        </div>

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
            </div>);

        }
        return (
          <div className="text-xs text-muted">
            <div>Standard: 1 piece per unit</div>
            {row.production_consumptions &&
              row.production_consumptions.length > 0 &&
              <div className="mt-1">
                <small>
                  Recent:{" "}
                  {row.production_consumptions.length}{" "}
                  consumption(s)
                </small>
              </div>
            }
          </div>);

      }
    },
    {
      label: "Min Level",
      key: "minimum_stock_level",
      adminOnly: true,
      render: (row) =>
        <div>
          {parseFloat(row.minimum_stock_level).toFixed(2)}{" "}
          {row.base_unit_of_measure}
        </div>

    },
    {
      label: "Unit Cost",
      key: "unit_cost",
      adminOnly: true,
      render: (row) => `${formatPeso(parseFloat(row.unit_cost).toFixed(2))}`
    },
    {
      label: "Status",
      key: "status",
      render: (row) => getStockStatusBadge(row)
    },
    {
      label: "Actions",
      key: "actions",
      render: (row) => {
        const canRead = isAdmin || hasPermission('inventory', 'read');
        const canManage = isAdmin || hasPermission('inventory', 'manage');
        const canAdjust = isAdmin || hasPermission('inventory', 'adjust');


        if (!canRead && !canManage) {
          return null;
        }

        return (
          <div className="btn-group">
            {isAdmin &&
              <button
                type="button"
                className="btn btn-link btn-sm text-orange-500"
                onClick={() =>
                  router.get(buildUrl(`/inventory/${row.id}/movements`))
                }>

                <i className="ti-eye"></i> Movements
              </button>
            }
            {canAdjust && (isAdmin || row.is_garment) &&
              <button
                type="button"
                className="btn btn-link btn-sm text-warning"
                onClick={() => handleOpenAdjustModal(row)}>

                <i className="ti-pencil"></i> Adjust
              </button>
            }
            {canManage && (
              <>
              <button
                type="button"
                className="btn btn-link btn-sm text-primary"
                onClick={() => handleOpenModal(row)}>

                <i className="ti-pencil"></i> Edit
              </button>
              <button
                type="button"
                className="btn btn-link btn-sm text-danger"
                onClick={() => handleDelete(row.id)}>

                <i className="ti-trash"></i> Delete
              </button>
              </>
            )}
          </div>);

      }
    }].
    filter((col) => {

      if (col.adminOnly && !isAdmin) {
        return false;
      }

      if (col.key === 'actions') {
        const canRead = isAdmin || hasPermission('inventory', 'read');
        const canManage = isAdmin || hasPermission('inventory', 'manage');
        const canAdjust = isAdmin || hasPermission('inventory', 'adjust');  
        return canRead || canManage || canAdjust;
      }
      return true;
    });

  return (
    <AdminLayout
      user={user}
      notifications={notifications}
      messages={messages}>

      <Head title="Inventory Management" />

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
        size="4xl">

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
                error={errors?.sku} />

            </div>
            <div className="col-md-6">
              <FormInput
                label="Name"
                type="text"
                name="name"
                defaultValue={editingStockItem?.name}
                required
                error={errors?.name} />

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
                error={errors?.description} />

            </div>
            {/* <div className="col-md-2">
              <FormInput
                label="Active"
                type="checkbox"
                name="is_active"
                defaultChecked={
                  editingStockItem?.is_active !== false
                } />

            </div> */}
          </div>
          <div className="row">
            <div className="col-md-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Types {!isGarment && <span className="text-red-500">*</span>}
                </label>
                <div className="border border-gray-300 rounded-md p-3 bg-white max-h-48 overflow-y-auto">
                  {jobTypes.length === 0 ? (
                    <p className="text-sm text-gray-500">No job types available</p>
                  ) : (
                    <div className="space-y-2">
                      {jobTypes.map((jt) => (
                        <div key={jt.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`job_type_${jt.id}`}
                            checked={selectedJobTypes.includes(jt.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedJobTypes([...selectedJobTypes, jt.id]);
                              } else {
                                setSelectedJobTypes(selectedJobTypes.filter(id => id !== jt.id));
                              }
                            }}
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                          />
                          <label
                            htmlFor={`job_type_${jt.id}`}
                            className="ml-2 text-sm text-gray-700 cursor-pointer"
                          >
                            {jt.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {errors?.job_type_ids && (
                  <p className="text-red-500 text-xs mt-1">{errors.job_type_ids}</p>
                )}
                {!isGarment && selectedJobTypes.length === 0 && (
                  <small className="text-muted d-block mt-1">
                    Please select at least one job type
                  </small>
                )}
              </div>
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
                error={errors?.base_unit_of_measure} />

            </div>
            <div className="col-md-3">
              <FormInput
                label="Unit Cost"
                type="number"
                name="unit_cost"
                defaultValue={editingStockItem?.unit_cost || 0}
                step="0.01"
                min="0"
                error={errors?.unit_cost} />

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
                    className="h-4 w-4 text-orange-600 border-gray-300 rounded" />

                  <label
                    htmlFor="is_area_based"
                    className="text-sm font-medium text-gray-700">

                    Area Based Material
                  </label>
                </div>
                <small className="text-muted d-block mt-1">
                  Check if this material is cut by area
                  (tarpaulin, fabric, etc.)
                </small>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_garment"
                    id="is_garment"
                    checked={isGarment}
                    onChange={(e) => {
                      setIsGarment(e.target.checked);
                    }}
                    className="h-4 w-4 text-orange-600 border-gray-300 rounded" />

                  <label
                    htmlFor="is_garment"
                    className="text-sm font-medium text-gray-700">

                    Garment
                  </label>
                </div>
                <small className="text-muted d-block mt-1">
                  Check if this is a garment item that requires manual stock management (Job Type becomes optional)
                </small>
              </div>
            </div>
            {isAreaBased &&
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
                    error={errors?.length} />

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
                    error={errors?.width} />

                </div>
              </>
            }
          </div>
          <div className="row">
            {!editingStockItem &&
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
                  error={errors?.current_stock} />

              </div>
            }
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
                error={errors?.minimum_stock_level} />

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
                error={errors?.maximum_stock_level} />

            </div>
          </div>
          <div className="row">
            <div className="col-md-6">
              <FormInput
                label="Supplier"
                type="text"
                name="supplier"
                defaultValue={editingStockItem?.supplier}
                error={errors?.supplier} />

            </div>
            <div className="col-md-6">
              <FormInput
                label="Location"
                type="text"
                name="location"
                defaultValue={editingStockItem?.location}
                error={errors?.location} />

            </div>
          </div>
          <div className="d-flex justify-content-end gap-2 mt-3">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}>

              {submitting ?
                <>
                  <i className="fa fa-spinner fa-spin"></i>{" "}
                  {editingStockItem ? "Updating..." : "Creating..."}
                </> :

                <>
                  <i className="ti-save"></i>{" "}
                  {editingStockItem ? "Update" : "Create"}
                </>
              }
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCloseModal}
              disabled={submitting}>

              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        title={"Inventory Report"}
        isOpen={openReportModal}
        onClose={handleCloseModal}
        size="6xl"
        submitButtonText={null}>

        <div className="mb-3 text-sm text-muted">
          This report summarizes the currently loaded stock items in the table.
          {stockItems?.total ? (
            <span>
              {" "}Showing {visibleStockItems.length} of {stockItems.total} item(s)
              {stockItems.current_page && stockItems.last_page
                ? ` (page ${stockItems.current_page} of ${stockItems.last_page}).`
                : "."}
            </span>
          ) : null}
        </div>

        <div className="row">
          <div className="col-md-4">
            <div className="card border-danger">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between">
                  <h5 className="mb-0">Out of Stock</h5>
                  <span className="badge badge-danger">{outOfStockItems.length}</span>
                </div>
                <div className="text-muted mt-2 text-sm">Items with stock at 0 (or below).</div>
                <div className="mt-3 d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => applyStockStatusFilter("out")}
                  >
                    View Out of Stock
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card border-warning">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between">
                  <h5 className="mb-0">Critical Stock</h5>
                  <span className="badge badge-warning">{criticalStockItems.length}</span>
                </div>
                <div className="text-muted mt-2 text-sm">
                  Items at or below minimum stock level.
                  {typeof lowStockCount === "number" && lowStockCount > 0 ? (
                    <div className="mt-1">Overall low stock count: <b>{lowStockCount}</b></div>
                  ) : null}
                </div>
                <div className="mt-3 d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-warning"
                    onClick={() => applyStockStatusFilter("low")}
                  >
                    View Critical Stock
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card border-success">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between">
                  <h5 className="mb-0">All Stocks</h5>
                  <span className="badge badge-success">{visibleStockItems.length}</span>
                </div>
                <div className="mt-2 text-sm">
                  <div className="text-muted">
                    In Stock: <b>{inStockItems.length}</b>
                  </div>
                  <div className="text-muted">
                    Total Qty (visible): <b>{totalVisibleQty.toFixed(2)}</b>
                  </div>
                  {canViewCost ? (
                    <div className="text-muted">
                      Total Value (visible): <b>{formatPeso(totalVisibleValue.toFixed(2))}</b>
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => applyStockStatusFilter("")}
                  >
                    View All
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-light"
                    onClick={() => window.print()}
                  >
                    Print
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h5 className="mb-2">Out of Stock Items</h5>
          <div className="table-responsive">
            <table className="table table-sm table-striped">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th className="text-right">Current Stock</th>
                  <th className="text-right">Min Level</th>
                </tr>
              </thead>
              <tbody>
                {outOfStockItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-muted">No out of stock items in the current table view.</td>
                  </tr>
                ) : (
                  outOfStockItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.sku}</td>
                      <td>{item.name}</td>
                      <td className="text-right">
                        {parseNumber(item.current_stock).toFixed(2)} {item.base_unit_of_measure}
                      </td>
                      <td className="text-right">
                        {parseNumber(item.minimum_stock_level).toFixed(2)} {item.base_unit_of_measure}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4">
          <h5 className="mb-2">Critical Stock Items</h5>
          <div className="table-responsive">
            <table className="table table-sm table-striped">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th className="text-right">Current Stock</th>
                  <th className="text-right">Min Level</th>
                </tr>
              </thead>
              <tbody>
                {criticalStockItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-muted">No critical stock items in the current table view.</td>
                  </tr>
                ) : (
                  criticalStockItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.sku}</td>
                      <td>{item.name}</td>
                      <td className="text-right">
                        {parseNumber(item.current_stock).toFixed(2)} {item.base_unit_of_measure}
                      </td>
                      <td className="text-right">
                        {parseNumber(item.minimum_stock_level).toFixed(2)} {item.base_unit_of_measure}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        key={selectedStockItem?.id || 'adjust-stock'}
        title={`Adjust Stock - ${selectedStockItem?.name}`}
        isOpen={openAdjustModal}
        onClose={handleCloseModal}
        size="lg">

        {selectedStockItem &&
          <form onSubmit={handleAdjustStock}>
            <div className="mb-3">
              <p>
                <strong>Current Stock:</strong>{" "}
                {selectedStockItem.current_stock}{" "}
                {selectedStockItem.base_unit_of_measure}
              </p>
            </div>
            <div className="mb-4">
              <label
                htmlFor="adjustment_quantity"
                className="block text-sm font-medium text-gray-700 mb-1">

                Adjustment Quantity <span className="text-red-500">*</span>
              </label>
              <input
                id="adjustment_quantity"
                type="number"
                name="quantity"
                value={adjustQuantity}
                onChange={(e) => {
                  setAdjustQuantity(e.target.value);
                }}
                onBlur={(e) => {

                  if (hasPermission('inventory', 'adjust') && !hasPermission('inventory', 'manage')) {
                    const numValue = parseFloat(e.target.value);
                    if (!isNaN(numValue) && numValue > 0) {
                      setAdjustQuantity(-numValue);
                    }
                  }
                }}
                step="0.01"
                required
                min={hasPermission('inventory', 'manage') ? undefined : -999999}
                placeholder={
                  hasPermission('inventory', 'manage') ?
                    "Positive for increase, negative for decrease" :
                    "Enter value to deduct stock (automatically converted to negative)"
                }
                className="w-full text-sm rounded-md border border-gray-300 p-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition duration-150 ease-in-out placeholder-gray-400 bg-white" />

            </div>
            {!hasPermission('inventory', 'manage') &&
              <small className="text-muted d-block mt-1">
                You can only deduct stock. Positive values will be automatically converted to negative.
              </small>
            }
            <FormInput
              label="Notes"
              type="textarea"
              name="notes"
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)} />

            <div className="d-flex justify-content-end gap-2 mt-3">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}>

                {submitting ?
                  <>
                    <i className="fa fa-spinner fa-spin"></i> Adjusting...
                  </> :

                  <>
                    <i className="ti-save"></i> Adjust Stock
                  </>
                }
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseModal}
                disabled={submitting}>

                Cancel
              </button>
            </div>
          </form>
        }
      </Modal>

      <Modal
        title={"Delete Stock"}
        isOpen={openDeleteModal}
        onClose={handleCloseModal}
        size="md"
        submitButtonText={null}>

        <DeleteConfirmation
          label="stock"
          loading={loading}
          onSubmit={handleDeleteStockItem}
          onCancel={handleCloseModal} />

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
                        {lowStockCount > 0 &&
                          <a
                            href={buildUrl('/inventory/low-stock')}
                            className="btn btn-warning btn-sm mr-2">

                            <i className="ti-alert"></i>{" "}
                            Low Stock (
                            {lowStockCount})
                          </a>
                        }
                        {(isAdmin || hasPermission('inventory', 'manage')) &&
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() =>
                              handleOpenModal()
                            }>

                            <i className="ti-plus"></i>{" "}
                            Add Stock Item
                          </button>
                        }
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary ml-2"
                          onClick={() => setReportModalOpen(true)}>

                          <i className="ti-bar-chart"></i>{" "}
                          Report
                        </button>
                         <button
                          className="btn btn-sm btn-light btn-rounded ml-2 text-orange-500"
                          onClick={handleRefresh}
                          disabled={isRefreshing}
                          title="Refresh Table"
                          // style={{ width: "32px", height: "32px", padding: "0", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >

                          <i className={`ti-reload ${isRefreshing ? "spin-animation" : ""}`}></i>
                        </button>
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
                            route="/inventory" />

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
                                    e.target.
                                      value ||
                                    null
                                },
                                {
                                  preserveState: false,
                                  preserveScroll: true
                                }
                              );
                            }}
                            options={[
                              {
                                value: "",
                                label: "Filter by Job Type (All)"
                              },
                              ...jobTypes.map(
                                (jt) => ({
                                  value: jt.id,
                                  label: jt.name
                                })
                              )]
                            } />

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
                                    e.target.
                                      value ||
                                    null
                                },
                                {
                                  preserveState: false,
                                  preserveScroll: true
                                }
                              );
                            }}
                            options={[
                              {
                                value: "",
                                label: "All Status"
                              },
                              {
                                value: "low",
                                label: "Low Stock"
                              },
                              {
                                value: "out",
                                label: "Out of Stock"
                              }]
                            } />

                        </div>
                      </div>

                      <div className="mt-4">
                        <DataTable
                          columns={stockItemColumns}
                          data={stockItems.data}
                          pagination={stockItems}
                          emptyMessage="No stock items found." />

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