import { useState } from 'react';
import { router } from '@inertiajs/react';
import AdminLayout from '@/Components/Layouts/AdminLayout';

export default function Settings({ settings: initialSettings }) {
    const [settings, setSettings] = useState({
        contact_phone: initialSettings?.contact_phone || '',
        contact_email: initialSettings?.contact_email || '',
        contact_facebook: initialSettings?.contact_facebook || '',
        contact_address: initialSettings?.contact_address || '',
        business_hours: initialSettings?.business_hours || {
            monday_friday: '8AM - 6PM',
            saturday: '9AM - 3PM',
            sunday: 'Closed'
        },
        payment_gcash_account_name: initialSettings?.payment_gcash_account_name || '',
        payment_gcash_number: initialSettings?.payment_gcash_number || '',
        payment_bank_name: initialSettings?.payment_bank_name || '',
        payment_bank_account_name: initialSettings?.payment_bank_account_name || '',
        payment_bank_account_number: initialSettings?.payment_bank_account_number || '',
    });

    const [qrcodeFile, setQrcodeFile] = useState(null);
    const [qrcodePreview, setQrcodePreview] = useState(initialSettings?.payment_gcash_qrcode || '');
    const [customerOrderQrcodeFile, setCustomerOrderQrcodeFile] = useState(null);
    const [customerOrderQrcodePreview, setCustomerOrderQrcodePreview] = useState(initialSettings?.customer_order_qrcode || '');
    const [showUpload, setShowUpload] = useState(!initialSettings?.customer_order_qrcode);
    const [saving, setSaving] = useState(false);

    const handleBusinessHoursChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            business_hours: {
                ...prev.business_hours,
                [field]: value
            }
        }));
    };

    const handleQRCodeUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setQrcodeFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setQrcodePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleCustomerOrderQRCodeUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setCustomerOrderQrcodeFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setCustomerOrderQrcodePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSaving(true);

        const formData = new FormData();

        // Contact Information
        formData.append('contact_phone', settings.contact_phone);
        formData.append('contact_email', settings.contact_email);
        formData.append('contact_facebook', settings.contact_facebook);
        formData.append('contact_address', settings.contact_address);

        // Business Hours
        formData.append('business_hours', JSON.stringify(settings.business_hours));

        // Payment - GCash
        formData.append('payment_gcash_account_name', settings.payment_gcash_account_name);
        formData.append('payment_gcash_number', settings.payment_gcash_number);
        if (qrcodeFile) {
            formData.append('payment_gcash_qrcode', qrcodeFile);
        }

        // Payment - Bank
        formData.append('payment_bank_name', settings.payment_bank_name);
        formData.append('payment_bank_account_name', settings.payment_bank_account_name);
        formData.append('payment_bank_account_number', settings.payment_bank_account_number);

        // Customer Order QR Code
        if (customerOrderQrcodeFile) {
            formData.append('customer_order_qrcode', customerOrderQrcodeFile);
        }

        router.post('/admin/settings', formData, {
            preserveScroll: true,
            onSuccess: () => {
                setSaving(false);
                setShowUpload(false);
                alert('Settings updated successfully!');
            },
            onError: (errors) => {
                setSaving(false);
                console.error('Error updating settings:', errors);
                alert('Failed to update settings. Please try again.');
            }
        });
    };

    return (
        <AdminLayout>
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-title">
                                <h4>System Settings</h4>
                                <p className="text-muted">Manage your business information and payment details</p>
                            </div>
                            <div className="card-body">
                                <form onSubmit={handleSubmit}>
                                    {/* Contact Information */}
                                    <div className="mb-4">
                                        <h5 className="mb-3">Contact Information</h5>
                                        <div className="row">
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">Phone Number</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={settings.contact_phone}
                                                    onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                                                    placeholder="+63 917 123 4567"
                                                />
                                            </div>
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">Email Address</label>
                                                <input
                                                    type="email"
                                                    className="form-control"
                                                    value={settings.contact_email}
                                                    onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                                                    placeholder="info@rcprintshoppe.com"
                                                />
                                            </div>
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">Facebook</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={settings.contact_facebook}
                                                    onChange={(e) => setSettings({ ...settings, contact_facebook: e.target.value })}
                                                    placeholder="rcprintshoppe"
                                                />
                                            </div>
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">Address</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={settings.contact_address}
                                                    onChange={(e) => setSettings({ ...settings, contact_address: e.target.value })}
                                                    placeholder="Paranaque City, Metro Manila, Philippines"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <hr />

                                    {/* Business Hours */}
                                    <div className="mb-4">
                                        <h5 className="mb-3">Business Hours</h5>
                                        <div className="row">
                                            <div className="col-md-4 mb-3">
                                                <label className="form-label">Monday - Friday</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={settings.business_hours.monday_friday}
                                                    onChange={(e) => handleBusinessHoursChange('monday_friday', e.target.value)}
                                                    placeholder="8AM - 6PM"
                                                />
                                            </div>
                                            <div className="col-md-4 mb-3">
                                                <label className="form-label">Saturday</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={settings.business_hours.saturday}
                                                    onChange={(e) => handleBusinessHoursChange('saturday', e.target.value)}
                                                    placeholder="9AM - 3PM"
                                                />
                                            </div>
                                            <div className="col-md-4 mb-3">
                                                <label className="form-label">Sunday</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={settings.business_hours.sunday}
                                                    onChange={(e) => handleBusinessHoursChange('sunday', e.target.value)}
                                                    placeholder="Closed"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <hr />

                                    {/* GCash Payment */}
                                    <div className="mb-4">
                                        <h5 className="mb-3">GCash Payment Details</h5>
                                        <div className="row">
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">Account Name</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={settings.payment_gcash_account_name}
                                                    onChange={(e) => setSettings({ ...settings, payment_gcash_account_name: e.target.value })}
                                                    placeholder="RC PrintShoppe"
                                                />
                                            </div>
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">GCash Number</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={settings.payment_gcash_number}
                                                    onChange={(e) => setSettings({ ...settings, payment_gcash_number: e.target.value })}
                                                    placeholder="0912 345 6789"
                                                />
                                            </div>
                                            <div className="col-md-12 mb-3">
                                                <label className="form-label">GCash QR Code</label>
                                                <input
                                                    type="file"
                                                    className="form-control"
                                                    accept="image/*"
                                                    onChange={handleQRCodeUpload}
                                                />
                                                {qrcodePreview && (
                                                    <div className="mt-2">
                                                        <img src={qrcodePreview} alt="QR Code Preview" className="border" style={{ maxWidth: '200px', maxHeight: '200px' }} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <hr />

                                    {/* Bank Transfer Payment */}
                                    <div className="mb-4">
                                        <h5 className="mb-3">Bank Transfer Details</h5>
                                        <div className="row">
                                            <div className="col-md-4 mb-3">
                                                <label className="form-label">Bank Name</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={settings.payment_bank_name}
                                                    onChange={(e) => setSettings({ ...settings, payment_bank_name: e.target.value })}
                                                    placeholder="BDO (Banco de Oro)"
                                                />
                                            </div>
                                            <div className="col-md-4 mb-3">
                                                <label className="form-label">Account Name</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={settings.payment_bank_account_name}
                                                    onChange={(e) => setSettings({ ...settings, payment_bank_account_name: e.target.value })}
                                                    placeholder="RC PrintShoppe"
                                                />
                                            </div>
                                            <div className="col-md-4 mb-3">
                                                <label className="form-label">Account Number</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={settings.payment_bank_account_number}
                                                    onChange={(e) => setSettings({ ...settings, payment_bank_account_number: e.target.value })}
                                                    placeholder="1234 5678 9012"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <hr />

                                    {/* Customer Order QR Code Section */}
                                    <div className="mb-4">
                                        <h5 className="mb-3">Customer Order QR Code</h5>
                                        <p className="text-muted small mb-3">
                                            Upload a QR code that customers can scan to be redirected to your online orders page.
                                            This QR code can be printed and displayed in your physical shop.
                                        </p>
                                        <div className="row">
                                            <div className="col-md-12 mb-3">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <label className="form-label mb-0">Order QR Code</label>
                                                    {customerOrderQrcodePreview && (
                                                        <button
                                                            type="button"
                                                            className={`btn btn-sm ${showUpload ? 'btn-outline-secondary' : 'btn-outline-primary'}`}
                                                            onClick={() => setShowUpload(!showUpload)}
                                                        >
                                                            <i className={`fa ${showUpload ? 'fa-times' : 'fa-upload'} me-1`}></i>
                                                            {showUpload ? 'Cancel Update' : 'Update QR Code'}
                                                        </button>
                                                    )}
                                                </div>

                                                {showUpload && (
                                                    <div className="mb-3 animate__animated animate__fadeIn">
                                                        <input
                                                            type="file"
                                                            className="form-control"
                                                            accept="image/*"
                                                            onChange={handleCustomerOrderQRCodeUpload}
                                                        />
                                                        <p className="text-muted small mt-1">Recommended size: 500x500px</p>
                                                    </div>
                                                )}
                                                {customerOrderQrcodePreview && (
                                                    <div className="mt-3">
                                                        <div className="d-flex align-items-start gap-4">
                                                            <div className="qrcode-preview-container">
                                                                <img
                                                                    src={customerOrderQrcodePreview}
                                                                    alt="Customer Order QR Code"
                                                                    className="border rounded p-2 bg-white"
                                                                    style={{ maxWidth: '250px', maxHeight: '250px', display: 'block' }}
                                                                />
                                                            </div>
                                                            <div className="d-flex flex-column gap-2 pt-2">
                                                                <a
                                                                    href={customerOrderQrcodePreview}
                                                                    download="customer-order-qrcode"
                                                                    className="btn btn-outline-primary btn-sm"
                                                                >
                                                                    <i className="fa fa-download me-1"></i> Download QR Code
                                                                </a>
                                                                <p className="text-muted small mt-2">
                                                                    <strong>Tip:</strong> You can download this image and use it for your shop's marketing materials or print it directly.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="d-flex justify-content-end">
                                        <button type="submit" className="btn btn-primary" disabled={saving}>
                                            {saving ? 'Saving...' : 'Save Settings'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
