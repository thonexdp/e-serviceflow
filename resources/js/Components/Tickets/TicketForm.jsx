// Components/Tickets/TicketForm.jsx
import React, { useState, useEffect } from "react";
import FormInput from "@/Components/Common/FormInput";

export default function TicketForm({ ticket = null, customerId = null, onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        customer_id: customerId || "",
        description: "",
        quantity: "",
        due_date: "",
        total_amount: "",
        payment_status: "pending",
        status: "pending",
        file: null,
    });

    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);

    // Populate form if editing
    useEffect(() => {
        if (ticket) {
            setFormData({
                customer_id: ticket.customer_id || customerId || "",
                description: ticket.description || "",
                quantity: ticket.quantity || "",
                due_date: ticket.due_date || "",
                total_amount: ticket.total_amount || "",
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
    }, [ticket, customerId]);

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

        if (!formData.total_amount || formData.total_amount <= 0) {
            newErrors.total_amount = "Amount must be greater than 0";
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

        // Reset processing state after a delay
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

    return (
        <form onSubmit={handleSubmit}>
            <div className="flex items-center my-4">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="px-4 text-gray-500 text-sm">Ticket Details</span>
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
                        rows={4}
                    />
                </div>
            </div>

            <div className="row">
                <div className="col-md-6">
                    <FormInput
                        label="Quantity"
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleChange}
                        error={errors.quantity}
                        placeholder="Enter quantity"
                        required
                    />
                </div>

                <div className="col-md-6">
                    <FormInput
                        label="Total Amount"
                        type="number"
                        name="total_amount"
                        value={formData.total_amount}
                        onChange={handleChange}
                        error={errors.total_amount}
                        placeholder="Enter amount"
                        required
                    />
                </div>
            </div>

            <div className="row">
                <div className="col-md-6">
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

                <div className="col-md-6">
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

            <div className="row">
                <div className="col-md-6">
                    <FormInput
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

                <div className="col-md-6">
                    <FormInput
                        label="Attachment (Optional)"
                        type="file"
                        name="file"
                        onChange={handleChange}
                        error={errors.file}
                    />
                </div>
            </div>

            <div className="mt-4 d-flex justify-content-end gap-2">
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onCancel}
                    disabled={processing}
                >
                    Cancel
                </button>
                <button type="submit"
                disabled={processing}
                className={`px-5 py-2.5 text-sm font-medium text-white rounded-lg transition
                                ${processing ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-400"}
                            `}
                >
                    {processing ? "Saving..." : ticket ? "Update" : "Save"}
                </button>
            </div>
        </form>
    );
}