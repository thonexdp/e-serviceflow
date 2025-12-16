import { useState, useEffect, useMemo, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import { formatPeso } from '@/Utils/currency';

export default function CustomerPOSOrder() {
    const { jobCategories = [] } = usePage().props;

    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        customer_name: '',
        customer_email: '',
        customer_facebook: '',
        customer_phone: '',
        customer_id: null,
        category_id: '',
        job_type_id: '',
        description: '',
        quantity: 1,
        free_quantity: 0,
        size_width: '',
        size_height: '',
        size_rate_id: '',
        due_date: '',
        file: null
    });

    const [designFiles, setDesignFiles] = useState([]);
    const [activeDesignTab, setActiveDesignTab] = useState(0);
    const [selectedJobType, setSelectedJobType] = useState(null);
    const [selectedSizeRate, setSelectedSizeRate] = useState(null);
    const [subtotal, setSubtotal] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('walkin');
    const [paymentProofs, setPaymentProofs] = useState([]);
    const [activeProofTab, setActiveProofTab] = useState(0);
    const [submittedTicket, setSubmittedTicket] = useState(null);
    const [settings, setSettings] = useState(null);
    const [qrcodeError, setQrcodeError] = useState(false);
    const [savedCustomers, setSavedCustomers] = useState([]);

    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');
    const [errors, setErrors] = useState({});
    const [retryCount, setRetryCount] = useState(0);
    const retryTimeoutRef = useRef(null);

    const MAX_RETRIES = 3;

    // Load saved customers from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('rc_printshop_customers');
        if (saved) {
            try {
                setSavedCustomers(JSON.parse(saved));
            } catch (e) {
                console.error('Error loading saved customers:', e);
            }
        }
    }, []);

    // Fetch settings on component mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch('/api/public/settings');
                const data = await response.json();
                if (data.success) {
                    setSettings(data.data);
                    setQrcodeError(false); // Reset QR code error when settings are fetched
                }
            } catch (err) {
                console.error('Error fetching settings:', err);
            }
        };
        fetchSettings();
    }, []);

    const availableJobTypes = useMemo(() => {
        if (!formData.category_id) return [];
        const category = jobCategories.find(cat => cat.id.toString() === formData.category_id.toString());
        return category?.job_types || category?.jobTypes || [];
    }, [formData.category_id, jobCategories]);

    // Update selected job type when job_type_id changes
    useEffect(() => {
        if (formData.job_type_id) {
            const jobType = availableJobTypes.find(jt => jt.id.toString() === formData.job_type_id.toString());
            setSelectedJobType(jobType || null);

            if (jobType?.size_rates?.length > 0) {
                const defaultRate = jobType.size_rates.find(r => r.is_default) || jobType.size_rates[0];
                setSelectedSizeRate(defaultRate);
                setFormData(prev => ({ ...prev, size_rate_id: defaultRate.id.toString() }));
            } else {
                setSelectedSizeRate(null);
            }
        } else {
            setSelectedJobType(null);
            setSelectedSizeRate(null);
        }
    }, [formData.job_type_id, availableJobTypes]);

    // Update selected size rate
    useEffect(() => {
        if (formData.size_rate_id && selectedJobType?.size_rates) {
            const rate = selectedJobType.size_rates.find(r => r.id.toString() === formData.size_rate_id.toString());
            setSelectedSizeRate(rate || null);
        }
    }, [formData.size_rate_id, selectedJobType]);

    // Calculate subtotal and free quantity
    useEffect(() => {
        if (!selectedJobType) {
            setSubtotal(0);
            setFormData(prev => ({ ...prev, free_quantity: 0 }));
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

        // Size-based pricing
        if (sizeRates.length > 0 && selectedSizeRate) {
            const width = parseFloat(formData.size_width) || 0;
            const height = parseFloat(formData.size_height) || 0;

            if (selectedSizeRate.calculation_method === 'length' && width > 0) {
                calculated = width * parseFloat(selectedSizeRate.rate) * quantity;
            } else if (width > 0 && height > 0) {
                calculated = width * height * parseFloat(selectedSizeRate.rate) * quantity;
            }
        }
        // Price tier pricing
        else if (priceTiers.length > 0) {
            const tier = [...priceTiers]
                .filter(tier =>
                    quantity >= tier.min_quantity &&
                    (!tier.max_quantity || quantity <= tier.max_quantity)
                )
                .sort((a, b) => a.min_quantity - b.min_quantity)
                .pop();

            const unitPrice = tier ? parseFloat(tier.price) : parseFloat(selectedJobType.price || 0);
            calculated = unitPrice * quantity;
        }
        // Standard pricing
        else {
            calculated = (parseFloat(selectedJobType.price) || 0) * quantity;
        }

        setSubtotal(calculated);

        // Calculate free quantity based on promo rules
        const promoRules = selectedJobType.promo_rules || [];
        if (promoRules.length > 0) {
            const activeRules = promoRules.filter(r => r.is_active);
            if (activeRules.length > 0) {
                // Sort by buy_quantity descending to apply largest rules first
                const sortedRules = [...activeRules].sort((a, b) => b.buy_quantity - a.buy_quantity);

                // Find the best matching rule
                const applicableRule = sortedRules.find(r => quantity >= r.buy_quantity);

                if (applicableRule) {
                    const sets = Math.floor(quantity / applicableRule.buy_quantity);
                    const totalFree = sets * applicableRule.free_quantity;
                    setFormData(prev => ({ ...prev, free_quantity: totalFree }));
                } else {
                    setFormData(prev => ({ ...prev, free_quantity: 0 }));
                }
            } else {
                setFormData(prev => ({ ...prev, free_quantity: 0 }));
            }
        } else {
            setFormData(prev => ({ ...prev, free_quantity: 0 }));
        }
    }, [selectedJobType, selectedSizeRate, formData.quantity, formData.size_width, formData.size_height]);

    const handleImageUpload = (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;

        const uploads = files.map((file) => ({
            file,
            preview: URL.createObjectURL(file),
            name: file.name,
            invalid: file.size > 10 * 1024 * 1024,
            errorMessage: file.size > 10 * 1024 * 1024 ? 'File too large (max 10MB)' : null
        }));

        setDesignFiles((prev) => [...prev, ...uploads]);
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
    };

    const handlePaymentProofUpload = (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;

        const uploads = files.map((file) => ({
            file,
            preview: URL.createObjectURL(file),
            name: file.name,
            invalid: file.size > 10 * 1024 * 1024,
            errorMessage: file.size > 10 * 1024 * 1024 ? 'File too large (max 10MB)' : null
        }));
        setPaymentProofs((prev) => [...prev, ...uploads]);
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

    // Save customer to localStorage
    const saveCustomerToLocal = (customerData) => {
        try {
            const customers = savedCustomers.filter(c => c.email !== customerData.email);
            customers.unshift(customerData); // Add to beginning
            const limited = customers.slice(0, 20); // Keep only last 20 emails
            setSavedCustomers(limited);
            localStorage.setItem('rc_printshop_customers', JSON.stringify(limited));
        } catch (e) {
            console.error('Error saving customer:', e);
        }
    };

    // Handle email change and autofill
    const handleEmailChange = (e) => {
        const email = e.target.value;
        setFormData(prev => ({ ...prev, customer_email: email }));

        // Check if this email exists in saved customers
        const savedCustomer = savedCustomers.find(c => c.email === email);
        if (savedCustomer) {
            setFormData(prev => ({
                ...prev,
                customer_email: email,
                customer_name: savedCustomer.name || prev.customer_name,
                customer_phone: savedCustomer.phone || prev.customer_phone,
                customer_facebook: savedCustomer.facebook || prev.customer_facebook,
            }));
        }
    };

    const findOrCreateCustomer = async () => {
        try {
            const response = await fetch('/api/public/orders/customer/find-or-create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    email: formData.customer_email,
                    customer_name: formData.customer_name,
                    customer_phone: formData.customer_phone,
                    customer_facebook: formData.customer_facebook,
                }),
            });

            const data = await response.json();

            if (data.success && data.customer) {
                // Save customer info to localStorage for future use
                saveCustomerToLocal({
                    email: formData.customer_email,
                    name: formData.customer_name,
                    phone: formData.customer_phone,
                    facebook: formData.customer_facebook,
                });

                setFormData(prev => ({ ...prev, customer_id: data.customer.id }));
                return data.customer.id;
            } else {
                throw new Error(data.message || 'Failed to create customer');
            }
        } catch (error) {
            console.error('Error finding/creating customer:', error);
            throw error;
        }
    };

    const handleSubmit = async (isRetry = false, retryAttempt = 0) => {
        // Clear any pending retry timeout
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }

        const currentRetryCount = isRetry ? retryAttempt : 0;

        console.log('retryCount...:', currentRetryCount);

        // Pre-submission validation for file sizes
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        const largeFiles = [];

        designFiles.forEach(f => {
            if (f.file && f.file.size > MAX_FILE_SIZE) {
                largeFiles.push(`${f.name} (${(f.file.size / (1024 * 1024)).toFixed(2)}MB)`);
            }
        });

        paymentProofs.forEach(f => {
            if (f.file && f.file.size > MAX_FILE_SIZE) {
                largeFiles.push(`${f.name} (${(f.file.size / (1024 * 1024)).toFixed(2)}MB)`);
            }
        });

        if (largeFiles.length > 0) {
            setErrors({
                general: [
                    'Unable to proceed. The following files exceed the 10MB limit:',
                    ...largeFiles
                ]
            });
            return;
        }

        setProcessing(true);
        setErrors({});
        setUploadProgress(0);
        setUploadStatus('preparing');

        // If this is not a retry, reset retry count
        if (!isRetry) {
            setRetryCount(0);
        }

        try {
            // Step 1: Find or create customer
            setUploadStatus('customer');
            let customerId = formData.customer_id;
            if (!customerId) {
                customerId = await findOrCreateCustomer();
            }
            setUploadProgress(10);

            // Step 2: Prepare order data
            setUploadStatus('preparing');
            const orderData = new FormData();
            orderData.append('customer_id', customerId);
            orderData.append('description', formData.description);
            orderData.append('job_type_id', formData.job_type_id);
            orderData.append('quantity', formData.quantity);
            orderData.append('free_quantity', formData.free_quantity || 0);
            orderData.append('due_date', formData.due_date);
            orderData.append('subtotal', subtotal.toFixed(2));
            orderData.append('total_amount', subtotal.toFixed(2));

            if (formData.size_rate_id) {
                orderData.append('size_rate_id', formData.size_rate_id);
            }
            if (formData.size_width) {
                orderData.append('size_width', formData.size_width);
            }
            if (formData.size_height) {
                orderData.append('size_height', formData.size_height);
            }

            designFiles.forEach((designFile) => {
                if (designFile.file) {
                    orderData.append(`attachments[]`, designFile.file);
                }
            });

            orderData.append('payment_method', paymentMethod);

            paymentProofs.forEach((proof) => {
                if (proof.file) {
                    orderData.append(`payment_proofs[]`, proof.file);
                }
            });

            setUploadProgress(15);
            setUploadStatus('uploading');

            // Step 3: Submit with XMLHttpRequest
            const response = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = Math.round((e.loaded / e.total) * 70) + 15;
                        setUploadProgress(percentComplete);
                    }
                });

                xhr.addEventListener('load', () => {
                    setUploadProgress(90);
                    setUploadStatus('processing');

                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            resolve({ ok: true, status: xhr.status, data });
                        } catch (e) {
                            reject(new Error('Failed to parse response'));
                        }
                    } else {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            resolve({ ok: false, status: xhr.status, data });
                        } catch (e) {
                            reject(new Error(`Server error (${xhr.status})`));
                        }
                    }
                });

                xhr.addEventListener('error', () => reject(new Error('Network error')));
                xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

                xhr.open('POST', '/api/public/orders');
                xhr.setRequestHeader('X-CSRF-TOKEN',
                    document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                );
                xhr.send(orderData);
            });

            setUploadProgress(95);

            // Handle response
            if (!response.ok) {
                let errorData = {};

                if (response.status === 422 && response.data.errors) {
                    errorData = response.data.errors;
                } else if (response.status === 413) {
                    errorData = {
                        general: ['One or more files are too large. Each file must be less than 10MB.']
                    };
                } else if (response.status === 500) {
                    errorData = {
                        general: ['Server error occurred. This might be due to a file upload issue. Please check your files and try again.']
                    };
                } else if (response.data.message) {
                    errorData = { general: [response.data.message] };
                } else {
                    errorData = {
                        general: ['An unexpected error occurred. Please try again or contact support if the problem persists.']
                    };
                }

                // Check if we should retry
                if (isRetryableError(errorData) && currentRetryCount < MAX_RETRIES) {
                    const nextRetry = currentRetryCount + 1;
                    setRetryCount(nextRetry);
                    setUploadStatus('retrying');

                    console.log(`Retrying submission... Attempt ${nextRetry} of ${MAX_RETRIES}`);

                    // Wait 2 seconds before retrying (progressive delay: 2s, 4s, 6s)
                    const delay = nextRetry * 2000;
                    retryTimeoutRef.current = setTimeout(() => {
                        handleSubmit(true, nextRetry);
                    }, delay);

                    return; // Don't show error yet, we're retrying
                }

                // If we've exhausted retries or error is not retryable, show error
                if (currentRetryCount >= MAX_RETRIES && isRetryableError(errorData)) {
                    errorData.general = [
                        ...(errorData.general || []),
                        `Failed after ${MAX_RETRIES} attempts. Please try again later.`
                    ];
                }

                setErrors(errorData);
                setUploadStatus('');
                setRetryCount(0);
                return;
            }

            if (response.data.success) {
                setUploadProgress(100);
                setUploadStatus('complete');
                setRetryCount(0); // Reset retry count on success

                const ticketData = {
                    ticket_number: response.data.ticket_number,
                    status: response.data.ticket?.status || 'pending',
                    payment_status: response.data.ticket?.payment_status || 'pending',
                };

                setSubmittedTicket(ticketData);

                // Save ticket to history in localStorage
                try {
                    const ticketHistory = JSON.parse(localStorage.getItem('rc_printshop_ticket_history') || '[]');
                    const newTicket = {
                        ticket_number: response.data.ticket_number,
                        customer_name: formData.customer_name,
                        created_at: new Date().toISOString(),
                    };

                    // Add to beginning of array (most recent first)
                    ticketHistory.unshift(newTicket);

                    // Keep only last 10 tickets
                    const limitedHistory = ticketHistory.slice(0, 10);
                    localStorage.setItem('rc_printshop_ticket_history', JSON.stringify(limitedHistory));
                } catch (e) {
                    console.error('Error saving ticket to history:', e);
                }

                setTimeout(() => {
                    setCurrentStep(5);
                    setUploadStatus('');
                }, 800);
            } else {
                setErrors({ general: [response.data.message || 'Failed to submit order'] });
                setUploadStatus('');
                setRetryCount(0);
            }
        } catch (error) {
            console.error('Error submitting order:', error);
            let errorMessage = 'Unable to submit your order. ';

            if (error.message.includes('Network error')) {
                errorMessage += 'Please check your internet connection and try again.';
            } else if (error.message.includes('Failed to parse')) {
                // Avoid using "server response" to prevent auto-retry on file size/content issues
                errorMessage += 'The upload failed. Your files may be too large for the server to process.';
            } else {
                errorMessage += 'Please try again or contact support if the issue continues.';
            }

            const errorData = { general: [errorMessage] };

            // Check if we should retry
            if (isRetryableError(errorData) && currentRetryCount < MAX_RETRIES) {
                const nextRetry = currentRetryCount + 1;
                setRetryCount(nextRetry);
                setUploadStatus('retrying');

                console.log(`Retrying submission... Attempt ${nextRetry} of ${MAX_RETRIES}`);

                const delay = nextRetry * 2000;
                retryTimeoutRef.current = setTimeout(() => {
                    handleSubmit(true, nextRetry);
                }, delay);

                return;
            }

            if (currentRetryCount >= MAX_RETRIES) {
                errorData.general = [
                    ...errorData.general,
                    `Failed after ${MAX_RETRIES} attempts. Please try again later.`
                ];
            }

            setErrors(errorData);
            setUploadStatus('');
            setRetryCount(0);
        } finally {
            setProcessing(false);
        }
    };


    const isRetryableError = (errorObj) => {
        if (!errorObj || Object.keys(errorObj).length === 0) return false;

        // Check for general errors that are retryable
        if (errorObj.general) {
            const generalErrors = Array.isArray(errorObj.general) ? errorObj.general : [errorObj.general];

            // Explicitly do NOT retry for file size errors
            if (generalErrors.some(msg =>
                msg.includes('too large') ||
                msg.includes('maximum size') ||
                msg.includes('Maximum size')
            )) {
                return false;
            }

            return generalErrors.some(msg =>
                msg.includes('Server error') ||
                msg.includes('server response') ||
                msg.includes('connection') ||
                msg.includes('Network error') ||
                msg.includes('try again')
            );
        }

        return false;
    };

    const formatErrorMessage = (field, message) => {
        // Field name mapping for better readability
        const fieldNames = {
            'customer_id': 'Customer',
            'description': 'Description',
            'job_type_id': 'Job Type',
            'quantity': 'Quantity',
            'free_quantity': 'Free Quantity',
            'size_rate_id': 'Size Rate',
            'size_width': 'Width',
            'size_height': 'Height',
            'due_date': 'Due Date',
            'subtotal': 'Subtotal',
            'total_amount': 'Total Amount',
            'payment_method': 'Payment Method',
            'file': 'Design File',
            'general': ''
        };

        // Handle array field names (like attachments.0, payment_proofs.1)
        let friendlyFieldName = field;

        // Check if it's an attachment field
        if (field.match(/^attachments\.\d+$/)) {
            const index = parseInt(field.split('.')[1]) + 1;
            friendlyFieldName = `Design File #${index}`;
        } else if (field.match(/^payment_proofs\.\d+$/)) {
            const index = parseInt(field.split('.')[1]) + 1;
            friendlyFieldName = `Payment Proof #${index}`;
        } else {
            friendlyFieldName = fieldNames[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }

        // Message transformation for common validation errors
        let friendlyMessage = message;

        // File size errors
        if (message.includes('must not be greater than 10240 kilobytes')) {
            friendlyMessage = 'File is too large. Maximum size is 10MB.';
        } else if (message.includes('kilobytes')) {
            friendlyMessage = 'File size exceeds the allowed limit.';
        }

        // File type errors
        if (message.includes('must be a file of type')) {
            friendlyMessage = 'Invalid file type. Please upload JPG, JPEG, PNG only.';
        }

        // Required field errors
        if (message.includes('field is required')) {
            friendlyMessage = 'This field is required.';
        }

        // Numeric errors
        if (message.includes('must be a number') || message.includes('must be an integer')) {
            friendlyMessage = 'Please enter a valid number.';
        }

        // Min/Max errors
        if (message.includes('must be at least')) {
            const match = message.match(/must be at least (\d+)/);
            if (match) {
                friendlyMessage = `Minimum value is ${match[1]}.`;
            }
        }

        // Date errors
        if (message.includes('is not a valid date')) {
            friendlyMessage = 'Please enter a valid date.';
        }

        // Exists validation (foreign key)
        if (message.includes('selected') && message.includes('is invalid')) {
            friendlyMessage = 'Invalid selection. Please choose a valid option.';
        }

        return { field: friendlyFieldName, message: friendlyMessage };
    };



    // const handleSubmit = async () => {
    //     setProcessing(true);
    //     setErrors({});

    //     try {
    //         // Step 1: Find or create customer
    //         let customerId = formData.customer_id;
    //         if (!customerId) {
    //             customerId = await findOrCreateCustomer();
    //         }

    //         // Step 2: Prepare order data
    //         const orderData = new FormData();
    //         orderData.append('customer_id', customerId);
    //         orderData.append('description', formData.description);
    //         orderData.append('job_type_id', formData.job_type_id);
    //         orderData.append('quantity', formData.quantity);
    //         orderData.append('free_quantity', formData.free_quantity || 0);
    //         orderData.append('due_date', formData.due_date);
    //         orderData.append('subtotal', subtotal.toFixed(2));
    //         orderData.append('total_amount', subtotal.toFixed(2));

    //         if (formData.size_rate_id) {
    //             orderData.append('size_rate_id', formData.size_rate_id);
    //         }
    //         if (formData.size_width) {
    //             orderData.append('size_width', formData.size_width);
    //         }
    //         if (formData.size_height) {
    //             orderData.append('size_height', formData.size_height);
    //         }

    //         // Add design files if any
    //         designFiles.forEach((designFile, index) => {
    //             if (designFile.file) {
    //                 orderData.append(`attachments[]`, designFile.file);
    //             }
    //         });

    //         // Add payment method
    //         orderData.append('payment_method', paymentMethod);

    //         // Add payment proofs if any
    //         paymentProofs.forEach((proof, index) => {
    //             if (proof.file) {
    //                 orderData.append(`payment_proofs[]`, proof.file);
    //             }
    //         });

    //         // Step 3: Submit order
    //         const response = await fetch('/api/public/orders', {
    //             method: 'POST',
    //             headers: {
    //                 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
    //             },
    //             body: orderData,
    //         });

    //         // Try to parse JSON response
    //         let data;
    //         try {
    //             data = await response.json();
    //         } catch (parseError) {
    //             console.error('Failed to parse response as JSON:', parseError);
    //             // Server returned HTML (likely a 500 error or file too large)
    //             setErrors({
    //                 general: [
    //                     'Server error: The file you uploaded may be too large or of an invalid type.',
    //                     'Please ensure your file is less than 10MB and is a JPG, JPEG, PNG, or PDF.'
    //                 ]
    //             });
    //             return;
    //         }


    //         // Check if validation errors exist (422 status or errors in response)
    //         if (!response.ok) {
    //             if (response.status === 422 && data.errors) {
    //                 // Laravel validation errors
    //                 setErrors(data.errors);
    //             } else if (response.status === 413) {
    //                 // File too large (payload too large)
    //                 setErrors(data.errors || {
    //                     file: ['The uploaded file is too large. Maximum size is 10MB.']
    //                 });
    //             } else if (data.message) {
    //                 // Other error with message
    //                 setErrors({ general: [data.message] });
    //             } else {
    //                 // Unknown error
    //                 setErrors({ general: [`Server error (${response.status}). Please try again.`] });
    //             }
    //             return;
    //         }

    //         if (data.success) {
    //             // Store submitted ticket info
    //             setSubmittedTicket({
    //                 ticket_number: data.ticket_number,
    //                 status: data.ticket?.status || 'pending',
    //                 payment_status: data.ticket?.payment_status || 'pending',
    //             });
    //             // Move to step 5 (success page)
    //             setCurrentStep(5);
    //         } else {
    //             // Handle other errors
    //             setErrors({ general: [data.message || 'Failed to submit order'] });
    //         }
    //     } catch (error) {
    //         console.error('Error submitting order:', error);
    //         setErrors({ general: ['Failed to submit order. Please check your connection and try again.'] });
    //     } finally {
    //         setProcessing(false);
    //     }
    // };

    const canProceedStep1 = formData.customer_name && formData.customer_email && formData.customer_phone;
    const canProceedStep2 = formData.category_id && formData.job_type_id && formData.quantity > 0;
    const hasInvalidDesignFiles = designFiles.some(f => f.invalid);
    const canProceedStep3 = formData.description && formData.due_date && !hasInvalidDesignFiles;

    const priceTiers = selectedJobType?.price_tiers || [];
    const sizeRates = selectedJobType?.size_rates || [];
    const promoRules = selectedJobType?.promo_rules || [];
    const hasPriceTiers = priceTiers.length > 0;
    const hasSizeRates = sizeRates.length > 0;
    const hasPromoRules = promoRules.length > 0;

    const UploadProgressIndicator = () => {
        const statusMessages = {
            preparing: 'Preparing your order...',
            customer: 'Verifying customer information...',
            uploading: 'Uploading files...',
            processing: 'Processing your order...',
            retrying: `Connection issue detected. Retrying... (Attempt ${retryCount} of ${MAX_RETRIES})`,
            complete: 'Order submitted successfully!'
        };

        if (!uploadStatus) return null;

        const totalFiles = designFiles.length + paymentProofs.length;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
                    <div className="text-center mb-6">
                        {uploadStatus === 'complete' ? (
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        ) : uploadStatus === 'retrying' ? (
                            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-yellow-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                        ) : (
                            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                        )}

                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                            {statusMessages[uploadStatus] || 'Processing...'}
                        </h3>
                        <p className="text-sm text-gray-600">
                            {uploadStatus === 'retrying' ? 'Please wait, we\'re trying to reconnect...' : 'Please don\'t close this window'}
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`absolute top-0 left-0 h-full transition-all duration-300 ease-out ${uploadStatus === 'retrying' ? 'bg-gradient-to-r from-yellow-500 to-orange-600' : 'bg-gradient-to-r from-indigo-500 to-purple-600'
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
                    {totalFiles > 0 && uploadStatus === 'uploading' && (
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
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center">
                                    <img src="/images/logo.jpg" alt="RC PrintShoppe" className="w-12 h-12 rounded-full" />
                                </div>
                                <div onClick={() => router.visit('/', { preserveState: true, preserveScroll: true, replace: true })}>
                                    <h1 className="text-2xl font-bold text-gray-900">RC PrintShoppe</h1>
                                    <p className="text-sm text-gray-600">Track Your Order</p>
                                </div>
                            </div>
                        </div>

                        {/* Step Indicator */}
                        <div className="hidden sm:flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map(step => (
                                <div key={step} className="flex items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep >= step ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
                                        }`}>
                                        {step}
                                    </div>
                                    {step < 5 && <div className={`w-8 h-0.5 ${currentStep > step ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Step 1: Customer Info */}
                {currentStep === 1 && (
                    <div className="bg-white rounded-2xl shadow-lg p-8 animate-fadeIn">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">Your Information</h2>
                            <p className="text-gray-500 mt-2">Let us know how to reach you</p>
                        </div>

                        <div className="space-y-6">

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                                <input
                                    type="email"
                                    value={formData.customer_email}
                                    onChange={handleEmailChange}
                                    list="email-suggestions"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="e.g., juan@example.com"
                                    autoComplete="email"
                                />
                                <datalist id="email-suggestions">
                                    {savedCustomers.map((customer, index) => (
                                        <option key={index} value={customer.email}>
                                            {customer.name}
                                        </option>
                                    ))}
                                </datalist>
                                {savedCustomers.length > 0 && formData.customer_email === '' && (
                                    <p className="text-xs text-gray-500 mt-1">💡 Previously used emails will appear as you type</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                                <input
                                    type="text"
                                    value={formData.customer_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="e.g., Juan Dela Cruz"
                                />
                            </div>



                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Facebook *</label>
                                <input
                                    type="text"
                                    value={formData.customer_facebook}
                                    onChange={(e) => setFormData(prev => ({ ...prev, customer_facebook: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="e.g., juancruz"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                                <input
                                    type="tel"
                                    value={formData.customer_phone}
                                    maxLength={11}
                                    onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="09XX XXX XXXX"
                                />
                            </div>

                            <button
                                onClick={() => setCurrentStep(2)}
                                disabled={!canProceedStep1}
                                className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${canProceedStep1
                                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl'
                                    : 'bg-gray-300 cursor-not-allowed'
                                    }`}
                            >
                                Continue →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Select Service */}
                {currentStep === 2 && (
                    <div className="bg-white rounded-2xl shadow-lg p-8 animate-fadeIn">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">Select Your Service</h2>
                            <p className="text-gray-500 mt-2">Choose what you need</p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Category</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {jobCategories.map(category => {
                                        const jobTypes = category.job_types || category.jobTypes || [];
                                        return (
                                            <button
                                                key={category.id}
                                                onClick={() => setFormData(prev => ({ ...prev, category_id: category.id.toString(), job_type_id: '' }))}
                                                className={`p-4 rounded-lg border-2 transition-all ${formData.category_id === category.id.toString()
                                                    ? 'border-indigo-600 bg-indigo-50'
                                                    : 'border-gray-200 hover:border-indigo-300'
                                                    }`}
                                            >
                                                <p className="font-semibold text-gray-900">{category.name}</p>
                                                <p className="text-xs text-gray-500 mt-1">{jobTypes.length} services</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {availableJobTypes.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">Service Type</label>
                                    <div className="space-y-3">
                                        {availableJobTypes.map(jobType => {
                                            const hasSizeRates = (jobType.size_rates || []).length > 0;
                                            const hasPriceTiers = (jobType.price_tiers || []).length > 0;
                                            return (
                                                <button
                                                    key={jobType.id}
                                                    onClick={() => setFormData(prev => ({ ...prev, job_type_id: jobType.id.toString() }))}
                                                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${formData.job_type_id === jobType.id.toString()
                                                        ? 'border-indigo-600 bg-indigo-50'
                                                        : 'border-gray-200 hover:border-indigo-300'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-gray-900">{jobType.name}</p>
                                                            {jobType.promo_text && (
                                                                <p className="text-xs text-green-600 mt-1">🎁 {jobType.promo_text}</p>
                                                            )}
                                                            {hasPriceTiers && (
                                                                <p className="text-xs text-blue-600 mt-1">📊 Bulk Pricing Available</p>
                                                            )}
                                                            {hasSizeRates && (
                                                                <p className="text-xs text-purple-600 mt-1">📐 Size-Based Pricing</p>
                                                            )}
                                                        </div>
                                                        {!hasSizeRates && !hasPriceTiers && (
                                                            <span className="text-indigo-600 font-bold">{formatPeso(parseFloat(jobType.price || 0).toFixed(2))}</span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Promo Rules Display */}
                            {hasPromoRules && formData.quantity > 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-start gap-2">
                                        <span className="text-green-600 text-xl">🎁</span>
                                        <div className="flex-1">
                                            <p className="font-semibold text-green-900 mb-1">Available Promos:</p>
                                            <ul className="text-sm text-green-800 space-y-1">
                                                {promoRules.filter(r => r.is_active).map((rule, idx) => (
                                                    <li key={idx}>
                                                        {rule.description || `Buy ${rule.buy_quantity}, Get ${rule.free_quantity} Free`}
                                                    </li>
                                                ))}
                                            </ul>
                                            {formData.free_quantity > 0 && (
                                                <p className="text-sm font-bold text-green-700 mt-2">
                                                    ✓ You get {formData.free_quantity} free item(s)! Total: {parseInt(formData.quantity) + parseInt(formData.free_quantity)} pcs
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Price Tiers Display */}
                            {hasPriceTiers && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="font-semibold text-blue-900 mb-2">📊 Bulk Pricing:</p>
                                    <div className="space-y-1 text-sm">
                                        {priceTiers.map((tier, idx) => (
                                            <div key={idx} className="flex justify-between">
                                                <span className="text-blue-800">
                                                    {tier.min_quantity}{tier.max_quantity ? ` - ${tier.max_quantity}` : '+'} pcs:
                                                </span>
                                                <span className="font-semibold text-blue-900">{formatPeso(parseFloat(tier.price).toFixed(2))}/unit</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Size-Based Pricing */}
                            {hasSizeRates && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">Size Options</label>
                                    <select
                                        value={formData.size_rate_id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, size_rate_id: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {sizeRates.map(rate => (
                                            <option key={rate.id} value={rate.id}>
                                                {rate.variant_name} - {formatPeso(parseFloat(rate.rate).toFixed(2))}/{rate.calculation_method === 'length' ? rate.dimension_unit : `${rate.dimension_unit}²`}
                                            </option>
                                        ))}
                                    </select>

                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-2">Width ({selectedSizeRate?.dimension_unit || 'unit'})</label>
                                            <input
                                                type="number"
                                                value={formData.size_width}
                                                onChange={(e) => setFormData(prev => ({ ...prev, size_width: e.target.value }))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                placeholder="0"
                                                step="0.1"
                                                min="0"
                                            />
                                        </div>
                                        {selectedSizeRate?.calculation_method !== 'length' && (
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-2">Height ({selectedSizeRate?.dimension_unit || 'unit'})</label>
                                                <input
                                                    type="number"
                                                    value={formData.size_height}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, size_height: e.target.value }))}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                    placeholder="0"
                                                    step="0.1"
                                                    min="0"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    {selectedSizeRate && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            Rate: {formatPeso(parseFloat(selectedSizeRate.rate).toFixed(2))} per {selectedSizeRate.calculation_method === 'length' ? selectedSizeRate.dimension_unit : `${selectedSizeRate.dimension_unit}²`}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                                <input
                                    type="number"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    min="1"
                                />
                            </div>

                            {subtotal > 0 && (
                                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-700 font-medium">Estimated Price:</span>
                                        <span className="text-2xl font-bold text-indigo-600">{formatPeso(subtotal.toFixed(2))}</span>
                                    </div>
                                </div>
                            )}


                            <div className="flex gap-3">

                                <button
                                    onClick={() => setCurrentStep(1)}
                                    className="flex-1 py-3 rounded-lg border-2 border-gray-300 font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    ← Back
                                </button>
                                <button
                                    onClick={() => setCurrentStep(3)}
                                    disabled={!canProceedStep2}
                                    className={`flex-1 py-3 rounded-lg font-semibold text-white transition-all ${canProceedStep2
                                        ? 'bg-indigo-600 hover:bg-indigo-700'
                                        : 'bg-gray-300 cursor-not-allowed'
                                        }`}
                                >
                                    Continue →
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Details & Upload */}
                {currentStep === 3 && (
                    <div className="bg-white rounded-2xl shadow-lg p-8 animate-fadeIn">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
                            <p className="text-gray-500 mt-2">Tell us more about your order</p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    rows="4"
                                    placeholder="Describe what you need... (e.g., 'Business cards with my logo on glossy paper')"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">When do you need it? *</label>
                                <input
                                    type="date"
                                    value={formData.due_date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Design/Reference (Optional)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageUpload}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                                {/* <p className="text-xs text-gray-500 mt-1">You can upload multiple images (PNG, JPG up to 10MB each)</p> */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2 mt-1">
                                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="text-sm text-blue-800">
                                        <p className="font-medium">File Requirements:</p>
                                        <ul className="mt-1 space-y-0.5 text-xs">
                                            <li>• Maximum size: <strong>10MB per file</strong></li>
                                            <li>• Accepted formats: <strong>JPG, JPEG, PNG</strong></li>
                                            <li>• You can upload multiple files</li>
                                        </ul>
                                    </div>
                                </div>


                                {designFiles.length > 0 && (
                                    <div className="mt-4">
                                        {designFiles.length > 1 && (
                                            <div className="flex gap-2 mb-3 overflow-x-auto">
                                                {designFiles.map((_, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        onClick={() => setActiveDesignTab(index)}
                                                        className={`px-3 py-1 rounded text-sm whitespace-nowrap ${activeDesignTab === index
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-gray-200 text-gray-700'
                                                            }`}
                                                    >
                                                        Design {index + 1}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <div className={`border-2 border-dashed rounded-lg p-4 ${designFiles[activeDesignTab]?.invalid ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50'}`}>
                                            {designFiles[activeDesignTab]?.invalid && (
                                                <div className="flex items-center gap-2 text-red-600 mb-2 justify-center">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="text-sm font-bold">{designFiles[activeDesignTab].errorMessage}</span>
                                                </div>
                                            )}
                                            <img
                                                src={designFiles[activeDesignTab]?.preview}
                                                alt={`Design ${activeDesignTab + 1}`}
                                                className="max-h-64 mx-auto rounded"
                                            />
                                            <div className="text-center mt-2 text-sm text-gray-600">
                                                {designFiles[activeDesignTab]?.name}
                                            </div>
                                            <div className="text-center mt-1 text-xs text-gray-500">
                                                {activeDesignTab + 1} of {designFiles.length}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeDesignFile(activeDesignTab)}
                                                className="w-full mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                                            >
                                                Remove File
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setCurrentStep(2)}
                                    className="flex-1 py-3 rounded-lg border-2 border-gray-300 font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    ← Back
                                </button>
                                <button
                                    onClick={() => setCurrentStep(4)}
                                    disabled={!canProceedStep3}
                                    className={`flex-1 py-3 rounded-lg font-semibold text-white transition-all ${canProceedStep3
                                        ? 'bg-indigo-600 hover:bg-indigo-700'
                                        : 'bg-gray-300 cursor-not-allowed'
                                        }`}
                                >
                                    Review Order →
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Payment & Review */}
                {currentStep === 4 && (
                    <div className="bg-white rounded-2xl shadow-lg p-8 animate-fadeIn">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">Payment & Review</h2>
                            <p className="text-gray-500 mt-2">Review your order and choose payment method</p>
                        </div>


                        <div className="space-y-6">
                            {/* Order Summary */}
                            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Customer</p>
                                    <p className="font-semibold text-gray-900">{formData.customer_name}</p>
                                    <p className="text-sm text-gray-600">{formData.customer_email}</p>
                                    <p className="text-sm text-gray-600">{formData.customer_phone}</p>
                                </div>

                                <div className="border-t pt-4">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Service</p>
                                    <p className="font-semibold text-gray-900">{selectedJobType?.name}</p>
                                    <p className="text-sm text-gray-600">Quantity: {formData.quantity}</p>
                                    {formData.free_quantity > 0 && (
                                        <p className="text-sm text-green-600 font-semibold">Free: {formData.free_quantity} (Total: {parseInt(formData.quantity) + parseInt(formData.free_quantity)} pcs)</p>
                                    )}
                                    {formData.size_width && (
                                        <p className="text-sm text-gray-600">
                                            Size: {formData.size_width}{formData.size_height && ` × ${formData.size_height}`} {selectedSizeRate?.dimension_unit}
                                        </p>
                                    )}
                                </div>

                                <div className="border-t pt-4">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Details</p>
                                    <p className="text-sm text-gray-700">{formData.description}</p>
                                    <p className="text-sm text-gray-600 mt-2">Due: {new Date(formData.due_date).toLocaleDateString()}</p>
                                </div>

                                <div className="border-t pt-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                                        <span className="text-3xl font-bold text-indigo-600">{formatPeso(subtotal.toFixed(2))}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method *</label>
                                <div className="space-y-3">
                                    <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input
                                            type="radio"
                                            name="payment_method"
                                            value="walkin"
                                            checked={paymentMethod === 'walkin'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="mt-1 mr-3"
                                        />
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">Pay on Walk-in</p>
                                            <p className="text-sm text-gray-600">Pay when you visit our shop. Just for record keeping.</p>
                                        </div>
                                    </label>

                                    <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input
                                            type="radio"
                                            name="payment_method"
                                            value="gcash"
                                            checked={paymentMethod === 'gcash'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="mt-1 mr-3"
                                        />
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">GCash</p>
                                            <p className="text-sm text-gray-600">Pay via GCash (downpayment or full payment)</p>
                                        </div>
                                    </label>

                                    <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input
                                            type="radio"
                                            name="payment_method"
                                            value="bank"
                                            checked={paymentMethod === 'bank'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="mt-1 mr-3"
                                        />
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">Bank Transfer</p>
                                            <p className="text-sm text-gray-600">Pay via bank transfer (downpayment or full payment)</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* GCash Payment Info */}
                            {paymentMethod === 'gcash' && settings?.payment?.gcash && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                                    <h3 className="font-semibold text-green-900 mb-4">GCash Payment Details</h3>
                                    <div className="space-y-3">
                                        {settings.payment.gcash.account_name && (
                                            <div>
                                                <p className="text-sm font-medium text-green-800">Account Name:</p>
                                                <p className="text-lg font-bold text-green-900">{settings.payment.gcash.account_name}</p>
                                            </div>
                                        )}
                                        {settings.payment.gcash.number && (
                                            <div>
                                                <p className="text-sm font-medium text-green-800">GCash Number:</p>
                                                <p className="text-lg font-bold text-green-900">{settings.payment.gcash.number}</p>
                                            </div>
                                        )}
                                        {settings.payment.gcash.qrcode && (
                                            <div>
                                                <p className="text-sm font-medium text-green-800 mb-2">QR Code:</p>
                                                <div className="bg-white p-4 rounded border border-green-300 inline-block">
                                                    {!qrcodeError ? (
                                                        <img
                                                            src={settings.payment.gcash.qrcode}
                                                            alt="GCash QR Code"
                                                            className="w-32 h-32 object-contain"
                                                            onError={() => setQrcodeError(true)}
                                                        />
                                                    ) : (
                                                        <div className="w-32 h-32 bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                                                            QR Code not available
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Bank Transfer Payment Info */}
                            {paymentMethod === 'bank' && settings?.payment?.bank && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                    <h3 className="font-semibold text-blue-900 mb-4">Bank Transfer Details</h3>
                                    <div className="space-y-3">
                                        {settings.payment.bank.bank_name && (
                                            <div>
                                                <p className="text-sm font-medium text-blue-800">Bank Name:</p>
                                                <p className="text-lg font-bold text-blue-900">{settings.payment.bank.bank_name}</p>
                                            </div>
                                        )}
                                        {settings.payment.bank.account_name && (
                                            <div>
                                                <p className="text-sm font-medium text-blue-800">Account Name:</p>
                                                <p className="text-lg font-bold text-blue-900">{settings.payment.bank.account_name}</p>
                                            </div>
                                        )}
                                        {settings.payment.bank.account_number && (
                                            <div>
                                                <p className="text-sm font-medium text-blue-800">Account Number:</p>
                                                <p className="text-lg font-bold text-blue-900">{settings.payment.bank.account_number}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Payment Proof Upload */}
                            {(paymentMethod === 'gcash' || paymentMethod === 'bank') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Upload Payment Proof (GCash / Bank Receipts) *
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handlePaymentProofUpload}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                                    />
                                    {paymentProofs.length > 0 && (
                                        <div className="mt-4">
                                            {paymentProofs.length > 1 && (
                                                <div className="flex gap-2 mb-3 overflow-x-auto">
                                                    {paymentProofs.map((_, index) => (
                                                        <button
                                                            key={index}
                                                            type="button"
                                                            onClick={() => setActiveProofTab(index)}
                                                            className={`px-3 py-1 rounded text-sm whitespace-nowrap ${activeProofTab === index
                                                                ? 'bg-indigo-600 text-white'
                                                                : 'bg-gray-200 text-gray-700'
                                                                }`}
                                                        >
                                                            Proof {index + 1}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            <div className={`border rounded-lg p-4 ${paymentProofs[activeProofTab]?.invalid ? 'border-red-400 bg-red-50' : 'bg-gray-50'}`}>
                                                {paymentProofs[activeProofTab]?.invalid && (
                                                    <div className="flex items-center gap-2 text-red-600 mb-2 justify-center">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span className="text-sm font-bold">{paymentProofs[activeProofTab].errorMessage}</span>
                                                    </div>
                                                )}
                                                <img
                                                    src={paymentProofs[activeProofTab]?.preview}
                                                    alt={`Payment proof ${activeProofTab + 1}`}
                                                    className="max-h-64 mx-auto rounded"
                                                />
                                                <div className="text-center mt-2 text-sm text-gray-600">
                                                    {activeProofTab + 1} of {paymentProofs.length}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removePaymentProof(activeProofTab)}
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
                            {Object.keys(errors).length > 0 && (
                                <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="flex-1">
                                            <div className="space-y-2">
                                                {Object.entries(errors).map(([field, messages]) => {
                                                    const messageArray = Array.isArray(messages) ? messages : [messages];
                                                    return messageArray.map((message, idx) => {
                                                        const formatted = formatErrorMessage(field, message);
                                                        return (
                                                            <div key={`${field}-${idx}`} className="flex items-start gap-2 bg-white p-3 rounded-lg border border-red-200">
                                                                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                                </svg>
                                                                <div className="flex-1">
                                                                    {formatted.field && (
                                                                        <span className="font-semibold text-red-900 text-sm">
                                                                            {formatted.field}:{' '}
                                                                        </span>
                                                                    )}
                                                                    <span className="text-red-700 text-sm">
                                                                        {formatted.message}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })}
                                            </div>
                                            <div className="mt-4 flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setErrors({});
                                                        setRetryCount(0);
                                                    }}
                                                    className="px-4 py-2 text-sm text-red-700 hover:text-white hover:bg-red-600 font-medium border border-red-300 rounded-lg transition-colors"
                                                >
                                                    Dismiss
                                                </button>
                                                {/* Manual retry button - still available after auto-retry exhausted */}
                                                <button
                                                    onClick={() => {
                                                        setErrors({});
                                                        setRetryCount(0);
                                                        handleSubmit(false);
                                                    }}
                                                    disabled={processing}
                                                    className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {processing ? 'Retrying...' : 'Try Again'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {uploadStatus && <UploadProgressIndicator />}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setCurrentStep(3);
                                        setErrors({});
                                        setRetryCount(0);
                                        if (retryTimeoutRef.current) {
                                            clearTimeout(retryTimeoutRef.current);
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
                                        ((paymentMethod === 'gcash' || paymentMethod === 'bank') && paymentProofs.length === 0) ||
                                        paymentProofs.some(p => p.invalid)
                                    }
                                    className={`flex-1 py-4 rounded-lg bg-indigo-600 font-bold text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all ${processing ||
                                        ((paymentMethod === 'gcash' || paymentMethod === 'bank') && paymentProofs.length === 0) ||
                                        paymentProofs.some(p => p.invalid)
                                        ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                >
                                    {processing ? 'Submitting...' : 'Submit Order ✓'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 5: Success Page */}
                {currentStep === 5 && submittedTicket && (
                    <div className="bg-white rounded-2xl shadow-lg p-8 animate-fadeIn">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-20 h-20 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Order Submitted Successfully!</h2>
                            <p className="text-gray-500">Your order has been received. We will contact you shortly.</p>
                        </div>

                        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-6 mb-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-3 border-b">
                                    <span className="text-sm font-medium text-gray-700">Ticket Number:</span>
                                    <span className="text-xl font-bold text-indigo-600">{submittedTicket.ticket_number}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700">Status:</span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${submittedTicket.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        submittedTicket.status === 'completed' ? 'bg-green-100 text-green-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                        {submittedTicket.status.toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t">
                                    <span className="text-sm font-medium text-gray-700">Payment Status:</span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${submittedTicket.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        submittedTicket.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                        {submittedTicket.payment_status.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <div className="flex gap-3">
                                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-sm text-blue-800">
                                    <strong>Important:</strong> Please save your ticket number <strong>{submittedTicket.ticket_number}</strong> for tracking your order.
                                    We'll contact you within 24 hours to confirm your order and discuss payment options.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => {
                                    // Save ticket number to localStorage for auto-fill on home page
                                    if (submittedTicket?.ticket_number) {
                                        localStorage.setItem('rc_printshop_last_ticket', submittedTicket.ticket_number);
                                    }
                                    router.visit('/');
                                }}
                                className="w-full py-4 rounded-lg border-2 border-indigo-600 font-bold text-indigo-600 hover:bg-indigo-50 shadow-lg hover:shadow-xl transition-all"
                            >
                                ← Back to Home
                            </button>
                            <button
                                onClick={() => {
                                    setFormData({
                                        customer_name: '',
                                        customer_email: '',
                                        customer_facebook: '',
                                        customer_phone: '',
                                        customer_id: null,
                                        category_id: '',
                                        job_type_id: '',
                                        description: '',
                                        quantity: 1,
                                        free_quantity: 0,
                                        size_width: '',
                                        size_height: '',
                                        size_rate_id: '',
                                        due_date: '',
                                        file: null
                                    });
                                    setDesignFiles([]);
                                    setActiveDesignTab(0);
                                    setPaymentProofs([]);
                                    setPaymentMethod('walkin');
                                    setSubmittedTicket(null);
                                    setCurrentStep(1);
                                }}
                                className="w-full py-4 rounded-lg bg-indigo-600 font-bold text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all"
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
      `}</style>
        </div>
    );
}
