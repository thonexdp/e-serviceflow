import { useState, useEffect, useMemo } from 'react';

const mockJobCategories = [
    {
        id: 1,
        name: 'Printing',
        job_types: [
            {
                id: 1,
                name: 'Business Cards',
                price: 500,
                price_by: 'set',
                promo_text: 'Buy 100 get 10 free!',
                size_rates: []
            },
            {
                id: 2,
                name: 'Flyers',
                price: 2,
                price_by: 'piece',
                size_rates: [
                    { id: 1, variant_name: 'A4 Size', rate: 5, dimension_unit: 'inch', calculation_method: 'area', is_default: true },
                    { id: 2, variant_name: 'A5 Size', rate: 3, dimension_unit: 'inch', calculation_method: 'area' }
                ]
            }
        ]
    },
    {
        id: 2,
        name: 'Signage',
        job_types: [
            {
                id: 3,
                name: 'Tarpaulin',
                price: 50,
                price_by: 'sq ft',
                size_rates: [
                    { id: 3, variant_name: 'Standard', rate: 50, dimension_unit: 'ft', calculation_method: 'area', is_default: true }
                ]
            }
        ]
    }
];

export default function CustomerPOSOrder() {
    const jobCategories = mockJobCategories;

    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        customer_name: '',
        customer_email: '',
        customer_facebook: '',
        customer_phone: '',
        category_id: '',
        job_type_id: '',
        description: '',
        quantity: 1,
        size_width: '',
        size_height: '',
        size_rate_id: '',
        due_date: '',
        file: null
    });

    const [imagePreview, setImagePreview] = useState(null);
    const [selectedJobType, setSelectedJobType] = useState(null);
    const [selectedSizeRate, setSelectedSizeRate] = useState(null);
    const [subtotal, setSubtotal] = useState(0);

    const availableJobTypes = useMemo(() => {
        if (!formData.category_id) return [];
        const category = jobCategories.find(cat => cat.id.toString() === formData.category_id.toString());
        return category?.job_types || [];
    }, [formData.category_id, jobCategories]);

    useEffect(() => {
        if (formData.job_type_id) {
            const jobType = availableJobTypes.find(jt => jt.id.toString() === formData.job_type_id.toString());
            setSelectedJobType(jobType || null);

            if (jobType?.size_rates?.length > 0) {
                const defaultRate = jobType.size_rates.find(r => r.is_default) || jobType.size_rates[0];
                setSelectedSizeRate(defaultRate);
                setFormData(prev => ({ ...prev, size_rate_id: defaultRate.id.toString() }));
            }
        }
    }, [formData.job_type_id, availableJobTypes]);

    useEffect(() => {
        if (formData.size_rate_id && selectedJobType?.size_rates) {
            const rate = selectedJobType.size_rates.find(r => r.id.toString() === formData.size_rate_id);
            setSelectedSizeRate(rate);
        }
    }, [formData.size_rate_id, selectedJobType]);

    useEffect(() => {
        let calculated = 0;
        const qty = parseFloat(formData.quantity) || 0;

        if (selectedJobType) {
            if (selectedJobType.size_rates?.length > 0 && selectedSizeRate) {
                const width = parseFloat(formData.size_width) || 0;
                const height = parseFloat(formData.size_height) || 0;

                if (selectedSizeRate.calculation_method === 'length' && width > 0) {
                    calculated = width * selectedSizeRate.rate * qty;
                } else if (width > 0 && height > 0) {
                    calculated = width * height * selectedSizeRate.rate * qty;
                }
            } else {
                calculated = (parseFloat(selectedJobType.price) || 0) * qty;
            }
        }

        setSubtotal(calculated);
    }, [selectedJobType, selectedSizeRate, formData.quantity, formData.size_width, formData.size_height]);

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(prev => ({ ...prev, file }));
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = () => {
        console.log('Order submitted:', formData);
        alert('Order submitted successfully! We will contact you shortly.');
    };

    const canProceedStep1 = formData.customer_name && formData.customer_email && formData.customer_phone;
    const canProceedStep2 = formData.category_id && formData.job_type_id && formData.quantity > 0;
    const canProceedStep3 = formData.description && formData.due_date;

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">RC PrintShoppe</h1>
                                <p className="text-xs text-gray-500">Quick Order System</p>
                            </div>
                        </div>

                        {/* Step Indicator */}
                        <div className="hidden sm:flex items-center gap-2">
                            {[1, 2, 3, 4].map(step => (
                                <div key={step} className="flex items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep >= step ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
                                        }`}>
                                        {step}
                                    </div>
                                    {step < 4 && <div className={`w-8 h-0.5 ${currentStep > step ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                                <input
                                    type="text"
                                    value={formData.customer_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Juan Dela Cruz"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                                <input
                                    type="email"
                                    value={formData.customer_email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="juan@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Facebook *</label>
                                <input
                                    type="text"
                                    value={formData.customer_facebook}
                                    onChange={(e) => setFormData(prev => ({ ...prev, customer_facebook: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="ana.fb"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                                <input
                                    type="tel"
                                    value={formData.customer_phone}
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
                                    {jobCategories.map(category => (
                                        <button
                                            key={category.id}
                                            onClick={() => setFormData(prev => ({ ...prev, category_id: category.id.toString(), job_type_id: '' }))}
                                            className={`p-4 rounded-lg border-2 transition-all ${formData.category_id === category.id.toString()
                                                ? 'border-indigo-600 bg-indigo-50'
                                                : 'border-gray-200 hover:border-indigo-300'
                                                }`}
                                        >
                                            <p className="font-semibold text-gray-900">{category.name}</p>
                                            <p className="text-xs text-gray-500 mt-1">{category.job_types.length} services</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {availableJobTypes.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">Service Type</label>
                                    <div className="space-y-3">
                                        {availableJobTypes.map(jobType => (
                                            <button
                                                key={jobType.id}
                                                onClick={() => setFormData(prev => ({ ...prev, job_type_id: jobType.id.toString() }))}
                                                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${formData.job_type_id === jobType.id.toString()
                                                    ? 'border-indigo-600 bg-indigo-50'
                                                    : 'border-gray-200 hover:border-indigo-300'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{jobType.name}</p>
                                                        {jobType.promo_text && (
                                                            <p className="text-xs text-green-600 mt-1">🎁 {jobType.promo_text}</p>
                                                        )}
                                                    </div>
                                                    {!jobType.size_rates?.length && (
                                                        <span className="text-indigo-600 font-bold">₱{jobType.price}</span>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedJobType?.size_rates?.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">Size Options</label>
                                    <select
                                        value={formData.size_rate_id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, size_rate_id: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {selectedJobType.size_rates.map(rate => (
                                            <option key={rate.id} value={rate.id}>
                                                {rate.variant_name} - ₱{rate.rate}/{rate.calculation_method === 'length' ? rate.dimension_unit : `${rate.dimension_unit}²`}
                                            </option>
                                        ))}
                                    </select>

                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-2">Width ({selectedSizeRate?.dimension_unit})</label>
                                            <input
                                                type="number"
                                                value={formData.size_width}
                                                onChange={(e) => setFormData(prev => ({ ...prev, size_width: e.target.value }))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                placeholder="0"
                                                step="0.1"
                                            />
                                        </div>
                                        {selectedSizeRate?.calculation_method !== 'length' && (
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-2">Height ({selectedSizeRate?.dimension_unit})</label>
                                                <input
                                                    type="number"
                                                    value={formData.size_height}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, size_height: e.target.value }))}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                    placeholder="0"
                                                    step="0.1"
                                                />
                                            </div>
                                        )}
                                    </div>
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
                                        <span className="text-2xl font-bold text-indigo-600">₱{subtotal.toFixed(2)}</span>
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
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
                                    {imagePreview ? (
                                        <div className="space-y-3">
                                            <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded" />
                                            <button
                                                onClick={() => {
                                                    setImagePreview(null);
                                                    setFormData(prev => ({ ...prev, file: null }));
                                                }}
                                                className="text-red-600 text-sm hover:underline"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                            />
                                            <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            <p className="text-gray-600">Click to upload or drag and drop</p>
                                            <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                                        </label>
                                    )}
                                </div>
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

                {/* Step 4: Review & Submit */}
                {currentStep === 4 && (
                    <div className="bg-white rounded-2xl shadow-lg p-8 animate-fadeIn">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">Review Your Order</h2>
                            <p className="text-gray-500 mt-2">Make sure everything looks good</p>
                        </div>

                        <div className="space-y-6">
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
                                        <span className="text-3xl font-bold text-indigo-600">₱{subtotal.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex gap-3">
                                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-sm text-blue-800">
                                        We'll contact you within 24 hours to confirm your order and discuss payment options.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setCurrentStep(3)}
                                    className="flex-1 py-3 rounded-lg border-2 border-gray-300 font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    ← Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="flex-1 py-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 font-bold text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
                                >
                                    Submit Order ✓
                                </button>
                            </div>
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