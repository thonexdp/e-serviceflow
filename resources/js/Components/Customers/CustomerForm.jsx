// Components/Customers/CustomerForm.jsx
import React, { useState, useEffect } from "react";
import FormInput from "@/Components/Common/FormInput";

export default function CustomerForm({ customer = null, onSubmit, onCancel, jsonReturn = false }) {
    const [formData, setFormData] = useState({
        firstname: "",
        lastname: "",
        facebook: "",
        phone: "",
        email: "",
        address: "",
    });

    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);

    // Populate form if editing
    useEffect(() => {
        if (customer) {
            setFormData({
                firstname: customer.firstname || "",
                lastname: customer.lastname || "",
                phone: customer.phone || "",
                email: customer.email || "",
                address: customer.address || "",
                facebook: customer.facebook || "",
            });
        }
    }, [customer]);

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

        if (!formData.firstname.trim()) {
            newErrors.firstname = "First name is required";
        }

        if (!formData.lastname.trim()) {
            newErrors.lastname = "Last name is required";
        }

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Please enter a valid email address";
        }

        if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
            newErrors.phone = "Please enter a valid phone number";
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
        formData.return_json = jsonReturn;
        onSubmit(formData);

        setTimeout(() => {
            setProcessing(false);
        }, 1000);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="row">
                <div className="col-md-6">
                    <FormInput
                        label="First Name"
                        name="firstname"
                        value={formData.firstname}
                        onChange={handleChange}
                        error={errors.firstname}
                        placeholder="Enter First Name"
                        required
                    />
                </div>

                <div className="col-md-6">
                    <FormInput
                        label="Last Name"
                        name="lastname"
                        value={formData.lastname}
                        onChange={handleChange}
                        error={errors.lastname}
                        placeholder="Enter Last Name"
                        required
                    />
                </div>
            </div>

            <div className="row">
                <div className="col-md-6">
                    <FormInput
                        label="Phone"
                        name="phone"
                        maxLength={11}
                        value={formData.phone}
                        onChange={handleChange}
                        error={errors.phone}
                        placeholder="Phone Number"
                    />
                </div>

                <div className="col-md-6">
                    <FormInput
                        label="Email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        error={errors.email}
                        placeholder="Email Address"
                    />
                </div>
            </div>

            <div className="row">
                <div className="col-md-12">
                    <FormInput
                        label="Facebook Account"
                        type="text"
                        name="facebook"
                        value={formData.facebook}
                        onChange={handleChange}
                        error={errors.facebook}
                        placeholder="Enter Facebook Account"
                        required
                    />
                </div>
            </div>

            <div className="row">
                <div className="col-md-12">
                    <FormInput
                        label="Address"
                        type="textarea"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        error={errors.address}
                        placeholder="Complete Address"
                        rows={2}
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
                    // onClick={onSubmit}
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
                            <i className="ti-save mr-2"></i> {customer ? "Update" : "Save"}
                        </span>
                    )}
                </button>

            </div>
        </form>
    );
}




