// Components/JobTypes/JobTypeForm.jsx
import React, { useState, useEffect } from "react";
import FormInput from "@/Components/Common/FormInput";

export default function JobTypeForm({ jobType = null, categories = [], onSubmit, onCancel }) {
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
        const submitData = {
            ...formData,
            category_id: parseInt(formData.category_id),
            price: parseFloat(formData.price),
            discount: formData.discount ? parseFloat(formData.discount) : null,
            sort_order: parseInt(formData.sort_order) || 0,
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

    const categoryOptions = categories.map(cat => ({
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

