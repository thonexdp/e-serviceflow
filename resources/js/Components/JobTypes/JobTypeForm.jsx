// Components/JobTypes/JobTypeForm.jsx
import React, { useState, useEffect } from "react";
import FormInput from "@/Components/Common/FormInput";

export default function JobTypeForm({ jobType = null, allcategories = [], onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        category_id: "",
        name: "",
        description: "",
        price: "",
        price_by: "pcs",
        discount: "",
        promo_text: "",
        is_active: true,
        sort_order: 0,
    });

    const [priceTiers, setPriceTiers] = useState([]);
    const [sizeRates, setSizeRates] = useState([]);
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);

    // Populate form if editing
    useEffect(() => {
        if (jobType) {
            setFormData({
                category_id: jobType.category_id?.toString() || jobType.category_id || "",
                name: jobType.name || "",
                description: jobType.description || "",
                price: jobType.price || "",
                price_by: jobType.price_by || "pcs",
                discount: jobType.discount || "",
                promo_text: jobType.promo_text || "",
                is_active: jobType.is_active !== undefined ? jobType.is_active : true,
                sort_order: jobType.sort_order || 0,
            });
            setPriceTiers(
                (jobType.price_tiers || []).map((tier) => ({
                    id: tier.id || null,
                    label: tier.label || "",
                    min_quantity: tier.min_quantity?.toString() || "",
                    max_quantity: tier.max_quantity?.toString() || "",
                    price: tier.price?.toString() || "",
                    notes: tier.notes || "",
                }))
            );
            setSizeRates(
                (jobType.size_rates || []).map((rate) => ({
                    id: rate.id || null,
                    variant_name: rate.variant_name || "",
                    description: rate.description || "",
                    calculation_method: rate.calculation_method || "area",
                    dimension_unit: rate.dimension_unit || "ft",
                    rate: rate.rate?.toString() || "",
                    min_width: rate.min_width?.toString() || "",
                    max_width: rate.max_width?.toString() || "",
                    min_height: rate.min_height?.toString() || "",
                    max_height: rate.max_height?.toString() || "",
                    is_default: !!rate.is_default,
                }))
            );
        } else {
            setPriceTiers([]);
            setSizeRates([]);
        }
    }, [jobType]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const addPriceTier = () => {
        setPriceTiers((prev) => [
            ...prev,
            {
                label: "",
                min_quantity: "",
                max_quantity: "",
                price: "",
                notes: "",
            },
        ]);
    };

    const updatePriceTier = (index, field, value) => {
        setPriceTiers((prev) => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                [field]: value,
            };
            return updated;
        });
    };

    const removePriceTier = (index) => {
        setPriceTiers((prev) => prev.filter((_, i) => i !== index));
    };

    const addSizeRate = () => {
        setSizeRates((prev) => [
            ...prev,
            {
                variant_name: "",
                description: "",
                calculation_method: "area",
                dimension_unit: "ft",
                rate: "",
                min_width: "",
                max_width: "",
                min_height: "",
                max_height: "",
                is_default: prev.length === 0,
            },
        ]);
    };

    const updateSizeRate = (index, field, value) => {
        setSizeRates((prev) => {
            const updated = [...prev];
            let newValue = value;

            if (field === "is_default") {
                updated.forEach((rate, idx) => {
                    updated[idx] = { ...rate, is_default: idx === index };
                });
            } else {
                updated[index] = {
                    ...updated[index],
                    [field]: newValue,
                };
            }

            return updated;
        });
    };

    const removeSizeRate = (index) => {
        setSizeRates((prev) => {
            const updated = prev.filter((_, i) => i !== index);
            if (updated.length > 0 && !updated.some((rate) => rate.is_default)) {
                updated[0].is_default = true;
            }
            return updated;
        });
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.category_id) {
            newErrors.category_id = "Category is required";
        }

        if (!formData.name.trim()) {
            newErrors.name = "Job type name is required";
        }

        if (!formData.price || parseFloat(formData.price) < 0) {
            newErrors.price = "Price must be a valid positive number";
        }

        if (formData.discount && (parseFloat(formData.discount) < 0 || parseFloat(formData.discount) > 100)) {
            newErrors.discount = "Discount must be between 0 and 100";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setProcessing(true);
        
        // Convert string values to appropriate types
        const formattedPriceTiers = priceTiers
            .filter((tier) => tier.min_quantity && tier.price)
            .map((tier) => ({
                label: tier.label || null,
                min_quantity: Number(tier.min_quantity),
                max_quantity: tier.max_quantity ? Number(tier.max_quantity) : null,
                price: Number(tier.price),
                notes: tier.notes || null,
            }));

        const formattedSizeRates = sizeRates
            .filter((rate) => rate.rate)
            .map((rate) => ({
                variant_name: rate.variant_name || null,
                description: rate.description || null,
                calculation_method: rate.calculation_method || "area",
                dimension_unit: rate.dimension_unit || "ft",
                rate: Number(rate.rate),
                min_width: rate.min_width ? Number(rate.min_width) : null,
                max_width: rate.max_width ? Number(rate.max_width) : null,
                min_height: rate.min_height ? Number(rate.min_height) : null,
                max_height: rate.max_height ? Number(rate.max_height) : null,
                is_default: !!rate.is_default,
            }));

        const submitData = {
            ...formData,
            category_id: parseInt(formData.category_id),
            price: parseFloat(formData.price),
            discount: formData.discount ? parseFloat(formData.discount) : null,
            sort_order: parseInt(formData.sort_order) || 0,
            price_tiers: formattedPriceTiers,
            size_rates: formattedSizeRates,
        };

        onSubmit(submitData);

        setTimeout(() => {
            setProcessing(false);
        }, 1000);
    };

    const priceByOptions = [
        { value: "pcs", label: "Per Piece (pcs)" },
        { value: "sqm", label: "Per Square Meter (sqm)" },
        { value: "length", label: "Per Length" },
    ];

    const categoryOptions = allcategories.map(cat => ({
        value: cat.id.toString(),
        label: cat.name
    }));

    return (
        <form onSubmit={handleSubmit}>
            <div className="row">
                <div className="col-md-6">
                    <FormInput
                        label="Category"
                        type="select"
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleChange}
                        error={errors.category_id}
                        options={categoryOptions}
                        required
                    />
                </div>

                <div className="col-md-6">
                    <FormInput
                        label="Job Type Name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        error={errors.name}
                        placeholder="e.g., 2x3 ft, 3x5 ft, 2×2 photo"
                        required
                    />
                </div>
            </div>

            <div className="row">
                <div className="col-md-12">
                    <FormInput
                        label="Description"
                        type="textarea"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        error={errors.description}
                        placeholder="Enter description (optional)"
                        rows={3}
                    />
                </div>
            </div>

            <div className="row">
                <div className="col-md-4">
                    <FormInput
                        label="Base Price"
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        error={errors.price}
                        placeholder="0.00"
                        required
                        step="0.01"
                        min="0"
                    />
                </div>

                <div className="col-md-4">
                    <FormInput
                        label="Price By"
                        type="select"
                        name="price_by"
                        value={formData.price_by}
                        onChange={handleChange}
                        error={errors.price_by}
                        options={priceByOptions}
                        required
                    />
                </div>

                <div className="col-md-4">
                    <FormInput
                        label="Discount (%)"
                        type="number"
                        name="discount"
                        value={formData.discount}
                        onChange={handleChange}
                        error={errors.discount}
                        placeholder="0"
                        step="0.01"
                        min="0"
                        max="100"
                    />
                </div>
            </div>

            <div className="row">
                <div className="col-md-6">
                    <FormInput
                        label="Promo Text"
                        name="promo_text"
                        value={formData.promo_text}
                        onChange={handleChange}
                        error={errors.promo_text}
                        placeholder="e.g., 12 + 1 free"
                    />
                </div>

                <div className="col-md-3">
                    <FormInput
                        label="Sort Order"
                        type="number"
                        name="sort_order"
                        value={formData.sort_order}
                        onChange={handleChange}
                        error={errors.sort_order}
                        placeholder="0"
                        min="0"
                    />
                </div>

                <div className="col-md-3">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                        </label>
                        <div className="flex items-center mt-2">
                            <input
                                type="checkbox"
                                name="is_active"
                                checked={formData.is_active}
                                onChange={handleChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700">
                                Active
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="mb-0">Quantity Based Pricing (Optional)</h5>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={addPriceTier}
                    >
                        <i className="ti-plus"></i> Add Tier
                    </button>
                </div>
                <p className="text-muted text-sm mb-3">
                    Use tiers to offer bulk discounts. Leave empty to use base price.
                </p>
                {priceTiers.length > 0 ? (
                    <div className="table-responsive">
                        <table className="table table-sm table-bordered">
                            <thead>
                                <tr>
                                    <th>Label</th>
                                    <th>Min Qty</th>
                                    <th>Max Qty</th>
                                    <th>Price (per unit)</th>
                                    <th>Notes</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {priceTiers.map((tier, index) => (
                                    <tr key={index}>
                                        <td>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                value={tier.label}
                                                onChange={(e) => updatePriceTier(index, "label", e.target.value)}
                                                placeholder="e.g., Retail"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                value={tier.min_quantity}
                                                onChange={(e) => updatePriceTier(index, "min_quantity", e.target.value)}
                                                min="1"
                                                placeholder="1"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                value={tier.max_quantity}
                                                onChange={(e) => updatePriceTier(index, "max_quantity", e.target.value)}
                                                min="1"
                                                placeholder="Optional"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                value={tier.price}
                                                onChange={(e) => updatePriceTier(index, "price", e.target.value)}
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                value={tier.notes}
                                                onChange={(e) => updatePriceTier(index, "notes", e.target.value)}
                                                placeholder="Optional notes"
                                            />
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-link text-danger"
                                                onClick={() => removePriceTier(index)}
                                            >
                                                <i className="ti-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="alert alert-light border">
                        No quantity tiers added yet.
                    </div>
                )}
            </div>

            <div className="mt-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="mb-0">Size Based Pricing (Optional)</h5>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={addSizeRate}
                    >
                        <i className="ti-plus"></i> Add Size Rate
                    </button>
                </div>
                <p className="text-muted text-sm mb-3">
                    Define rates per size or area (useful for Tarpaulins, Panaflex, etc.). If present, ticket pricing will use these rates.
                </p>

                {sizeRates.length > 0 ? (
                    <div className="table-responsive">
                        <table className="table table-sm table-bordered">
                            <thead>
                                <tr>
                                    <th>Variant</th>
                                    <th>Method</th>
                                    <th>Unit</th>
                                    <th>Rate</th>
                                    <th>Size Limits (W / H)</th>
                                    <th>Default</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sizeRates.map((rate, index) => (
                                    <tr key={index}>
                                        <td>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm mb-2"
                                                value={rate.variant_name}
                                                onChange={(e) => updateSizeRate(index, "variant_name", e.target.value)}
                                                placeholder="e.g., Ready to Print"
                                            />
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                value={rate.description}
                                                onChange={(e) => updateSizeRate(index, "description", e.target.value)}
                                                placeholder="Optional description"
                                            />
                                        </td>
                                        <td>
                                            <select
                                                className="form-control form-control-sm"
                                                value={rate.calculation_method}
                                                onChange={(e) => updateSizeRate(index, "calculation_method", e.target.value)}
                                            >
                                                <option value="area">Area (W x H)</option>
                                                <option value="length">Length Only</option>
                                            </select>
                                        </td>
                                        <td>
                                            <select
                                                className="form-control form-control-sm"
                                                value={rate.dimension_unit}
                                                onChange={(e) => updateSizeRate(index, "dimension_unit", e.target.value)}
                                            >
                                                <option value="ft">Feet</option>
                                                <option value="m">Meters</option>
                                                <option value="cm">Centimeters</option>
                                                <option value="in">Inches</option>
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                value={rate.rate}
                                                onChange={(e) => updateSizeRate(index, "rate", e.target.value)}
                                                min="0"
                                                step="0.01"
                                                placeholder="Rate"
                                            />
                                        </td>
                                        <td>
                                            <div className="d-flex gap-2">
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm"
                                                    value={rate.min_width}
                                                    onChange={(e) => updateSizeRate(index, "min_width", e.target.value)}
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="Min W"
                                                />
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm"
                                                    value={rate.min_height}
                                                    onChange={(e) => updateSizeRate(index, "min_height", e.target.value)}
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="Min H"
                                                />
                                            </div>
                                            <div className="d-flex gap-2 mt-2">
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm"
                                                    value={rate.max_width}
                                                    onChange={(e) => updateSizeRate(index, "max_width", e.target.value)}
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="Max W"
                                                />
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm"
                                                    value={rate.max_height}
                                                    onChange={(e) => updateSizeRate(index, "max_height", e.target.value)}
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="Max H"
                                                />
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="default_rate"
                                                    checked={rate.is_default}
                                                    onChange={() => updateSizeRate(index, "is_default", true)}
                                                />
                                            </div>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-link text-danger"
                                                onClick={() => removeSizeRate(index)}
                                            >
                                                <i className="ti-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="alert alert-light border">
                        No size rates configured. Base price will be used.
                    </div>
                )}
            </div>

            <div className="mt-4 d-flex justify-content-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={processing}
                    className={`px-4 py-2.5 text-sm font-medium text-white rounded-md transition
                        ${processing ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-400"}
                    `}
                >
                    {processing ? (
                        <span className="flex items-center">
                            <i className="ti-reload mr-2 animate-spin"></i> Saving...
                        </span>
                    ) : (
                        <span className="flex items-center">
                            <i className="ti-save mr-2"></i> {jobType ? "Update" : "Save"}
                        </span>
                    )}
                </button>
            </div>
        </form>
    );
}

