
import React, { useState, useEffect, useMemo } from "react";
import { getColorName, getFullColorName } from "@/Utils/colors";
import FormInput from "@/Components/Common/FormInput";
import TiptapEditor from "@/Components/Common/TiptapEditor";
import { usePage } from "@inertiajs/react";

const parseSizeValue = (value) => {
  if (!value) {
    return { width: "", height: "" };
  }
  const parts = value.split("x");
  if (parts.length >= 2) {
    return {
      width: parts[0].replace(/[^\d.]/g, "").trim(),
      height: parts[1].replace(/[^\d.]/g, "").trim()
    };
  }
  return { width: "", height: "" };
};

const Section = ({ title, children }) =>
  <div className="mb-4 pb-3 border-bottom">
    <h5 className="mb-3">{title}</h5>
    {children}
  </div>;


const PromoBox = ({ text }) =>
  <div className="alert alert-info mt-2">
    <i className="ti-gift mr-2" style={{ fontFamily: 'themify' }}></i>
    <strong>Promo:</strong> {text}
  </div>;


export default function TicketForm({
  ticket = null,
  customerId = null,
  onSubmit,
  onCancel,
  hasPermission,
  isPublic = false,
  branches = [],
  jobCategories: jobCategoriesProp = null
}) {
  const { jobCategories: jobCategoriesFromPage = [], auth } = usePage().props;
  const jobCategories = jobCategoriesProp ?? jobCategoriesFromPage;
  const userRole = auth?.user?.role;




  const canProcessPayment = false;//userRole === 'admin' || userRole === 'Cashier';
  const isFrontDesk = userRole === 'FrontDesk';

  const [formData, setFormData] = useState({
    customer_id: customerId || "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    description: "",
    category_id: "",
    job_type_id: "",
    custom_workflow_steps: [],
    quantity: "",
    free_quantity: 0,
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
    payment_status: "pending",
    initial_payment_reference: "",
    initial_payment_notes: "",
    initial_payment_or: "",
    status: "pending",
    file: null,
    order_branch_id: "",
    production_branch_id: "",
    // Others category fields
    custom_job_type_description: "",
    custom_price_mode: "per_item", // 'per_item' or 'fixed_total'
    custom_price_per_item: "",
    custom_fixed_total: "",
    is_size_based: false,
    custom_width: "",
    custom_height: "",
    selected_color: "",
    design_description: ""
  });

  const WORKFLOW_STEP_OPTIONS = [
    { key: 'printing', label: 'Printing', icon: 'ti-printer' },
    { key: 'lamination_heatpress', label: 'Lamination/Heatpress', icon: 'ti-layers' },
    { key: 'cutting', label: 'Cutting', icon: 'ti-cut' },
    { key: 'sewing', label: 'Sewing', icon: 'ti-pin-alt' },
    { key: 'dtf_press', label: 'DTF Press', icon: 'ti-stamp' },
    { key: 'embroidery', label: 'Embroidery', icon: 'ti-pencil-alt' },
    { key: 'knitting', label: 'Knitting', icon: 'ti-layout-grid2' },
    { key: 'lasser_cutting', label: 'Laser Cutting', icon: 'ti-bolt' },
    { key: 'qa', label: 'Quality Assurance', icon: 'ti-check-box' }
  ];

  const normalizeWorkflowSteps = (steps) => {
    if (!steps) return [];

    if (Array.isArray(steps)) {
      return steps;
    }

    if (typeof steps === 'object') {
      return Object.entries(steps)
        .filter(([, v]) => {
          if (v && typeof v === 'object' && 'enabled' in v) return !!v.enabled;
          return !!v;
        })
        .map(([k]) => k);
    }

    return [];
  };

  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  const [selectedJobType, setSelectedJobType] = useState(null);
  const [sizeDimensions, setSizeDimensions] = useState({
    width: "",
    height: ""
  });
  const [selectedSizeRateId, setSelectedSizeRateId] = useState(null);

  const [ticketAttachments, setTicketAttachments] = useState([]);
  const [activeAttachmentTab, setActiveAttachmentTab] = useState(0);
  const [paymentProofs, setPaymentProofs] = useState([]);
  const [activeProofTab, setActiveProofTab] = useState(0);
  const [enableDiscount, setEnableDiscount] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isOthersCategory, setIsOthersCategory] = useState(false);


  const availableJobTypes = useMemo(() => {
    if (!formData.category_id) return [];
    const category = jobCategories.find(
      (cat) => cat.id.toString() === formData.category_id.toString()
    );
    return category?.jobTypes || category?.job_types || [];
  }, [formData.category_id, jobCategories]);

  const jobTypeIdToCategoryId = useMemo(() => {
    const map = new Map();
    for (const cat of jobCategories || []) {
      const jobTypes = cat?.jobTypes || cat?.job_types || [];
      for (const jt of jobTypes) {
        if (jt?.id !== undefined && jt?.id !== null) {
          map.set(jt.id.toString(), cat.id.toString());
        }
      }
    }
    return map;
  }, [jobCategories]);

  const sortedJobCategories = useMemo(() => {
    return [...(jobCategories || [])].sort((a, b) =>
      (a?.name || "").localeCompare(b?.name || "")
    );
  }, [jobCategories]);

  const formatJobTypeLabel = (jt) => {
    let label = jt.name;
    if (jt.discount > 0) {
      label += ` (PROMO - ${parseFloat(jt.discount)}% OFF)`;
    } else if (jt.price_tiers && jt.price_tiers.length > 0) {
      label += " (Tiered Pricing)";
    } else if (jt.size_rates && jt.size_rates.length > 0) {
      label += " (Size-Based)";
    } else {
      label += ` - ₱${parseFloat(jt.price).toFixed(2)}/${jt.price_by}`;
    }
    return label;
  };


  useEffect(() => {
    if (ticket) {

      const jobTypeId = ticket.job_type_id?.toString() || "";

      // Check if it's a custom ticket:
      // 1. If job_type is a string (not an object), it's custom
      // 2. If job_type_id is null/empty and job_type exists as string
      // 3. If custom_job_type_description exists (for newer records)
      // 4. If custom_workflow_steps exists (indicates custom ticket)
      const isJobTypeString = typeof ticket.job_type === 'string';
      const hasCustomWorkflowSteps = ticket.custom_workflow_steps &&
        (Array.isArray(ticket.custom_workflow_steps) ? ticket.custom_workflow_steps.length > 0 :
          (typeof ticket.custom_workflow_steps === 'object' ? Object.keys(ticket.custom_workflow_steps).length > 0 : false));
      const isCustomTicket = isJobTypeString ||
        (!ticket.job_type_id && ticket.job_type) ||
        ticket.custom_job_type_description ||
        (!ticket.job_type_id && !ticket.job_type?.id) ||
        hasCustomWorkflowSteps;

      let categoryId = "";
      if (isCustomTicket) {
        categoryId = "others";
      } else if (ticket.job_type && typeof ticket.job_type === 'object' && ticket.job_type.category_id) {
        categoryId = ticket.job_type.category_id.toString();
        setIsOthersCategory(false);
      } else if (jobTypeId) {
        for (const cat of jobCategories) {
          const found = cat.job_types?.find(
            (jt) => jt.id.toString() === jobTypeId
          );
          if (found) {
            categoryId = cat.id.toString();
            setIsOthersCategory(false);
            break;
          }
        }
      }

      const parsedSize = parseSizeValue(ticket.size_value);

      // Parse custom size if it's a custom ticket with size
      let customWidth = "";
      let customHeight = "";
      let isSizeBased = false;
      if (isCustomTicket && ticket.size_value) {
        const customSize = parseSizeValue(ticket.size_value);
        customWidth = customSize.width;
        customHeight = customSize.height;
        isSizeBased = !!(customWidth || customHeight);
      }

      // Determine custom price mode - try to preserve existing mode if possible
      let customPriceMode = "per_item";
      let customPricePerItem = "";
      let customFixedTotal = "";

      if (isCustomTicket && ticket.total_amount) {
        const totalAmount = parseFloat(ticket.total_amount);
        const quantity = parseFloat(ticket.quantity) || 1;

        // If we have subtotal, use it to determine mode
        if (ticket.subtotal && parseFloat(ticket.subtotal) > 0) {
          const subtotal = parseFloat(ticket.subtotal);
          const pricePerItem = subtotal / quantity;

          // Check if it's a round number (likely per_item) or not (likely fixed_total)
          if (pricePerItem === Math.round(pricePerItem * 100) / 100 && pricePerItem > 0) {
            customPriceMode = "per_item";
            customPricePerItem = pricePerItem.toFixed(2);
          } else {
            customPriceMode = "fixed_total";
            customFixedTotal = subtotal.toFixed(2);
          }
        } else {
          // Fallback: use total_amount
          const pricePerItem = totalAmount / quantity;
          if (pricePerItem === Math.round(pricePerItem * 100) / 100 && pricePerItem > 0) {
            customPriceMode = "per_item";
            customPricePerItem = pricePerItem.toFixed(2);
          } else {
            customPriceMode = "fixed_total";
            customFixedTotal = totalAmount.toFixed(2);
          }
        }
      }

      // Get custom job type description - could be from job_type string or custom_job_type_description
      const customJobTypeDesc = ticket.custom_job_type_description ||
        (isJobTypeString ? ticket.job_type : "") ||
        "";

      // Ensure isOthersCategory is set before formData to avoid race conditions
      if (isCustomTicket) {
        setIsOthersCategory(true);
      }

      // Use original_price as subtotal if available, otherwise use subtotal or total_amount
      const ticketSubtotal = ticket.original_price || ticket.subtotal || ticket.total_amount || "";

      // Use discount_percentage if available, fallback to discount
      const ticketDiscount = ticket.discount_percentage || ticket.discount || "";

      setFormData({
        customer_id: ticket.customer_id || customerId || "",
        description: ticket.description || "",
        category_id: categoryId,
        job_type_id: jobTypeId,
        custom_workflow_steps: normalizeWorkflowSteps(ticket.custom_workflow_steps),
        quantity: ticket.quantity || 1,
        free_quantity: ticket.free_quantity || 0,
        size_value: ticket.size_value || "",
        size_unit: ticket.size_unit || "",
        size_rate_id: "",
        size_width: parsedSize.width,
        size_height: parsedSize.height,
        due_date: (() => {
          if (!ticket.due_date) return "";
          // Handle string dates (e.g., "2026-01-14" or "2026-01-14T00:00:00.000000Z")
          if (typeof ticket.due_date === 'string') {
            return ticket.due_date.split('T')[0].split(' ')[0];
          }
          // Handle Date objects
          if (ticket.due_date instanceof Date) {
            const year = ticket.due_date.getFullYear();
            const month = String(ticket.due_date.getMonth() + 1).padStart(2, '0');
            const day = String(ticket.due_date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
          return "";
        })(),
        subtotal: ticketSubtotal,
        discount: ticketDiscount,
        discount_amount: ticket.discount_amount || "",
        total_amount: ticket.total_amount || "",
        downpayment: ticket.downpayment || "",
        balance: "",
        payment_method: ticket.payment_method || "cash",
        payment_status: ticket.payment_status || "pending",
        status: ticket.status || "pending",
        file: null,
        initial_payment_reference: "",
        initial_payment_notes: "",
        initial_payment_or: "",
        order_branch_id: ticket.order_branch_id || "",
        production_branch_id: ticket.production_branch_id || "",
        // Custom fields
        custom_job_type_description: customJobTypeDesc,
        custom_price_mode: customPriceMode,
        custom_price_per_item: customPricePerItem,
        custom_fixed_total: customFixedTotal,
        is_size_based: isSizeBased,
        custom_width: customWidth,
        custom_height: customHeight,
        selected_color: ticket.selected_color || "",
        design_description: ticket.design_description || ""
      });
      setSizeDimensions(parsedSize);
      // Enable discount if ticket has discount_percentage, discount, or job type discount
      const hasDiscount = parseFloat(
        ticket.discount_percentage ||
        ticket.discount ||
        ticket.job_type?.discount ||
        0
      ) > 0;
      setEnableDiscount(hasDiscount);

      // Set selectedJobType if ticket has job_type object (for customer orders)
      if (ticket.job_type && typeof ticket.job_type === 'object') {
        setSelectedJobType(ticket.job_type);
      }
    } else if (customerId) {
      setFormData((prev) => ({
        ...prev,
        customer_id: customerId
      }));
      setSizeDimensions({ width: "", height: "" });
      setIsOthersCategory(false);
    }
  }, [ticket, customerId, jobCategories]);

  // Note: Workflow steps are now available for all tickets, not just "Others" category
  // We no longer auto-clear workflow steps when switching categories
  // Users can set workflow steps for any ticket type


  // Sync isOthersCategory with category_id - but only if category_id is set and not already synced
  useEffect(() => {
    // Only sync if category_id is explicitly set and different from current state
    if (formData.category_id === "others" && !isOthersCategory) {
      setIsOthersCategory(true);
    } else if (formData.category_id && formData.category_id !== "others" && isOthersCategory) {
      setIsOthersCategory(false);
    }
  }, [formData.category_id, isOthersCategory]);

  useEffect(() => {
    if (formData.job_type_id) {
      const jobType = availableJobTypes.find(
        (jt) => jt.id.toString() === formData.job_type_id.toString()
      );
      setSelectedJobType(jobType || null);


      if (jobType) {
        let newDiscount = jobType.discount;

        // When editing a ticket, prioritize ticket's stored discount over job type's discount
        if (ticket && ticket.job_type_id?.toString() === formData.job_type_id?.toString()) {
          // Check all possible discount sources (in order of priority)
          newDiscount = ticket.discount_percentage || // New field (highest priority)
            ticket.discount ||            // Old field
            ticket.job_type?.discount ||  // Job type's discount on ticket object
            jobType.discount;             // Current job type's discount (fallback)
        }

        setFormData((prev) => ({
          ...prev,
          discount: newDiscount !== undefined && newDiscount !== null ? newDiscount : prev.discount,
          subtotal: (jobType.price * (prev.quantity || 1)).toFixed(2)
        }));

        // Check if discount should be enabled
        const discountToCheck = newDiscount !== undefined && newDiscount !== null ?
          newDiscount :
          formData.discount;

        if (parseFloat(discountToCheck) > 0) {
          setEnableDiscount(true);
        }
      }
    } else {
      setSelectedJobType(null);
    }
  }, [formData.job_type_id, availableJobTypes, ticket]);

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
      size_rate_id: selectedSizeRateId || ""
    }));
  }, [selectedSizeRateId]);

  useEffect(() => {
    if (ticket && ticket.customer_files && ticket.customer_files.length > 0) {
      const existingImages = ticket.customer_files.map((attachment) => ({
        preview: attachment.file_path || attachment.file_path,
        file: null,
        existing: true,
        id: attachment.id,
        name: attachment.file_name
      }));
      setTicketAttachments(existingImages);
      setActiveAttachmentTab(0);
    } else {
      setTicketAttachments([]);
      setActiveAttachmentTab(0);
    }




    if (ticket && ticket.payments && ticket.payments.length > 0) {
      const firstPayment = ticket.payments[0];
      if (firstPayment.documents && firstPayment.documents.length > 0) {
        const existingProofs = firstPayment.documents.map((doc, index) => ({
          preview: doc.file_path,
          file: null,
          existing: true,
          id: doc.id,
          name: `Proof ${index + 1}`
        }));
        setPaymentProofs(existingProofs);
        setActiveProofTab(0);
      }
    } else {
      setPaymentProofs([]);
      setActiveProofTab(0);
    }
  }, [ticket]);


  useEffect(() => {
    const quantity = parseFloat(formData.quantity) || 0;
    const subtotal = parseFloat(formData.subtotal) || 0;
    const discountPercent = enableDiscount ?
      parseFloat(formData.discount) || 0 :
      0;
    const downpayment = parseFloat(formData.downpayment) || 0;


    const discountAmount = subtotal * discountPercent / 100;


    const totalAmount = subtotal - discountAmount;


    const difference = downpayment - totalAmount;
    const balance = difference < 0 ? Math.abs(difference) : 0;
    const change = difference > 0 ? difference : 0;

    setFormData((prev) => ({
      ...prev,
      discount_amount: discountAmount.toFixed(2),
      total_amount: totalAmount.toFixed(2),
      balance: balance.toFixed(2),
      change: change.toFixed(2)
    }));
  }, [
    formData.quantity,
    formData.subtotal,
    formData.discount,
    formData.downpayment,
    enableDiscount]
  );

  const priceTiers = selectedJobType?.price_tiers || [];
  const sizeRates = selectedJobType?.size_rates || [];
  const hasPriceTiers = priceTiers.length > 0;
  const hasSizeRates = sizeRates.length > 0;
  const subtotalValue = parseFloat(formData.subtotal || 0);
  const discountAmountValue = parseFloat(formData.discount_amount || 0);
  const totalAmountValue = parseFloat(formData.total_amount || 0);
  const downpaymentValue = parseFloat(formData.downpayment || 0);
  const remainingAfterDownpayment = Math.max(
    totalAmountValue - downpaymentValue,
    0
  );
  const currentSizeRate = hasSizeRates ?
    sizeRates.find(
      (rate) =>
        rate.id?.toString() === (selectedSizeRateId || "").toString()
    ) ||
    sizeRates.find((rate) => rate.is_default) ||
    sizeRates[0] :
    null;

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
        width > 0 && (
          variant.calculation_method === "length" || height > 0)) {
        const measurement =
          variant.calculation_method === "length" ?
            width :
            width * height;
        subtotal =
          measurement * parseFloat(variant.rate || 0) * quantity;
        computedSizeUnit = variant.dimension_unit;
        computedSizeValue =
          variant.calculation_method === "length" ?
            `${width} ${variant.dimension_unit}` :
            `${width} x ${height}`;
      } else {
        subtotal = 0;
      }
    } else if (priceTiers.length > 0) {
      const tier = [...priceTiers].
        filter(
          (tier) =>
            quantity >= tier.min_quantity && (
              !tier.max_quantity || quantity <= tier.max_quantity)
        ).
        sort((a, b) => a.min_quantity - b.min_quantity).
        pop();
      const unitPrice = tier ?
        parseFloat(tier.price) :
        parseFloat(selectedJobType.price || 0);
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


    if (selectedJobType?.promo_rules?.length > 0) {
      const qty = parseFloat(formData.quantity) || 0;
      let totalFree = 0;
      let promoDescription = "";


      const rules = [...selectedJobType.promo_rules].
        filter((r) => r.is_active).
        sort((a, b) => b.buy_quantity - a.buy_quantity);









      const applicableRule = rules.find((r) => qty >= r.buy_quantity);

      if (applicableRule) {
        const sets = Math.floor(qty / applicableRule.buy_quantity);
        totalFree = sets * applicableRule.free_quantity;
        promoDescription = applicableRule.description;
      }

      setFormData((prev) => {
        if (prev.free_quantity !== totalFree) {
          return { ...prev, free_quantity: totalFree };
        }
        return prev;
      });
    } else {
      setFormData((prev) => {
        if (prev.free_quantity !== 0) {
          return { ...prev, free_quantity: 0 };
        }
        return prev;
      });
    }

  }, [
    selectedJobType,
    formData.quantity,
    selectedSizeRateId,
    sizeDimensions.width,
    sizeDimensions.height]
  );

  // Subtotal calculation for 'Others' category
  useEffect(() => {
    if (!isOthersCategory) {
      return;
    }

    const quantity = parseFloat(formData.quantity) || 0;
    if (quantity <= 0) {
      return;
    }

    let subtotal = 0;

    if (formData.custom_price_mode === "per_item") {
      const pricePerItem = parseFloat(formData.custom_price_per_item) || 0;
      subtotal = pricePerItem * quantity;
    } else if (formData.custom_price_mode === "fixed_total") {
      subtotal = parseFloat(formData.custom_fixed_total) || 0;
    }

    const subtotalFormatted = subtotal ? subtotal.toFixed(2) : "0.00";

    setFormData((prev) => {
      if (prev.subtotal !== subtotalFormatted) {
        return { ...prev, subtotal: subtotalFormatted };
      }
      return prev;
    });
  }, [
    isOthersCategory,
    formData.quantity,
    formData.custom_price_mode,
    formData.custom_price_per_item,
    formData.custom_fixed_total,
    formData.is_size_based,
    formData.custom_width,
    formData.custom_height
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
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (name === "category_id") {
      const isOthers = value === "others";
      setIsOthersCategory(isOthers);
      // Only reset custom fields if switching FROM others TO another category
      // Don't reset if we're loading existing data or staying in others category
      if (!isOthers) {
        setFormData((prev) => ({
          ...prev,
          job_type_id: "",
          custom_job_type_description: "",
          custom_price_mode: "per_item",
          custom_price_per_item: "",
          custom_fixed_total: "",
          is_size_based: false,
          custom_width: "",
          custom_height: ""
        }));
      } else {
        // If switching TO others, only clear job_type_id
        setFormData((prev) => ({
          ...prev,
          job_type_id: ""
        }));
      }
      setSelectedJobType(null);
      setSelectedSizeRateId(null);
      setSizeDimensions({ width: "", height: "" });
    }

    if (name === "job_type_id") {
      setSelectedSizeRateId(null);
      setSizeDimensions({ width: "", height: "" });
    }

    clearError(name);
  };

  const groupedSelectionValue = isOthersCategory ? "others" : (formData.job_type_id || "");

  const handleGroupedJobTypeChange = (e) => {
    const value = e.target.value;

    if (!value) {
      handleChange({ target: { name: "category_id", value: "" } });
      return;
    }

    if (value === "others") {
      handleChange({ target: { name: "category_id", value: "others" } });
      return;
    }

    const categoryId = jobTypeIdToCategoryId.get(value.toString());
    if (categoryId) {
      handleChange({ target: { name: "category_id", value: categoryId } });
    }
    handleChange({ target: { name: "job_type_id", value } });
  };

  const MAX_FILE_SIZE_MB = 10;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const handleTicketAttachmentUpload = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    const validFiles = [];
    const invalidFiles = [];

    files.forEach((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        invalidFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      setUploadError(
        `The following files exceed the ${MAX_FILE_SIZE_MB}MB limit:\n${invalidFiles.join(
          "\n"
        )}`
      );
    } else {
      setUploadError(null);
    }

    if (validFiles.length === 0) {
      event.target.value = "";
      return;
    }

    const uploads = validFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      existing: false,
      name: file.name
    }));
    setTicketAttachments((prev) => [...prev, ...uploads]);
    event.target.value = "";
  };

  const removeTicketAttachment = (index) => {
    setTicketAttachments((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (activeAttachmentTab >= updated.length && activeAttachmentTab > 0) {
        setActiveAttachmentTab(updated.length - 1);
      } else if (updated.length === 0) {
        setActiveAttachmentTab(0);
      }
      return updated;
    });
  };

  const handlePaymentProofUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(`File exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
      event.target.value = "";
      return;
    }
    setUploadError(null);

    const upload = {
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    };

    setPaymentProofs([upload]);

    event.target.value = "";
  };

  const removePaymentProof = (index) => {
    setPaymentProofs((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (activeProofTab >= updated.length && activeProofTab > 0) {
        setActiveProofTab(updated.length - 1);
      } else if (updated.length === 0) {
        setActiveProofTab(0);
      }
      return updated;
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!isPublic && !formData.customer_id) {
      newErrors.customer_id = "Customer is required";
    }

    if (isPublic) {
      if (!formData.customer_name?.trim()) newErrors.customer_name = "Name is required";
      if (!formData.customer_email?.trim()) newErrors.customer_email = "Email is required";
      if (!formData.customer_phone?.trim()) newErrors.customer_phone = "Phone is required";
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

    if (!isOthersCategory && !formData.job_type_id) {
      newErrors.job_type_id = "Job type is required";
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

    // Validation for 'Others' category
    if (isOthersCategory) {
      if (!formData.custom_job_type_description?.trim()) {
        newErrors.custom_job_type_description = "Job type description is required";
      }

      // Only require workflow steps for "Others" category during creation
      // For editing existing tickets, workflow steps are recommended but not required here
      // (validation happens when changing status to "In Designer")
      if (!ticket && (!Array.isArray(formData.custom_workflow_steps) || formData.custom_workflow_steps.length === 0)) {
        newErrors.custom_workflow_steps = "Please select at least one production workflow step";
      }

      if (formData.custom_price_mode === "per_item") {
        const pricePerItem = parseFloat(formData.custom_price_per_item);
        if (!pricePerItem || pricePerItem <= 0) {
          newErrors.custom_price_per_item = "Price per item must be greater than 0";
        }
      } else if (formData.custom_price_mode === "fixed_total") {
        const fixedTotal = parseFloat(formData.custom_fixed_total);
        if (!fixedTotal || fixedTotal <= 0) {
          newErrors.custom_fixed_total = "Fixed total price must be greater than 0";
        }
      }

      if (formData.is_size_based) {
        if (!parseFloat(formData.custom_width) || parseFloat(formData.custom_width) <= 0) {
          newErrors.custom_width = "Width is required";
        }
        if (!parseFloat(formData.custom_height) || parseFloat(formData.custom_height) <= 0) {
          newErrors.custom_height = "Height is required";
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const toggleCustomWorkflowStep = (stepKey) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.custom_workflow_steps) ? prev.custom_workflow_steps : [];
      const exists = current.includes(stepKey);
      const next = exists ? current.filter((s) => s !== stepKey) : [...current, stepKey];
      return { ...prev, custom_workflow_steps: next };
    });

    clearError('custom_workflow_steps');
  };

  const handleSubmit = (e) => {
    e.preventDefault();


    if (!validateForm()) {
      return;
    }

    setProcessing(true);


    const submitData = {
      ...formData,
      job_type_id: isOthersCategory ? null : formData.job_type_id,
      quantity: parseInt(formData.quantity),
      free_quantity: parseInt(formData.free_quantity),
      subtotal: parseFloat(formData.subtotal) || 0,
      discount: enableDiscount ? parseFloat(formData.discount) || 0 : 0,
      total_amount: parseFloat(formData.total_amount) || 0,
      size_rate_id: selectedSizeRateId,
      size_width: isOthersCategory && formData.is_size_based ? formData.custom_width : sizeDimensions.width,
      size_height: isOthersCategory && formData.is_size_based ? formData.custom_height : sizeDimensions.height,
      // Convert is_size_based to proper boolean (0 or 1 for Laravel)
      is_size_based: isOthersCategory ? (formData.is_size_based ? 1 : 0) : 0,
      custom_workflow_steps: formData.custom_workflow_steps || [],
      ticketAttachments: ticketAttachments.
        filter((attachment) => !attachment.existing && attachment.file).
        map((attachment) => attachment.file)
    };


    // For custom tickets with size, format the size_value
    if (isOthersCategory && formData.is_size_based) {
      const width = parseFloat(formData.custom_width);
      const height = parseFloat(formData.custom_height);
      if (width > 0 && height > 0) {
        submitData.size_value = `${width} x ${height}`;
        submitData.size_unit = "custom";
      } else if (width > 0) {
        submitData.size_value = `${width}`;
        submitData.size_unit = "custom";
      }
    }

    // Clean up custom fields if not Others category (but keep workflow steps)
    if (!isOthersCategory) {
      delete submitData.custom_job_type_description;
      delete submitData.custom_price_mode;
      delete submitData.custom_price_per_item;
      delete submitData.custom_fixed_total;
      delete submitData.custom_width;
      delete submitData.custom_height;
      // Note: custom_workflow_steps is kept for all tickets
    }


    if (isFrontDesk && !ticket) {
      submitData.payment_status = 'pending';
      submitData.payment_method = 'cash';
      submitData.downpayment = 0;

      delete submitData.initial_payment_reference;
      delete submitData.initial_payment_notes;
      delete submitData.initial_payment_or;
    } else if (canProcessPayment) {

      submitData.downpayment = parseFloat(formData.downpayment) || 0;
      submitData.paymentProofs = paymentProofs.
        filter((proof) => proof.file).
        map((proof) => proof.file);
    } else {

      submitData.downpayment = parseFloat(formData.downpayment) || 0;
      if (paymentProofs.length > 0) {
        submitData.paymentProofs = paymentProofs.
          filter((proof) => proof.file).
          map((proof) => proof.file);
      }
    }

    onSubmit(submitData);

    setTimeout(() => {
      setProcessing(false);
    }, 1000);
  };

  const paymentStatusOptions = [
    { value: "pending", label: "Pending" },
    { value: "partial", label: "Partial" },
    { value: "paid", label: "Paid" },
    { value: "awaiting_verification", label: "Awaiting Verification" }];


  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "in_production", label: "In Production" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" }];


  const paymentMethodOptions = [
    { value: "cash", label: "Cash" },
    { value: "gcash", label: "GCash" },
    { value: "bank_account", label: "Bank Account" }];


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
                        {subtotalValue.toLocaleString(
                          "en-US",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }
                        )}
                      </span>
                    </div>

                    {/* Discount */}
                    {(enableDiscount || discountAmountValue > 0) && (
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom bg-success-subtle">
                        <span className="text-success small text-uppercase font-weight-bold">
                          <i className="ti-gift mr-1" style={{ fontFamily: 'themify' }}></i>
                          Discount {parseFloat(formData.discount || 0) > 0 && `(${parseFloat(formData.discount).toFixed(2)}%)`}
                        </span>
                        <span className="text-success font-weight-bold">
                          -₱
                          {discountAmountValue.toLocaleString(
                            "en-US",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            }
                          )}
                        </span>
                      </div>
                    )}

                    {/* Total Amount */}
                    <div className="d-flex justify-content-between align-items-center py-3 rounded">
                      <span className="small text-uppercase font-weight-bold">
                        Total Amount
                      </span>
                      <span
                        style={{ fontSize: "1.25rem" }}
                        className="font-weight-bold">

                        ₱
                        {totalAmountValue.toLocaleString(
                          "en-US",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }
                        )}
                      </span>
                    </div>
                  </div>
                </Section>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — ALL FORM FIELDS */}
        <div className="col-md-9">
          {/* CUSTOMER DETAILS (PUBLIC ONLY) */}
          {isPublic &&
            <Section title="Customer Details">
              <div className="row">
                <div className="col-md-4">
                  <FormInput
                    label="Full Name"
                    type="text"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleChange}
                    error={errors.customer_name}
                    required />

                </div>
                <div className="col-md-4">
                  <FormInput
                    label="Email Address"
                    type="email"
                    name="customer_email"
                    value={formData.customer_email}
                    onChange={handleChange}
                    error={errors.customer_email}
                    required />

                </div>
                <div className="col-md-4">
                  <FormInput
                    label="Phone Number"
                    type="text"
                    name="customer_phone"
                    value={formData.customer_phone}
                    onChange={handleChange}
                    error={errors.customer_phone}
                    required />

                </div>
              </div>
            </Section>
          }

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
                  rows={1} />

              </div>
            </div>

            <div className="row">
              <div className="col-md-10">
                <div className="mb-4">
                  <label
                    htmlFor="job_type_grouped"
                    className="block text-sm font-medium text-gray-700 mb-1">
                    Category / Job Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="job_type_grouped"
                    name="job_type_grouped"
                    value={groupedSelectionValue}
                    onChange={handleGroupedJobTypeChange}
                    required
                    className="
                      w-full text-sm rounded-md border border-gray-300 
                      focus:border-orange-500 focus:ring-2 focus:ring-orange-200 
                      outline-none transition duration-150 ease-in-out
                      placeholder-gray-400
                      bg-white
                      p-2.5
                    ">
                    <option value="">Select</option>
                    {sortedJobCategories.map((cat) => {
                      const jobTypes = (cat?.jobTypes || cat?.job_types || [])
                        .filter((jt) => jt?.is_active !== false)
                        .sort((a, b) => {
                          const aSort = a?.sort_order ?? 0;
                          const bSort = b?.sort_order ?? 0;
                          if (aSort !== bSort) return aSort - bSort;
                          return (a?.name || "").localeCompare(b?.name || "");
                        });

                      if (!jobTypes.length) {
                        return null;
                      }

                      return (
                        <optgroup key={cat.id} label={cat.name}>
                          {jobTypes.map((jt) => (
                            <option key={jt.id} value={jt.id.toString()}>
                              {formatJobTypeLabel(jt)}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                    <option value="others">Others (Custom)</option>
                  </select>
                  {(errors.job_type_id || errors.category_id) && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.job_type_id || errors.category_id}
                    </p>
                  )}
                </div>
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
                  step="1" />

              </div>
            </div>

            {selectedJobType?.has_colors && selectedJobType?.available_colors?.length > 0 && (
              <div className="row mt-3">
                <div className="col-12">
                  <label className="form-label d-block">Available Colors</label>
                  <div className="d-flex flex-wrap gap-2">
                    {selectedJobType.available_colors.map((colorObj, idx) => {
                      const hex = typeof colorObj === 'string' ? colorObj : colorObj.hex;
                      const code = typeof colorObj === 'string' ? '' : colorObj.code;
                      return (
                        <div
                          key={idx}
                          onClick={() => setFormData(prev => ({ ...prev, selected_color: hex }))}
                          className={`rounded-circle border cursor-pointer transition-all ${formData.selected_color === hex ? 'border-primary ring-2 ring-primary shadow-sm' : 'border-light'}`}
                          style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: hex,
                            padding: '2px',
                            border: formData.selected_color === hex ? '2px solid #000' : '1px solid #ddd',
                            transform: formData.selected_color === hex ? 'scale(1.1)' : 'scale(1)'
                          }}
                          title={code ? `${getColorName(hex)} (${code})` : getColorName(hex)}
                        >
                          {formData.selected_color === hex && (
                            <div className="w-100 h-100 d-flex align-items-center justify-center">
                              <i className="ti-check text-white" style={{ fontSize: '12px', textShadow: '0 0 2px #000', fontFamily: 'themify' }}></i>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {formData.selected_color && (
                    <div className="mt-3 d-flex align-items-center gap-2">
                      <span className="text-muted small">Selected Variant:</span>
                      <span className="badge badge-light border d-flex align-items-center gap-2 py-2 px-3 shadow-sm" style={{ borderRadius: '20px', backgroundColor: '#f8f9fa' }}>
                        <div
                          className="rounded-circle border"
                          style={{ width: '12px', height: '12px', backgroundColor: formData.selected_color }}
                        ></div>
                        <span className="text-dark font-weight-bold" style={{ fontSize: '11px' }}>
                          {getFullColorName(formData.selected_color, selectedJobType)}
                        </span>
                        <code className="text-muted small" style={{ fontSize: '9px' }}>{formData.selected_color}</code>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Others Category Custom Fields */}
            {isOthersCategory && (
              <>
                <div className="row mt-3">
                  <div className="col-md-12">
                    <FormInput
                      label="Job Type Description"
                      type="text"
                      name="custom_job_type_description"
                      value={formData.custom_job_type_description}
                      onChange={handleChange}
                      error={errors.custom_job_type_description}
                      placeholder="Describe the custom job type"
                      required />
                  </div>
                </div>

                <div className="row mt-2">
                  <div className="col-md-12">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="is_size_based"
                        name="is_size_based"
                        checked={formData.is_size_based}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_size_based: e.target.checked }))}
                      />
                      <label className="form-check-label" htmlFor="is_size_based">
                        Size-Based Item
                      </label>
                    </div>
                  </div>
                </div>

                {formData.is_size_based && (
                  <div className="row mt-3">
                    <div className="col-md-6">
                      <FormInput
                        label="Width"
                        type="number"
                        name="custom_width"
                        value={formData.custom_width}
                        onChange={handleChange}
                        error={errors.custom_width}
                        placeholder="Width"
                        required
                        step="0.01" />
                    </div>
                    <div className="col-md-6">
                      <FormInput
                        label="Height"
                        type="number"
                        name="custom_height"
                        value={formData.custom_height}
                        onChange={handleChange}
                        error={errors.custom_height}
                        placeholder="Height"
                        required
                        step="0.01" />
                    </div>
                  </div>
                )}

                <div className="row mt-3">
                  <div className="col-md-12">
                    <label className="form-label">Pricing Mode</label>
                    <div className="d-flex gap-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="custom_price_mode"
                          id="price_mode_per_item"
                          value="per_item"
                          checked={formData.custom_price_mode === "per_item"}
                          onChange={handleChange}
                        />
                        <label className="form-check-label" htmlFor="price_mode_per_item">
                          Price Per Item
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="custom_price_mode"
                          id="price_mode_fixed_total"
                          value="fixed_total"
                          checked={formData.custom_price_mode === "fixed_total"}
                          onChange={handleChange}
                        />
                        <label className="form-check-label" htmlFor="price_mode_fixed_total">
                          Fixed Total Price
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row mt-3">
                  {formData.custom_price_mode === "per_item" ? (
                    <div className="col-md-6">
                      <FormInput
                        label="Price Per Item (₱)"
                        type="number"
                        name="custom_price_per_item"
                        value={formData.custom_price_per_item}
                        onChange={handleChange}
                        error={errors.custom_price_per_item}
                        placeholder="0.00"
                        required
                        min="0"
                        step="0.01" />
                      {formData.custom_price_per_item && formData.quantity && (
                        <small className="text-muted">
                          Total: ₱{(parseFloat(formData.custom_price_per_item) * parseFloat(formData.quantity)).toFixed(2)}
                        </small>
                      )}
                    </div>
                  ) : (
                    <div className="col-md-6">
                      <FormInput
                        label="Fixed Total Price (₱)"
                        type="number"
                        name="custom_fixed_total"
                        value={formData.custom_fixed_total}
                        onChange={handleChange}
                        error={errors.custom_fixed_total}
                        placeholder="0.00"
                        required
                        min="0"
                        step="0.01" />
                      {formData.custom_fixed_total && formData.quantity && (
                        <small className="text-muted">
                          Price per item: ₱{(parseFloat(formData.custom_fixed_total) / parseFloat(formData.quantity)).toFixed(2)}
                        </small>
                      )}
                    </div>
                  )}
                </div>

                <hr />
                <div className="mt-4">
                  <h6 className="mb-2">Production Workflow Template</h6>
                  <p className="text-muted text-sm mb-2">
                    Select the production steps that apply to this custom job type.
                  </p>

                  <div className="row">
                    {WORKFLOW_STEP_OPTIONS.map((step) => (
                      <div key={step.key} className="col-md-3 mb-2">
                        <div className="form-check custom-checkbox">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id={`custom_workflow_${step.key}`}
                            checked={(formData.custom_workflow_steps || []).includes(step.key)}
                            onChange={() => toggleCustomWorkflowStep(step.key)} />

                          <label className="form-check-label font-weight-bold" htmlFor={`custom_workflow_${step.key}`}>
                            <i className={`${step.icon} mr-1`} style={{ fontFamily: 'themify' }}></i> {step.label}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  {errors.custom_workflow_steps && (
                    <p className="mt-1 text-xs text-red-500">{errors.custom_workflow_steps}</p>
                  )}

                  <div className="mt-3 p-2 bg-light rounded border">
                    <h6 className="mb-2 font-weight-bold text-dark">Workflow Preview</h6>
                    <div className="d-flex flex-wrap align-items-center" style={{ gap: '6px' }}>
                      {WORKFLOW_STEP_OPTIONS
                        .filter((s) => (formData.custom_workflow_steps || []).includes(s.key))
                        .map((s, index, array) => (
                          <React.Fragment key={s.key}>
                            <div className="d-flex align-items-center">
                              <div className="badge badge-primary p-2 px-3 rounded-pill shadow-sm" style={{ fontSize: '0.9rem' }}>
                                {s.label}
                              </div>
                              {index < array.length - 1 && (
                                <span className="mx-2 text-muted font-weight-bold" style={{ fontSize: '16px', lineHeight: '1' }}>→</span>
                              )}
                            </div>
                          </React.Fragment>
                        ))}

                      {(formData.custom_workflow_steps || []).length > 0 && (
                        <>
                          <span className="mx-2 text-muted font-weight-bold" style={{ fontSize: '16px', lineHeight: '1' }}>→</span>
                          <div className="badge badge-success p-2 px-3 rounded-pill shadow-sm" style={{ fontSize: '0.9rem' }}>
                            Completed
                          </div>
                        </>
                      )}

                      {(formData.custom_workflow_steps || []).length === 0 && (
                        <span className="text-muted font-italic">Select steps above to see the workflow preview.</span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Promo Display */}
            {(selectedJobType?.promo_rules?.length > 0 || selectedJobType?.promo_text) &&
              <div className="row mb-3">
                <div className="col-md-12">
                  {formData.free_quantity > 0 ?
                    <div className="alert alert-success">
                      <div className="d-flex align-items-center">
                        <i className="ti-gift mr-2 text-xl" style={{ fontFamily: 'themify' }}></i>
                        <div>
                          <strong>Promo Applied!</strong>
                          <div>
                            You get <strong>{formData.free_quantity} free item(s)</strong> based on your quantity.
                            <br />
                            Total to produce: <strong>{parseInt(formData.quantity) + parseInt(formData.free_quantity)} pcs</strong>
                          </div>
                        </div>
                      </div>
                    </div> :

                    <div className="alert alert-info">
                      <i className="ti-gift mr-2" style={{ fontFamily: 'themify' }}></i>
                      <strong>Available Promo:</strong>
                      <ul className="mb-0 pl-4 mt-1">
                        {selectedJobType.promo_rules?.map((rule, idx) =>
                          <li key={idx}>
                            {rule.description || `Buy ${rule.buy_quantity}, Get ${rule.free_quantity} Free`}
                          </li>
                        )}
                        {selectedJobType.promo_text && !selectedJobType.promo_rules?.length &&
                          <li>{selectedJobType.promo_text}</li>
                        }
                      </ul>
                    </div>
                  }
                </div>
              </div>
            }
          </Section>

          {userRole === 'admin' &&
            <Section title="Branch Assignment">
              <div className="row">
                <div className="col-md-6">
                  <FormInput
                    label="Order Branch"
                    type="select"
                    name="order_branch_id"
                    value={formData.order_branch_id}
                    onChange={handleChange}
                    options={branches.map((b) => ({ value: b.id.toString(), label: b.name }))}
                    placeholder="Select Order Branch"
                    required />

                </div>
                <div className="col-md-6">
                  <FormInput
                    label="Production Branch"
                    type="select"
                    name="production_branch_id"
                    value={formData.production_branch_id}
                    onChange={handleChange}
                    options={branches.map((b) => ({ value: b.id.toString(), label: b.name }))}
                    placeholder="Select Production Branch"
                    required />

                </div>
              </div>
            </Section>
          }

          {hasPriceTiers &&
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
                    {priceTiers.map((tier) =>
                      <tr
                        key={
                          tier.id ||
                          `${tier.min_quantity}-${tier.max_quantity}`
                        }>

                        <td>{tier.label || "Tier"}</td>
                        <td>
                          {tier.min_quantity}
                          {tier.max_quantity ?
                            ` - ${tier.max_quantity}` :
                            "+"}
                        </td>
                        <td>
                          ₱
                          {parseFloat(
                            tier.price
                          ).toFixed(2)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          }

          {selectedJobType?.promo_text &&
            <PromoBox text={selectedJobType.promo_text} />
          }
          {hasSizeRates &&
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
                      label: `${rate.variant_name || "Variant"} - ₱${parseFloat(
                        rate.rate
                      ).toFixed(2)} per ${rate.calculation_method ===
                        "length" ?
                        rate.dimension_unit :
                        `${rate.dimension_unit}²`}`

                    }))} />

                </div>
                <div className="col-md-4">
                  <FormInput
                    label={`Width (${currentSizeRate?.dimension_unit ||
                      "unit"})`
                    }
                    type="number"
                    name="size_width"
                    value={sizeDimensions.width}
                    onChange={(e) => {
                      setSizeDimensions((prev) => ({
                        ...prev,
                        width: e.target.value
                      }));
                      clearError("size_width");
                    }}
                    error={errors.size_width}
                    min="0"
                    step="0.01"
                    placeholder="Width" />

                </div>
                {currentSizeRate?.calculation_method !==
                  "length" &&
                  <div className="col-md-4">
                    <FormInput
                      label={`Height (${currentSizeRate?.dimension_unit ||
                        "unit"})`
                      }
                      type="number"
                      name="size_height"
                      value={sizeDimensions.height}
                      onChange={(e) => {
                        setSizeDimensions((prev) => ({
                          ...prev,
                          height: e.target.value
                        }));
                        clearError("size_height");
                      }}
                      error={errors.size_height}
                      min="0"
                      step="0.01"
                      placeholder="Height" />

                  </div>
                }
              </div>
              {currentSizeRate &&
                <p className="text-muted text-sm mt-2">
                  Rate: ₱
                  {parseFloat(currentSizeRate.rate).toFixed(
                    2
                  )}{" "}
                  per{" "}
                  {currentSizeRate.calculation_method ===
                    "length" ?
                    currentSizeRate.dimension_unit :
                    `${currentSizeRate.dimension_unit}²`}
                </p>
              }
              {/* </div> */}
              <hr />
            </div>
          }


          {/* SCHEDULE */}
          <hr className="my-2" />
          <Section title="Schedule">
            <div className="row">
              <div className="col-md-12">
                <FormInput
                  label="Due Date"
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                  error={errors.due_date}
                  required
                  min={new Date().toISOString().split("T")[0]} />

              </div>
            </div>
            {isFrontDesk &&
              <div className="alert alert-info mt-3">
                <i className="ti-info-alt mr-2" style={{ fontFamily: 'themify' }}></i>
                <strong>Note:</strong> Payment will be processed separately by the Cashier.
                Ticket will be created with "Pending" payment status.
              </div>
            }
          </Section>

          {/* PAYMENT SECTION - Only for Admin/Cashier */}
          {canProcessPayment &&
            <>
              <Section title="Payment Information">
                <div className="row">
                  <div className="col-md-6">
                    <FormInput
                      label="Payment Method"
                      type="select"
                      name="payment_method"
                      value={formData.payment_method}
                      onChange={handleChange}
                      error={errors.payment_method}
                      options={paymentMethodOptions} />

                  </div>
                  <div className="col-md-6">
                    <FormInput
                      label="Payment Status"
                      type="select"
                      name="payment_status"
                      value={formData.payment_status}
                      onChange={handleChange}
                      error={errors.payment_status}
                      options={paymentStatusOptions} />

                  </div>
                </div>
              </Section>
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
                      min="0" />

                  </div>
                  {hasPermission("tickets", "price_edit") ?
                    <>
                      <div className="col-md-3">
                        <div className="custom-control custom-checkbox float-end">
                          <input
                            type="checkbox"
                            className="custom-control-input"
                            id="enableDiscount"
                            checked={enableDiscount}
                            onChange={(e) => {
                              setEnableDiscount(e.target.checked);







                            }} />

                          <label
                            className="custom-control-label"
                            htmlFor="enableDiscount">

                            <i className="ti-cut mr-1" style={{ fontFamily: 'themify' }}></i>{" "}
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
                          disabled={!enableDiscount} />

                      </div>
                      <div className="col-md-3">
                        <FormInput
                          label="Discount Amount"
                          type="number"
                          name="discount_amount"
                          value={formData.discount_amount}
                          readOnly
                          className="bg-light"
                          disabled={!enableDiscount} />

                      </div>
                    </> :

                    <div className="col-md-8"></div>
                  }
                </div>
                <div className="row mt-3">
                  <div className="col-md-4">
                    <FormInput
                      label="Official Receipt #"
                      type="text"
                      name="initial_payment_or"
                      value={formData.initial_payment_or}
                      onChange={handleChange} />

                  </div>
                  <div className="col-md-4">
                    <FormInput
                      label="Payment Reference"
                      type="text"
                      name="initial_payment_reference"
                      value={formData.initial_payment_reference}
                      onChange={handleChange}
                      placeholder="GCash, bank trace, etc." />

                  </div>
                  <div className="col-md-4">
                    <FormInput
                      label="Payment Notes"
                      type="text"
                      name="initial_payment_notes"
                      value={formData.initial_payment_notes}
                      onChange={handleChange}
                      placeholder="Optional note" />

                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mt-10">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Proofs (GCash / bank receipts)
                      </label>
                      <input
                        type="file"
                        className="form-control"
                        accept="image/*"
                        onChange={handlePaymentProofUpload} />

                    </div>

                  </div>
                  <div className="col-md-6">
                    {paymentProofs.length > 0 ?
                      <div className="mt-3">
                        {paymentProofs.length > 1 &&
                          <div className="nav nav-pills nav-fill gap-2 mb-3" role="tablist">
                            {paymentProofs.map((_, index) =>
                              <button
                                key={index}
                                type="button"
                                className={`nav-link btn-sm py-1 px-2 ${activeProofTab === index ? "active" : ""}`
                                }
                                onClick={() => setActiveProofTab(index)}
                                style={{ fontSize: "0.75rem" }}>

                                <i className="ti-receipt mr-1" style={{ fontFamily: 'themify' }}></i>
                                Proof {index + 1}
                                {paymentProofs[index].existing &&
                                  <span className="badge badge-success ml-1">
                                    Existing
                                  </span>
                                }
                              </button>
                            )}
                          </div>
                        }
                        <div
                          className="border rounded overflow-hidden bg-light d-flex align-items-center justify-content-center"
                          style={{ minHeight: "300px", maxHeight: "300px" }}>

                          <img
                            src={paymentProofs[activeProofTab].preview}
                            alt={`Payment proof ${activeProofTab + 1}`}
                            className="img-fluid"
                            style={{
                              maxHeight: "300px",
                              maxWidth: "100%",
                              objectFit: "contain"
                            }} />

                        </div>
                        <div className="text-muted small mt-2 text-center">
                          {activeProofTab + 1} of {paymentProofs.length}
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger w-100 mt-2"
                          onClick={() => removePaymentProof(activeProofTab)}
                          disabled={paymentProofs[activeProofTab]?.existing}
                          title={
                            paymentProofs[activeProofTab]?.existing ?
                              "Existing payment proofs cannot be removed here." :
                              "Remove proof"
                          }>

                          <i className="ti-trash mr-1" style={{ fontFamily: 'themify' }}></i>
                          {paymentProofs[activeProofTab]?.existing ?
                            "Existing Proof" :
                            "Remove Proof"}
                        </button>
                      </div> :

                      <div className="border rounded p-4 text-center text-muted bg-light mt-3">
                        <i className="ti-receipt" style={{ fontSize: "32px", fontFamily: 'themify' }}></i>
                        <p className="mt-2 small mb-0">
                          Upload screenshots of payment confirmations
                        </p>
                      </div>
                    }
                  </div>
                </div>
              </Section>
            </>
          }
          {/* END PAYMENT SECTION - Only for Admin/Cashier */}

          <Section title="Attachments">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <div className="d-flex align-items-center mb-2">
                  <i className="ti-image mr-2" style={{ fontFamily: 'themify' }}></i>
                  <span className="font-semibold">Attachments/Mock-Up Design</span>
                </div>
                <input
                  type="file"
                  className="form-control"
                  accept="image/*"
                  multiple
                  onChange={handleTicketAttachmentUpload} />


                {ticketAttachments.length > 0 &&
                  <div className="mt-3">
                    {ticketAttachments.length > 1 &&
                      <div
                        className="nav nav-pills nav-fill gap-2 mb-3"
                        role="tablist">

                        {ticketAttachments.map((_, index) =>
                          <button
                            key={index}
                            type="button"
                            className={`nav-link btn-sm py-1 px-2 ${activeAttachmentTab === index ?
                              "active" :
                              ""}`
                            }
                            onClick={() => setActiveAttachmentTab(index)}
                            style={{ fontSize: "0.75rem" }}>

                            <i className="ti-image mr-1" style={{ fontFamily: 'themify' }}></i>
                            File {index + 1}
                            {ticketAttachments[index].existing &&
                              <span className="badge badge-success ml-1">
                                Existing
                              </span>
                            }
                          </button>
                        )}
                      </div>
                    }

                    <div
                      className="border rounded overflow-hidden bg-light"
                      style={{


                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>

                      <img
                        src={
                          ticketAttachments[activeAttachmentTab].
                            preview
                        }
                        alt={`Attachment ${activeAttachmentTab + 1}`}
                        className="img-fluid"
                        style={{
                          maxHeight: "100%",
                          maxWidth: "100%",
                          objectFit: "contain"
                        }} />

                    </div>

                    <div className="text-muted small mt-2 text-center">
                      {activeAttachmentTab + 1} of{" "}
                      {ticketAttachments.length}
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger w-20 mt-2"
                      onClick={() =>
                        removeTicketAttachment(activeAttachmentTab)
                      }
                      disabled={
                        ticketAttachments[activeAttachmentTab]?.
                          existing
                      }
                      title={
                        ticketAttachments[activeAttachmentTab]?.
                          existing ?
                          "Existing files can be managed from the ticket view." :
                          "Remove attachment"
                      }>

                      <i className="ti-trash mr-1" style={{ fontFamily: 'themify' }}></i>
                      {ticketAttachments[activeAttachmentTab]?.existing ?
                        "Existing file" :
                        "Remove Attachment"}
                    </button>
                  </div>
                }
                {ticketAttachments.length === 0 &&
                  <div className="border rounded p-5 text-center text-muted bg-light">
                    <i
                      className="ti-image"
                      style={{ fontSize: "40px", fontFamily: 'themify' }}>
                    </i>
                    <p className="mt-2 small">
                      No images selected
                    </p>
                  </div>
                }
              </div>
            </div>
          </Section>

          <div className="row mt-3">
            <div className="col-md-12">
              <label className="text-sm font-medium text-gray-700 mb-2">
                <i className="ti-info-alt mr-1" style={{ fontFamily: 'themify' }}></i> Design Description / Elaboration
              </label>
              <TiptapEditor
                value={formData.design_description}
                onChange={(html) => setFormData(prev => ({ ...prev, design_description: html }))}
              />
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="mt-4 d-flex justify-content-end gap-3">
            <button
              type="button"
              className="btn btn-light"
              onClick={onCancel}>

              <i className="ti-back-left mr-1" style={{ fontFamily: 'themify' }}></i>Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={processing || ticket?.status === 'completed'}>

              {processing ?
                <>
                  <span
                    className="spinner-border spinner-border-sm mr-2"
                    role="status"
                    aria-hidden="true">
                  </span>
                  Saving...
                </> :

                <>
                  <i className="ti-save-alt mr-1" style={{ fontFamily: 'themify' }}></i>Save
                  Ticket
                </>
              }
            </button>
          </div>
          {uploadError &&
            <div className="alert alert-danger mt-3">
              <i className="ti-alert mr-2" style={{ fontFamily: 'themify' }}></i>
              {uploadError}
            </div>
          }
        </div>
      </form>
    </>);

}