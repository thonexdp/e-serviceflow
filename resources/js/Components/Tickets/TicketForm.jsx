// Components/Tickets/TicketForm.jsx
import React, { useState, useEffect, useMemo } from "react";
import FormInput from "@/Components/Common/FormInput";
import { usePage } from "@inertiajs/react";

const parseSizeValue = (value) => {
    if (!value) {
        return { width: "", height: "" };
    }
    const parts = value.split("x");
    if (parts.length >= 2) {
        return {
            width: parts[0].replace(/[^\d.]/g, "").trim(),
            height: parts[1].replace(/[^\d.]/g, "").trim(),
        };
    }
    return { width: "", height: "" };
};

const Section = ({ title, children }) => (
    <div className="mb-4 pb-3 border-bottom">
        <h5 className="mb-3">{title}</h5>
        {children}
    </div>
);

const PromoBox = ({ text }) => (
    <div className="alert alert-info mt-2">
        <i className="ti-gift mr-2"></i>
        <strong>Promo:</strong> {text}
    </div>
);

export default function TicketForm({
    ticket = null,
    customerId = null,
    onSubmit,
    onCancel,
}) {
    const { jobCategories = [] } = usePage().props;

    const [formData, setFormData] = useState({
        customer_id: customerId || "",
        description: "",
        category_id: "",
        job_type_id: "",
        quantity: "",
        size_value: "",
        size_unit: "",
        size_rate_id: "",
        size_width: "",
        size_height: "",
        due_date: "",
        subtotal: "",
        discount: "",
        discount_amount: "",
        total_amount: "",
        downpayment: "",
        balance: "",
        change: "",
        payment_method: "cash",
        payment_status: "",
        status: "pending",
        file: null,
    });

    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);
    const [selectedJobType, setSelectedJobType] = useState(null);
    const [sizeDimensions, setSizeDimensions] = useState({
        width: "",
        height: "",
    });
    const [selectedSizeRateId, setSelectedSizeRateId] = useState(null);

    const [selectedImages, setSelectedImages] = useState([]);
    const [activeImageTab, setActiveImageTab] = useState(0);
    const [enableDiscount, setEnableDiscount] = useState(false);

    // Get available job types based on selected category
    const availableJobTypes = useMemo(() => {
        if (!formData.category_id) return [];
        const category = jobCategories.find(
            (cat) => cat.id.toString() === formData.category_id.toString()
        );
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
                    const found = cat.job_types?.find(
                        (jt) => jt.id.toString() === jobTypeId
                    );
                    if (found) {
                        categoryId = cat.id.toString();
                        break;
                    }
                }
            }

            const parsedSize = parseSizeValue(ticket.size_value);

            setFormData({
                customer_id: ticket.customer_id || customerId || "",
                description: ticket.description || "",
                category_id: categoryId,
                job_type_id: jobTypeId,
                quantity: ticket.quantity || 1,
                size_value: ticket.size_value || "",
                size_unit: ticket.size_unit || "",
                size_rate_id: "",
                size_width: parsedSize.width,
                size_height: parsedSize.height,
                due_date: ticket.due_date
                    ? ticket.due_date.includes("T")
                        ? ticket.due_date.split("T")[0]
                        : ticket.due_date
                    : "",
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
            setSizeDimensions(parsedSize);
            setEnableDiscount(parseFloat(ticket.discount) > 0);
        } else if (customerId) {
            setFormData((prev) => ({
                ...prev,
                customer_id: customerId,
            }));
            setSizeDimensions({ width: "", height: "" });
        }
    }, [ticket, customerId, jobCategories]);

    // Update selected job type when job_type_id changes
    useEffect(() => {
        if (formData.job_type_id) {
            const jobType = availableJobTypes.find(
                (jt) => jt.id.toString() === formData.job_type_id.toString()
            );
            setSelectedJobType(jobType || null);

            // Auto-fill price and promo if job type is selected
            console.log("Selected Job Type:", jobType);
            if (jobType) {
                setFormData((prev) => ({
                    ...prev,
                    discount: jobType.discount || prev.discount,
                    subtotal: (jobType.price * (prev.quantity || 1)).toFixed(2),
                }));
            }
            console.log("Form Data after job type change:", formData);
        } else {
            setSelectedJobType(null);
        }
    }, [formData.job_type_id, availableJobTypes]);

    useEffect(() => {
        const sizeRates = selectedJobType?.size_rates || [];
        if (sizeRates.length > 0) {
            const defaultRate =
                sizeRates.find((rate) => rate.is_default) ?? sizeRates[0];
            setSelectedSizeRateId(defaultRate?.id?.toString() || null);
            if (!sizeDimensions.width && !sizeDimensions.height) {
                setSizeDimensions({ width: "", height: "" });
            }
        } else {
            setSelectedSizeRateId(null);
        }
    }, [selectedJobType]);

    useEffect(() => {
        setFormData((prev) => ({
            ...prev,
            size_rate_id: selectedSizeRateId || "",
        }));
    }, [selectedSizeRateId]);

    useEffect(() => {
        if (
            ticket &&
            ticket.customer_files &&
            ticket.customer_files.length > 0
        ) {
            const existingImages = ticket.customer_files.map((attachment) => ({
                preview:
                    attachment.file_path || `/storage/${attachment.filepath}`,
                file: null,
                existing: true,
                id: attachment.id,
                name: attachment.filename,
            }));
            setSelectedImages(existingImages);
            setActiveImageTab(0);
        } else {
            setSelectedImages([]);
            setActiveImageTab(0);
        }
    }, [ticket]);

    // Auto-calculate totals when quantity, subtotal, discount, or downpayment changes
    useEffect(() => {
        const quantity = parseFloat(formData.quantity) || 0;
        const subtotal = parseFloat(formData.subtotal) || 0;
        const discountPercent = enableDiscount
            ? parseFloat(formData.discount) || 0
            : 0;
        const downpayment = parseFloat(formData.downpayment) || 0;

        // Calculate discount amount
        const discountAmount = (subtotal * discountPercent) / 100;

        // Calculate total amount (subtotal - discount)
        const totalAmount = subtotal - discountAmount;

        // Calculate balance and change
        const difference = downpayment - totalAmount;
        const balance = difference < 0 ? Math.abs(difference) : 0;
        const change = difference > 0 ? difference : 0;

        setFormData((prev) => ({
            ...prev,
            discount_amount: discountAmount.toFixed(2),
            total_amount: totalAmount.toFixed(2),
            balance: balance.toFixed(2),
            change: change.toFixed(2),
        }));
    }, [
        formData.quantity,
        formData.subtotal,
        formData.discount,
        formData.downpayment,
        enableDiscount,
    ]);

    const priceTiers = selectedJobType?.price_tiers || [];
    const sizeRates = selectedJobType?.size_rates || [];
    const hasPriceTiers = priceTiers.length > 0;
    const hasSizeRates = sizeRates.length > 0;
    const currentSizeRate = hasSizeRates
        ? sizeRates.find(
              (rate) =>
                  rate.id?.toString() === (selectedSizeRateId || "").toString()
          ) ||
          sizeRates.find((rate) => rate.is_default) ||
          sizeRates[0]
        : null;

    useEffect(() => {
        if (!selectedJobType) {
            return;
        }

        const quantity = parseFloat(formData.quantity) || 0;
        if (quantity <= 0) {
            return;
        }

        let subtotal = 0;
        let computedSizeUnit = formData.size_unit;
        let computedSizeValue = formData.size_value;

        if (sizeRates.length > 0) {
            const variant =
                sizeRates.find(
                    (rate) =>
                        rate.id?.toString() ===
                        (selectedSizeRateId || "").toString()
                ) ||
                sizeRates.find((rate) => rate.is_default) ||
                sizeRates[0];

            const width = parseFloat(sizeDimensions.width) || 0;
            const height = parseFloat(sizeDimensions.height) || 0;

            if (
                variant &&
                width > 0 &&
                (variant.calculation_method === "length" || height > 0)
            ) {
                const measurement =
                    variant.calculation_method === "length"
                        ? width
                        : width * height;
                subtotal =
                    measurement * parseFloat(variant.rate || 0) * quantity;
                computedSizeUnit = variant.dimension_unit;
                computedSizeValue =
                    variant.calculation_method === "length"
                        ? `${width} ${variant.dimension_unit}`
                        : `${width} x ${height}`;
            } else {
                subtotal = 0;
            }
        } else if (priceTiers.length > 0) {
            const tier = [...priceTiers]
                .filter(
                    (tier) =>
                        quantity >= tier.min_quantity &&
                        (!tier.max_quantity || quantity <= tier.max_quantity)
                )
                .sort((a, b) => a.min_quantity - b.min_quantity)
                .pop();
            const unitPrice = tier
                ? parseFloat(tier.price)
                : parseFloat(selectedJobType.price || 0);
            subtotal = unitPrice * quantity;
        } else {
            subtotal = (parseFloat(selectedJobType.price) || 0) * quantity;
        }

        const subtotalFormatted = subtotal ? subtotal.toFixed(2) : "0.00";

        setFormData((prev) => {
            const updated = { ...prev };
            let changed = false;

            if (prev.subtotal !== subtotalFormatted) {
                updated.subtotal = subtotalFormatted;
                changed = true;
            }

            if (computedSizeUnit && prev.size_unit !== computedSizeUnit) {
                updated.size_unit = computedSizeUnit;
                changed = true;
            }

            if (computedSizeValue && prev.size_value !== computedSizeValue) {
                updated.size_value = computedSizeValue;
                changed = true;
            }

            return changed ? updated : prev;
        });
    }, [
        selectedJobType,
        formData.quantity,
        selectedSizeRateId,
        sizeDimensions.width,
        sizeDimensions.height,
    ]);

    const clearError = (field) => {
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleChange = (e) => {
        const { name, value, type, files } = e.target;

        if (type === "file") {
            if (files && files.length > 0) {
                const newImages = Array.from(files).map((file) => ({
                    file,
                    preview: URL.createObjectURL(file),
                    existing: false,
                }));
                setSelectedImages((prev) => [...prev, ...newImages]);
                // setFormData((prev) => ({
                //     ...prev,
                //     file: files[0],
                // }));
                e.target.value = "";
            }
            clearError(name);
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
                setSelectedSizeRateId(null);
                setSizeDimensions({ width: "", height: "" });
            }

            if (name === "job_type_id") {
                setSelectedSizeRateId(null);
                setSizeDimensions({ width: "", height: "" });
            }
        }

        clearError(name);
    };

    const removeImage = (index) => {
        setSelectedImages((prev) => {
            const updated = prev.filter((_, i) => i !== index);
            if (activeImageTab >= updated.length && activeImageTab > 0) {
                setActiveImageTab(updated.length - 1);
            } else if (updated.length === 0) {
                setActiveImageTab(0);
            }
            return updated;
        });
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

        if (sizeRates.length > 0) {
            const currentRate =
                sizeRates.find(
                    (rate) =>
                        rate.id?.toString() ===
                        (selectedSizeRateId || "").toString()
                ) ||
                sizeRates.find((rate) => rate.is_default) ||
                sizeRates[0];

            const widthVal = parseFloat(sizeDimensions.width);
            if (!widthVal || widthVal <= 0) {
                newErrors.size_width = "Width is required";
            }

            if (currentRate && currentRate.calculation_method !== "length") {
                const heightVal = parseFloat(sizeDimensions.height);
                if (!heightVal || heightVal <= 0) {
                    newErrors.size_height = "Height is required";
                }
            }
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
            discount: enableDiscount ? parseFloat(formData.discount) || 0 : 0,
            total_amount: parseFloat(formData.total_amount) || 0,
            downpayment: parseFloat(formData.downpayment) || 0,
            size_rate_id: selectedSizeRateId,
            size_width: sizeDimensions.width,
            size_height: sizeDimensions.height,
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

    const categoryOptions = jobCategories.map((cat) => ({
        value: cat.id.toString(),
        label: cat.name,
    }));

    const jobTypeOptions = availableJobTypes.map((jt) => {
        let label = jt.name;
        if (jt.price_tiers && jt.price_tiers.length > 0) {
            label += " (Tiered Pricing)";
        } else if (jt.size_rates && jt.size_rates.length > 0) {
            label += " (Size-Based)";
        } else {
            label += ` - ₱${parseFloat(jt.price).toFixed(2)}/${jt.price_by}`;
        }
        return {
            value: jt.id.toString(),
            label,
        };
    });

    return (
        <>
            <form onSubmit={handleSubmit} className="row">
                {/* LEFT COLUMN — IMAGE PREVIEW */}
                <div className="col-md-3">
                    <div className="sticky-top">
                        {/* Pricing Summary Card */}
                        <div className="card shadow-sm border-0">
                            <div className="card-body">
                                <Section title="Pricing Summary">
                                    <div className="space-y-2">
                                        {/* Subtotal */}
                                        <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                                            <span className="text-muted small text-uppercase font-weight-bold">
                                                Subtotal
                                            </span>
                                            <span className="font-weight-bold">
                                                ₱
                                                {parseFloat(
                                                    formData.subtotal || 0
                                                ).toLocaleString("en-US", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </span>
                                        </div>

                                        {/* Discount */}
                                        <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                                            <span className="text-muted small Billing text-uppercase font-weight-bold">
                                                Discount
                                            </span>
                                            <span className="text-danger font-weight-bold">
                                                -₱
                                                {parseFloat(
                                                    formData.discount_amount ||
                                                        0
                                                ).toLocaleString("en-US", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </span>
                                        </div>

                                        {/* Total Amount */}
                                        <div className="d-flex justify-content-between align-items-center py-3 rounded">
                                            <span className="small text-uppercase font-weight-bold">
                                                Total Amount
                                            </span>
                                            <span
                                                style={{ fontSize: "1.25rem" }}
                                                className="font-weight-bold"
                                            >
                                                ₱
                                                {parseFloat(
                                                    formData.total_amount || 0
                                                ).toLocaleString("en-US", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </span>
                                        </div>

                                        {/* Balance */}
                                        {/* {parseFloat(formData.balance || 0) > 0 && ( */}
                                        <div className="d-flex justify-content-between align-items-center py-2 border-top">
                                            <span className="text-muted small text-uppercase font-weight-bold">
                                                Balance
                                            </span>
                                            <span className="text-warning font-weight-bold">
                                                ₱
                                                {parseFloat(
                                                    formData.balance || 0
                                                ).toLocaleString("en-US", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </span>
                                        </div>
                                        {/* )} */}

                                        {/* Change (Sukli) */}
                                        {/* {parseFloat(formData.change || 0) > 0 && ( */}
                                        <div className="d-flex justify-content-between align-items-center py-2 border-top rounded">
                                            <span className="text-success small text-uppercase font-weight-bold">
                                                Change
                                            </span>
                                            <span
                                                className="text-success font-weight-bold"
                                                style={{ fontSize: "1.1rem" }}
                                            >
                                                ₱
                                                {parseFloat(
                                                    formData.change || 0
                                                ).toLocaleString("en-US", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </span>
                                        </div>
                                        {/* )} */}
                                    </div>
                                </Section>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN — ALL FORM FIELDS */}
                <div className="col-md-9">
                    {/* JOB DETAILS */}
                    <Section title="Job Details">
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
                            <div className="col-md-5">
                                <FormInput
                                    label="Category"
                                    type="select"
                                    name="category_id"
                                    value={formData.category_id}
                                    onChange={handleChange}
                                    error={errors.category_id}
                                    options={categoryOptions}
                                    placeholder="Select Category"
                                    required
                                />
                            </div>

                            <div className="col-md-5">
                                <FormInput
                                    label="Job Type"
                                    type="select"
                                    name="job_type_id"
                                    value={formData.job_type_id}
                                    onChange={handleChange}
                                    error={errors.job_type_id}
                                    options={jobTypeOptions}
                                    placeholder={
                                        formData.category_id
                                            ? "Select Job Type"
                                            : "Select category first"
                                    }
                                    disabled={!formData.category_id}
                                    required
                                />
                            </div>
                            <div className="col-md-2">
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
                        </div>

                        {/* Promo Display */}
                        {selectedJobType?.promo_text && (
                            <div className="row mb-3">
                                <div className="col-md-12">
                                    <div
                                        className="alert alert-info"
                                        role="alert"
                                    >
                                        <i className="ti-gift mr-2"></i>
                                        <strong>Promo:</strong>{" "}
                                        {selectedJobType.promo_text}
                                    </div>
                                </div>
                            </div>
                        )}
                    </Section>

                    {hasPriceTiers && (
                        <div className="alert alert-light border mt-3">
                            <div className="alert alert-info" role="alert">
                                <i className="fa fa-info-circle"></i>{" "}
                                <strong>Promo:</strong> Bulk Pricing for 
                            </div>
                            <div className="table-responsive">
                                <table className="table table-sm mb-0">
                                    <thead>
                                        <tr>
                                            <th>Label</th>
                                            <th>Quantity Range</th>
                                            <th>Price / Unit</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {priceTiers.map((tier) => (
                                            <tr
                                                key={
                                                    tier.id ||
                                                    `${tier.min_quantity}-${tier.max_quantity}`
                                                }
                                            >
                                                <td>{tier.label || "Tier"}</td>
                                                <td>
                                                    {tier.min_quantity}
                                                    {tier.max_quantity
                                                        ? ` - ${tier.max_quantity}`
                                                        : "+"}
                                                </td>
                                                <td>
                                                    ₱
                                                    {parseFloat(
                                                        tier.price
                                                    ).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {selectedJobType?.promo_text && (
                        <PromoBox text={selectedJobType.promo_text} />
                    )}
                    {hasSizeRates && (
                        <div className="my-3">
                            {/* <div className="card-body"> */}
                            <h5 className="mb-3">Size-Based Pricing</h5>
                            <div className="row">
                                <div className="col-md-4">
                                    <FormInput
                                        label="Print Option"
                                        type="select"
                                        name="size_rate_id"
                                        value={selectedSizeRateId || ""}
                                        onChange={(e) =>
                                            setSelectedSizeRateId(
                                                e.target.value
                                            )
                                        }
                                        options={sizeRates.map((rate) => ({
                                            value: rate.id?.toString(),
                                            label: `${
                                                rate.variant_name || "Variant"
                                            } - ₱${parseFloat(
                                                rate.rate
                                            ).toFixed(2)} per ${
                                                rate.calculation_method ===
                                                "length"
                                                    ? rate.dimension_unit
                                                    : `${rate.dimension_unit}²`
                                            }`,
                                        }))}
                                    />
                                </div>
                                <div className="col-md-4">
                                    <FormInput
                                        label={`Width (${
                                            currentSizeRate?.dimension_unit ||
                                            "unit"
                                        })`}
                                        type="number"
                                        name="size_width"
                                        value={sizeDimensions.width}
                                        onChange={(e) => {
                                            setSizeDimensions((prev) => ({
                                                ...prev,
                                                width: e.target.value,
                                            }));
                                            clearError("size_width");
                                        }}
                                        error={errors.size_width}
                                        min="0"
                                        step="0.01"
                                        placeholder="Width"
                                    />
                                </div>
                                {currentSizeRate?.calculation_method !==
                                    "length" && (
                                    <div className="col-md-4">
                                        <FormInput
                                            label={`Height (${
                                                currentSizeRate?.dimension_unit ||
                                                "unit"
                                            })`}
                                            type="number"
                                            name="size_height"
                                            value={sizeDimensions.height}
                                            onChange={(e) => {
                                                setSizeDimensions((prev) => ({
                                                    ...prev,
                                                    height: e.target.value,
                                                }));
                                                clearError("size_height");
                                            }}
                                            error={errors.size_height}
                                            min="0"
                                            step="0.01"
                                            placeholder="Height"
                                        />
                                    </div>
                                )}
                            </div>
                            {currentSizeRate && (
                                <p className="text-muted text-sm mt-2">
                                    Rate: ₱
                                    {parseFloat(currentSizeRate.rate).toFixed(
                                        2
                                    )}{" "}
                                    per{" "}
                                    {currentSizeRate.calculation_method ===
                                    "length"
                                        ? currentSizeRate.dimension_unit
                                        : `${currentSizeRate.dimension_unit}²`}
                                </p>
                            )}
                            {/* </div> */}
                            <hr />
                        </div>
                    )}

                    {/* SCHEDULE & PAYMENT */}
                    <Section title="Schedule & Payment">
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
                                    label={`Payment Status ${formData.payment_status}`}
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
                    </Section>

                    {/* BILLING */}
                    <Section title="Billing">
                        <div className="row">
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

                            <div className="col-md-3">
                                <div className="custom-control custom-checkbox float-end">
                                    <input
                                        type="checkbox"
                                        className="custom-control-input"
                                        id="enableDiscount"
                                        checked={enableDiscount}
                                        onChange={(e) => {
                                            setEnableDiscount(e.target.checked);
                                            // if (!e.target.checked) {
                                            //     setFormData((prev) => ({
                                            //         ...prev,
                                            //         discount: "",
                                            //         discount_amount: "0.00",
                                            //     }));
                                            // }
                                        }}
                                    />
                                    <label
                                        className="custom-control-label"
                                        htmlFor="enableDiscount"
                                    >
                                        <i className="ti-cut mr-1"></i>{" "}
                                        <small>Add Discount</small>
                                    </label>
                                </div>
                            </div>
                            <div className="col-md-2">
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
                                    disabled={!enableDiscount}
                                />
                            </div>
                            <div className="col-md-3">
                                <FormInput
                                    label="Discount Amount"
                                    type="number"
                                    name="discount_amount"
                                    value={formData.discount_amount}
                                    readOnly
                                    className="bg-light"
                                    disabled={!enableDiscount}
                                />
                            </div>
                        </div>

                        {/* {enableDiscount && ( */}
                        {/* <div className="row mt-3">
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
                            className="bg-light"
                        />
                    </div>
                </div> */}
                        {/* )} */}
                    </Section>
                    <Section title="Attachments">
                        <div className="card shadow-sm border-0">
                            <div className="card-body">
                                {/* <h6 className="card-title mb-3"> */}
                                <i className="ti-image mr-2"></i>Attachments
                                {/* </h6> */}
                                <FormInput
                                    type="file"
                                    name="file"
                                    onChange={handleChange}
                                    error={errors.file}
                                    accept="image/*"
                                    multiple
                                />
                                {/* Image Tabs */}
                                {selectedImages.length > 0 && (
                                    <div className="mt-3">
                                        {selectedImages.length > 1 && (
                                            <div
                                                className="nav nav-pills nav-fill gap-2 mb-3"
                                                role="tablist"
                                            >
                                                {selectedImages.map(
                                                    (_, index) => (
                                                        <button
                                                            key={index}
                                                            type="button"
                                                            className={`nav-link btn-sm py-1 px-2 ${
                                                                activeImageTab ===
                                                                index
                                                                    ? "active"
                                                                    : ""
                                                            }`}
                                                            onClick={() =>
                                                                setActiveImageTab(
                                                                    index
                                                                )
                                                            }
                                                            style={{
                                                                fontSize:
                                                                    "0.75rem",
                                                            }}
                                                        >
                                                            <i className="ti-image mr-1"></i>
                                                            Image {index + 1}
                                                            {selectedImages[
                                                                index
                                                            ].existing && (
                                                                <span className="badge badge-success ml-1">
                                                                    Existing
                                                                </span>
                                                            )}
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        )}

                                        {/* Image Preview */}
                                        <div
                                            className="border rounded overflow-hidden bg-light"
                                            style={{
                                                aspectRatio: "1",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <img
                                                src={
                                                    selectedImages[
                                                        activeImageTab
                                                    ].preview
                                                }
                                                alt={`Preview ${
                                                    activeImageTab + 1
                                                }`}
                                                className="img-fluid"
                                                style={{
                                                    maxHeight: "100%",
                                                    maxWidth: "100%",
                                                    objectFit: "contain",
                                                }}
                                            />
                                        </div>

                                        {/* Image Counter */}
                                        <div className="text-muted small mt-2 text-center">
                                            {activeImageTab + 1} of{" "}
                                            {selectedImages.length}
                                        </div>

                                        {/* Remove Button */}
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-danger w-100 mt-2"
                                            onClick={() =>
                                                removeImage(activeImageTab)
                                            }
                                        >
                                            <i className="ti-trash mr-1"></i>
                                            Remove Image
                                        </button>
                                    </div>
                                )}
                                {selectedImages.length === 0 && (
                                    <div className="border rounded p-5 text-center text-muted bg-light">
                                        <i
                                            className="ti-image"
                                            style={{ fontSize: "40px" }}
                                        ></i>
                                        <p className="mt-2 small">
                                            No images selected
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Section>

                    {/* ACTION BUTTONS */}
                    <div className="mt-4 d-flex justify-content-end gap-3">
                        <button
                            type="button"
                            className="btn btn-light"
                            onClick={onCancel}
                        >
                            <i className="ti-back-left mr-1"></i>Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={processing}
                        >
                            {processing ? (
                                <>
                                    <span
                                        className="spinner-border spinner-border-sm mr-2"
                                        role="status"
                                        aria-hidden="true"
                                    ></span>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <i className="ti-save-alt mr-1"></i>Save
                                    Ticket
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </>
    );
}
