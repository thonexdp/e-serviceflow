// Components/Tickets/TicketForm.jsx
import React, { useState, useEffect, useMemo } from "react";
import FormInput from "@/Components/Common/FormInput";
import { usePage } from "@inertiajs/react";

export default function TicketForm({ ticket = null, customerId = null, onSubmit, onCancel }) {
    const { jobCategories = [] } = usePage().props;
    
    const [formData, setFormData] = useState({
        customer_id: customerId || "",
        description: "",
        category_id: "",
        job_type_id: "",
        quantity: 1,
        size_value: "",
        size_unit: "",
        due_date: "",
        subtotal: "",
        discount: "",
        discount_amount: "",
        total_amount: "",
        downpayment: "",
        balance: "",
        payment_method: "cash",
        payment_status: "pending",
        status: "pending",
        file: null,
    });

    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);
    const [selectedJobType, setSelectedJobType] = useState(null);

    // Get available job types based on selected category
    const availableJobTypes = useMemo(() => {
        if (!formData.category_id) return [];
        const category = jobCategories.find(cat => cat.id.toString() === formData.category_id.toString());
        return category?.job_types || [];
    }, [formData.category_id, jobCategories]);

    // Populate form if editing
    useEffect(() => {
        if (ticket) {
            const jobTypeId = ticket.job_type_id?.toString() || "";
            // Try to get category from job_type relationship, or find it from jobCategories
            let categoryId = "";
            if (ticket.job_type?.category_id) {
                categoryId = ticket.job_type.category_id.toString();
            } else if (jobTypeId) {
                // Find category by searching through jobCategories
                for (const cat of jobCategories) {
                    const found = cat.job_types?.find(jt => jt.id.toString() === jobTypeId);
                    if (found) {
                        categoryId = cat.id.toString();
                        break;
                    }
                }
            }
            
            setFormData({
                customer_id: ticket.customer_id || customerId || "",
                description: ticket.description || "",
                category_id: categoryId,
                job_type_id: jobTypeId,
                quantity: ticket.quantity || 1,
                size_value: ticket.size_value || "",
                size_unit: ticket.size_unit || "",
                due_date: ticket.due_date ? (ticket.due_date.includes('T') ? ticket.due_date.split('T')[0] : ticket.due_date) : "",
                subtotal: ticket.subtotal || ticket.total_amount || "",
                discount: ticket.discount || "",
                discount_amount: "",
                total_amount: ticket.total_amount || "",
                downpayment: ticket.downpayment || "",
                balance: "",
                payment_method: ticket.payment_method || "cash",
                payment_status: ticket.payment_status || "pending",
                status: ticket.status || "pending",
                file: null,
            });
        } else if (customerId) {
            setFormData((prev) => ({
                ...prev,
                customer_id: customerId,
            }));
        }
    }, [ticket, customerId, jobCategories]);

    // Update selected job type when job_type_id changes
    useEffect(() => {
        if (formData.job_type_id) {
            const jobType = availableJobTypes.find(jt => jt.id.toString() === formData.job_type_id.toString());
            setSelectedJobType(jobType || null);
            
            // Auto-fill price and promo if job type is selected
            if (jobType) {
                setFormData(prev => ({
                    ...prev,
                    subtotal: (jobType.price * (prev.quantity || 1)).toFixed(2),
                }));
            }
        } else {
            setSelectedJobType(null);
        }
    }, [formData.job_type_id, availableJobTypes]);

    // Auto-calculate totals when quantity, subtotal, discount, or downpayment changes
    useEffect(() => {
        const quantity = parseFloat(formData.quantity) || 0;
        const subtotal = parseFloat(formData.subtotal) || 0;
        const discountPercent = parseFloat(formData.discount) || 0;
        const downpayment = parseFloat(formData.downpayment) || 0;

        // Calculate discount amount
        const discountAmount = (subtotal * discountPercent) / 100;
        
        // Calculate total amount (subtotal - discount)
        const totalAmount = subtotal - discountAmount;
        
        // Calculate balance (total - downpayment)
        const balance = totalAmount - downpayment;

        setFormData(prev => ({
            ...prev,
            discount_amount: discountAmount.toFixed(2),
            total_amount: totalAmount.toFixed(2),
            balance: balance.toFixed(2),
        }));
    }, [formData.quantity, formData.subtotal, formData.discount, formData.downpayment]);

    // Auto-calculate subtotal when job type price or quantity changes
    useEffect(() => {
        if (selectedJobType && formData.quantity) {
            const quantity = parseFloat(formData.quantity) || 0;
            const price = parseFloat(selectedJobType.price) || 0;
            const subtotal = price * quantity;
            
            setFormData(prev => ({
                ...prev,
                subtotal: subtotal.toFixed(2),
            }));
        }
    }, [selectedJobType, formData.quantity]);

    const handleChange = (e) => {
        const { name, value, type, files } = e.target;

        if (type === "file") {
            setFormData((prev) => ({
                ...prev,
                [name]: files[0],
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: value,
            }));

            // Reset job type when category changes
            if (name === "category_id") {
                setFormData((prev) => ({
                    ...prev,
                    job_type_id: "",
                }));
                setSelectedJobType(null);
            }
        }

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

        if (!formData.customer_id) {
            newErrors.customer_id = "Customer is required";
        }

        if (!formData.description.trim()) {
            newErrors.description = "Description is required";
        }

        if (!formData.quantity || formData.quantity <= 0) {
            newErrors.quantity = "Quantity must be greater than 0";
        }

        if (!formData.due_date) {
            newErrors.due_date = "Due date is required";
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
        
        // Prepare data for submission
        const submitData = {
            ...formData,
            quantity: parseInt(formData.quantity),
            subtotal: parseFloat(formData.subtotal) || 0,
            discount: parseFloat(formData.discount) || 0,
            total_amount: parseFloat(formData.total_amount) || 0,
            downpayment: parseFloat(formData.downpayment) || 0,
        };

        onSubmit(submitData);

        setTimeout(() => {
            setProcessing(false);
        }, 1000);
    };

    const paymentStatusOptions = [
        { value: "pending", label: "Pending" },
        { value: "partial", label: "Partial" },
        { value: "paid", label: "Paid" },
    ];

    const statusOptions = [
        { value: "pending", label: "Pending" },
        { value: "in_production", label: "In Production" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
    ];

    const paymentMethodOptions = [
        { value: "cash", label: "Cash" },
        { value: "gcash", label: "GCash" },
        { value: "bank_account", label: "Bank Account" },
    ];

    const categoryOptions = jobCategories.map(cat => ({
        value: cat.id.toString(),
        label: cat.name
    }));

    const jobTypeOptions = availableJobTypes.map(jt => ({
        value: jt.id.toString(),
        label: `${jt.name} - ₱${parseFloat(jt.price).toFixed(2)}/${jt.price_by}`
    }));

    return (
        <form onSubmit={handleSubmit}>
            <div className="flex items-center my-4">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="px-4 text-gray-500 text-sm font-semibold">Job Details</span>
                <div className="flex-grow border-t border-gray-300"></div>
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
                        placeholder="Enter ticket description"
                        required
                        rows={1}
                    />
                </div>
            </div>

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
                        placeholder="Select Category"
                    />
                </div>

                <div className="col-md-6">
                    <FormInput
                        label="Job Type"
                        type="select"
                        name="job_type_id"
                        value={formData.job_type_id}
                        onChange={handleChange}
                        error={errors.job_type_id}
                        options={jobTypeOptions}
                        placeholder={formData.category_id ? "Select Job Type" : "Select category first"}
                        disabled={!formData.category_id}
                    />
                </div>
            </div>

            {/* Promo Display */}
            {selectedJobType?.promo_text && (
                <div className="row mb-3">
                    <div className="col-md-12">
                        <div className="alert alert-info" role="alert">
                            <i className="ti-gift mr-2"></i>
                            <strong>Promo:</strong> {selectedJobType.promo_text}
                        </div>
                    </div>
                </div>
            )}

            <div className="row">
                <div className="col-md-4">
                    <FormInput
                        label="Quantity"
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleChange}
                        error={errors.quantity}
                        placeholder="Enter quantity"
                        required
                        min="1"
                        step="1"
                    />
                </div>

                <div className="col-md-4">
                    <FormInput
                        label="Size Value"
                        name="size_value"
                        value={formData.size_value}
                        onChange={handleChange}
                        error={errors.size_value}
                        placeholder="e.g., 2x3, 3x5"
                    />
                </div>

                <div className="col-md-4">
                    <FormInput
                        label="Size Unit"
                        type="select"
                        name="size_unit"
                        value={formData.size_unit}
                        onChange={handleChange}
                        error={errors.size_unit}
                        options={[
                            { value: "ft", label: "ft" },
                            { value: "m", label: "m" },
                            { value: "cm", label: "cm" },
                            { value: "in", label: "in" },
                        ]}
                        placeholder="Select unit"
                    />
                </div>
            </div>

            <div className="row">
                <div className="col-md-4">
                    <FormInput
                        label="Due Date"
                        type="date"
                        name="due_date"
                        value={formData.due_date}
                        onChange={handleChange}
                        error={errors.due_date}
                        required
                    />
                </div>

                <div className="col-md-4">
                    <FormInput
                        label="Payment Method"
                        type="select"
                        name="payment_method"
                        value={formData.payment_method}
                        onChange={handleChange}
                        error={errors.payment_method}
                        options={paymentMethodOptions}
                        required
                    />
                </div>
                <div className="col-md-4">
                    <FormInput
                        label="Payment Status"
                        type="select"
                        name="payment_status"
                        value={formData.payment_status}
                        onChange={handleChange}
                        error={errors.payment_status}
                        options={paymentStatusOptions}
                        required
                    />
                </div>
            </div>

            

            <div className="flex items-center my-4">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="px-4 text-gray-500 text-sm font-semibold">Pricing & Payment</span>
                <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <div className="row">
                <div className="col-md-4">
                    <FormInput
                        label="Subtotal"
                        type="number"
                        name="subtotal"
                        value={formData.subtotal}
                        onChange={handleChange}
                        error={errors.subtotal}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        readOnly
                        className="bg-gray-50"
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
                <div className="col-md-4">
                    <FormInput
                        label="Discount Amount"
                        type="number"
                        name="discount_amount"
                        value={formData.discount_amount}
                        readOnly
                        className="bg-gray-50"
                    />
                </div>
            </div>

            <div className="row">
               

                <div className="col-md-4">
                    <FormInput
                        label="Total Amount"
                        type="number"
                        name="total_amount"
                        value={formData.total_amount}
                        onChange={handleChange}
                        error={errors.total_amount}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        readOnly
                        className="bg-gray-50 font-semibold"
                    />
                </div>
                <div className="col-md-4">
                    <FormInput
                        label="Downpayment"
                        type="number"
                        name="downpayment"
                        value={formData.downpayment}
                        onChange={handleChange}
                        error={errors.downpayment}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                    />
                </div>

                <div className="col-md-4">
                    <FormInput
                        label="Balance"
                        type="number"
                        name="balance"
                        value={formData.balance}
                        readOnly
                        className="bg-gray-50 font-semibold"
                    />
                </div>
            </div>


            <div className="row">

                <div className="col-md-12">
                    <FormInput
                        hidden={true}
                        label="Status"
                        type="select"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        error={errors.status}
                        options={statusOptions}
                        required
                    />
                </div>
            </div>

            <div className="row">
                <div className="col-md-12">
                    <FormInput
                        label="Attachment (Optional)"
                        type="file"
                        name="file"
                        onChange={handleChange}
                        error={errors.file}
                    />
                </div>
            </div>

            {/* Footer Summary */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                <div className="row">
                    <div className="col-md-3 text-center">
                        <label className="text-xs text-gray-500 block mb-1">Subtotal</label>
                        <div className="text-lg font-semibold text-gray-700">
                            ₱{parseFloat(formData.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="col-md-3 text-center">
                        <label className="text-xs text-gray-500 block mb-1">Discount</label>
                        <div className="text-lg font-semibold text-red-600">
                            -₱{parseFloat(formData.discount_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="col-md-3 text-center">
                        <label className="text-xs text-gray-500 block mb-1">Total Amount</label>
                        <div className="text-xl font-bold text-blue-700">
                            ₱{parseFloat(formData.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="col-md-3 text-center">
                        <label className="text-xs text-gray-500 block mb-1">Balance</label>
                        <div className={`text-lg font-semibold ${parseFloat(formData.balance || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            ₱{parseFloat(formData.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 d-flex justify-content-end gap-2">
                <button
                    type="button"
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
                    onClick={onCancel}
                    disabled={processing}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={processing}
                    className={`px-5 py-2.5 text-sm font-medium text-white rounded-lg transition
                        ${processing ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-400"}
                    `}
                >
                    {processing ? (
                        <span className="flex items-center">
                            <i className="ti-reload mr-2 animate-spin"></i> Saving...
                        </span>
                    ) : (
                        <span className="flex items-center">
                            <i className="ti-save mr-2"></i> {ticket ? "Update" : "Save"}
                        </span>
                    )}
                </button>
            </div>
        </form>
    );
}
