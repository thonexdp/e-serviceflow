/**
 * @author Antonio Jr De Paz
 * @description Orders Page
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { router, usePage } from "@inertiajs/react";
import { formatPeso } from "@/Utils/currency";
import { getColorName, getFullColorName } from "@/Utils/colors";

export default function CustomerPOSOrder() {
  const { jobCategories = [], branches = [] } = usePage().props;

  console.log(branches);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    customer_firstname: "",
    customer_lastname: "",
    customer_email: "",
    customer_facebook: "",
    customer_phone: "",
    customer_address: "",
    customer_id: null,
    branch_id: "",
    category_id: "",
    job_type_id: "",
    description: "",
    quantity: "",
    free_quantity: 0,
    size_width: "",
    size_height: "",
    size_rate_id: "",
    due_date: "",
    file: null,
    // Others category fields
    custom_job_type_description: "",
    custom_price_mode: "per_item", // 'per_item' or 'fixed_total'
    custom_price_per_item: "",
    custom_fixed_total: "",
    selected_color: ""
  });

  const [designFiles, setDesignFiles] = useState([]);
  const [activeDesignTab, setActiveDesignTab] = useState(0);
  const [selectedJobType, setSelectedJobType] = useState(null);
  const [selectedSizeRate, setSelectedSizeRate] = useState(null);
  const [subtotal, setSubtotal] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("walkin");
  const [paymentProofs, setPaymentProofs] = useState([]);
  const [activeProofTab, setActiveProofTab] = useState(0);
  const [activeBankTab, setActiveBankTab] = useState(0);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [settings, setSettings] = useState(null);
  const [qrcodeError, setQrcodeError] = useState(false);
  const [savedCustomers, setSavedCustomers] = useState([]);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [errors, setErrors] = useState({});
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = useRef(null);
  const [emailSuggestion, setEmailSuggestion] = useState(null);
  const [showRestoredBanner, setShowRestoredBanner] = useState(false);
  const [designFileError, setDesignFileError] = useState("");
  const [paymentProofError, setPaymentProofError] = useState("");
  const designFileInputRef = useRef(null);
  const paymentProofInputRef = useRef(null);
  const serviceTypeSectionRef = useRef(null);

  // Discount tracking
  const [originalPrice, setOriginalPrice] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);

  const MAX_RETRIES = 3;

  // Phone normalization helper
  const normalizePhone = (phone) => {
    if (!phone) return "";
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, "");
    // Convert to 639XXXXXXXXX format
    if (cleaned.startsWith("0") && cleaned.length === 11) {
      cleaned = "63" + cleaned.substring(1);
    } else if (cleaned.startsWith("9") && cleaned.length === 10) {
      cleaned = "63" + cleaned;
    }
    return cleaned;
  };

  // Convert file to base64 for localStorage
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Convert base64 back to File object
  const base64ToFile = (base64, filename, mimeType) => {
    const arr = base64.split(',');
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mimeType });
  };

  // Load saved customers
  useEffect(() => {
    const saved = localStorage.getItem("rc_printshop_customers");
    if (saved) {
      try {
        setSavedCustomers(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading saved customers:", e);
      }
    }
  }, []);

  // Load saved form progress on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem("rc_printshop_order_progress");
    if (savedProgress) {
      try {
        const progress = JSON.parse(savedProgress);

        // Check if saved data is not too old (24 hours)
        const savedTime = progress.savedAt || 0;
        const currentTime = new Date().getTime();
        const hoursPassed = (currentTime - savedTime) / (1000 * 60 * 60);

        if (hoursPassed < 24) {
          // Restore form data
          if (progress.formData) {
            setFormData(progress.formData);
          }

          // Restore current step
          if (progress.currentStep) {
            setCurrentStep(progress.currentStep);
          }

          // Restore payment method
          if (progress.paymentMethod) {
            setPaymentMethod(progress.paymentMethod);
          }

          // Restore design files from base64
          if (progress.designFiles && progress.designFiles.length > 0) {
            const restoredDesignFiles = progress.designFiles.map(fileData => {
              if (fileData.base64) {
                try {
                  // Convert base64 back to File object
                  const file = base64ToFile(fileData.base64, fileData.name, fileData.type);
                  return {
                    file: file,
                    preview: fileData.base64, // Use base64 as preview
                    name: fileData.name,
                    type: fileData.type,
                    size: fileData.size,
                    base64: fileData.base64,
                    invalid: fileData.invalid,
                    errorMessage: fileData.errorMessage,
                  };
                } catch (e) {
                  console.error("Error restoring design file:", e);
                  return null;
                }
              }
              return null;
            }).filter(f => f !== null);

            setDesignFiles(restoredDesignFiles);
          }

          // Restore payment proofs from base64
          if (progress.paymentProofs && progress.paymentProofs.length > 0) {
            const restoredPaymentProofs = progress.paymentProofs.map(fileData => {
              if (fileData.base64) {
                try {
                  // Convert base64 back to File object
                  const file = base64ToFile(fileData.base64, fileData.name, fileData.type);
                  return {
                    file: file,
                    preview: fileData.base64, // Use base64 as preview
                    name: fileData.name,
                    type: fileData.type,
                    size: fileData.size,
                    base64: fileData.base64,
                    invalid: fileData.invalid,
                    errorMessage: fileData.errorMessage,
                  };
                } catch (e) {
                  console.error("Error restoring payment proof:", e);
                  return null;
                }
              }
              return null;
            }).filter(f => f !== null);

            setPaymentProofs(restoredPaymentProofs);
          }

          // Show restoration banner
          setShowRestoredBanner(true);

        } else {
          // Data is too old, clear it
          localStorage.removeItem("rc_printshop_order_progress");
        }
      } catch (e) {
        console.error("Error loading saved progress:", e);
        localStorage.removeItem("rc_printshop_order_progress");
      }
    }
  }, []);

  // Save form progress whenever formData, currentStep, or files change
  useEffect(() => {
    // Don't save if we're on the success page (step 5)
    if (currentStep === 5) {
      return;
    }

    // Only save if there's meaningful data
    const hasData = formData.customer_firstname ||
      formData.customer_lastname ||
      formData.customer_phone ||
      formData.category_id ||
      formData.job_type_id;

    if (hasData) {
      try {
        // Prepare files for storage (exclude File objects and blob URLs)
        const designFilesForStorage = designFiles.map(df => ({
          name: df.name,
          type: df.type,
          size: df.size,
          base64: df.base64,
          invalid: df.invalid,
          errorMessage: df.errorMessage,
        }));

        const paymentProofsForStorage = paymentProofs.map(pp => ({
          name: pp.name,
          type: pp.type,
          size: pp.size,
          base64: pp.base64,
          invalid: pp.invalid,
          errorMessage: pp.errorMessage,
        }));

        const progress = {
          formData: formData,
          currentStep: currentStep,
          designFiles: designFilesForStorage,
          paymentProofs: paymentProofsForStorage,
          paymentMethod: paymentMethod,
          savedAt: new Date().getTime(),
        };

        localStorage.setItem("rc_printshop_order_progress", JSON.stringify(progress));
      } catch (e) {
        console.error("Error saving progress:", e);
        // If localStorage is full, try without files
        try {
          const progressWithoutFiles = {
            formData: formData,
            currentStep: currentStep,
            savedAt: new Date().getTime(),
          };
          localStorage.setItem("rc_printshop_order_progress", JSON.stringify(progressWithoutFiles));
          console.warn("Saved progress without files due to storage limit");
        } catch (e2) {
          console.error("Error saving even without files:", e2);
        }
      }
    }
  }, [formData, currentStep, designFiles, paymentProofs, paymentMethod]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/public/settings");
        const data = await response.json();
        if (data.success) {
          setSettings(data.data);
          setQrcodeError(false);
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();
  }, []);

  const availableJobTypes = useMemo(() => {
    if (!formData.category_id) return [];
    const category = jobCategories.find(
      (cat) => cat.id.toString() === formData.category_id.toString()
    );
    return category?.job_types || category?.jobTypes || [];
  }, [formData.category_id, jobCategories]);




  // Scroll to service type section when category changes
  useEffect(() => {
    if (formData.category_id && availableJobTypes.length > 0 && serviceTypeSectionRef.current) {
      // Delay scroll to allow DOM to update
      setTimeout(() => {
        serviceTypeSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    }
  }, [formData.category_id, availableJobTypes.length]);

  useEffect(() => {
    if (formData.job_type_id) {
      const jobType = availableJobTypes.find(
        (jt) => jt.id.toString() === formData.job_type_id.toString()
      );
      setSelectedJobType(jobType || null);

      if (jobType?.size_rates?.length > 0) {
        const defaultRate =
          jobType.size_rates.find((r) => r.is_default) ||
          jobType.size_rates[0];
        setSelectedSizeRate(defaultRate);
        setFormData((prev) => ({
          ...prev,
          size_rate_id: defaultRate.id.toString(),
        }));
      } else {
        setSelectedSizeRate(null);
      }
    } else {
      setSelectedJobType(null);
      setSelectedSizeRate(null);
    }
  }, [formData.job_type_id, availableJobTypes]);

  useEffect(() => {
    if (formData.size_rate_id && selectedJobType?.size_rates) {
      const rate = selectedJobType.size_rates.find(
        (r) => r.id.toString() === formData.size_rate_id.toString()
      );
      setSelectedSizeRate(rate || null);
    }
  }, [formData.size_rate_id, selectedJobType]);

  useEffect(() => {
    if (!selectedJobType) {
      setSubtotal(0);
      setFormData((prev) => ({ ...prev, free_quantity: 0 }));
      return;
    }

    const quantity = parseFloat(formData.quantity) || 0;
    if (quantity <= 0) {
      setSubtotal(0);
      return;
    }

    let calculated = 0;
    const sizeRates = selectedJobType.size_rates || [];
    const priceTiers = selectedJobType.price_tiers || [];

    if (sizeRates.length > 0 && selectedSizeRate) {
      const width = parseFloat(formData.size_width) || 0;
      const height = parseFloat(formData.size_height) || 0;

      if (selectedSizeRate.calculation_method === "length" && width > 0) {
        calculated =
          width * parseFloat(selectedSizeRate.rate) * quantity;
      } else if (width > 0 && height > 0) {
        calculated =
          width *
          height *
          parseFloat(selectedSizeRate.rate) *
          quantity;
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
      calculated = unitPrice * quantity;
    } else {
      calculated = (parseFloat(selectedJobType.price) || 0) * quantity;
    }

    // Store original price before discount
    setOriginalPrice(calculated);

    // Apply discount if available
    const discount = selectedJobType.discount_percentage || selectedJobType.discount || 0;
    const discountValue = parseFloat(discount);

    if (discountValue > 0) {
      const discountAmountCalc = calculated * (discountValue / 100);
      setDiscountAmount(discountAmountCalc);
      setDiscountPercentage(discountValue);
      calculated = calculated - discountAmountCalc;
    } else {
      setDiscountAmount(0);
      setDiscountPercentage(0);
    }

    setSubtotal(calculated);

    const promoRules = selectedJobType.promo_rules || [];
    if (promoRules.length > 0) {
      const activeRules = promoRules.filter((r) => r.is_active);
      if (activeRules.length > 0) {
        const sortedRules = [...activeRules].sort(
          (a, b) => b.buy_quantity - a.buy_quantity
        );

        const applicableRule = sortedRules.find(
          (r) => quantity >= r.buy_quantity
        );

        if (applicableRule) {
          const sets = Math.floor(
            quantity / applicableRule.buy_quantity
          );
          const totalFree = sets * applicableRule.free_quantity;
          setFormData((prev) => ({
            ...prev,
            free_quantity: totalFree,
          }));
        } else {
          setFormData((prev) => ({ ...prev, free_quantity: 0 }));
        }
      } else {
        setFormData((prev) => ({ ...prev, free_quantity: 0 }));
      }
    } else {
      setFormData((prev) => ({ ...prev, free_quantity: 0 }));
    }
  }, [
    selectedJobType,
    selectedSizeRate,
    formData.quantity,
    formData.size_width,
    formData.size_height,
  ]);

  // Subtotal for 'Others' category
  useEffect(() => {
    if (formData.category_id !== "others") return;

    const quantity = parseFloat(formData.quantity) || 0;
    if (quantity <= 0) {
      setSubtotal(0);
      return;
    }

    let calculated = 0;
    if (formData.custom_price_mode === "per_item") {
      calculated =
        (parseFloat(formData.custom_price_per_item) || 0) * quantity;
    } else {
      calculated = parseFloat(formData.custom_fixed_total) || 0;
    }

    setSubtotal(calculated);
    setFormData((prev) => ({ ...prev, free_quantity: 0 }));

    // Reset discount for custom orders
    setOriginalPrice(calculated);
    setDiscountAmount(0);
    setDiscountPercentage(0);
  }, [
    formData.category_id,
    formData.quantity,
    formData.custom_price_mode,
    formData.custom_price_per_item,
    formData.custom_fixed_total,
  ]);

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    // Clear previous error
    setDesignFileError("");

    // Check if adding these files would exceed the limit of 5
    if (designFiles.length + files.length > 5) {
      setDesignFileError(`You can only upload up to 5 design files.`);
      event.target.value = "";
      return;
    }

    // Convert files to base64 for storage
    const uploadsPromises = files.map(async (file) => {
      let base64 = null;
      try {
        // Only convert to base64 if file is not too large (to avoid localStorage issues)
        if (file.size <= 10 * 1024 * 1024) {
          base64 = await fileToBase64(file);
        }
      } catch (e) {
        console.error("Error converting file to base64:", e);
      }

      return {
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        type: file.type,
        size: file.size,
        base64: base64, // Store base64 for restoration
        invalid: file.size > 10 * 1024 * 1024,
        errorMessage:
          file.size > 10 * 1024 * 1024
            ? "File too large (max 10MB)"
            : null,
      };
    });

    const uploads = await Promise.all(uploadsPromises);
    setDesignFiles((prev) => [...prev, ...uploads]);
    setDesignFileError(""); // Clear any previous errors on successful upload
    event.target.value = "";
  };

  const removeDesignFile = (index) => {
    setDesignFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (activeDesignTab >= updated.length && activeDesignTab > 0) {
        setActiveDesignTab(updated.length - 1);
      } else if (updated.length === 0) {
        setActiveDesignTab(0);
      }
      return updated;
    });
    // Clear error when removing files
    setDesignFileError("");
    // Clear the file input to prevent 413 errors
    if (designFileInputRef.current) {
      designFileInputRef.current.value = "";
    }
  };

  const handlePaymentProofUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    // Clear previous error
    setPaymentProofError("");

    // Check if adding these files would exceed the limit of 1
    if (files.length > 1 || paymentProofs.length >= 1) {
      setPaymentProofError(`You can only upload 1 payment proof file.`);
      event.target.value = "";
      return;
    }

    // Convert files to base64 for storage
    const uploadsPromises = files.map(async (file) => {
      let base64 = null;
      try {
        // Only convert to base64 if file is not too large
        if (file.size <= 10 * 1024 * 1024) {
          base64 = await fileToBase64(file);
        }
      } catch (e) {
        console.error("Error converting file to base64:", e);
      }

      return {
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        type: file.type,
        size: file.size,
        base64: base64, // Store base64 for restoration
        invalid: file.size > 10 * 1024 * 1024,
        errorMessage:
          file.size > 10 * 1024 * 1024
            ? "File too large (max 10MB)"
            : null,
      };
    });

    const uploads = await Promise.all(uploadsPromises);
    setPaymentProofs((prev) => [...prev, ...uploads]);
    setPaymentProofError(""); // Clear any previous errors on successful upload
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
    // Clear error when removing files
    setPaymentProofError("");
    // Clear the file input to prevent 413 errors
    if (paymentProofInputRef.current) {
      paymentProofInputRef.current.value = "";
    }
  };

  const saveCustomerToLocal = (customerData) => {
    try {
      // Remove duplicate based on email (if provided) or phone
      const customers = savedCustomers.filter((c) => {
        if (customerData.email && c.email === customerData.email)
          return false;
        if (
          customerData.normalized_phone &&
          c.normalized_phone === customerData.normalized_phone
        )
          return false;
        return true;
      });
      customers.unshift(customerData);
      const limited = customers.slice(0, 20);
      setSavedCustomers(limited);
      localStorage.setItem(
        "rc_printshop_customers",
        JSON.stringify(limited)
      );
    } catch (e) {
      console.error("Error saving customer:", e);
    }
  };

  const handleEmailChange = (e) => {
    const email = e.target.value;
    setFormData((prev) => ({ ...prev, customer_email: email }));

    // Clear previous suggestion
    setEmailSuggestion(null);

    // Find matching saved customer
    if (email) {
      const savedCustomer = savedCustomers.find((c) => c.email === email);
      if (savedCustomer) {
        // Show suggestion instead of auto-filling
        setEmailSuggestion(savedCustomer);
      }
    }
  };

  const acceptEmailSuggestion = () => {
    if (emailSuggestion) {
      setFormData((prev) => ({
        ...prev,
        customer_firstname:
          emailSuggestion.firstname || prev.customer_firstname,
        customer_lastname:
          emailSuggestion.lastname || prev.customer_lastname,
        customer_phone: emailSuggestion.phone || prev.customer_phone,
        customer_facebook:
          emailSuggestion.facebook || prev.customer_facebook,
        customer_address:
          emailSuggestion.address || prev.customer_address,
        branch_id: emailSuggestion.branch_id || prev.branch_id,
      }));
      setEmailSuggestion(null);
    }
  };

  const dismissEmailSuggestion = () => {
    setEmailSuggestion(null);
  };

  const clearSavedProgress = () => {
    try {
      localStorage.removeItem("rc_printshop_order_progress");
      // Reset to initial state
      setFormData({
        customer_firstname: "",
        customer_lastname: "",
        customer_email: "",
        customer_facebook: "",
        customer_phone: "",
        customer_address: "",
        customer_id: null,
        branch_id: "",
        category_id: "",
        job_type_id: "",
        description: "",
        quantity: "",
        free_quantity: 0,
        size_width: "",
        size_height: "",
        size_rate_id: "",
        due_date: "",
        file: null,
      });
      setDesignFiles([]);
      setActiveDesignTab(0);
      setPaymentProofs([]);
      setPaymentMethod("walkin");
      setEmailSuggestion(null);
      setShowRestoredBanner(false);
      setCurrentStep(1);
      setErrors({});
      setDesignFileError("");
      setPaymentProofError("");
    } catch (e) {
      console.error("Error clearing saved progress:", e);
    }
  };

  const refreshCsrfToken = async () => {
    try {
      const response = await fetch("/csrf-token");
      if (response.ok) {
        const data = await response.json();
        if (data.csrf_token) {
          const meta = document.querySelector(
            'meta[name="csrf-token"]'
          );
          if (meta) {
            meta.setAttribute("content", data.csrf_token);

            if (window.axios) {
              window.axios.defaults.headers.common[
                "X-CSRF-TOKEN"
              ] = data.csrf_token;
            }
          }
          return data.csrf_token;
        }
      }
    } catch (e) {
      console.error("Failed to refresh CSRF token", e);
    }
    return null;
  };

  const findOrCreateCustomer = async (retry = false) => {
    try {
      const normalizedPhone = normalizePhone(formData.customer_phone);

      const response = await fetch(
        "/api/public/orders/customer/find-or-create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-CSRF-TOKEN":
              document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content") || "",
          },
          body: JSON.stringify({
            email: formData.customer_email || null,
            customer_firstname: formData.customer_firstname,
            customer_lastname: formData.customer_lastname,
            customer_phone: formData.customer_phone,
            normalized_phone: normalizedPhone,
            customer_facebook: formData.customer_facebook,
            customer_address: formData.customer_address || null,
          }),
        }
      );

      if (response.status === 419 && !retry) {
        await refreshCsrfToken();
        return findOrCreateCustomer(true);
      }

      const data = await response.json();

      if (data.success && data.customer) {
        saveCustomerToLocal({
          email: formData.customer_email || null,
          firstname: formData.customer_firstname,
          lastname: formData.customer_lastname,
          phone: formData.customer_phone,
          normalized_phone: normalizedPhone,
          facebook: formData.customer_facebook,
          address: formData.customer_address || null,
          branch_id: formData.branch_id,
        });

        setFormData((prev) => ({
          ...prev,
          customer_id: data.customer.id,
        }));
        return data.customer.id;
      } else {
        throw new Error(data.message || "Failed to create customer");
      }
    } catch (error) {
      console.error("Error finding/creating customer:", error);
      throw error;
    }
  };

  const handleSubmit = async (isRetry = false, retryAttempt = 0) => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    const currentRetryCount = isRetry ? retryAttempt : 0;

    console.log("retryCount...:", currentRetryCount);

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const largeFiles = [];

    designFiles.forEach((f) => {
      if (f.file && f.file.size > MAX_FILE_SIZE) {
        largeFiles.push(
          `${f.name} (${(f.file.size / (1024 * 1024)).toFixed(2)}MB)`
        );
      }
    });

    paymentProofs.forEach((f) => {
      if (f.file && f.file.size > MAX_FILE_SIZE) {
        largeFiles.push(
          `${f.name} (${(f.file.size / (1024 * 1024)).toFixed(2)}MB)`
        );
      }
    });

    if (largeFiles.length > 0) {
      setErrors({
        general: [
          "Unable to proceed. The following files exceed the 10MB limit:",
          ...largeFiles,
          `Please send a Google Drive link to ${formData.branch_id ? branches.find(b => b.id.toString() === formData.branch_id.toString())?.email : (branches.length === 1 ? branches[0].email : "our email")} or include it in the description.`,
        ],
      });
      return;
    }

    setProcessing(true);
    setErrors({});
    setUploadProgress(0);
    setUploadStatus("preparing");

    if (!isRetry) {
      setRetryCount(0);
    }

    try {
      setUploadStatus("customer");
      let customerId = formData.customer_id;
      if (!customerId) {
        customerId = await findOrCreateCustomer();
      }
      setUploadProgress(10);

      setUploadStatus("preparing");
      const orderData = new FormData();
      orderData.append("customer_id", customerId);
      orderData.append("branch_id", formData.branch_id);
      orderData.append("description", formData.description);
      if (formData.category_id !== "others") {
        orderData.append("job_type_id", formData.job_type_id);
      }
      orderData.append("quantity", formData.quantity);
      orderData.append("free_quantity", formData.free_quantity || 0);
      orderData.append("due_date", formData.due_date);
      orderData.append("subtotal", subtotal.toFixed(2));
      orderData.append("total_amount", subtotal.toFixed(2));

      // Append discount information if applicable
      if (discountPercentage > 0) {
        orderData.append("original_price", originalPrice.toFixed(2));
        orderData.append("discount_percentage", discountPercentage.toString());
        orderData.append("discount_amount", discountAmount.toFixed(2));
      }

      // Append Others category fields
      if (formData.category_id === "others") {
        orderData.append("category_id", "others");
        orderData.append(
          "custom_job_type_description",
          formData.custom_job_type_description
        );
        orderData.append("custom_price_mode", formData.custom_price_mode);
        if (formData.custom_price_mode === "per_item") {
          orderData.append(
            "custom_price_per_item",
            formData.custom_price_per_item
          );
        } else {
          orderData.append(
            "custom_fixed_total",
            formData.custom_fixed_total
          );
        }
      }

      if (formData.size_rate_id) {
        orderData.append("size_rate_id", formData.size_rate_id);
      }
      if (formData.size_width) {
        orderData.append("size_width", formData.size_width);
      }
      if (formData.size_height) {
        orderData.append("size_height", formData.size_height);
      }
      if (formData.selected_color) {
        orderData.append("selected_color", formData.selected_color);
      }

      designFiles.forEach((designFile) => {
        if (designFile.file) {
          orderData.append(`attachments[]`, designFile.file);
        }
      });

      orderData.append("payment_method", paymentMethod);

      paymentProofs.forEach((proof) => {
        if (proof.file) {
          orderData.append(`payment_proofs[]`, proof.file);
        }
      });

      setUploadProgress(15);
      setUploadStatus("uploading");

      const response = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percentComplete =
              Math.round((e.loaded / e.total) * 70) + 15;
            setUploadProgress(percentComplete);
          }
        });

        xhr.addEventListener("load", () => {
          setUploadProgress(90);
          setUploadStatus("processing");

          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve({ ok: true, status: xhr.status, data });
            } catch (e) {
              reject(new Error("Failed to parse response"));
            }
          } else {
            try {
              const data = JSON.parse(xhr.responseText);
              // Extract Retry-After header for rate limiting
              const retryAfter = xhr.getResponseHeader("Retry-After");
              if (retryAfter) {
                data.retry_after = parseInt(retryAfter);
              }
              resolve({ ok: false, status: xhr.status, data });
            } catch (e) {
              reject(new Error(`Server error (${xhr.status})`));
            }
          }
        });

        xhr.addEventListener("error", () =>
          reject(new Error("Network error"))
        );
        xhr.addEventListener("abort", () =>
          reject(new Error("Upload cancelled"))
        );

        xhr.open("POST", "/api/public/orders");
        xhr.setRequestHeader(
          "X-CSRF-TOKEN",
          document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute("content") || ""
        );
        xhr.send(orderData);
      });

      setUploadProgress(95);

      if (!response.ok) {
        let errorData = {};

        // Check for rate limit error first (can come as 429 or 422 with "Too Many Attempts" message)
        const isRateLimitError =
          response.status === 429 ||
          response.data?.message?.includes("Too Many Attempts") ||
          (response.data?.errors?.general &&
            Array.isArray(response.data.errors.general) &&
            response.data.errors.general.some(msg => msg.includes("Too Many Attempts")));

        if (isRateLimitError) {
          const retryAfter = response.data?.retry_after || 60; // Default 1 minute in seconds
          const minutes = Math.ceil(retryAfter / 60);
          errorData = {
            general: [
              `⏱️ Too Many Attempts! You have exceeded the maximum number of order submissions allowed.`,
              `Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.`,
              `This limit helps us prevent spam and ensure quality service for all customers.`,
              `If you need immediate assistance, please contact us directly.`,
            ],
          };
        } else if (response.status === 422 && response.data.errors) {
          errorData = response.data.errors;
        } else if (response.status === 413) {
          errorData = {
            general: [
              "One or more files are too large. Each file must be less than 10MB.",
            ],
          };
        } else if (response.status === 500) {
          errorData = {
            general: [
              "Server error occurred. This might be due to a file upload issue. Please check your files and try again.",
            ],
          };
        } else if (response.data.message) {
          errorData = { general: [response.data.message] };
        } else if (response.status === 419) {
          errorData = {
            general: ["CSRF token mismatch. Refreshing session..."],
          };
        } else {
          errorData = {
            general: [
              "An unexpected error occurred. Please try again or contact support if the problem persists.",
            ],
          };
        }

        if (
          isRetryableError(errorData) &&
          currentRetryCount < MAX_RETRIES
        ) {
          const nextRetry = currentRetryCount + 1;
          setRetryCount(nextRetry);
          setUploadStatus("retrying");

          console.log(
            `Retrying submission... Attempt ${nextRetry} of ${MAX_RETRIES}`
          );

          const delay = nextRetry * 2000;
          retryTimeoutRef.current = setTimeout(async () => {
            if (
              errorData.general?.some(
                (g) =>
                  g.includes("CSRF") ||
                  g.includes("token mismatch")
              )
            ) {
              await refreshCsrfToken();
            }
            handleSubmit(true, nextRetry);
          }, delay);

          return;
        }

        if (
          currentRetryCount >= MAX_RETRIES &&
          isRetryableError(errorData)
        ) {
          // Don't add retry message if it's a rate limit error
          const hasRateLimitError = errorData.general?.some(
            (msg) => msg.includes("Too Many Attempts")
          );

          if (!hasRateLimitError) {
            errorData.general = [
              ...(errorData.general || []),
              `Failed after ${MAX_RETRIES} attempts. Please try again later.`,
            ];
          }
        }

        setErrors(errorData);
        setUploadStatus("");
        setRetryCount(0);
        return;
      }

      if (response.data.success) {
        setUploadProgress(100);
        setUploadStatus("complete");
        setRetryCount(0);

        const ticketData = {
          ticket_number: response.data.ticket_number,
          status: response.data.ticket?.status || "pending",
          payment_status:
            response.data.ticket?.payment_status || "pending",
        };

        setSubmittedTicket(ticketData);

        try {
          const ticketHistory = JSON.parse(
            localStorage.getItem("rc_printshop_ticket_history") ||
            "[]"
          );
          const newTicket = {
            ticket_number: response.data.ticket_number,
            customer_name: `${formData.customer_firstname} ${formData.customer_lastname}`,
            created_at: new Date().toISOString(),
          };

          ticketHistory.unshift(newTicket);

          const limitedHistory = ticketHistory.slice(0, 10);
          localStorage.setItem(
            "rc_printshop_ticket_history",
            JSON.stringify(limitedHistory)
          );
        } catch (e) {
          console.error("Error saving ticket to history:", e);
        }

        // Clear saved progress on successful submission
        localStorage.removeItem("rc_printshop_order_progress");

        setTimeout(() => {
          setCurrentStep(5);
          setUploadStatus("");
        }, 800);
      } else {
        setErrors({
          general: [
            response.data.message || "Failed to submit order",
          ],
        });
        setUploadStatus("");
        setRetryCount(0);
      }
    } catch (error) {
      console.error("Error submitting order:", error);
      let errorMessage = "Unable to submit your order. ";

      if (error.message.includes("Network error")) {
        errorMessage +=
          "Please check your internet connection and try again.";
      } else if (error.message.includes("Failed to parse")) {
        errorMessage +=
          "The upload failed. Your files may be too large for the server to process.";
      } else {
        errorMessage +=
          "Please try again or contact support if the issue continues.";
      }

      const errorData = { general: [errorMessage] };

      if (
        isRetryableError(errorData) &&
        currentRetryCount < MAX_RETRIES
      ) {
        const nextRetry = currentRetryCount + 1;
        setRetryCount(nextRetry);
        setUploadStatus("retrying");

        console.log(
          `Retrying submission... Attempt ${nextRetry} of ${MAX_RETRIES}`
        );

        const delay = nextRetry * 2000;
        retryTimeoutRef.current = setTimeout(() => {
          handleSubmit(true, nextRetry);
        }, delay);

        return;
      }

      if (currentRetryCount >= MAX_RETRIES) {
        // Don't add retry message if it's a rate limit error
        const hasRateLimitError = errorData.general?.some(
          (msg) => msg.includes("Too Many Attempts")
        );

        if (!hasRateLimitError) {
          errorData.general = [
            ...errorData.general,
            `Failed after ${MAX_RETRIES} attempts. Please try again later.`,
          ];
        }
      }

      setErrors(errorData);
      setUploadStatus("");
      setRetryCount(0);
    } finally {
      setProcessing(false);
    }
  };

  const isRetryableError = (errorObj) => {
    if (!errorObj || Object.keys(errorObj).length === 0) return false;

    if (errorObj.general) {
      const generalErrors = Array.isArray(errorObj.general)
        ? errorObj.general
        : [errorObj.general];

      // Don't retry on file size errors
      if (
        generalErrors.some(
          (msg) =>
            msg.includes("too large") ||
            msg.includes("maximum size") ||
            msg.includes("Maximum size")
        )
      ) {
        return false;
      }

      // Don't retry on rate limit errors
      if (
        generalErrors.some(
          (msg) =>
            msg.includes("Too Many Attempts") ||
            msg.includes("Too Many Attempts.") ||
            msg.includes("rate limit") ||
            msg.includes("exceeded the maximum")
        )
      ) {
        return false;
      }

      return generalErrors.some(
        (msg) =>
          msg.includes("Server error") ||
          msg.includes("server response") ||
          msg.includes("connection") ||
          msg.includes("Network error") ||
          msg.includes("try again") ||
          msg.includes("CSRF") ||
          msg.includes("token mismatch")
      );
    }

    return false;
  };

  const formatErrorMessage = (field, message) => {
    const fieldNames = {
      customer_id: "Customer",
      description: "Description",
      job_type_id: "Job Type",
      quantity: "Quantity",
      free_quantity: "Free Quantity",
      size_rate_id: "Size Rate",
      size_width: "Width",
      size_height: "Height",
      due_date: "Due Date",
      subtotal: "Subtotal",
      total_amount: "Total Amount",
      payment_method: "Payment Method",
      file: "Design File",
      general: null, // Don't show field name for general errors
    };

    let friendlyFieldName = field;

    if (field.match(/^attachments\.\d+$/)) {
      const index = parseInt(field.split(".")[1]) + 1;
      friendlyFieldName = `Design File #${index}`;
    } else if (field.match(/^payment_proofs\.\d+$/)) {
      const index = parseInt(field.split(".")[1]) + 1;
      friendlyFieldName = `Payment Proof #${index}`;
    } else {
      friendlyFieldName =
        fieldNames[field] ||
        field
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    let friendlyMessage = message;

    if (message.includes("must not be greater than 10240 kilobytes")) {
      friendlyMessage = "File is too large. Maximum size is 10MB.";
    } else if (message.includes("kilobytes")) {
      friendlyMessage = "File size exceeds the allowed limit.";
    }

    if (message.includes("must be a file of type")) {
      friendlyMessage =
        "Invalid file type. Please upload JPG, JPEG, PNG only.";
    }

    if (message.includes("field is required")) {
      friendlyMessage = "This field is required.";
    }

    if (
      message.includes("must be a number") ||
      message.includes("must be an integer")
    ) {
      friendlyMessage = "Please enter a valid number.";
    }

    if (message.includes("must be at least")) {
      const match = message.match(/must be at least (\d+)/);
      if (match) {
        friendlyMessage = `Minimum value is ${match[1]}.`;
      }
    }

    if (message.includes("is not a valid date")) {
      friendlyMessage = "Please enter a valid date.";
    }

    if (message.includes("selected") && message.includes("is invalid")) {
      friendlyMessage =
        "Invalid selection. Please choose a valid option.";
    }

    return { field: friendlyFieldName, message: friendlyMessage };
  };

  const canProceedCustomer =
    formData.customer_firstname &&
    formData.customer_lastname &&
    formData.customer_phone &&
    formData.customer_facebook &&
    formData.branch_id;
  const canProceedService =
    formData.category_id &&
    (formData.category_id === "others"
      ? formData.custom_job_type_description
      : formData.job_type_id) &&
    parseInt(formData.quantity) > 0;
  const hasInvalidDesignFiles = designFiles.some((f) => f.invalid);
  const canProceedDesign =
    formData.description && formData.due_date && !hasInvalidDesignFiles;

  const priceTiers = selectedJobType?.price_tiers || [];
  const sizeRates = selectedJobType?.size_rates || [];
  const promoRules = selectedJobType?.promo_rules || [];
  const hasPriceTiers = priceTiers.length > 0;
  const hasSizeRates = sizeRates.length > 0;
  const hasPromoRules = promoRules.length > 0;

  const UploadProgressIndicator = () => {
    const statusMessages = {
      preparing: "Preparing your order...",
      customer: "Verifying customer information...",
      uploading: "Uploading files...",
      processing: "Processing your order...",
      retrying: `Connection issue detected. Retrying... (Attempt ${retryCount} of ${MAX_RETRIES})`,
      complete: "Order submitted successfully!",
    };

    if (!uploadStatus) return null;

    const totalFiles = designFiles.length + paymentProofs.length;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            {uploadStatus === "complete" ? (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            ) : uploadStatus === "retrying" ? (
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-yellow-600 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
            ) : (
              <div className="w-16 h-16 border-4 border-orange-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            )}

            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {statusMessages[uploadStatus] || "Processing..."}
            </h3>
            <p className="text-sm text-gray-600">
              {uploadStatus === "retrying"
                ? "Please wait, we're trying to reconnect..."
                : "Please don't close this window"}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full transition-all duration-300 ease-out ${uploadStatus === "retrying"
                ? "bg-gradient-to-r from-yellow-500 to-orange-600"
                : "bg-gradient-to-r from-indigo-500 to-purple-600"
                }`}
              style={{ width: `${uploadProgress}%` }}
            >
              <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
            </div>
          </div>

          <div className="text-center mt-3">
            <span className="text-sm font-semibold text-gray-700">
              {uploadProgress}%
            </span>
          </div>

          {/* File info */}
          {totalFiles > 0 && uploadStatus === "uploading" && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                Uploading {totalFiles} file(s)...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          {/* Header section */}
          <div className="flex items-center justify-between mb-3 sm:mb-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center">
                <img
                  src="/images/logo.png"
                  alt="RC PrintShoppe"
                  className="w212 h212 rounded-full"
                />
              </div>
              <div
                onClick={() =>
                  router.visit("/", {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                  })
                }
                className="cursor-pointer"
              >
                <h1 className="text-base sm:text-xl font-bold text-gray-900">
                  RC Printshoppe
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">
                  Click here to track your order
                </p>
              </div>
            </div>
          </div>

          {/* Step Indicator - Now visible on mobile */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 mt-2 sm:mt-3">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-all ${currentStep >= step
                    ? "bg-orange-600 text-white"
                    : "bg-gray-200 text-gray-500"
                    }`}
                >
                  {step}
                </div>
                {step < 5 && (
                  <div
                    className={`w-4 sm:w-8 h-0.5 transition-all ${currentStep > step
                      ? "bg-orange-600"
                      : "bg-gray-200"
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Restored Progress Banner */}
        {showRestoredBanner && currentStep !== 5 && (
          <div className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4 animate-fadeIn">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <svg
                  className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    📋 Your previous order draft has been restored
                  </p>
                  <p className="text-xs text-blue-700">
                    You can continue where you left off. Your form data and uploaded photos are automatically saved.
                  </p>
                  <button
                    onClick={clearSavedProgress}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    Start Fresh (Clear Draft)
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowRestoredBanner(false)}
                className="text-blue-400 hover:text-blue-600 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Customer Information */}
        {currentStep === 3 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 animate-fadeIn">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
                Customer Information
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
                Let us know how to reach you
              </p>
            </div>

            <div className="space-y-6">
              {/* Name Fields - Side by side on desktop, stacked on mobile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.customer_firstname}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        customer_firstname: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="e.g., Juan"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.customer_lastname}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        customer_lastname: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="e.g., Dela Cruz"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.customer_phone}
                  maxLength={11}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      customer_phone: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="09XX XXX XXXX"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Facebook *
                </label>
                <input
                  type="text"
                  value={formData.customer_facebook}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      customer_facebook: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="e.g., juancruz"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll use this to contact you about your
                  order
                </p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Email Address (optional)
                </label>
                <input
                  type="email"
                  value={formData.customer_email}
                  onChange={handleEmailChange}
                  list="email-suggestions"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="e.g., juan@gmail.com"
                  autoComplete="email"
                />

                <datalist id="email-suggestions">
                  {savedCustomers.map((customer, index) => (
                    <option
                      key={index}
                      value={customer.email}
                    >
                      {customer.firstname}{" "}
                      {customer.lastname}
                    </option>
                  ))}
                </datalist>
                {savedCustomers.length > 0 &&
                  formData.customer_email === "" && (
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Previously used emails will
                      appear as you type
                    </p>
                  )}

                {/* Email Suggestion Prompt */}
                {emailSuggestion && (
                  <div className="mt-3 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm font-semibold text-blue-900 mb-1">
                          This email was used before
                        </p>
                        <p className="text-xs sm:text-sm text-blue-800 mb-2">
                          Customer:{" "}
                          <strong>
                            {
                              emailSuggestion.firstname
                            }{" "}
                            {
                              emailSuggestion.lastname
                            }
                          </strong>
                        </p>
                        <p className="text-[10px] sm:text-xs text-blue-700 mb-3 leading-tight">
                          Do you want to use the
                          existing customer data?
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={
                              acceptEmailSuggestion
                            }
                            className="px-3 py-1.5 bg-blue-600 text-white text-[11px] sm:text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                          >
                            Yes, use this data
                          </button>
                          <button
                            type="button"
                            onClick={
                              dismissEmailSuggestion
                            }
                            className="px-3 py-1.5 bg-white text-blue-700 text-[11px] sm:text-sm font-medium border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                          >
                            No, continue with new
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Address (optional)
                </label>
                <textarea
                  value={formData.customer_address}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      customer_address: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="e.g., Rizal, Sogod, Southern Leyte"
                  rows="2"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Select Branch *
                </label>
                <select
                  value={formData.branch_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      branch_id: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                >
                  <option value="">
                    -- Choose a branch --
                  </option>
                  {branches.map((branch) => (
                    <option
                      key={branch.id}
                      value={branch.id}
                    >
                      {branch.name}{" "}
                      {branch.address
                        ? `- ${branch.address}`
                        : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select which branch you want to place your
                  order with
                </p>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 py-3 sm:py-4 rounded-lg border-2 border-gray-300 font-semibold text-sm sm:text-base text-gray-700 hover:bg-gray-50 transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  disabled={!canProceedCustomer}
                  className={`flex-1 py-3 sm:py-4 rounded-lg font-semibold text-sm sm:text-base text-white transition-all ${canProceedCustomer
                    ? "bg-orange-600 hover:bg-orange-700 shadow-lg"
                    : "bg-gray-300 cursor-not-allowed"
                    }`}
                >
                  Continue →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Select Service */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 animate-fadeIn">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
                Service Selection
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
                Choose the type of service you need
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                  Category
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {jobCategories.map((category) => {
                    const jobTypes =
                      category.job_types ||
                      category.jobTypes ||
                      [];
                    const isSelected = formData.category_id === category.id.toString();

                    return (
                      <button
                        key={category.id}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            category_id:
                              category.id.toString(),
                            job_type_id: "",
                          }))
                        }
                        className={`group relative flex flex-row items-center p-3 rounded-2xl border-2 transition-all duration-300 ${isSelected
                          ? "border-orange-500 bg-orange-50 shadow-md transform scale-[1.01]"
                          : "border-gray-100 bg-white hover:border-orange-200 hover:shadow-sm"
                          }`}
                      >
                        {/* Image Container */}
                        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden mr-4 bg-gray-50 border flex-shrink-0 transition-all duration-300 ${isSelected ? "border-orange-200" : "border-gray-100 group-hover:border-orange-100"
                          }`}>
                          {category.image_path ? (
                            <img
                              src={category.image_path.replace('/storage/storage/', '/storage/')}
                              alt={category.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                              <i className="ti-image text-xl mb-1"></i>
                              <span className="text-[10px] font-medium uppercase tracking-wider">{category.name.substring(0, 2)}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 text-left">
                          <p className={`font-bold text-sm sm:text-base transition-colors ${isSelected ? "text-orange-900" : "text-gray-700 group-hover:text-orange-600"
                            }`}>
                            {category.name}
                          </p>
                          <p className="text-[11px] sm:text-xs text-gray-500 mt-1 font-medium">
                            {jobTypes.length} services available
                          </p>
                        </div>

                        {/* Selection Badge */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center shadow-sm z-10 animate-scaleIn">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {/* Others/Custom Category */}
                  <button
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        category_id: "others",
                        job_type_id: "",
                        custom_job_type_description: "",
                        custom_price_mode: "per_item",
                        custom_price_per_item: "",
                        custom_fixed_total: ""
                      }))
                    }
                    className={`group relative flex flex-row items-center p-3 rounded-2xl border-2 transition-all duration-300 ${formData.category_id === "others"
                      ? "border-orange-500 bg-orange-50 shadow-md transform scale-[1.01]"
                      : "border-gray-100 bg-white hover:border-orange-200 hover:shadow-sm"
                      }`}
                  >
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden mr-4 bg-gray-50 border flex-shrink-0 flex items-center justify-center transition-all duration-300 ${formData.category_id === "others" ? "border-orange-200" : "border-gray-100 group-hover:border-orange-100"
                      }`}>

                      <img
                        src={'/images/others-category.png'}
                        alt="Others Category"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>

                    <div className="flex-1 text-left">
                      <p className={`font-bold text-sm sm:text-base transition-colors ${formData.category_id === "others" ? "text-orange-900" : "text-gray-700 group-hover:text-orange-600"
                        }`}>
                        Others
                      </p>
                      <p className="text-[11px] sm:text-xs text-gray-500 mt-1 font-medium">
                        Custom Order
                      </p>
                    </div>

                    {formData.category_id === "others" && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center shadow-sm z-10 animate-scaleIn">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {availableJobTypes.length > 0 && (
                <div ref={serviceTypeSectionRef}>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-3">
                    Service Type
                  </label>
                  <div className="space-y-3">
                    {availableJobTypes.map((jobType) => {
                      const hasSizeRates =
                        (jobType.size_rates || [])
                          .length > 0;
                      const hasPriceTiers =
                        (jobType.price_tiers || [])
                          .length > 0;
                      const isSelected = formData.job_type_id === jobType.id.toString();
                      const promoRules = jobType.promo_rules || [];
                      const hasPromoRules = promoRules.length > 0;
                      const hasActivePromo = promoRules.some(r => r.is_active);
                      const discountPercentage = jobType.discount_percentage || jobType.discount || null;
                      const hasDiscount = discountPercentage && parseFloat(discountPercentage) > 0;
                      const priceTiers = jobType.price_tiers || [];
                      const sizeRates = jobType.size_rates || [];

                      return (
                        <div key={jobType.id} className="space-y-3">
                          <button
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                job_type_id:
                                  jobType.id.toString(),
                              }))
                            }
                            className={`relative w-full p-3 rounded-xl border-2 text-left transition-all overflow-hidden ${isSelected
                              ? "border-orange-600 bg-orange-50 shadow-sm"
                              : "border-gray-100 hover:border-orange-300 hover:bg-gray-50"
                              }`}
                          >
                            {/* Discount/Promo Corner Ribbons */}
                            {hasDiscount && (
                              <div className="absolute top-0 right-0 z-10">
                                <div className="relative">
                                  <div className="bg-gradient-to-br from-red-500 to-red-600 text-white px-3 py-1 rounded-bl-lg shadow-lg animate-pulse">
                                    <div className="flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                      <span className="text-xs font-black tracking-tight">
                                        {parseFloat(parseFloat(discountPercentage).toFixed(2))}% OFF
                                      </span>
                                    </div>
                                  </div>
                                  {/* Corner fold effect */}
                                  <div className="absolute -bottom-1 right-0 w-0 h-0 border-l-[12px] border-l-transparent border-t-[8px] border-t-red-800 opacity-40"></div>
                                </div>
                              </div>
                            )}

                            {hasActivePromo && !hasDiscount && (
                              <div className="absolute top-0 right-0 z-10">
                                <div className="relative">
                                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white px-3 py-1 rounded-bl-lg shadow-lg">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs">🎁</span>
                                      <span className="text-xs font-black tracking-tight uppercase">
                                        Promo!
                                      </span>
                                    </div>
                                  </div>
                                  {/* Corner fold effect */}
                                  <div className="absolute -bottom-1 right-0 w-0 h-0 border-l-[12px] border-l-transparent border-t-[8px] border-t-emerald-800 opacity-40"></div>
                                </div>
                              </div>
                            )}

                            <div className="flex gap-4 items-center">
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 border border-gray-100 shadow-sm">
                                <img
                                  src={
                                    (jobType.image_path ? jobType.image_path.replace('/storage/storage/', '/storage/') : null) ||
                                    `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='16' fill='%239ca3af'%3E${encodeURIComponent(
                                      jobType.name
                                        .substring(
                                          0,
                                          2
                                        )
                                        .toUpperCase()
                                    )}%3C/text%3E%3C/svg%3E`
                                  }
                                  alt={
                                    jobType.name
                                  }
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(
                                    e
                                  ) => {
                                    e.target.onerror =
                                      null;
                                    e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='16' fill='%239ca3af'%3ENA%3C/text%3E%3C/svg%3E`;
                                  }}
                                />
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 pr-2">
                                    <p className="font-normal text-gray-900">
                                      {
                                        jobType.name
                                      }
                                    </p>
                                    {jobType.description && (
                                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                        {
                                          jobType.description
                                        }
                                      </p>
                                    )}
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {/* Show discount badge in tags too */}
                                      {hasDiscount && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300 animate-pulse">
                                          💥 {parseFloat(parseFloat(discountPercentage).toFixed(2))}% OFF
                                        </span>
                                      )}
                                      {hasActivePromo && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-green-100 to-emerald-200 text-green-800 border border-green-300">
                                          🎁 PROMO
                                        </span>
                                      )}
                                      {jobType.brochure_link && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">
                                          📄 Brochure
                                        </span>
                                      )}
                                      {jobType.has_colors && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-pink-100 text-pink-700 uppercase tracking-wider">
                                          🎨 {jobType.available_colors?.length || 0} Colors
                                        </span>
                                      )}
                                      {jobType.promo_text && !hasActivePromo && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                                          🎁
                                          Promo
                                        </span>
                                      )}
                                      {hasPriceTiers && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800">
                                          📊
                                          Bulk
                                        </span>
                                      )}
                                      {hasSizeRates && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800">
                                          📐
                                          Size
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {/* Price section - with spacing to avoid ribbon overlap */}
                                  <div className={`flex-shrink-0 ${(hasDiscount || hasActivePromo) ? 'mt-3 sm:mr-0' : ''}`}>
                                    {!hasSizeRates &&
                                      !hasPriceTiers && (
                                        <div className="text-right flex flex-col items-end">
                                          {hasDiscount ? (
                                            <>
                                              <span className="text-xs text-gray-400 line-through">
                                                {formatPeso(parseFloat(jobType.price || 0).toFixed(2))}
                                              </span>
                                              <span className="text-green-600 font-bold text-lg">
                                                {formatPeso((parseFloat(jobType.price || 0) * (1 - parseFloat(discountPercentage) / 100)).toFixed(2))}
                                              </span>
                                            </>
                                          ) : (
                                            <span className="text-orange-600 font-bold text-lg">
                                              {formatPeso(
                                                parseFloat(
                                                  jobType.price ||
                                                  0
                                                ).toFixed(
                                                  2
                                                )
                                              )}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    {(hasSizeRates ||
                                      hasPriceTiers) && (
                                        <div className="text-right flex flex-col items-end">
                                          {hasDiscount ? (
                                            <>
                                              <span className="text-xs text-gray-400 line-through">
                                                {formatPeso(parseFloat(jobType.price || 0).toFixed(2))}
                                              </span>
                                              <span className="text-green-600 text-xs italic">
                                                Starts at{" "}
                                                <span className="text-lg font-bold not-italic block">
                                                  {formatPeso((parseFloat(jobType.price || 0) * (1 - parseFloat(discountPercentage) / 100)).toFixed(2))}
                                                </span>
                                              </span>
                                            </>
                                          ) : (
                                            <span className="text-orange-600 text-xs mt-1 italic">
                                              Price Starts
                                              at{" "}
                                              <div className="text-lg font-bold">
                                                {formatPeso(
                                                  parseFloat(
                                                    jobType.price ||
                                                    0
                                                  ).toFixed(
                                                    2
                                                  )
                                                )}

                                              </div>

                                            </span>
                                          )}
                                        </div>
                                      )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>

                          {/* Additional Information - Only shown when this job type is selected */}
                          {isSelected && (
                            <div className="ml-4 pl-4 border-l-4 border-orange-300 space-y-4 animate-fadeIn">
                              {/* Brochure Link */}
                              {jobType.brochure_link && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                  <div className="flex items-center gap-3">
                                    <span className="text-blue-600 text-xl">📄</span>
                                    <div>
                                      <p className="font-semibold text-blue-900">Brochure Available</p>
                                      <a
                                        href={jobType.brochure_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                                      >
                                        View Product Brochure (Google Drive)
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Color Selection */}
                              {jobType.has_colors && jobType.available_colors?.length > 0 && (
                                <div>
                                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-3">
                                    Select Color
                                  </label>
                                  <div className="flex flex-wrap gap-1">
                                    {jobType.available_colors.map((colorObj, idx) => {
                                      const hex = typeof colorObj === 'string' ? colorObj : colorObj.hex;
                                      const code = typeof colorObj === 'string' ? '' : colorObj.code;
                                      return (
                                        <button
                                          key={idx}
                                          type="button"
                                          onClick={() => setFormData(prev => ({ ...prev, selected_color: hex }))}
                                          className={`w-10 h-10 border-2 transition-all transform hover:scale-110 ${formData.selected_color === hex
                                            ? "border-orange-600 ring-2 ring-orange-200"
                                            : "border-gray-200"
                                            }`}
                                          style={{ backgroundColor: hex }}
                                          title={code ? `${getColorName(hex)} (${code})` : getColorName(hex)}
                                        />
                                      );
                                    })}
                                  </div>
                                  {formData.selected_color && (
                                    <p className="text-xs text-gray-500 mt-2">
                                      Selected: <span className="font-semibold text-gray-900">{getFullColorName(formData.selected_color, selectedJobType)}</span> ({formData.selected_color})
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Promo Rules Display */}
                              {hasPromoRules && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                  <div className="flex items-start gap-2">
                                    <span className="text-green-600 text-xl">
                                      🎁
                                    </span>
                                    <div className="flex-1">
                                      <p className="font-semibold text-green-900 mb-1">
                                        Available Promos:
                                      </p>
                                      <ul className="text-sm text-green-800 space-y-1">
                                        {promoRules
                                          .filter((r) => r.is_active)
                                          .map((rule, idx) => (
                                            <li key={idx}>
                                              {rule.description ||
                                                `Buy ${rule.buy_quantity}, Get ${rule.free_quantity} Free`}
                                            </li>
                                          ))}
                                      </ul>
                                      {formData.quantity > 0 && formData.free_quantity > 0 && (
                                        <p className="text-sm font-bold text-green-700 mt-2">
                                          ✓ You get{" "}
                                          {formData.free_quantity}{" "}
                                          free item(s)! Total:{" "}
                                          {parseInt(
                                            formData.quantity
                                          ) +
                                            parseInt(
                                              formData.free_quantity
                                            )}{" "}
                                          pcs
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Price Tiers Display */}
                              {hasPriceTiers && (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                  <p className="font-semibold text-orange-900 mb-2">
                                    📊 Bulk Pricing:
                                  </p>
                                  <div className="space-y-1 text-sm">
                                    {priceTiers.map((tier, idx) => (
                                      <div
                                        key={idx}
                                        className="flex justify-between"
                                      >
                                        <span className="text-orange-800">
                                          {tier.min_quantity}
                                          {tier.max_quantity
                                            ? ` - ${tier.max_quantity}`
                                            : "+"}{" "}
                                          pcs:
                                        </span>
                                        <span className="font-semibold text-orange-900">
                                          {formatPeso(
                                            parseFloat(
                                              tier.price
                                            ).toFixed(2)
                                          )}
                                          /unit
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Size-Based Pricing */}
                              {hasSizeRates && (
                                <div>
                                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-3">
                                    Size Options
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    {sizeRates.map((rate) => (
                                      <button
                                        key={rate.id}
                                        type="button"
                                        onClick={() =>
                                          setFormData((prev) => ({
                                            ...prev,
                                            size_rate_id: rate.id.toString(),
                                          }))
                                        }
                                        className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${formData.size_rate_id === rate.id.toString()
                                          ? "border-orange-600 bg-orange-50 text-orange-700 shadow-sm"
                                          : "border-gray-200 text-gray-600 hover:border-orange-300 hover:bg-gray-50"
                                          }`}
                                      >
                                        {rate.variant_name}
                                      </button>
                                    ))}
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-2">
                                        Width (
                                        {selectedSizeRate?.dimension_unit ||
                                          "unit"}
                                        )
                                      </label>
                                      <input
                                        type="number"
                                        value={formData.size_width}
                                        onChange={(e) =>
                                          setFormData((prev) => ({
                                            ...prev,
                                            size_width:
                                              e.target.value,
                                          }))
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                        placeholder="0"
                                        step="0.1"
                                        min="0"
                                      />
                                    </div>
                                    {selectedSizeRate?.calculation_method !==
                                      "length" && (
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 mb-2">
                                            Height (
                                            {selectedSizeRate?.dimension_unit ||
                                              "unit"}
                                            )
                                          </label>
                                          <input
                                            type="number"
                                            value={formData.size_height}
                                            onChange={(e) =>
                                              setFormData((prev) => ({
                                                ...prev,
                                                size_height:
                                                  e.target.value,
                                              }))
                                            }
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                            placeholder="0"
                                            step="0.1"
                                            min="0"
                                          />
                                        </div>
                                      )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {formData.category_id === "others" && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Job Type Description *
                    </label>
                    <input
                      type="text"
                      value={formData.custom_job_type_description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          custom_job_type_description:
                            e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., Custom Banner, Special Stickers"
                      required
                    />
                  </div>

                  <p className="text-sm text-gray-500 italic mt-2">
                    Note: Our team will verify this request and provide you with a final price shortly.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      quantity: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  min="1"
                />
              </div>

              {subtotal > 0 && (
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">
                      Estimated Price:
                    </span>
                    <span className="text-2xl font-bold text-orange-600">
                      {formatPeso(subtotal.toFixed(2))}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={!canProceedService}
                  className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${canProceedService
                    ? "bg-orange-600 hover:bg-orange-700 shadow-lg"
                    : "bg-gray-300 cursor-not-allowed"
                    }`}
                >
                  Continue →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Details & Upload */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 animate-fadeIn">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Design & Details
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">
                Show us what you want to create
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  rows="4"
                  placeholder="Describe what you need... (e.g., 'Business cards with my logo on glossy paper')"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  When do you need it? *
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      due_date: e.target.value,
                    }))
                  }
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Upload Design/Reference (Optional)
                  {designFiles.length > 0 && (
                    <span className="ml-2 text-xs text-gray-500">
                      ({designFiles.length}/5 files)
                    </span>
                  )}
                  <span className="block mt-1 text-[10px] sm:text-xs font-normal text-orange-600">
                    * Large files? Send a Google Drive link to{" "}
                    <span className="font-bold">
                      {formData.branch_id
                        ? branches.find(
                          (b) =>
                            b.id.toString() ===
                            formData.branch_id.toString()
                        )?.email
                        : branches.length > 0
                          ? branches[0].email
                          : "our email"}
                    </span>{" "}
                    or include it in the description.
                  </span>
                </label>
                <input
                  ref={designFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={designFiles.length >= 5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {designFiles.length >= 5 && (
                  <p className="text-xs text-orange-200 mt-1 font-medium">
                    Maximum file limit reached. Remove some files to upload more.
                  </p>
                )}

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2 mt-1">
                  <svg
                    className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm text-orange-800">
                    <p className="font-medium">
                      File Requirements:
                    </p>
                    <ul className="mt-1 space-y-0.5 text-xs">
                      <li>
                        • Maximum files:{" "}
                        <strong>5 files</strong>
                      </li>
                      <li>
                        • Maximum size:{" "}
                        <strong>10MB per file</strong>
                      </li>
                      <li>
                        • Accepted formats:{" "}
                        <strong>JPG, JPEG, PNG</strong>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Design File Upload Error */}
                {designFileError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 mt-2">
                    <svg
                      className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm text-red-800 font-medium">
                        {designFileError}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDesignFileError("")}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                )}

                {designFiles.length > 0 && (
                  <div className="mt-4">
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                      {designFiles.map((file, index) => (
                        <div key={index} className="relative flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setActiveDesignTab(index)}
                            className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${activeDesignTab === index
                              ? "border-orange-600 ring-2 ring-orange-200"
                              : "border-gray-200 opacity-60 hover:opacity-100"
                              }`}
                          >
                            <img
                              src={file.preview}
                              alt={`Thumb ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                          {file.invalid && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center border border-white">
                              <span className="text-[8px] text-white font-bold">!</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div
                      className={`border-2 border-dashed rounded-lg p-4 relative ${designFiles[activeDesignTab]
                        ?.invalid
                        ? "border-red-400 bg-red-50"
                        : "border-gray-300 bg-gray-50"
                        }`}
                    >
                      {designFiles[activeDesignTab]?.invalid && (
                        <div className="flex items-center gap-2 text-red-600 mb-2 justify-center">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="text-sm font-bold">
                            {designFiles[activeDesignTab].errorMessage}
                          </span>
                        </div>
                      )}

                      <img
                        src={designFiles[activeDesignTab]?.preview}
                        alt={`Design ${activeDesignTab + 1}`}
                        className="max-h-64 mx-auto rounded shadow-sm bg-white"
                      />

                      <div className="text-center mt-3 text-sm text-gray-700 font-medium truncate px-8">
                        {designFiles[activeDesignTab]?.name}
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="text-xs text-gray-500 italic">
                          File {activeDesignTab + 1} of {designFiles.length}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDesignFile(activeDesignTab)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-semibold"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 py-3 rounded-lg border-2 border-gray-300 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!canProceedDesign}
                  className={`flex-1 py-3 rounded-lg font-semibold text-white transition-all ${canProceedDesign
                    ? "bg-orange-600 hover:bg-orange-700 shadow-md"
                    : "bg-gray-300 cursor-not-allowed"
                    }`}
                >
                  Continue →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Payment & Review */}
        {currentStep === 4 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 animate-fadeIn">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                Order Summary & Confirmation
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">
                Please review your details before submitting
              </p>
            </div>

            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Customer
                  </p>
                  <p className="font-semibold text-gray-900">
                    {formData.customer_firstname}{" "}
                    {formData.customer_lastname}
                  </p>
                  {formData.customer_email && (
                    <p className="text-sm text-gray-600">
                      {formData.customer_email}
                    </p>
                  )}
                  <p className="text-sm text-gray-600">
                    {formData.customer_phone}
                  </p>
                  <p className="text-sm text-gray-600">
                    Facebook: {formData.customer_facebook}
                  </p>
                  {formData.customer_address && (
                    <p className="text-sm text-gray-600">
                      Address: {formData.customer_address}
                    </p>
                  )}
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Service
                  </p>
                  <p className="font-semibold text-gray-900">
                    {formData.category_id === "others"
                      ? formData.custom_job_type_description
                      : selectedJobType?.name}
                  </p>
                  {formData.category_id === "others" && (
                    <p className="text-xs text-gray-500 italic mb-1">
                      Mode: {formData.custom_price_mode === "per_item" ? "Price Per Item" : "Fixed Total"}
                    </p>
                  )}
                  <p className="text-sm text-gray-600">
                    Quantity: {formData.quantity}
                  </p>
                  {formData.free_quantity > 0 && (
                    <p className="text-sm text-green-600 font-semibold">
                      Free: {formData.free_quantity}{" "}
                      (Total:{" "}
                      {parseInt(formData.quantity) +
                        parseInt(
                          formData.free_quantity
                        )}{" "}
                      pcs)
                    </p>
                  )}
                  {formData.size_width && (
                    <p className="text-sm text-gray-600">
                      Size: {formData.size_width}
                      {formData.size_height &&
                        ` × ${formData.size_height}`}{" "}
                      {selectedSizeRate?.dimension_unit}
                    </p>
                  )}
                  {formData.selected_color && (
                    <p className="text-sm text-gray-600">
                      Color: <span className="font-semibold text-gray-900">{getFullColorName(formData.selected_color, selectedJobType)}</span> ({formData.selected_color})
                    </p>
                  )}
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Details
                  </p>
                  <p className="text-sm text-gray-700">
                    {formData.description}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Due:{" "}
                    {new Date(
                      formData.due_date
                    ).toLocaleDateString()}
                  </p>
                </div>

                <div className="border-t pt-4">
                  {/* Price Breakdown */}
                  <div className="space-y-2">
                    {/* Original Price */}
                    {discountPercentage > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          Original Price:
                        </span>
                        <span className="text-sm text-gray-500 line-through">
                          {formatPeso(originalPrice.toFixed(2))}
                        </span>
                      </div>
                    )}

                    {/* Discount */}
                    {discountPercentage > 0 && (
                      <div className="flex justify-between items-center bg-red-50 -mx-2 px-2 py-2 rounded">
                        <span className="text-sm font-semibold text-red-700 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          Discount ({parseFloat(parseFloat(discountPercentage).toFixed(2))}%):
                        </span>
                        <span className="text-sm font-bold text-red-700">
                          - {formatPeso(discountAmount.toFixed(2))}
                        </span>
                      </div>
                    )}

                    {/* Total */}
                    <div className={`flex justify-between items-center pt-2 ${discountPercentage > 0 ? 'border-t' : ''}`}>
                      <span className="text-lg font-semibold text-gray-900">
                        Total Amount:
                      </span>
                      <span className={`text-xl font-bold ${discountPercentage > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                        {subtotal > 0 ? formatPeso(subtotal.toFixed(2)) : "To be confirmed"}
                      </span>
                    </div>

                    {/* Savings highlight */}
                    {discountPercentage > 0 && subtotal > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2 mt-2">
                        <p className="text-xs text-green-800 font-semibold text-center">
                          🎉 You save {formatPeso(discountAmount.toFixed(2))} with this discount!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Payment Method *
                </label>
                <div className="space-y-3">
                  <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="payment_method"
                      value="walkin"
                      checked={paymentMethod === "walkin"}
                      onChange={(e) =>
                        setPaymentMethod(e.target.value)
                      }
                      className="mt-1 mr-3"
                    />

                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        Pay on Walk-in
                      </p>
                      <p className="text-sm text-gray-600">
                        Pay when you visit our shop.
                        Just for record keeping.
                      </p>
                    </div>
                  </label>

                  {settings?.payment?.gcash
                    ?.show_on_customer_page && (
                      <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="payment_method"
                          value="gcash"
                          checked={
                            paymentMethod === "gcash"
                          }
                          onChange={(e) =>
                            setPaymentMethod(
                              e.target.value
                            )
                          }
                          className="mt-1 mr-3"
                        />

                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            GCash
                          </p>
                          <p className="text-sm text-gray-600">
                            Pay via GCash (downpayment
                            or full payment)
                          </p>
                        </div>
                      </label>
                    )}

                  <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="payment_method"
                      value="bank_transfer"
                      checked={paymentMethod === "bank_transfer"}
                      onChange={(e) =>
                        setPaymentMethod(e.target.value)
                      }
                      className="mt-1 mr-3"
                    />

                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        Bank Transfer
                      </p>
                      <p className="text-sm text-gray-600">
                        Pay via bank transfer
                        (downpayment or full payment)
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* GCash Payment Info */}
              {paymentMethod === "gcash" &&
                settings?.payment?.gcash &&
                settings?.payment?.gcash
                  ?.show_on_customer_page !== false && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="font-semibold text-green-900 mb-4">
                      GCash Payment Details
                    </h3>
                    <div className="space-y-3">
                      {settings.payment.gcash
                        .account_name && (
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-green-800">
                              Account Name:
                            </p>
                            <p className="text-lg font-bold text-green-900">
                              {
                                settings.payment
                                  .gcash
                                  .account_name
                              }
                            </p>
                          </div>
                        )}
                      {settings.payment.gcash.number && (
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-green-800">
                            GCash Number:
                          </p>
                          <p className="text-lg font-bold text-green-900">
                            {
                              settings.payment
                                .gcash.number
                            }
                          </p>
                        </div>
                      )}
                      {settings.payment.gcash.qrcode && (
                        <div>
                          <p className="text-sm font-medium text-green-800 mb-2">
                            QR Code:
                          </p>
                          <div className="bg-white p-4 rounded border border-green-300 inline-block">
                            {!qrcodeError ? (
                              <img
                                src={
                                  settings
                                    .payment
                                    .gcash
                                    .qrcode
                                }
                                alt="GCash QR Code"
                                className="w-32 h-32 object-contain"
                                onError={() =>
                                  setQrcodeError(
                                    true
                                  )
                                }
                              />
                            ) : (
                              <div className="w-32 h-32 bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                                QR Code not
                                available
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Bank Transfer Payment Info */}
              {paymentMethod === "bank_transfer" &&
                settings?.payment?.bank_accounts &&
                settings.payment.bank_accounts.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                    <h3 className="font-semibold text-orange-900 mb-4">
                      Bank Transfer Details
                    </h3>

                    {/* Tabs for multiple bank accounts */}
                    {settings.payment.bank_accounts.length >
                      1 && (
                        <div className="flex gap-2 mb-4 overflow-x-auto">
                          {settings.payment.bank_accounts.map(
                            (_, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() =>
                                  setActiveBankTab(
                                    index
                                  )
                                }
                                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeBankTab ===
                                  index
                                  ? "bg-orange-600 text-white"
                                  : "bg-white text-orange-900 hover:bg-orange-100 border border-orange-300"
                                  }`}
                              >
                                {settings.payment
                                  .bank_accounts[
                                  index
                                ].bank_name ||
                                  `Bank ${index + 1
                                  }`}
                              </button>
                            )
                          )}
                        </div>
                      )}

                    {/* Bank Account Details */}
                    {settings.payment.bank_accounts[
                      activeBankTab
                    ] &&
                      (() => {
                        const bankAccount =
                          settings.payment
                            .bank_accounts[
                          activeBankTab
                          ];
                        return (
                          <div className="space-y-3">
                            {bankAccount.bank_name && (
                              <div>
                                <p className="text-xs sm:text-sm font-medium text-orange-800">
                                  Bank Name:
                                </p>
                                <p className="text-lg font-bold text-orange-900">
                                  {
                                    bankAccount.bank_name
                                  }
                                </p>
                              </div>
                            )}
                            {bankAccount.account_name && (
                              <div>
                                <p className="text-xs sm:text-sm font-medium text-orange-800">
                                  Account
                                  Name:
                                </p>
                                <p className="text-lg font-bold text-orange-900">
                                  {
                                    bankAccount.account_name
                                  }
                                </p>
                              </div>
                            )}
                            {bankAccount.account_number && (
                              <div>
                                <p className="text-xs sm:text-sm font-medium text-orange-800">
                                  Account
                                  Number:
                                </p>
                                <p className="text-lg font-bold text-orange-900">
                                  {
                                    bankAccount.account_number
                                  }
                                </p>
                              </div>
                            )}
                            {bankAccount.qrcode && (
                              <div>
                                <p className="text-sm font-medium text-orange-800 mb-2">
                                  QR Code:
                                </p>
                                <div className="bg-white p-4 rounded border border-orange-300 inline-block">
                                  <img
                                    src={
                                      bankAccount.qrcode
                                    }
                                    alt={`Bank QR Code ${activeBankTab +
                                      1
                                      }`}
                                    className="w-32 h-32 object-contain"
                                    onError={(
                                      e
                                    ) => {
                                      e.target.style.display =
                                        "none";
                                      if (
                                        e
                                          .target
                                          .nextSibling
                                      ) {
                                        e.target.nextSibling.style.display =
                                          "flex";
                                      }
                                    }}
                                  />

                                  <div className="w-32 h-32 bg-gray-200 hidden items-center justify-center text-xs text-gray-500">
                                    QR Code
                                    not
                                    available
                                  </div>
                                </div>
                              </div>
                            )}
                            {settings.payment
                              .bank_accounts
                              .length > 1 && (
                                <p className="text-xs text-orange-700 mt-3">
                                  Account{" "}
                                  {activeBankTab +
                                    1}{" "}
                                  of{" "}
                                  {
                                    settings
                                      .payment
                                      .bank_accounts
                                      .length
                                  }
                                </p>
                              )}
                          </div>
                        );
                      })()}
                  </div>
                )}

              {/* Payment Proof Upload */}
              {(paymentMethod === "gcash" ||
                paymentMethod === "bank_transfer") && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Upload Payment Proof (GCash / Bank
                      Receipts) *
                      {paymentProofs.length > 0 && (
                        <span className="ml-2 text-xs text-gray-500">
                          (1/1 file)
                        </span>
                      )}
                    </label>
                    <input
                      ref={paymentProofInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePaymentProofUpload}
                      disabled={paymentProofs.length >= 1}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    {paymentProofs.length >= 1 ? (
                      <p className="text-xs text-orange-600 mt-1 font-medium">
                        Maximum file limit reached. Remove the file to upload another.
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">
                        Maximum 1 file • JPG, JPEG, PNG • Max 10MB
                      </p>
                    )}

                    {/* Payment Proof Upload Error */}
                    {paymentProofError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 mt-2">
                        <svg
                          className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm text-red-800 font-medium">
                            {paymentProofError}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPaymentProofError("")}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    )}

                    {paymentProofs.length > 0 && (
                      <div className="mt-4">
                        <div
                          className={`border rounded-lg p-4 ${paymentProofs[
                            activeProofTab
                          ]?.invalid
                            ? "border-red-400 bg-red-50"
                            : "bg-gray-50"
                            }`}
                        >
                          {paymentProofs[activeProofTab]
                            ?.invalid && (
                              <div className="flex items-center gap-2 text-red-600 mb-2 justify-center">
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span className="text-sm font-bold">
                                  {
                                    paymentProofs[
                                      activeProofTab
                                    ].errorMessage
                                  }
                                </span>
                              </div>
                            )}
                          <img
                            src={
                              paymentProofs[
                                activeProofTab
                              ]?.preview
                            }
                            alt="Payment proof"
                            className="max-h-64 mx-auto rounded"
                          />

                          <div className="text-center mt-2 text-sm text-gray-600 truncate max-w-xs mx-auto">
                            {paymentProofs[activeProofTab]?.name}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removePaymentProof(
                                activeProofTab
                              )
                            }
                            className="w-full mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                          >
                            Remove Proof
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* Validation Errors Display */}
              {Object.keys(errors).length > 0 && (() => {
                // Check if it's a rate limit error
                const hasRateLimitError = Object.values(errors).some(
                  messages => {
                    const msgArray = Array.isArray(messages) ? messages : [messages];
                    return msgArray.some(msg =>
                      msg.includes("Too Many Attempts") ||
                      msg.includes("rate limit")
                    );
                  }
                );

                const bgColor = hasRateLimitError ? "bg-yellow-50" : "bg-red-50";
                const borderColor = hasRateLimitError ? "border-yellow-300" : "border-red-200";
                const iconColor = hasRateLimitError ? "text-yellow-600" : "text-red-600";

                return (
                  <div className={`mb-6 ${bgColor} border-2 ${borderColor} rounded-lg p-4`}>
                    <div className="flex items-start gap-3">
                      <svg
                        className={`w-6 h-6 ${iconColor} flex-shrink-0 mt-0.5`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="flex-1">
                        <h3 className={`text-lg font-bold mb-3 ${hasRateLimitError ? 'text-yellow-900' : 'text-red-900'}`}>
                          {hasRateLimitError
                            ? "⏱️ Please Wait Before Trying Again"
                            : "⚠️ Unable to Submit Order"}
                        </h3>
                        <div className="space-y-2">
                          {Object.entries(errors).map(
                            ([field, messages]) => {
                              const messageArray =
                                Array.isArray(
                                  messages
                                )
                                  ? messages
                                  : [messages];
                              return messageArray.map(
                                (message, idx) => {
                                  const formatted =
                                    formatErrorMessage(
                                      field,
                                      message
                                    );
                                  return (
                                    <div
                                      key={`${field}-${idx}`}
                                      className={`flex items-start gap-2 bg-white p-3 rounded-lg border ${hasRateLimitError ? 'border-yellow-300' : 'border-red-200'
                                        }`}
                                    >
                                      <svg
                                        className={`w-4 h-4 flex-shrink-0 mt-0.5 ${hasRateLimitError ? 'text-yellow-600' : 'text-red-500'
                                          }`}
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <div className="flex-1">
                                        {/* Only show field name if it's not "general" */}
                                        {formatted.field && field !== 'general' && (
                                          <span className={`font-semibold text-sm ${hasRateLimitError ? 'text-yellow-900' : 'text-red-900'
                                            }`}>
                                            {
                                              formatted.field
                                            }
                                            :{" "}
                                          </span>
                                        )}
                                        <span className={`text-sm ${hasRateLimitError
                                          ? 'text-yellow-800 font-medium'
                                          : field === 'general'
                                            ? 'text-red-700 font-medium'
                                            : 'text-red-700'
                                          }`}>
                                          {
                                            formatted.message
                                          }
                                        </span>
                                      </div>
                                    </div>
                                  );
                                }
                              );
                            }
                          )}
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => {
                              setErrors({});
                              setRetryCount(0);
                            }}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${hasRateLimitError
                              ? 'text-yellow-700 hover:text-white hover:bg-yellow-600 border border-yellow-300'
                              : 'text-red-700 hover:text-white hover:bg-red-600 border border-red-300'
                              }`}
                          >
                            Dismiss
                          </button>
                          {/* Manual retry button - hidden for rate limit errors */}
                          {!hasRateLimitError && (
                            <button
                              onClick={() => {
                                setErrors({});
                                setRetryCount(0);
                                handleSubmit(false);
                              }}
                              disabled={processing}
                              className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processing
                                ? "Retrying..."
                                : "Try Again"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {uploadStatus && <UploadProgressIndicator />}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setCurrentStep(3);
                    setErrors({});
                    setRetryCount(0);
                    if (retryTimeoutRef.current) {
                      clearTimeout(
                        retryTimeoutRef.current
                      );
                    }
                  }}
                  disabled={processing}
                  className="flex-1 py-3 rounded-lg border-2 border-gray-300 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  ← Back
                </button>
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={
                    processing ||
                    ((paymentMethod === "gcash" ||
                      paymentMethod === "bank_transfer") &&
                      paymentProofs.length === 0) ||
                    paymentProofs.some((p) => p.invalid)
                  }
                  className={`flex-1 py-4 rounded-lg bg-orange-600 font-bold text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all ${processing ||
                    ((paymentMethod === "gcash" ||
                      paymentMethod === "bank_transfer") &&
                      paymentProofs.length === 0) ||
                    paymentProofs.some((p) => p.invalid)
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                    }`}
                >
                  {processing
                    ? "Submitting..."
                    : "Submit Order ✓"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Success Page */}
        {currentStep === 5 && submittedTicket && (
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 animate-fadeIn">
            <div className="text-center mb-8">
              <div className="w-24 h-24 sm:w-28 sm:h-28 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm ring-6 ring-green-50">
                <svg
                  className="w-12 h-12 sm:w-14 sm:h-14 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Order Submitted Successfully!
              </h2>
              <p className="text-sm sm:text-base text-gray-500">
                Your order has been received. We will contact
                you shortly.
              </p>
            </div>

            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 mb-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">
                    Ticket Number:
                  </span>
                  <span className="text-xl font-bold text-orange-600">
                    {submittedTicket.ticket_number}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">
                    Status:
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${submittedTicket.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : submittedTicket.status ===
                        "completed"
                        ? "bg-green-100 text-green-800"
                        : "bg-orange-100 text-orange-800"
                      }`}
                  >
                    {submittedTicket.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">
                    Payment Status:
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${submittedTicket.payment_status ===
                      "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : submittedTicket.payment_status ===
                        "paid"
                        ? "bg-green-100 text-green-800"
                        : "bg-orange-100 text-orange-800"
                      }`}
                  >
                    {submittedTicket.payment_status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <svg
                  className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-xs sm:text-sm text-orange-800">
                  <strong>Important:</strong> Please save your
                  ticket number{" "}
                  <strong>
                    {submittedTicket.ticket_number}
                  </strong>{" "}
                  for tracking your order. We'll contact you
                  within 24 hours to confirm your order and
                  discuss payment options.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  if (submittedTicket?.ticket_number) {
                    localStorage.setItem(
                      "rc_printshop_last_ticket",
                      submittedTicket.ticket_number
                    );
                  }
                  router.visit("/");
                }}
                className="w-full py-3 sm:py-4 rounded-lg border-2 border-orange-600 font-bold text-orange-600 hover:bg-orange-50 shadow-lg hover:shadow-xl transition-all text-sm sm:text-base"
              >
                ← Back to Home
              </button>
              <button
                onClick={() => {
                  setSubmittedTicket(null);
                  clearSavedProgress();
                }}
                className="w-full py-3 sm:py-4 rounded-lg bg-orange-600 font-bold text-white hover:bg-orange-700 shadow-lg hover:shadow-xl transition-all text-sm sm:text-base"
              >
                Place Another Order
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        /* Mobile-specific adjustments */
        @media (max-width: 640px) {
          /* Adjust input field padding for mobile */
          input[type="text"],
          input[type="email"],
          input[type="tel"],
          textarea,
          select {
            font-size: 14px;
            padding: 10px 12px;
          }
          
          /* Ensure proper text scaling on mobile */
          body {
            -webkit-text-size-adjust: 100%;
          }
          
          /* Smaller step indicator on mobile */
          .step-indicator-mobile {
            gap: 0.25rem;
          }
        }
      `}</style>
    </div>
  );
}
