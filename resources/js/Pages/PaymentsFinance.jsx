import React, { useMemo, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import DataTable from "@/Components/Common/DataTable";
import Modal from "@/Components/Main/Modal";
import FlashMessage from "@/Components/Common/FlashMessage";
import { formatPeso } from "@/Utils/currency";
import PreviewModal from "@/Components/Main/PreviewModal";
import OfficialReceipt from "@/Components/Finance/OfficialReceipt";
import { useRoleApi } from "@/Hooks/useRoleApi";
import Confirmation from "@/Components/Common/Confirmation";
import BillingStatement from "@/Components/Finance/BillingStatement";

const SearchableCustomerFilter = ({ customers, selectedId, onSelect }) => {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  const selectedCustomer = customers.find(c => c.id == selectedId);

  const filtered = customers.filter(c =>
    `${c.firstname} ${c.lastname}`.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 100);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef} style={{ width: "200px" }}>
      <div
        className="form-control form-control-sm flex justify-between items-center cursor-pointer bg-white"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          borderRadius: "5px",
          height: "32px",
          border: isOpen ? "1px solid #7367f0" : "1px solid #d8d6de",
          padding: "0 10px",
          boxShadow: isOpen ? "0 3px 10px 0 rgba(34, 41, 47, 0.1)" : "none",
          transition: "all 0.2s ease"
        }}
      >
        <span className="truncate text-xs font-medium" style={{ color: selectedCustomer ? "#5e5873" : "#b9b9c3" }}>
          {selectedCustomer ? `${selectedCustomer.firstname} ${selectedCustomer.lastname}` : "Filter by Customer..."}
        </span>
        <i className={`ti-angle-down text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: "#d8d6de" }}></i>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200"
          style={{ border: "1px solid #ebe9f1" }}>
          <div className="p-2 bg-light/50 border-bottom">
            <div className="relative">
              <input
                autoFocus
                type="text"
                className="form-control form-control-sm border-gray-200"
                placeholder="Type to search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ fontSize: "12px", borderRadius: "15px", paddingLeft: "15px" }}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            <div
              className={`px-3 py-2 text-xs cursor-pointer hover:bg-primary/5 transition-colors ${!selectedId ? 'bg-primary/10 text-primary font-bold' : 'text-muted'}`}
              onClick={() => { onSelect(""); setIsOpen(false); setSearch(""); }}
            >
              All Customers
            </div>
            {filtered.map(c => (
              <div
                key={c.id}
                className={`px-3 py-2 text-xs cursor-pointer hover:bg-primary/5 transition-colors border-top border-gray-50 ${selectedId == c.id ? 'bg-primary/10 text-primary font-bold' : 'text-gray-700'}`}
                onClick={() => { onSelect(c.id); setIsOpen(false); setSearch(""); }}
              >
                {c.firstname} {c.lastname}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-xs text-muted text-center italic">
                No customers found matching "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function PaymentsFinance({
  ledger,
  receivables = [],
  expenses,
  cashFlow = [],
  summary = {},
  filters = {},
  paymentMethods = [],
  expenseCategories = [],
  openTickets = [],
  customers = [],
  pendingPayments = [],

  user = {},
  notifications = [],
  messages = [],
  printSettings = {}
}) {
  const [activeTab, setActiveTab] = useState(filters.tab || "receivables");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpenseSubmitting, setIsExpenseSubmitting] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [paymentErrors, setPaymentErrors] = useState({});
  const [expenseErrors, setExpenseErrors] = useState({});
  const [paymentForm, setPaymentForm] = useState({
    ticket_id: "",
    customer_id: "",
    payer_name: "",
    payment_type: "collection",
    allocation: "downpayment",
    payment_method: paymentMethods[0] || "cash",
    payment_date: new Date().toISOString().slice(0, 10),
    amount: "",
    invoice_number: "",
    official_receipt_number: "",
    payment_reference: "",
    notes: "",
    discount: "",
    attachments: [],
    bank_name: "",
    cheque_number: "",
    cheque_date: ""
  });
  const { api, buildUrl } = useRoleApi();
  const { flash, auth } = usePage().props;


  const [show, setShow] = useState(false);
  const [filepath, setFilepath] = useState("");
  const [receiptToPrint, setReceiptToPrint] = useState(null);
  const [selectedReceivable, setSelectedReceivable] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [billingForm, setBillingForm] = useState({
    name: "",
    company_name: "",
    address: ""
  });
  const [billingToPrint, setBillingToPrint] = useState(null);
  const [selectionWarning, setSelectionWarning] = useState(null);

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "Confirm Action",
    description: "",
    subtitle: "",
    color: "primary",
    label: "Confirm",
    onConfirm: () => { },
    loading: false
  });
  const hasPermission = (module, feature) => {
    if (auth.user.role === 'admin') return true;
    return auth.user.permissions && auth.user.permissions.includes(`${module}.${feature}`);
  };
  const capitalizeName = (name = '') => name.replace(/\b\w/g, char => char.toUpperCase());


  const [expenseForm, setExpenseForm] = useState({
    category: expenseCategories[0] || "supplies",
    vendor: "",
    description: "",
    amount: "",
    expense_date: new Date().toISOString().slice(0, 10),
    payment_method: paymentMethods[0] || "cash",
    reference_number: "",
    ticket_id: "",
    notes: ""
  });

  const [localSearch, setLocalSearch] = useState(filters.search || "");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSearch = () => {
    router.get(
      buildUrl("finance"),
      { search: localSearch },
      {
        preserveState: true,
        preserveScroll: true,
        replace: true
      }
    );
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    setSelectedItems([]); // Clear selection when switching tabs

    const url = new URL(window.location.href);
    url.searchParams.set('tab', key);
    window.history.replaceState({}, '', url);
  };

  const toggleSelection = (row) => {
    const id = row.id || row.ticket_id;
    const customerId = row.customer_id || 'walk-in';

    setSelectedItems(prev => {
      // If unselecting
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }

      // If selecting a new item, check if it matches existing selections' customer
      if (prev.length > 0) {
        // Find one already selected item to get its customer_id
        let referenceItem = null;
        if (activeTab === 'receivables') {
          referenceItem = filteredReceivables.find(r => r.id === prev[0] || r.ticket_id === prev[0]);
        } else if (activeTab === 'pending_payments') {
          referenceItem = pendingPayments.find(p => p.id === prev[0]);
        }

        const refCustomerId = referenceItem?.customer_id || 'walk-in';

        if (refCustomerId !== customerId) {
          setSelectionWarning(`Limited to one customer per statement (${referenceItem?.name || referenceItem?.payer_name || 'Current'}).`);
          setTimeout(() => setSelectionWarning(null), 5000);
          return prev;
        }
      }
      setSelectionWarning(null);

      return [...prev, id];
    });
  };

  const handleGenerateStatement = () => {
    if (selectedItems.length === 0) return;

    // Get selected data objects
    let selectedData = [];
    if (activeTab === 'receivables') {
      selectedData = filteredReceivables.filter(r => selectedItems.includes(r.id) || selectedItems.includes(r.ticket_id));
    } else if (activeTab === 'pending_payments') {
      selectedData = pendingPayments.filter(p => selectedItems.includes(p.id));
    }

    // Validate: All selected items must belong to the same customer
    const customerIds = [...new Set(selectedData.map(item => item.customer_id || 'walk-in'))];
    if (customerIds.length > 1) {
      setConfirmConfig({
        isOpen: true,
        title: "Inconsistent Selection",
        description: "You have selected items belonging to multiple different customers.",
        subtitle: "A billing statement is designed for a single customer. Please select only items related to one client (e.g., tickets for the same person or company).",
        color: "warning",
        label: "Got it, I'll reselect",
        onConfirm: () => setConfirmConfig({ isOpen: false })
      });
      return;
    }

    const firstItem = selectedData[0];

    if (firstItem) {
      // For more specific address/name if available from customer object
      const customerObj = firstItem.customer || {};
      const fullName = customerObj.full_name || firstItem.name || firstItem.payer_name || (customerObj.firstname ? `${customerObj.firstname} ${customerObj.lastname}` : "");

      setBillingForm({
        name: fullName,
        company_name: "", // Manual input as requested
        address: customerObj.address || ""
      });
      setBillingModalOpen(true);
    }
  };

  const handlePrintBillingStatement = () => {
    // Collect all selected items data
    let selectedData = [];
    if (activeTab === 'receivables') {
      selectedData = filteredReceivables.filter(r => selectedItems.includes(r.id) || selectedItems.includes(r.ticket_id));
    } else if (activeTab === 'pending_payments') {
      selectedData = pendingPayments.filter(p => selectedItems.includes(p.id));
    }

    const billingData = {
      customerName: capitalizeName(billingForm.name),
      companyName: capitalizeName(billingForm.company_name),
      address: billingForm.address,
      date: new Date().toLocaleDateString(),
      tickets: selectedData,
      summary: {
        totalBalanceDue: selectedData.reduce((sum, item) => sum + parseFloat(item.balance || item.amount || 0), 0),
        credits: 0, // Could be calculated if needed
        previousBalance: 0,
      },
      bankName: capitalizeName(printSettings?.bank_account?.bank_name),
      accountName: capitalizeName(printSettings?.bank_account?.account_name),
      accountNo: printSettings?.bank_account?.account_number,
      qrCodeUrl: printSettings?.bank_account?.qrcode ? (printSettings.bank_account.qrcode.startsWith('/') ? printSettings.bank_account.qrcode : `/storage/${printSettings.bank_account.qrcode}`) : null
    };

    setBillingToPrint(billingData);
    setBillingModalOpen(false);

    document.body.classList.add("printing-billing");

    setTimeout(() => {
      window.print();
      document.body.classList.remove("printing-billing");
      setBillingToPrint(null);
    }, 500);
  };


  React.useEffect(() => {
    setLocalSearch(filters.search || "");
  }, [filters.search]);

  const handleRefresh = () => {
    setLocalSearch("");
    setIsRefreshing(true);

    router.visit(buildUrl("finance"), {
      preserveState: false,
      preserveScroll: true,
      onFinish: () => setIsRefreshing(false)
    });

  };

  const filteredReceivables = useMemo(() => {
    if (receivables && receivables.data) {
      return receivables.data;
    }
    return Array.isArray(receivables) ? receivables : [];
  }, [receivables]);

  const renderTableControls = () =>
    <div className="flex items-center gap-2">
      {selectionWarning && (
        <div className="alert alert-warning py-1 m-0 flex items-center gap-2 animate-in fade-in slide-in-from-right-2" style={{ borderRadius: '5px', paddingLeft: '12px', paddingRight: '12px', border: '1px solid #ffd591', backgroundColor: '#fffbe6', color: '#856404', fontSize: '11px', fontWeight: 'bold' }}>
          <i className="ti-alert"></i>
          {selectionWarning}
          <button type="button" className="close p-0 m-0 ml-2" onClick={() => setSelectionWarning(null)} style={{ fontSize: '16px', lineHeight: '1', color: 'inherit', float: 'none', opacity: '0.5' }}>&times;</button>
        </div>
      )}
      {selectedItems.length > 0 && (activeTab === 'receivables' || activeTab === 'pending_payments') && (
        <div className="flex items-center gap-1 bg-info/10 p-1 px-2 rounded-md border border-info/20">
          <span className="text-xs font-bold text-info uppercase mr-2 tracking-tighter">
            {selectedItems.length} Selected
          </span>
          <button
            className="btn btn-sm btn-info btn-rounded-md"
            onClick={handleGenerateStatement}
            style={{ padding: "0 15px", height: "32px", display: "flex", alignItems: "center", gap: "5px" }}
          >
            <i className="ti-printer"></i>
            Generate
          </button>
          <button
            className="btn btn-sm btn-light btn-outline btn-rounded"
            onClick={() => setSelectedItems([])}
            title="Clear Selection"
            style={{ width: "32px", height: "32px", padding: "0" }}
          >
            <i className="ti-close"></i>
          </button>
        </div>
      )}
      {activeTab === "ledger" &&
        <select
          className="form-control form-control-sm"
          value={filters.status || ""}
          onChange={(e) => {
            router.get(buildUrl("finance"), { ...filters, status: e.target.value }, { preserveState: true });
          }}
          style={{ width: "130px", borderRadius: "5px" }}>

          <option value="">All Statuses</option>
          <option value="posted">Posted</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      }
      <SearchableCustomerFilter
        customers={customers}
        selectedId={filters.customer_id}
        onSelect={(id) => {
          router.get(buildUrl("finance"), { ...filters, customer_id: id, receivables_page: 1, ledger_page: 1 }, { preserveState: true });
        }}
      />
      <div className="relative">
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Search..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          style={{ width: "200px", borderRadius: "5px", paddingRight: "30px", height: "32px" }} />

        <i
          className="ti-search absolute text-muted cursor-pointer"
          onClick={handleSearch}
          style={{ right: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "12px" }}>
        </i>
      </div>
      <button
        className="btn btn-sm btn-light btn-rounded"
        onClick={handleRefresh}
        disabled={isRefreshing}
        title="Refresh Table"
        style={{ width: "32px", height: "32px", padding: "0", display: "flex", alignItems: "center", justifyContent: "center" }}>

        <i className={`ti-reload ${isRefreshing ? "spin-animation" : ""}`}></i>
      </button>
    </div>;


  const tabs = [
    { key: "receivables", label: "Receivables" },
    { key: "pending_payments", label: `Pending Payments (${(summary?.pending_cheques_count || 0) + (summary?.pending_government_count || 0)})` },
    { key: "ledger", label: "Payment Ledger" },
    { key: "expenses", label: "Expenses" }];



  const resetPaymentForm = () => {
    setPaymentForm((prev) => ({
      ...prev,
      ticket_id: "",
      customer_id: "",
      payer_name: "",
      allocation: "downpayment",
      amount: "",
      invoice_number: "",
      official_receipt_number: "",
      payment_reference: "",
      notes: "",
      discount: "",
      attachments: [],
      bank_name: "",
      cheque_number: "",
      cheque_date: ""
    }));
    setPaymentErrors({});
  };

  const handlePaymentMethodChange = (method) => {
    setPaymentForm(prev => {
      const updates = { ...prev, payment_method: method };

      // Auto-fill amount and allocation for pending methods
      if ((method === 'check' || method === 'government_ar') && prev.ticket_id) {
        const ticket = openTickets.find(t => t.id === prev.ticket_id);
        if (ticket) {
          const subtotal = parseFloat(ticket.subtotal || ticket.total_amount || 0);
          const disc = parseFloat(prev.discount || 0);
          const total = subtotal - (subtotal * (disc / 100));
          const paid = parseFloat(ticket.amount_paid || 0);
          const balance = Math.max(0, total - paid);

          if (balance > 0) {
            updates.amount = balance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
          }

          if (method === 'government_ar') {
            updates.allocation = 'government_charge';
          }
        }
      }
      return updates;
    });
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      category: expenseCategories[0] || "supplies",
      vendor: "",
      description: "",
      amount: "",
      expense_date: new Date().toISOString().slice(0, 10),
      payment_method: paymentMethods[0] || "cash",
      reference_number: "",
      ticket_id: "",
      notes: ""
    });
    setExpenseErrors({});
  };

  const ticketOptions = useMemo(
    () =>
      openTickets.map((ticket) => ({
        value: ticket.id,
        label: `${ticket.ticket_number} - ${ticket.customer ?
          `${ticket.customer.firstname} ${ticket.customer.lastname}` :
          "Walk-in"}`,

        customer_id: ticket.customer_id
      })),
    [openTickets]
  );

  const handlePreviewFile = (payment) => {
    setFilepath(payment?.documents[0]?.file_path);
    setShow(true);
  };

  const customerOptions = useMemo(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: `${customer.firstname} ${customer.lastname}`
      })),
    [customers]
  );

  const handlePaymentSubmit = async () => {
    const errors = {};

    if (!paymentForm.ticket_id && !paymentForm.customer_id && !paymentForm.payer_name) {
      errors.payer = "Select a ticket, customer, or specify a payer name.";
    }
    if (!paymentForm.amount) {
      errors.amount = "Enter the amount received.";
    }

    if (Object.keys(errors).length > 0) {
      setPaymentErrors(errors);
      return;
    }

    const isPending = ['check', 'government_ar'].includes(paymentForm.payment_method);
    const methodLabel = paymentForm.payment_method === 'government_ar' ? 'Government AR' : paymentForm.payment_method.toUpperCase();
    const selectedTicket = openTickets.find((t) => t.id === paymentForm.ticket_id);
    const payerName = paymentForm.payer_name || (selectedTicket?.customer ? `${selectedTicket.customer.firstname} ${selectedTicket.customer.lastname}` : "Customer");

    setConfirmConfig({
      isOpen: true,
      title: "Confirm Payment Recording",
      description: `Record ${methodLabel} payment?`,
      subtitle: isPending ?
        `You are about to record a PENDING ${methodLabel} payment of ${formatPeso(paymentForm.amount)} for ${payerName}. This will not update the ticket balance until cleared/collected.` :
        `You are about to record a payment of ${formatPeso(paymentForm.amount)} for ${payerName}.`,
      color: "success",
      label: "Save Payment",
      onConfirm: () => processPaymentSubmit(),
      loading: false
    });
  };

  const processPaymentSubmit = async () => {
    const formData = new FormData();

    // Calculate the actual amount to record (cap at balance if ticket exists)
    let actualAmount = parseFloat(String(paymentForm.amount || 0).replace(/,/g, ''));
    
    if (paymentForm.ticket_id) {
      const selectedTicket = openTickets.find((t) => t.id === paymentForm.ticket_id);
      if (selectedTicket) {
        const subtotal = parseFloat(selectedTicket.subtotal || selectedTicket.total_amount || 0);
        const discountPercent = parseFloat(paymentForm.discount || 0);
        const discountAmount = subtotal * (discountPercent / 100);
        const ticketTotal = subtotal - discountAmount;
        const previousPayments = parseFloat(selectedTicket.amount_paid || 0);
        const balanceBeforePayment = Math.max(ticketTotal - previousPayments, 0);
        
        // Only cap if there's a balance and payment exceeds it (to avoid inflating sales)
        if (balanceBeforePayment > 0 && actualAmount > balanceBeforePayment) {
          actualAmount = balanceBeforePayment;
        }
      }
    }

    let finalMetadata = {};
    if (['check', 'government_ar'].includes(paymentForm.payment_method)) {
      finalMetadata = {
        bank_name: paymentForm.bank_name,
        cheque_number: paymentForm.cheque_number,
        cheque_date: paymentForm.cheque_date
      };
      formData.append('status', 'pending');
    }

    Object.entries(paymentForm).forEach(([key, value]) => {
      if (key === "attachments") {
        value.forEach((file) => formData.append("attachments[]", file));
      } else if (key === "amount") {
        // Use the calculated actual amount (capped at balance) instead of raw input
        formData.append(key, actualAmount.toString());
      } else if (key === "discount") {
        formData.append(key, String(value).replace(/,/g, ''));
      } else if (['bank_name', 'cheque_number', 'cheque_date'].includes(key)) {

      } else if (value !== null && value !== "") {
        formData.append(key, value);
      }
    });


    Object.entries(finalMetadata).forEach(([k, v]) => {
      formData.append(`metadata[${k}]`, v);
    });

    setIsSubmitting(true);
    setPaymentErrors({});
    try {
      const response = await api.post("/payments", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const newPayment = response.data.payment || response.data;



      let printablePayment = { ...newPayment };
      if (paymentForm.customer_id) {
        const customer = customers.find((c) => c.id == paymentForm.customer_id);
        if (customer) {
          printablePayment.customer = customer;
          printablePayment.payer_name = printablePayment.payer_name || customer.full_name || `${customer.firstname} ${customer.lastname}`;
        }
      }

      if (paymentForm.ticket_id) {
        const ticket = openTickets.find((t) => t.id == paymentForm.ticket_id);
        if (ticket) printablePayment.ticket = ticket;
      }

      setPaymentModalOpen(false);
      setIsSubmitting(false);
      resetPaymentForm();
      setConfirmConfig({ isOpen: false });
      router.reload({ preserveScroll: true });

    } catch (error) {
      console.error("Payment submission failed", error);
      setConfirmConfig((prev) => ({ ...prev, loading: false }));
      setPaymentErrors({
        submit: error.response?.data?.message || "Failed to record payment."
      });
    }
  };

  const handleExpenseSubmit = async () => {
    const errors = {};

    if (!expenseForm.description) {
      errors.description = "Description is required.";
    }
    if (!expenseForm.amount) {
      errors.amount = "Amount is required.";
    }

    if (Object.keys(errors).length > 0) {
      setExpenseErrors(errors);
      return;
    }

    setIsExpenseSubmitting(true);
    setExpenseErrors({});
    try {

      const cleanedForm = {
        ...expenseForm,
        amount: String(expenseForm.amount).replace(/,/g, '')
      };
      await api.post("/expenses", cleanedForm);
      setExpenseModalOpen(false);
      resetExpenseForm();
      router.reload({ preserveScroll: true });
    } catch (error) {
      console.error("Expense submission failed", error);
      setExpenseErrors({
        submit: error.response?.data?.message || "Failed to record expense."
      });
    } finally {
      setIsExpenseSubmitting(false);
    }
  };

  const handleCurrencyInputChange = (setter, form, field, value) => {

    const numericValue = value.replace(/[^0-9.]/g, '');


    const parts = numericValue.split('.');
    let integerPart = parts[0];
    let decimalPart = parts[1];


    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    let finalValue = formattedInteger;
    if (decimalPart !== undefined) {
      finalValue += '.' + decimalPart.slice(0, 2);
    }

    setter({
      ...form,
      [field]: finalValue
    });
  };

  const handlePrintReceipt = (payment, onAfterPrint = null) => {
    setReceiptToPrint(payment);

    document.body.classList.add("printing-receipt");


    setTimeout(() => {
      window.print();




      document.body.classList.remove("printing-receipt");
      setReceiptToPrint(null);

      if (onAfterPrint) {
        onAfterPrint();
      }
    }, 500);
  };

  const handleProcessPayment = (row) => {
    setSelectedReceivable(row);
    setPaymentForm((prev) => ({
      ...prev,
      ticket_id: row.ticket_id,
      customer_id: row.customer_id,
      payer_name: row.name,
      discount: row.discount || ""
    }));
    setPaymentModalOpen(true);
  };

  const handlePaymentAction = (paymentId, action) => {
    setConfirmConfig({
      isOpen: true,
      title: "Confirm Action",
      description: `Are you sure you want to ${action} this payment?`,
      subtitle: action === 'reject' ?
        "Please provide a reason for rejecting this payment. This will be visible to the frontdesk." :
        "This action will update the payment status and may affect ticket balances.",
      color: action === 'reject' ? 'danger' : 'success',
      label: action.toUpperCase(),
      showNotesField: action === 'reject',
      notesLabel: "Rejection Reason",
      notesPlaceholder: "e.g., NSF (Non-Sufficient Funds), Signature mismatch, Account closed...",
      notesRequired: action === 'reject',
      notesRows: 6,
      onConfirm: async (notes) => {
        setConfirmConfig((prev) => ({ ...prev, loading: true }));
        try {
          const payload = action === 'reject' && notes ? { notes } : {};
          await api.post(`/payments/${paymentId}/${action}`, payload);
          setConfirmConfig({ isOpen: false });
          router.reload({ preserveScroll: true });
        } catch (error) {
          console.error(`Payment ${action} failed`, error);
          setConfirmConfig({
            isOpen: true,
            title: "Error",
            description: `Failed to ${action} payment`,
            subtitle: error.response?.data?.message || "Something went wrong.",
            color: "danger",
            label: "Close",
            showNotesField: false,
            onConfirm: () => setConfirmConfig({ isOpen: false }),
            loading: false
          });
        }
      },
      loading: false
    });
  };

  const handleQuickUpload = async (paymentId, file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('attachments[]', file);

    try {
      await api.post(`/payments/${paymentId}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      router.reload({ preserveScroll: true });
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload evidence.");
    }
  };

  const ledgerColumns = [
    {
      label: (activeTab === 'pending_payments') ? "Select" : "",
      render: (row) => (activeTab === 'pending_payments') ? (
        <input
          type="checkbox"
          checked={selectedItems.includes(row.id)}
          onChange={() => toggleSelection(row)}
          style={{ width: '18px', height: '18px' }}
        />
      ) : null,
      hide: activeTab !== 'pending_payments'
    },
    {
      label: "Date",
      render: (row) =>
        new Date(row.payment_date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        })
    },
    {
      label: "Ticket / Invoice",
      render: (row) =>
        <div>
          <strong>{row.ticket?.ticket_number || row.invoice_number || "—"}</strong>
          <div className="text-xs text-gray-500">
            {row.ticket?.description || row.notes || ""}
          </div>
        </div>

    },
    {
      label: "Customer",
      render: (row) => row.customer?.full_name || row.payer_name || "Walk-in"
    },
    {
      label: "Method",
      render: (row) =>
        <div className="flex flex-col">
          <div className="flex items-center">
            {row.payment_method === 'check' && <i className="ti-wallet text-primary mr-1" title="Cheque"></i>}
            {row.payment_method === 'government_ar' && <i className="ti-layout-grid2 text-info mr-1" title="Government AR"></i>}
            <span className="font-medium">
              {row.payment_method === 'government_ar' ? "Govt (On Account)" : (row.payment_method ? row.payment_method.replace("_", " ") : "—")}
            </span>
          </div>
          {row.payment_method === 'check' && row.metadata &&
            <div className="text-[10px] text-muted leading-tight">
              {row.metadata.bank_name} | {row.metadata.cheque_number}
            </div>
          }
          {row.payment_method === 'government_ar' &&
            <span className="text-[10px] text-info font-bold uppercase tracking-tighter">DELAYED PAYMENT</span>
          }
        </div>

    },
    {
      label: "Amount",
      render: (row) =>
        <div className="flex flex-col">
          <strong className={row.status === 'pending' ? "text-warning" : "text-green-600"}>
            {formatPeso(row.amount)}
          </strong>
          {row.status === 'pending' && <span className="text-xs text-warning font-bold">PENDING</span>}
          {row.status === 'rejected' && <span className="text-xs text-danger font-bold">REJECTED</span>}
        </div>

    },
    {
      label: "OR / Ref",
      render: (row) =>
        row.official_receipt_number || row.payment_reference || "—"
    },
    {
      label: "Proof",
      render: (row) =>
        row.documents?.length ?
          <>
            <span className="badge badge-success">
              {row.documents.length} file(s)
            </span>
            <button
              onClick={() => handlePreviewFile(row)}
              className="btn btn-sm btn-outline-primary ml-1"
              style={{ padding: "2px 8px", fontSize: "11px" }}
              title="Photo preview">

              <i className="ti-eye"></i>
            </button>
          </> :

          <div className="flex items-center gap-1">
            <span className="badge badge-light text-muted">None</span>
            {row.status === 'pending' && (
              <label className="mb-0 cursor-pointer text-primary" title="Upload Proof">
                <i className="ti-upload"></i>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => handleQuickUpload(row.id, e.target.files[0])}
                />
              </label>
            )}
          </div>

    },
    {
      label: "Action",
      render: (row) =>
        <div className="flex gap-1">
          {row.status === 'pending' &&
            <>
              <button
                className="btn btn-success btn-sm btn-outline"
                onClick={() => handlePaymentAction(row.id, 'clear')}
                title="Clear Cheque">

                <i className="ti-check"></i>
              </button>
              <button
                className="btn btn-danger btn-sm btn-outline"
                onClick={() => handlePaymentAction(row.id, 'reject')}
                title="Reject Cheque">

                <i className="ti-close"></i>
              </button>
            </>
          }
          <button
            className="btn btn-primary btn-sm btn-outline"
            onClick={() => handlePrintReceipt(row)}
            title="Print Official Receipt"
            disabled={row.status === 'rejected'}>

            <i className="ti-printer"></i>
          </button>
        </div>

    }];


  const receivablesColumns = [
    {
      label: "Select",
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedItems.includes(row.id || row.ticket_id)}
          onChange={() => toggleSelection(row)}
          style={{ width: '18px', height: '18px' }}
        />
      )
    },
    {
      label: "Ticket #",
      render: (row) =>
        <div className="flex flex-col">
          <span className="font-semibold text-primary">
            {row.ticket_number || `#${row.ticket_id}`}
          </span>
          {row.has_rejected_payment &&
            <div className="flex flex-col mt-1">
              <span className="badge badge-danger text-[10px] p-1 flex items-center w-fit" title="Click process to see details or record new payment">
                <i className="ti-alert mr-1"></i> BOUNCED/REJECTED
              </span>
              {row.last_rejected_payment?.notes &&
                <span className="text-danger text-xs mt-1 italic">
                  Reason: {row.last_rejected_payment.notes}
                </span>
              }
            </div>
          }
          {row.job_type?.discount > 0 &&
            <span className="badge badge-success text-[10px] p-1 mt-1 flex items-center w-fit">
              <i className="ti-gift mr-1"></i> PROMO
            </span>
          }
        </div>

    },
    { label: "Customer", render: (row) => row.name },
    {
      label: "Description",
      render: (row) =>
        <span className="text-sm text-gray-600">
          {row.description ? row.description.length > 50 ? row.description.substring(0, 50) + '...' : row.description : '—'}
        </span>

    },
    { label: "Total Amount", render: (row) => formatPeso(row.total_invoiced) },
    { label: "Paid", render: (row) => formatPeso(row.total_paid) },
    {
      label: "Balance",
      render: (row) =>
        <span className="text-danger font-semibold">{formatPeso(row.balance)}</span>

    },
    {
      label: "Due Date",
      render: (row) =>
        row.due_date ?
          new Date(row.due_date).toLocaleDateString() :
          "—"
    },
    {
      label: "Action",
      render: (row) =>
        hasPermission('finance', 'create') &&
        <button
          className="btn btn-primary btn-sm btn-rounded-md"
          onClick={() => handleProcessPayment(row)}>

          <i className="ti-wallet m-r-5"></i>
          Process Payment
        </button>


    }];


  const expenseColumns = [
    {
      label: "Date",
      render: (row) =>
        new Date(row.expense_date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        })
    },
    { label: "Category", render: (row) => row.category },
    { label: "Description", render: (row) => row.description },
    { label: "Vendor", render: (row) => row.vendor || "—" },
    {
      label: "Amount",
      render: (row) =>
        <span className="text-danger font-semibold">
          {formatPeso(row.amount)}
        </span>

    },
    {
      label: "Method",
      render: (row) =>
        row.payment_method ? row.payment_method.replace("_", " ") : "—"
    }];


  const renderSummaryCards = () =>
    <div className="row">
      <div className="col-lg-2 col-md-6">
        <div className="card">
          <div className="card-body">
            <h5>Collections (Month)</h5>
            <h2 className="m-b-0">{formatPeso(summary.collections_month)}</h2>
          </div>
        </div>
      </div>
      <div className="col-lg-2 col-md-6">
        <div className="card">
          <div className="card-body">
            <h5>Expenses (Month)</h5>
            <h2 className="m-b-0 text-danger">
              {formatPeso(summary.expenses_month)}
            </h2>
          </div>
        </div>
      </div>
      <div className="col-lg-2 col-md-4">
        <div className="card">
          <div className="card-body">
            <h5>Net Cash Flow</h5>
            <h2
              className={`m-b-0 ${summary.net_cash_flow_month >= 0 ?
                "text-success" :
                "text-danger"}`
              }>

              {formatPeso(summary.net_cash_flow_month)}
            </h2>
          </div>
        </div>
      </div>
      <div className="col-lg-3 col-md-4">
        <div className="card">
          <div className="card-body">
            <h5>Collectable (Pending)</h5>
            <h2 className="m-b-0 text-warning">
              {formatPeso(summary.collectable_total || 0)}
            </h2>
            <div className="text-xs uppercase mt-1 opacity-75">
              CQ: {formatPeso(summary.pending_cheques_total || 0)} |
              GOVT: {formatPeso(summary.pending_government_total || 0)}
            </div>
          </div>
        </div>
      </div>
      <div className="col-lg-3 col-md-4">
        <div className="card">
          <div className="card-body">
            <h5>Receivables</h5>
            <h2 className="m-b-0 text-warning">
              {formatPeso(summary.receivables_total)}
            </h2>
            <p className="text-muted m-b-0">
              {summary.open_tickets} open tickets
            </p>
          </div>
        </div>
      </div>
    </div>;


  const renderTabContent = () => {
    switch (activeTab) {
      case "ledger":
        return (
          <div className="card">
            <div className="card-title">
              <h4>Payment Ledger</h4>
            </div>
            <div className="card-body">
              <DataTable
                columns={ledgerColumns.filter(c => !c.hide)}
                data={ledger?.data || []}
                pagination={ledger}
                emptyMessage="No payments recorded yet." />

            </div>
          </div>);

      case "pending_payments":
        return (
          <div className="space-y-4">
            <div className="row">
              <div className="col-md-6">
                <div className="card bg-light border">
                  <div className="card-body py-3">
                    <h6 className="text-muted uppercase text-xs font-bold mb-2">Pending Cheques</h6>
                    <div className="flex justify-between items-end">
                      <h3 className="mb-0 text-primary">{formatPeso(summary.pending_cheques_total || 0)}</h3>
                      <span className="badge badge-primary">{summary.pending_cheques_count || 0} items</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card bg-light border">
                  <div className="card-body py-3">
                    <h6 className="text-muted uppercase text-xs font-bold mb-2">Government AR (Delayed)</h6>
                    <div className="flex justify-between items-end">
                      <h3 className="mb-0 text-info">{formatPeso(summary.pending_government_total || 0)}</h3>
                      <span className="badge badge-info">{summary.pending_government_count || 0} items</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title p-3 border-bottom flex justify-between items-center">
                <h4 className="mb-0">All Pending Items</h4>
                <div className="text-sm font-bold border-l pl-3">
                  TOTAL COLLECTABLE: <span className="text-primary">{formatPeso(summary.collectable_total || 0)}</span>
                </div>
              </div>
              <div className="card-body">
                <DataTable
                  columns={ledgerColumns.filter(c => !c.hide)}
                  data={pendingPayments}
                  emptyMessage="No pending payments found." />
              </div>
            </div>
          </div>);

      case "receivables":
        return (
          <div className="card">
            <div className="card-title">
              <h4>Receivables</h4>
            </div>
            <div className="card-body">
              <DataTable
                columns={receivablesColumns}
                data={filteredReceivables}
                pagination={receivables}
                emptyMessage="No outstanding balances. Great job!" />

            </div>
          </div>);

      case "expenses":
        return (
          <div className="card">
            <div className="card-title">
              <div className="flex items-center gap-3">
                <h4 className="m-b-0">Expenses</h4>
                <button
                  className="btn btn-outline-primary btn-sm btn-rounded-md ml-auto"
                  onClick={() => setExpenseModalOpen(true)}>

                  <i className="ti-plus text-xs m-r-5"></i> Add Expense
                </button>
              </div>
            </div>
            <div className="card-body">
              <DataTable
                columns={expenseColumns}
                data={expenses?.data || []}
                pagination={expenses}
                emptyMessage="No expenses recorded." />

            </div>
          </div>);

      default:
        return null;
    }
  };


  const handleTicketChange = (ticketId) => {
    const selected = ticketOptions.find((option) => option.value === ticketId);
    setPaymentForm((prev) => ({
      ...prev,
      ticket_id: ticketId,
      customer_id: selected?.customer_id || ""
    }));
  };

  const handleCustomerChange = (customerId) => {
    setPaymentForm((prev) => ({
      ...prev,
      customer_id: customerId,
      ticket_id: customerId ? prev.ticket_id : ""
    }));
  };

  const renderBillingModal = () => (
    <Modal
      title="Prepare Billing Statement"
      isOpen={billingModalOpen}
      onClose={() => setBillingModalOpen(false)}
      size="lg"
    >
      <div className="row">
        <div className="col-md-12">
          <div className="alert alert-info py-2">
            <i className="ti-info-alt mr-2"></i>
            Customizing these fields will only affect the printed billing statement.
          </div>
        </div>
        <div className="col-md-12 mb-3">
          <label className="form-label">Customer Name</label>
          <input
            type="text"
            className="form-control"
            value={billingForm.name}
            onChange={(e) => setBillingForm({ ...billingForm, name: e.target.value })}
          />
        </div>
        <div className="col-md-12 mb-3">
          <label className="form-label">Company Name (Optional)</label>
          <input
            type="text"
            className="form-control"
            placeholder=""
            value={billingForm.company_name}
            onChange={(e) => setBillingForm({ ...billingForm, company_name: e.target.value })}
          />
        </div>
        <div className="col-md-12 mb-3">
          <label className="form-label">Address</label>
          <textarea
            className="form-control"
            rows="3"
            value={billingForm.address}
            onChange={(e) => setBillingForm({ ...billingForm, address: e.target.value })}
          ></textarea>
        </div>

        <div className="col-md-12 mt-3 p-3 bg-light rounded">
          <h6 className="font-bold border-bottom pb-2 mb-2 uppercase text-xs">Summary of Selection</h6>
          <div className="flex justify-between items-center mb-1">
            <span className="text-muted">Selected Items:</span>
            <span className="font-bold">{selectedItems.length}</span>
          </div>
          <div className="flex justify-between items-center text-primary font-bold">
            <span>Total Statement Amount:</span>
            <span>
              {formatPeso(
                (activeTab === 'receivables' ? filteredReceivables : pendingPayments)
                  .filter(item => selectedItems.includes(item.id) || selectedItems.includes(item.ticket_id))
                  .reduce((sum, item) => sum + parseFloat(item.balance || item.amount || 0), 0)
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 border-t pt-4">
        <button className="btn btn-secondary" onClick={() => setBillingModalOpen(false)}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={handlePrintBillingStatement}>
          <i className="ti-printer mr-2"></i>
          Print Billing Statement
        </button>
      </div>
    </Modal>
  );

  const renderPaymentModal = () => {
    const isCheck = paymentForm.payment_method === 'check';
    const isGovernment = paymentForm.payment_method === 'government_ar';
    const isPending = isCheck || isGovernment;

    return (
      <Modal
        title="Record Payment"
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          resetPaymentForm();
        }}
        size="6xl"
        staticBackdrop={true}>

        {/* Header - Customer and Ticket Info */}
        <div className="mb-4 pb-3 border-bottom">
          <label className="form-label text-gray-500 uppercase text-xs font-bold">Process Payment For</label>
          <div className="text-xl font-bold text-primary mb-2">
            {paymentForm.payer_name || "Selected Customer"}
          </div>
          {paymentForm.ticket_id &&
            <div className="text-sm text-gray-600 mb-2">
              <i className="ti-ticket mr-1"></i>
              Ticket: {openTickets.find((t) => t.id === paymentForm.ticket_id)?.ticket_number || `#${paymentForm.ticket_id}`}
            </div>
          }
        </div>

        <div className="row">
          {/* LEFT COLUMN - Payment Summary  */}
          <div className="col-md-5">
            {selectedReceivable?.has_rejected_payment &&
              <div className="alert alert-danger mb-4">
                <h6 className="font-bold">
                  <i className="ti-alert mr-2"></i>
                  PREVIOUS PAYMENT REJECTED
                </h6>
                <div className="text-xs uppercase mt-1">
                  <strong>Date:</strong> {new Date(selectedReceivable.last_rejected_payment.payment_date).toLocaleDateString()} <br />
                  <strong>Method:</strong> {selectedReceivable.last_rejected_payment.payment_method} <br />
                  {selectedReceivable.last_rejected_payment.metadata &&
                    <>
                      <strong>Bank/Cheque #:</strong> {selectedReceivable.last_rejected_payment.metadata.bank_name} | {selectedReceivable.last_rejected_payment.metadata.cheque_number} <br />
                    </>
                  }
                  <strong>Reason:</strong> {selectedReceivable.last_rejected_payment.notes || "No reason provided"}
                </div>
              </div>
            }
            {paymentForm.ticket_id && (() => {
              const selectedTicket = openTickets.find((t) => t.id === paymentForm.ticket_id);
              if (!selectedTicket) return null;

              const isCheckSummary = paymentForm.payment_method === 'check';
              const isGovSummary = paymentForm.payment_method === 'government_ar';
              const isPendingSummary = isCheckSummary || isGovSummary;


              const subtotal = parseFloat(selectedTicket.subtotal || selectedTicket.total_amount || 0);
              const discountPercent = parseFloat(paymentForm.discount || 0);
              const discountAmount = subtotal * (discountPercent / 100);
              const ticketTotal = subtotal - discountAmount;

              const previousPayments = parseFloat(selectedTicket.amount_paid || 0);

              const currentPayment = parseFloat(String(paymentForm.amount || 0).replace(/,/g, ''));
              const balanceBeforePayment = Math.max(ticketTotal - previousPayments, 0);
              const balanceAfterPayment = Math.max(balanceBeforePayment - currentPayment, 0);
              const change = currentPayment > balanceBeforePayment ? currentPayment - balanceBeforePayment : 0;

              return (
                <div className="card border-2 border-primary shadow-sm" style={{ position: 'sticky', top: '0' }}>
                  <div className="card-body bg-light p-0">
                    <div className="p-3 bg-primary text-white d-flex justify-content-between align-items-center">
                      <h5 className="card-title text-white mb-0">
                        <i className="ti-receipt mr-2"></i>
                        Payment Summary
                      </h5>
                      {/* <span className="badge badge-light text-primary">POS MODE</span> */}
                    </div>

                    <div className="p-3 space-y-2">
                      {/* Ticket Description */}
                      {selectedTicket.description &&
                        <div className="pb-2 mb-2 border-bottom">
                          <small className="text-muted uppercase text-xs font-bold">Item/Description:</small>
                          <div className="font-weight-bold text-dark">{selectedTicket.description}</div>
                        </div>
                      }

                      {/* Subtotal */}
                      <div className="d-flex justify-content-between align-items-center py-1">
                        <span className="text-muted">Subtotal:</span>
                        <span className="font-weight-bold">
                          {formatPeso(subtotal)}
                        </span>
                      </div>

                      {/* Discount */}
                      {discountPercent > 0 &&
                        <div className="d-flex justify-content-between align-items-center py-1 text-success">
                          <span>
                            <i className="ti-tag mr-1"></i>
                            Discount ({discountPercent}%):
                          </span>
                          <span className="font-weight-bold">
                            -{formatPeso(discountAmount)}
                          </span>
                        </div>
                      }

                      {/* Ticket Total (After Discount) */}
                      <div className="d-flex justify-content-between align-items-center py-2 border-top mt-2">
                        <span className="font-bold">Net Amount:</span>
                        <span className="font-bold">
                          {formatPeso(ticketTotal)}
                        </span>
                      </div>

                      {/* Previous Payments */}
                      {previousPayments > 0 &&
                        <div className="d-flex justify-content-between align-items-center py-1">
                          <span className="text-muted">Less: Paid:</span>
                          <span className="text-info">
                            -{formatPeso(previousPayments)}
                          </span>
                        </div>
                      }

                      {/* Balance Before Payment */}
                      <div className="d-flex justify-content-between align-items-center py-3 border-top border-bottom my-2 bg-white px-3 rounded-lg shadow-sm">
                        <span className="font-weight-bold text-uppercase text-xs tracking-wider">Balance Due:</span>
                        <span className="font-weight-bold text-danger" style={{ fontSize: '1.4rem' }}>
                          {formatPeso(balanceBeforePayment)}
                        </span>
                      </div>

                      {/* Current Payment */}
                      {currentPayment > 0 &&
                        <>
                          <div className="d-flex justify-content-between align-items-center py-2 bg-primary px-3 rounded text-white shadow-sm">
                            <span className="font-weight-bold">
                              <i className="ti-wallet mr-1"></i>
                              Paying Now:
                            </span>
                            <span className="font-weight-bold" style={{ fontSize: '1.2rem' }}>
                              {formatPeso(currentPayment)}
                            </span>
                          </div>

                          {/* Balance After Payment */}
                          <div className="d-flex justify-content-between align-items-center py-2 mt-2 px-3">
                            <span className="text-muted small text-uppercase font-bold">
                              Remaining:
                            </span>
                            <div className="text-right">
                              <span className={`font-weight-bold ${balanceAfterPayment === 0 ? 'text-success' : 'text-warning'}`}>
                                {formatPeso(balanceAfterPayment)}
                              </span>
                              {isPendingSummary &&
                                <div className="text-danger font-bold text-[10px] uppercase">
                                  {isGovSummary ? "(Delayed Payment/AR)" : "(Pending Clearance)"}
                                </div>
                              }
                            </div>
                          </div>

                          {/* Change */}
                          {change > 0 &&
                            <div className="mt-3 p-3 bg-success text-white rounded-lg shadow-sm">
                              <div className="d-flex justify-content-between align-items-center">
                                <span className="font-weight-bold text-uppercase text-xs">
                                  Change:
                                </span>
                                <span className="font-weight-bold" style={{ fontSize: '1.5rem' }}>
                                  {formatPeso(change)}
                                </span>
                              </div>
                            </div>
                          }

                          {balanceAfterPayment === 0 && change === 0 &&
                            <div className="mt-3 p-2 bg-success text-white rounded text-center font-bold text-uppercase text-sm shadow-sm">
                              <i className="ti-check-box mr-2"></i>
                              {isPendingSummary ? (isGovSummary ? "Charged to Account" : "Settled (Pending)") : "Paid In Full"}
                            </div>
                          }
                        </>
                      }
                    </div>
                  </div>
                </div>);

            })()}
          </div>
          {/* RIGHT COLUMN - Form Fields  */}
          <div className="col-md-7">
            <div className="row">
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Payment Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={paymentForm.payment_date}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        payment_date: e.target.value
                      })
                    } />

                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select
                    className="form-control"
                    value={paymentForm.payment_method}
                    onChange={(e) => handlePaymentMethodChange(e.target.value)}>
                    {paymentMethods.map((method) =>
                      <option key={method} value={method}>
                        {method === 'government_ar' ? "Government (Delayed Payment)" : method.replace("_", " ")}
                      </option>
                    )}
                  </select>
                </div>
              </div>

              {paymentForm.payment_method === 'check' &&
                <>
                  <div className="col-md-6">
                    <div className="form-group">
                      <label className="form-label font-bold text-primary">Bank Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. BDO, BPI, MBTC"
                        value={paymentForm.bank_name}
                        onChange={(e) => setPaymentForm({ ...paymentForm, bank_name: e.target.value })} />

                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="form-group">
                      <label className="form-label font-bold text-primary">Cheque #</label>
                      <input
                        type="text"
                        className="form-control"
                        value={paymentForm.cheque_number}
                        onChange={(e) => setPaymentForm({ ...paymentForm, cheque_number: e.target.value })} />

                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="form-group">
                      <label className="form-label font-bold text-primary">Cheque Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={paymentForm.cheque_date}
                        onChange={(e) => setPaymentForm({ ...paymentForm, cheque_date: e.target.value })} />

                    </div>
                  </div>
                </>
              }
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label font-bold text-success">Discount (%)</label>
                  <div className="input-group">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0"
                      min="0"
                      max="100"
                      step="0.01"
                      value={paymentForm.discount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, discount: e.target.value })}
                      disabled={!hasPermission('tickets', 'price_edit')} />

                    <div className="input-group-append">
                      <span className="input-group-text bg-success text-white">%</span>
                    </div>
                  </div>
                  {!hasPermission('tickets', 'price_edit') &&
                    <small className="text-muted">No permission to edit discount.</small>
                  }
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label font-bold text-primary">
                    {isCheck ? "Cheque Amount (₱)" : isGovernment ? "Charge Amount (₱)" : "Amount Received (₱)"}
                  </label>
                  <div className="input-group">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-primary text-white">₱</span>
                    </div>
                    <input
                      type="text"
                      readOnly={isGovernment}
                      className={`form-control form-control-lg font-bold ${isGovernment ? "bg-light" : ""} ${paymentErrors.amount ? "border-danger" : ""}`}
                      placeholder="0.00"
                      value={paymentForm.amount}
                      onChange={(e) => {
                        handleCurrencyInputChange(setPaymentForm, paymentForm, 'amount', e.target.value);
                        if (paymentErrors.amount) {
                          setPaymentErrors({ ...paymentErrors, amount: "" });
                        }
                      }} />

                  </div>
                  {paymentErrors.amount &&
                    <span className="text-danger small">{paymentErrors.amount}</span>
                  }
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Allocation</label>
                  <select
                    className="form-control"
                    value={paymentForm.allocation}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        allocation: e.target.value
                      })
                    }>

                    <option value="downpayment">Downpayment</option>
                    <option value="balance">Balance</option>
                    <option value="full">Full Payment</option>
                    <option value="government_charge">Government Charge (On Account)</option>
                  </select>
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Official Receipt #</label>
                  <input
                    type="text"
                    className="form-control"
                    value={paymentForm.official_receipt_number}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        official_receipt_number: e.target.value
                      })
                    } />

                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Reference # / GCash Trace</label>
                  <input
                    type="text"
                    className="form-control"
                    value={paymentForm.payment_reference}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        payment_reference: e.target.value
                      })
                    } />

                </div>
              </div>
              <div className="col-md-12">
                <div className="form-group">
                  <label className="form-label">Invoice # (optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={paymentForm.invoice_number}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        invoice_number: e.target.value
                      })
                    } />

                </div>
              </div>
              <div className="col-md-12">
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Add context – downpayment collected, GCash details, etc."
                    value={paymentForm.notes}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        notes: e.target.value
                      })
                    }>
                  </textarea>
                </div>
              </div>
              <div className="col-md-12">
                <div className="form-group">
                  <label className="form-label">Attachments (GCash / Bank proof)</label>
                  <input
                    type="file"
                    className="form-control"
                    multiple
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        attachments: Array.from(e.target.files)
                      })
                    } />

                </div>
              </div>
            </div>
          </div>



        </div>
        {paymentErrors.submit &&
          <div className="alert alert-danger mt-3">
            <i className="ti-alert mr-2"></i>
            {paymentErrors.submit}
          </div>
        }
        <div className="flex justify-end gap-3 mt-6 border-t pt-4">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setPaymentModalOpen(false);
              resetPaymentForm();
            }}
            disabled={isSubmitting}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handlePaymentSubmit}
            disabled={isSubmitting}>
            {isSubmitting ?
              <>
                <i className="fa fa-spinner fa-spin m-r-5"></i> Saving...
              </> :
              <>
                <i className="ti-check m-r-5"></i> Save Payment
              </>
            }
          </button>
        </div>
      </Modal>
    );
  };


  const renderExpenseModal = () =>
    <Modal
      title="Add Expense"
      isOpen={expenseModalOpen}
      onClose={() => {
        setExpenseModalOpen(false);
        resetExpenseForm();
      }}
      size="lg">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Category</label>
          <select
            className="form-control"
            value={expenseForm.category}
            onChange={(e) =>
              setExpenseForm({ ...expenseForm, category: e.target.value })
            }>

            {expenseCategories.map((category) =>
              <option key={category} value={category}>
                {category}
              </option>
            )}
          </select>
        </div>
        <div>
          <label className="form-label">Expense Date</label>
          <input
            type="date"
            className="form-control"
            value={expenseForm.expense_date}
            onChange={(e) =>
              setExpenseForm({
                ...expenseForm,
                expense_date: e.target.value
              })
            } />

        </div>
        <div>
          <label className="form-label">Payment Method</label>
          <select
            className="form-control"
            value={expenseForm.payment_method}
            onChange={(e) =>
              setExpenseForm({
                ...expenseForm,
                payment_method: e.target.value
              })
            }>

            {paymentMethods.map((method) =>
              <option key={method} value={method}>
                {method.replace("_", " ")}
              </option>
            )}
          </select>
        </div>
        <div>
          <label className="form-label">Reference #</label>
          <input
            type="text"
            className="form-control"
            value={expenseForm.reference_number}
            onChange={(e) =>
              setExpenseForm({
                ...expenseForm,
                reference_number: e.target.value
              })
            } />

        </div>
        <div className="md:col-span-2">
          <label className="form-label">Description</label>
          <input
            type="text"
            className={`form-control ${expenseErrors.description ? "border-danger" : ""}`}
            value={expenseForm.description}
            onChange={(e) => {
              setExpenseForm({
                ...expenseForm,
                description: e.target.value
              });
              if (expenseErrors.description) {
                setExpenseErrors({ ...expenseErrors, description: "" });
              }
            }}
            required />

          {expenseErrors.description &&
            <span className="text-danger small">{expenseErrors.description}</span>
          }
        </div>
        <div>
          <label className="form-label">Vendor</label>
          <input
            type="text"
            className="form-control"
            value={expenseForm.vendor}
            onChange={(e) =>
              setExpenseForm({
                ...expenseForm,
                vendor: e.target.value
              })
            } />

        </div>
        <div>
          <label className="form-label font-bold text-danger">Amount (₱)</label>
          <div className="input-group">
            <div className="input-group-prepend">
              <span className="input-group-text bg-danger text-white">₱</span>
            </div>
            <input
              type="text"
              className={`form-control ${expenseErrors.amount ? "border-danger" : ""}`}
              placeholder="0.00"
              value={expenseForm.amount}
              onChange={(e) => {
                handleCurrencyInputChange(setExpenseForm, expenseForm, 'amount', e.target.value);
                if (expenseErrors.amount) {
                  setExpenseErrors({ ...expenseErrors, amount: "" });
                }
              }}
              required />

          </div>
          {expenseErrors.amount &&
            <span className="text-danger small">{expenseErrors.amount}</span>
          }
        </div>
        <div className="md:col-span-2">
          <label className="form-label">Related Ticket (optional)</label>
          <select
            className="form-control"
            value={expenseForm.ticket_id}
            onChange={(e) =>
              setExpenseForm({
                ...expenseForm,
                ticket_id: e.target.value
              })
            }>

            <option value="">None</option>
            {ticketOptions.map((ticket) =>
              <option key={ticket.value} value={ticket.value}>
                {ticket.label}
              </option>
            )}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="form-label">Notes</label>
          <textarea
            className="form-control"
            rows="3"
            value={expenseForm.notes}
            onChange={(e) =>
              setExpenseForm({
                ...expenseForm,
                notes: e.target.value
              })
            }>
          </textarea>
        </div>
      </div>
      {expenseErrors.submit &&
        <div className="alert alert-danger mt-3">
          <i className="ti-alert mr-2"></i>
          {expenseErrors.submit}
        </div>
      }
      <div className="flex justify-end gap-3 mt-6 border-t pt-4">
        <button
          className="btn btn-secondary"
          onClick={() => {
            setExpenseModalOpen(false);
            resetExpenseForm();
          }}
          disabled={isExpenseSubmitting}>

          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleExpenseSubmit}
          disabled={isExpenseSubmitting}>

          {isExpenseSubmitting ?
            <>
              <i className="fa fa-spinner fa-spin m-r-5"></i> Saving...
            </> :

            <>
              <i className="ti-check m-r-5"></i> Save Expense
            </>
          }
        </button>
      </div>
    </Modal>;


  return (
    <>
      <PreviewModal
        isOpen={show}
        onClose={() => setShow(false)}
        fileUrl={filepath}
        title="Document Preview" />


      <AdminLayout user={user} notifications={notifications} messages={messages}>
        <Head title="Payments & Finance" />
        <section id="main-content">
          <div className="row">
            <div className="col-lg-12 p-3">
              <h2>Payments & Finance</h2>
              <p className="text-muted">
                Track every peso coming in and out – payments, receivables,
                expenses, and cash flow snapshots.
              </p>
              {flash?.success &&
                <FlashMessage type="success" message={flash.success} />
              }
              {flash?.error &&
                <FlashMessage type="error" message={flash.error} />
              }
            </div>
          </div>

          {auth.user.role === 'admin' && renderSummaryCards()}

          <div className="card">
            <div className="card-body">
              <div className="tabs flex justify-between items-center">
                <div className="tab-control">
                  {tabs.map((tab) =>
                    <button
                      key={tab.key}
                      className={`btn btn-sm m-r-3 ${activeTab === tab.key ? "btn-primary" : "btn-light"}`
                      }
                      onClick={() => handleTabChange(tab.key)}>

                      {tab.label}
                    </button>
                  )}
                </div>
                {renderTableControls()}
              </div>

            </div>

          </div>

          <div className="m-t-10">{renderTabContent()}</div>

        </section>

        {renderPaymentModal()}
        {renderBillingModal()}
        {renderExpenseModal()}

        <Modal
          isOpen={confirmConfig.isOpen}
          onClose={() => !confirmConfig.loading && setConfirmConfig({ ...confirmConfig, isOpen: false })}
          title={confirmConfig.title}
          size="md"
          staticBackdrop={true}>

          <Confirmation
            {...confirmConfig}
            onCancel={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
            onSubmit={confirmConfig.onConfirm} />

        </Modal>

        {show &&
          <PreviewModal
            show={show}
            setShow={setShow}
            file={{ file_path: filepath }} />

        }

        {/* Print Styles */}
        <style>{`
                    @media print {
                        @page {
                            size: portrait;
                            margin: 0;
                        }
                        body.printing-receipt, body.printing-billing {
                            visibility: hidden;
                            margin: 0;
                            padding: 0;
                        }
                        body.printing-receipt .official-receipt-print-wrapper,
                        body.printing-billing .billing-statement-print-wrapper {
                            visibility: visible;
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 100% !important;
                            height: auto !important;
                            z-index: 9999;
                            background: white;
                            box-sizing: border-box;
                            padding: 0;
                            margin: 0;
                            display: block !important;
                        }

                        body.printing-receipt .official-receipt-container,
                        body.printing-billing .billing-statement-container {
                            font-family: inherit !important;
                            height: auto !important;
                            min-height: auto !important;
                            box-sizing: border-box !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                            color-adjust: exact;
                        }
                        
                        body.printing-receipt .official-receipt-print-wrapper *,
                        body.printing-billing .billing-statement-print-wrapper * {
                            visibility: visible;
                        }
                        /* Hide everything else explicitly */
                        body.printing-receipt #main-content,
                        body.printing-receipt .modal,
                        body.printing-receipt nav,
                        body.printing-receipt header,
                        body.printing-receipt aside,
                        body.printing-billing #main-content,
                        body.printing-billing .modal,
                        body.printing-billing nav,
                        body.printing-billing header,
                        body.printing-billing aside {
                            display: none !important;
                        }
                    }

                    .spin-animation {
                        animation: spin 1s linear infinite;
                    }

                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>

        {/* Hidden Printable Receipt */}
        <div className="official-receipt-print-wrapper" style={{ display: receiptToPrint ? 'block' : 'none' }}>
          <div className="hidden print:block">
            <OfficialReceipt payment={receiptToPrint} />
          </div>
        </div>

        {/* Hidden Printable Billing Statement */}
        <div className="billing-statement-print-wrapper" style={{ display: billingToPrint ? 'block' : 'none' }}>
          <div className="hidden print:block">
            <BillingStatement data={billingToPrint} />
          </div>
        </div>
      </AdminLayout>
    </>);

}