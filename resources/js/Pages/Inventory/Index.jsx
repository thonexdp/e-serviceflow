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
  const [measurementType, setMeasurementType] = useState("pieces");
  const { flash, auth, errors } = usePage().props;
  const [isRefreshing, setIsRefreshing] = useState(false);


  const isAdmin = auth?.user?.role === "admin";
  const { buildUrl } = useRoleApi();

  const measurementOptions = [
    {
      key: "pieces",
      label: "Pieces (Default)",
      description: "Standard unit count",
      defaultUnit: "pcs"
    },
    {
      key: "area",
      label: "Area-based (sqft)",
      description: "Store stock directly in square feet",
      defaultUnit: "sqft"
    },
    {
      key: "weight",
      label: "Weight-based (kg)",
      description: "Store stock directly in kilograms",
      defaultUnit: "kg"
    },
    {
      key: "volume",
      label: "Volume-based (ml)",
      description: "Store stock directly in milliliters",
      defaultUnit: "ml"
    },
    {
      key: "length",
      label: "Length-based (m)",
      description: "Store stock directly in meters",
      defaultUnit: "m"
    }
  ];

  const deriveMeasurementType = (stockItem) => {
    if (!stockItem) return "pieces";
    if (stockItem.measurement_type) return stockItem.measurement_type;
    if (stockItem.is_area_based) return "area";

    const baseUnit = (stockItem.base_unit_of_measure || "").toLowerCase();
    if (["kg", "kilogram", "kilograms"].includes(baseUnit)) return "weight";
    if (["liter", "litre", "liters", "litres", "l"].includes(baseUnit)) return "volume";
    if (["m", "meter", "meters", "metre", "metres"].includes(baseUnit)) return "length";
    return "pieces";
  };

  const getDefaultUnitForType = (type) =>
    measurementOptions.find((opt) => opt.key === type)?.defaultUnit || "pcs";

  const convertToBaseQuantity = (type, value) => {
    // No conversion needed - store directly in base units
    if (!value) return 0;
    return parseFloat(value) || 0;
  };

  const handleOpenModal = (stockItem = null) => {
    // Create a copy to avoid mutating the original
    const stockItemCopy = stockItem ? { ...stockItem } : null;
    const derivedType = deriveMeasurementType(stockItemCopy);
    
    // Convert kg back to grams for display when editing weight items
    if (stockItemCopy && derivedType === "weight") {
      if (stockItemCopy.current_stock) {
        stockItemCopy.current_stock = parseFloat(stockItemCopy.current_stock) * 1000;
      }
      if (stockItemCopy.minimum_stock_level) {
        stockItemCopy.minimum_stock_level = parseFloat(stockItemCopy.minimum_stock_level) * 1000;
      }
      if (stockItemCopy.maximum_stock_level) {
        stockItemCopy.maximum_stock_level = parseFloat(stockItemCopy.maximum_stock_level) * 1000;
      }
    }
    
    setEditingStockItem(stockItemCopy);
    setMeasurementType(derivedType);
    setIsAreaBased(derivedType === "area");
    setIsGarment(stockItemCopy?.is_garment || false);
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
    setMeasurementType("pieces");
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

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    data.is_active = data.is_active === "on" || data.is_active === true;
    data.measurement_type = measurementType;
    data.is_area_based = measurementType === "area";
    data.is_garment =
      data.is_garment === "on" ||
      data.is_garment === true ||
      isGarment;

    // Auto-set base_unit_of_measure based on Stock Input Type
    data.base_unit_of_measure = getDefaultUnitForType(measurementType);

    // Remove length/width for area-based items - stocks are saved by sqft, not per roll
    data.length = null;
    data.width = null;

    // Store stock values - send raw values to backend, backend will convert if needed
    // For weight: send grams, backend converts to kg
    // For volume: send ml, backend stores as ml (no conversion)
    // For others: send as-is
    data.current_stock = parseFloat(data.current_stock) || 0;
    data.minimum_stock_level = parseFloat(data.minimum_stock_level) || 0;
    data.maximum_stock_level = parseFloat(data.maximum_stock_level) || 0;
    // Unit cost is stored relative to base unit (price per 1 sqft, 1kg, 1ml, 1m, etc.)
    data.unit_cost = parseFloat(data.unit_cost) || 0;

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

  // Helper function to normalize unit display and convert values if needed
  const normalizeUnitDisplay = (row, value) => {
    const measurementType = row.measurement_type || (row.is_area_based ? "area" : "pieces");
    const baseUnit = (row.base_unit_of_measure || "").toLowerCase();
    let displayValue = parseFloat(value) || 0;
    let displayUnit = row.base_unit_of_measure;

    // Handle volume: if stored as "liter", convert to ml for display
    if (measurementType === "volume" && baseUnit === "liter") {
      displayValue = displayValue * 1000; // Convert liters to ml
      displayUnit = "ml";
    }

    return { displayValue, displayUnit };
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
  const selectedMeasurement =
    measurementOptions.find((opt) => opt.key === measurementType) || measurementOptions[0];

  const quantityMeta = {
    pieces: {
      label: "Initial Stock",
      placeholder: "e.g., 10",
      hint: "Standard unit count (pcs)"
    },
    area: {
      label: "Initial Stock",
      placeholder: "e.g., 1350",
      hint: "Stock in square feet (sqft)"
    },
    weight: {
      label: "Initial Stock (grams)",
      placeholder: "e.g., 50000",
      hint: "Input in grams - will be stored as kg (e.g., 50000g = 50kg)"
    },
    volume: {
      label: "Initial Stock",
      placeholder: "e.g., 5000",
      hint: "Stock in milliliters (ml)"
    },
    length: {
      label: "Initial Stock",
      placeholder: "e.g., 25",
      hint: "Stock in meters (m)"
    }
  };

  const getQuantityMeta = (type) => quantityMeta[type] || quantityMeta.pieces;
  const quantityInfo = getQuantityMeta(measurementType);
  const quantityStep = measurementType === "pieces" ? "1" : measurementType === "weight" ? "0.1" : "0.01";

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
    // {
    //   label: "Category",
    //   key: "category",
    //   render: (row) => row.category || <span className="text-muted">N/A</span>
    // },
    {
      label: "Unit",
      key: "unit",
      render: (row) => {
        return row.base_unit_of_measure || "-";
      }
    },
    {
      label: "Current Stock",
      key: "current_stock",
      render: (row) => {
        const { displayValue, displayUnit } = normalizeUnitDisplay(row, row.current_stock);
        return (
          <div>
            <strong>{displayValue.toFixed(2)}</strong>{" "}
            {displayUnit}
          </div>
        );
      }
    },
    {
      label: "Consumption",
      key: "consumption",
      render: (row) => {
        const measurementType = row.measurement_type || (row.is_area_based ? "area" : "pieces");
        if (measurementType === "area") {
          return (
            <div className="text-xs">
              <div className="text-muted">
                <small>
                  Consumption: Based on production area (sqft)
                </small>
              </div>
              <div className="text-muted">
                <small>
                  Usage defined in Job Type recipe
                </small>
              </div>
            </div>);
        }
        return (
          <div className="text-xs text-muted">
            <div>Usage defined in Job Type recipe</div>
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
      render: (row) => {
        const { displayValue, displayUnit } = normalizeUnitDisplay(row, row.minimum_stock_level);
        return (
          <div>
            {displayValue.toFixed(2)}{" "}
            {displayUnit}
          </div>
        );
      }
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
        size="6xl">

        <form onSubmit={handleStockItemSubmit}>
          <div className="alert alert-info mb-3">
            <i className="ti-info-alt mr-2"></i>
            <strong>Note:</strong> Inventory items are now managed independently.
            Material consumption is defined in the Job Type settings (recipe/BOM system).
          </div>

          {/* Inline Stock Input Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <i className="ti-settings mr-1"></i> Stock Input Type
            </label>
            <div className="d-flex flex-wrap gap-2">
              {measurementOptions.map((opt) => (
                <div
                  key={opt.key}
                  className={`p-3 border rounded cursor-pointer transition-all ${measurementType === opt.key
                      ? 'border-orange-500 bg-orange-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  style={{ minWidth: '180px', flex: '1 1 180px', maxWidth: '220px' }}
                  onClick={() => {
                    setMeasurementType(opt.key);
                    setIsAreaBased(opt.key === "area");
                  }}>
                  <div className="d-flex align-items-start">
                    <input
                      type="radio"
                      name="measurement_type_inline"
                      className="mr-2 mt-1"
                      checked={measurementType === opt.key}
                      onChange={() => {
                        setMeasurementType(opt.key);
                        setIsAreaBased(opt.key === "area");
                      }}
                    />
                    <div>
                      <div className={`font-weight-bold text-sm ${measurementType === opt.key ? 'text-orange-700' : 'text-gray-800'}`}>
                        {opt.label}
                      </div>
                      <div className="text-muted text-xs">{opt.description}</div>
                      <div className={`text-xs mt-1 ${measurementType === opt.key ? 'text-orange-600' : 'text-gray-500'}`}>
                        Unit: {opt.defaultUnit.toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
            <div className="col-md-12">
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
            <div className="col-md-4">
              <FormInput
                label={measurementType === "weight" 
                  ? "Unit Cost (per 1 kg)" 
                  : measurementType === "area"
                  ? "Unit Cost (per 1 sqft)"
                  : measurementType === "volume"
                  ? "Unit Cost (per 1 ml)"
                  : measurementType === "length"
                  ? "Unit Cost (per 1 m)"
                  : "Unit Cost (per 1 pcs)"}
                type="number"
                name="unit_cost"
                defaultValue={editingStockItem?.unit_cost || 0}
                step="0.01"
                min="0"
                error={errors?.unit_cost} />
              <small className="text-muted d-block mt-1">
                {measurementType === "area" 
                  ? "Price per 1 sqft (e.g., if 1 roll costs ₱450 and contains 450 sqft, enter ₱1.00)"
                  : measurementType === "weight"
                  ? "Price per 1 kg (e.g., if 1000g costs ₱50, enter ₱50.00 per kg)"
                  : measurementType === "volume"
                  ? "Price per 1 ml (e.g., if 1000ml costs ₱100, enter ₱0.10 per ml)"
                  : measurementType === "length"
                  ? "Price per 1 meter (e.g., if 10m costs ₱200, enter ₱20.00 per m)"
                  : "Price per 1 piece"}
              </small>
            </div>
            <div className="col-md-5">
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
                  Check if this is a garment item that requires manual stock management
                </small>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-md-12">
              <input type="hidden" name="measurement_type" value={measurementType} />
            </div>
           
          </div>
          <div className="row">
            {!editingStockItem &&
              <div className="col-md-4">
                <FormInput
                  label={quantityInfo.label}
                  type="number"
                  name="current_stock"
                  defaultValue={0}
                  step={quantityStep}
                  min="0"
                  placeholder={quantityInfo.placeholder}
                  error={errors?.current_stock} />
                <small className="text-muted d-block mt-1">{quantityInfo.hint}</small>

              </div>
            }
            <div className="col-md-4">
              <FormInput
                label={measurementType === "weight" 
                  ? "Minimum Stock Level (grams)" 
                  : `Minimum Stock Level (${selectedMeasurement.defaultUnit})`}
                type="number"
                name="minimum_stock_level"
                defaultValue={
                  editingStockItem?.minimum_stock_level || 0
                }
                step={quantityStep}
                min="0"
                placeholder={measurementType === "weight" 
                  ? "e.g., 10000 (grams = 10kg)"
                  : `e.g., ${measurementType === "area" ? "500" : measurementType === "volume" ? "1000" : measurementType === "length" ? "10" : "5"}`}
                error={errors?.minimum_stock_level} />
              {measurementType === "weight" && (
                <small className="text-muted d-block mt-1">
                  Input in grams - will be stored as kg
                </small>
              )}

            </div>
            <div className="col-md-4">
              <FormInput
                label={measurementType === "weight" 
                  ? "Maximum Stock Level (grams)" 
                  : `Maximum Stock Level (${selectedMeasurement.defaultUnit})`}
                type="number"
                name="maximum_stock_level"
                defaultValue={
                  editingStockItem?.maximum_stock_level || 0
                }
                step={quantityStep}
                min="0"
                placeholder={measurementType === "weight" 
                  ? "e.g., 100000 (grams = 100kg)"
                  : `e.g., ${measurementType === "area" ? "5000" : measurementType === "volume" ? "10000" : measurementType === "length" ? "100" : "50"}`}
                error={errors?.maximum_stock_level} />
              {measurementType === "weight" && (
                <small className="text-muted d-block mt-1">
                  Input in grams - will be stored as kg
                </small>
              )}

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
                  outOfStockItems.map((item) => {
                    const currentStock = normalizeUnitDisplay(item, item.current_stock);
                    const minStock = normalizeUnitDisplay(item, item.minimum_stock_level);
                    return (
                      <tr key={item.id}>
                        <td>{item.sku}</td>
                        <td>{item.name}</td>
                        <td className="text-right">
                          {currentStock.displayValue.toFixed(2)} {currentStock.displayUnit}
                        </td>
                        <td className="text-right">
                          {minStock.displayValue.toFixed(2)} {minStock.displayUnit}
                        </td>
                      </tr>
                    );
                  })
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
                  criticalStockItems.map((item) => {
                    const currentStock = normalizeUnitDisplay(item, item.current_stock);
                    const minStock = normalizeUnitDisplay(item, item.minimum_stock_level);
                    return (
                      <tr key={item.id}>
                        <td>{item.sku}</td>
                        <td>{item.name}</td>
                        <td className="text-right">
                          {currentStock.displayValue.toFixed(2)} {currentStock.displayUnit}
                        </td>
                        <td className="text-right">
                          {minStock.displayValue.toFixed(2)} {minStock.displayUnit}
                        </td>
                      </tr>
                    );
                  })
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
                        <div className="col-md-3">
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
                        <div className="col-md-6"></div>

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