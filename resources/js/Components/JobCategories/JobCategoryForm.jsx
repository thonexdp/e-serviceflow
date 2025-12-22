// Components/JobCategories/JobCategoryForm.jsx
import React, { useState, useEffect } from "react";
import FormInput from "@/Components/Common/FormInput";

export default function JobCategoryForm({ category = null, onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        name: "",
    });

    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);

    // Populate form if editing
    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name || "",
            });
        }
    }, [category]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
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

        if (!formData.name.trim()) {
            newErrors.name = "Category name is required";
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
        onSubmit(formData);

        setTimeout(() => {
            setProcessing(false);
        }, 1000);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="row">
                <div className="col-md-12">
                    <FormInput
                        label="Category Name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        error={errors.name}
                        placeholder="Enter category name (e.g., Tarpaulin, T-shirt Printing, Photo Printing)"
                        required
                    />
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
                        ${processing ? "bg-orange-400 cursor-not-allowed" : "bg-orange-600 hover:bg-orange-700 focus:ring-2 focus:ring-orange-400"}
                    `}
                >
                    {processing ? (
                        <span className="flex items-center">
                            <i className="ti-reload mr-2 animate-spin"></i> Saving...
                        </span>
                    ) : (
                        <span className="flex items-center">
                            <i className="ti-save mr-2"></i> {category ? "Update" : "Save"}
                        </span>
                    )}
                </button>
            </div>
        </form>
    );
}

