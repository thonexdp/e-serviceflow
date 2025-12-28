import { useState, useEffect } from 'react';
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
    payment_gcash_show_on_customer_page: initialSettings?.payment_gcash_show_on_customer_page !== undefined ?
    initialSettings.payment_gcash_show_on_customer_page :
    true,
    payment_bank_accounts: initialSettings?.payment_bank_accounts || []
  });

  const [qrcodeFile, setQrcodeFile] = useState(null);
  const [qrcodePreview, setQrcodePreview] = useState(initialSettings?.payment_gcash_qrcode || '');
  const [customerOrderQrcodeFile, setCustomerOrderQrcodeFile] = useState(null);
  const [customerOrderQrcodePreview, setCustomerOrderQrcodePreview] = useState(initialSettings?.customer_order_qrcode || '');
  const [showUpload, setShowUpload] = useState(!initialSettings?.customer_order_qrcode);
  const [saving, setSaving] = useState(false);
  const [bankQrcodeFiles, setBankQrcodeFiles] = useState({});
  const [bankQrcodePreviews, setBankQrcodePreviews] = useState({});
  const [alertMessage, setAlertMessage] = useState({ type: '', message: '' });


  useEffect(() => {
    if (initialSettings?.payment_bank_accounts) {
      const previews = {};
      initialSettings.payment_bank_accounts.forEach((account, index) => {
        if (account.qrcode) {
          previews[index] = account.qrcode;
        }
      });
      setBankQrcodePreviews(previews);
    }
  }, []);

  const handleBusinessHoursChange = (field, value) => {
    setSettings((prev) => ({
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

  const handleBankQRCodeUpload = (index, e) => {
    const file = e.target.files?.[0];
    if (file) {
      setBankQrcodeFiles((prev) => ({ ...prev, [index]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setBankQrcodePreviews((prev) => ({ ...prev, [index]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addBankAccount = () => {
    setSettings((prev) => ({
      ...prev,
      payment_bank_accounts: [
      ...prev.payment_bank_accounts,
      {
        bank_name: '',
        account_name: '',
        account_number: '',
        qrcode: ''
      }]

    }));
  };

  const removeBankAccount = (index) => {
    setSettings((prev) => ({
      ...prev,
      payment_bank_accounts: prev.payment_bank_accounts.filter((_, i) => i !== index)
    }));

    setBankQrcodeFiles((prev) => {
      const newState = { ...prev };
      delete newState[index];
      return newState;
    });
    setBankQrcodePreviews((prev) => {
      const newState = { ...prev };
      delete newState[index];
      return newState;
    });
  };

  const updateBankAccount = (index, field, value) => {
    setSettings((prev) => ({
      ...prev,
      payment_bank_accounts: prev.payment_bank_accounts.map((account, i) =>
      i === index ? { ...account, [field]: value } : account
      )
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData();


    formData.append('contact_phone', settings.contact_phone);
    formData.append('contact_email', settings.contact_email);
    formData.append('contact_facebook', settings.contact_facebook);
    formData.append('contact_address', settings.contact_address);


    formData.append('business_hours', JSON.stringify(settings.business_hours));


    formData.append('payment_gcash_account_name', settings.payment_gcash_account_name);
    formData.append('payment_gcash_number', settings.payment_gcash_number);
    formData.append('payment_gcash_show_on_customer_page', settings.payment_gcash_show_on_customer_page ? '1' : '0');
    if (qrcodeFile) {
      formData.append('payment_gcash_qrcode', qrcodeFile);
    }


    formData.append('payment_bank_accounts', JSON.stringify(settings.payment_bank_accounts));


    Object.keys(bankQrcodeFiles).forEach((index) => {
      if (bankQrcodeFiles[index]) {
        formData.append(`payment_bank_qrcode_${index}`, bankQrcodeFiles[index]);
      }
    });


    if (customerOrderQrcodeFile) {
      formData.append('customer_order_qrcode', customerOrderQrcodeFile);
    }

    router.post('/admin/settings', formData, {
      preserveScroll: true,
      onSuccess: () => {
        setSaving(false);
        setShowUpload(false);
        setAlertMessage({ type: 'success', message: 'Settings updated successfully!' });

        setTimeout(() => {
          setAlertMessage({ type: '', message: '' });
        }, 5000);
      },
      onError: (errors) => {
        setSaving(false);
        console.error('Error updating settings:', errors);
        setAlertMessage({ type: 'danger', message: 'Failed to update settings. Please try again.' });
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
                          placeholder="+63 917 123 4567" />

                                            </div>
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">Email Address</label>
                                                <input
                          type="email"
                          className="form-control"
                          value={settings.contact_email}
                          onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                          placeholder="info@rcprintshoppe.com" />

                                            </div>
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">Facebook</label>
                                                <input
                          type="text"
                          className="form-control"
                          value={settings.contact_facebook}
                          onChange={(e) => setSettings({ ...settings, contact_facebook: e.target.value })}
                          placeholder="rcprintshoppe" />

                                            </div>
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">Address</label>
                                                <input
                          type="text"
                          className="form-control"
                          value={settings.contact_address}
                          onChange={(e) => setSettings({ ...settings, contact_address: e.target.value })}
                          placeholder="Paranaque City, Metro Manila, Philippines" />

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
                          placeholder="8AM - 6PM" />

                                            </div>
                                            <div className="col-md-4 mb-3">
                                                <label className="form-label">Saturday</label>
                                                <input
                          type="text"
                          className="form-control"
                          value={settings.business_hours.saturday}
                          onChange={(e) => handleBusinessHoursChange('saturday', e.target.value)}
                          placeholder="9AM - 3PM" />

                                            </div>
                                            <div className="col-md-4 mb-3">
                                                <label className="form-label">Sunday</label>
                                                <input
                          type="text"
                          className="form-control"
                          value={settings.business_hours.sunday}
                          onChange={(e) => handleBusinessHoursChange('sunday', e.target.value)}
                          placeholder="Closed" />

                                            </div>
                                        </div>
                                    </div>

                                    <hr />

                                    {/* GCash Payment */}
                                    <div className="mb-4">
                                        <h5 className="mb-3">GCash Payment Details</h5>
                                        <div className="row">
                                            <div className="col-md-12 mb-3">
                                                <div className="form-check">
                                                    <input
                            className="form-check-input"
                            type="checkbox"
                            checked={settings.payment_gcash_show_on_customer_page}
                            onChange={(e) => setSettings({ ...settings, payment_gcash_show_on_customer_page: e.target.checked })}
                            id="showGcashOnCustomerPage" />

                                                    <label className="form-check-label" htmlFor="showGcashOnCustomerPage">
                                                        Show GCash payment details on customer order page
                                                    </label>
                                                </div>
                                                <p className="text-muted small mt-1">
                                                    When checked, customers will see GCash payment details when placing an order. Uncheck to hide it.
                                                </p>
                                            </div>
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">Account Name</label>
                                                <input
                          type="text"
                          className="form-control"
                          value={settings.payment_gcash_account_name}
                          onChange={(e) => setSettings({ ...settings, payment_gcash_account_name: e.target.value })}
                          placeholder="RC PrintShoppe" />

                                            </div>
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">GCash Number</label>
                                                <input
                          type="text"
                          className="form-control"
                          value={settings.payment_gcash_number}
                          onChange={(e) => setSettings({ ...settings, payment_gcash_number: e.target.value })}
                          placeholder="0912 345 6789" />

                                            </div>
                                            <div className="col-md-12 mb-3">
                                                <label className="form-label">GCash QR Code</label>
                                                <input
                          type="file"
                          className="form-control"
                          accept="image/*"
                          onChange={handleQRCodeUpload} />

                                                {qrcodePreview &&
                        <div className="mt-2">
                                                        <img src={qrcodePreview} alt="QR Code Preview" className="border" style={{ maxWidth: '200px', maxHeight: '200px' }} />
                                                    </div>
                        }
                                            </div>
                                        </div>
                                    </div>

                                    <hr />

                                    {/* Bank Transfer Payment */}
                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <h5 className="mb-0">Bank Transfer Details</h5>
                                            <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={addBankAccount}>

                                                <i className="fa fa-plus me-1"></i> Add Bank Account
                                            </button>
                                        </div>
                                        {settings.payment_bank_accounts.length === 0 &&
                    <div className="alert alert-info">
                                                No bank accounts added yet. Click "Add Bank Account" to add one.
                                            </div>
                    }
                                        {settings.payment_bank_accounts.map((account, index) =>
                    <div key={index} className="card mb-3">
                                                <div className="card-header d-flex justify-content-between align-items-center">
                                                    <strong>Bank Account #{index + 1}</strong>
                                                    <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => removeBankAccount(index)}>

                                                        <i className="fa fa-trash me-1"></i> Remove
                                                    </button>
                                                </div>
                                                <div className="card-body">
                                                    <div className="row">
                                                        <div className="col-md-4 mb-3">
                                                            <label className="form-label">Bank Name</label>
                                                            <input
                              type="text"
                              className="form-control"
                              value={account.bank_name}
                              onChange={(e) => updateBankAccount(index, 'bank_name', e.target.value)}
                              placeholder="BDO (Banco de Oro)" />

                                                        </div>
                                                        <div className="col-md-4 mb-3">
                                                            <label className="form-label">Account Name</label>
                                                            <input
                              type="text"
                              className="form-control"
                              value={account.account_name}
                              onChange={(e) => updateBankAccount(index, 'account_name', e.target.value)}
                              placeholder="RC PrintShoppe" />

                                                        </div>
                                                        <div className="col-md-4 mb-3">
                                                            <label className="form-label">Account Number</label>
                                                            <input
                              type="text"
                              className="form-control"
                              value={account.account_number}
                              onChange={(e) => updateBankAccount(index, 'account_number', e.target.value)}
                              placeholder="1234 5678 9012" />

                                                        </div>
                                                        <div className="col-md-12 mb-3">
                                                            <label className="form-label">Bank QR Code (Optional)</label>
                                                            <input
                              type="file"
                              className="form-control"
                              accept="image/*"
                              onChange={(e) => handleBankQRCodeUpload(index, e)} />

                                                            {(bankQrcodePreviews[index] || account.qrcode) &&
                            <div className="mt-2">
                                                                    <img
                                src={bankQrcodePreviews[index] || account.qrcode}
                                alt={`Bank QR Code ${index + 1}`}
                                className="border"
                                style={{ maxWidth: '200px', maxHeight: '200px' }} />

                                                                </div>
                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                    )}
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
                                                    {customerOrderQrcodePreview &&
                          <button
                            type="button"
                            className={`btn btn-sm ${showUpload ? 'btn-outline-secondary' : 'btn-outline-primary'}`}
                            onClick={() => setShowUpload(!showUpload)}>

                                                            <i className={`fa ${showUpload ? 'fa-times' : 'fa-upload'} me-1`}></i>
                                                            {showUpload ? 'Cancel Update' : 'Update QR Code'}
                                                        </button>
                          }
                                                </div>

                                                {showUpload &&
                        <div className="mb-3 animate__animated animate__fadeIn">
                                                        <input
                            type="file"
                            className="form-control"
                            accept="image/*"
                            onChange={handleCustomerOrderQRCodeUpload} />

                                                        <p className="text-muted small mt-1">Recommended size: 500x500px</p>
                                                    </div>
                        }
                                                {customerOrderQrcodePreview &&
                        <div className="mt-3">
                                                        <div className="d-flex align-items-start gap-4">
                                                            <div className="qrcode-preview-container">
                                                                <img
                                src={customerOrderQrcodePreview}
                                alt="Customer Order QR Code"
                                className="border rounded p-2 bg-white"
                                style={{ maxWidth: '250px', maxHeight: '250px', display: 'block' }} />

                                                            </div>
                                                            <div className="d-flex flex-column gap-2 pt-2">
                                                                <a
                                href={customerOrderQrcodePreview}
                                download="customer-order-qrcode"
                                className="btn btn-outline-primary btn-sm">

                                                                    <i className="fa fa-download me-1"></i> Download QR Code
                                                                </a>
                                                                <p className="text-muted small mt-2">
                                                                    <strong>Tip:</strong> You can download this image and use it for your shop's marketing materials or print it directly.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                        }
                                            </div>
                                        </div>
                                    </div>
                                    {alertMessage.message &&
                  <div className={`alert alert-${alertMessage.type} alert-dismissible fade show`} role="alert">
                                            {alertMessage.type === 'success' &&
                    <i className="fa fa-check-circle me-2"></i>
                    }
                                            {alertMessage.type === 'danger' &&
                    <i className="fa fa-exclamation-circle me-2"></i>
                    }
                                            {alertMessage.message}
                                            <button
                      type="button"
                      className="btn-close"
                      onClick={() => setAlertMessage({ type: '', message: '' })}
                      aria-label="Close">
                    </button>
                                        </div>
                  }
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
        </AdminLayout>);

}