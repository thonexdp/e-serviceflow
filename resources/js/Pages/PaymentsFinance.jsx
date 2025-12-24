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
    // flash = {},
    user = {},
    notifications = [],
    messages = [],
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
        cheque_date: "",
    });
    const { api, buildUrl } = useRoleApi();
    const { flash, auth } = usePage().props;


    const [show, setShow] = useState(false);
    const [filepath, setFilepath] = useState("");
    const [receiptToPrint, setReceiptToPrint] = useState(null);
    const [selectedReceivable, setSelectedReceivable] = useState(null);

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

    const [expenseForm, setExpenseForm] = useState({
        category: expenseCategories[0] || "supplies",
        vendor: "",
        description: "",
        amount: "",
        expense_date: new Date().toISOString().slice(0, 10),
        payment_method: paymentMethods[0] || "cash",
        reference_number: "",
        ticket_id: "",
        notes: "",
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
                replace: true,
            }
        );
    };

    const handleTabChange = (key) => {
        setActiveTab(key);
        // Update URL without reloading to keep it in sync for refreshes/searches
        const url = new URL(window.location.href);
        url.searchParams.set('tab', key);
        window.history.replaceState({}, '', url);
    };

    // Auto-update when filters prop changes (if search is cleared from URL)
    React.useEffect(() => {
        setLocalSearch(filters.search || "");
    }, [filters.search]);

    const handleRefresh = () => {
        setLocalSearch("");
        setIsRefreshing(true);

        router.visit(buildUrl("finance"), {
            preserveState: false,
            preserveScroll: true,
            onFinish: () => setIsRefreshing(false),
        });

    };

    const filteredReceivables = useMemo(() => {
        if (receivables && receivables.data) {
            return receivables.data;
        }
        return Array.isArray(receivables) ? receivables : [];
    }, [receivables]);

    const renderTableControls = () => (
        <div className="flex items-center gap-2">
            {activeTab === "ledger" && (
                <select
                    className="form-control form-control-sm"
                    value={filters.status || ""}
                    onChange={(e) => {
                        router.get(buildUrl("finance"), { ...filters, status: e.target.value }, { preserveState: true });
                    }}
                    style={{ width: "130px", borderRadius: "5px" }}
                >
                    <option value="">All Statuses</option>
                    <option value="posted">Posted</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                </select>
            )}
            <div className="relative">
                <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Search..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    style={{ width: "200px", borderRadius: "5px", paddingRight: "30px" }}
                />
                <i
                    className="ti-search absolute text-muted cursor-pointer"
                    onClick={handleSearch}
                    style={{ right: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "12px" }}
                ></i>
            </div>
            <button
                className="btn btn-sm btn-light btn-rounded"
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Refresh Table"
                style={{ width: "32px", height: "32px", padding: "0", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
                <i className={`ti-reload ${isRefreshing ? "spin-animation" : ""}`}></i>
            </button>
        </div>
    );

    const tabs = [
        { key: "receivables", label: "Receivables" },
        { key: "pending_payments", label: `Pending Payments (${summary?.pending_cheques_count || 0})` },
        { key: "ledger", label: "Payment Ledger" },
        { key: "expenses", label: "Expenses" },
        // { key: "cashFlow", label: "Cash Flow" },
    ];

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
            cheque_date: "",
        }));
        setPaymentErrors({});
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
            notes: "",
        });
        setExpenseErrors({});
    };

    const ticketOptions = useMemo(
        () =>
            openTickets.map((ticket) => ({
                value: ticket.id,
                label: `${ticket.ticket_number} - ${ticket.customer
                    ? `${ticket.customer.firstname} ${ticket.customer.lastname}`
                    : "Walk-in"
                    }`,
                customer_id: ticket.customer_id,
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
                label: `${customer.firstname} ${customer.lastname}`,
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

        const isCheck = paymentForm.payment_method === 'check';
        const selectedTicket = openTickets.find(t => t.id === paymentForm.ticket_id);
        const payerName = paymentForm.payer_name || (selectedTicket?.customer ? `${selectedTicket.customer.firstname} ${selectedTicket.customer.lastname}` : "Customer");

        setConfirmConfig({
            isOpen: true,
            title: "Confirm Payment Recording",
            description: `Record ${paymentForm.payment_method.toUpperCase()} payment?`,
            subtitle: isCheck
                ? `You are about to record a PENDING cheque payment of ${formatPeso(paymentForm.amount)} for ${payerName}. This will not update the ticket balance until cleared.`
                : `You are about to record a payment of ${formatPeso(paymentForm.amount)} for ${payerName}.`,
            color: "success",
            label: "Save Payment",
            onConfirm: () => processPaymentSubmit(),
            loading: false
        });
    };

    const processPaymentSubmit = async () => {
        const formData = new FormData();

        // Handle metadata for cheques
        let finalMetadata = {};
        if (paymentForm.payment_method === 'check') {
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
            } else if (key === "amount" || key === "discount") {
                // Ensure amount is clean (no commas)
                formData.append(key, String(value).replace(/,/g, ''));
            } else if (['bank_name', 'cheque_number', 'cheque_date'].includes(key)) {
                // Already handled via metadata
            } else if (value !== null && value !== "") {
                formData.append(key, value);
            }
        });

        // Append metadata properly for Laravel
        Object.entries(finalMetadata).forEach(([k, v]) => {
            formData.append(`metadata[${k}]`, v);
        });

        setIsSubmitting(true);
        setPaymentErrors({});
        try {
            const response = await api.post("/payments", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const newPayment = response.data.payment || response.data;

            // Enrich payment object for printing if needed (e.g. if response is minimal)
            // We ensure we have the customer details if available
            let printablePayment = { ...newPayment };
            if (paymentForm.customer_id) {
                const customer = customers.find(c => c.id == paymentForm.customer_id);
                if (customer) {
                    printablePayment.customer = customer;
                    printablePayment.payer_name = printablePayment.payer_name || customer.full_name || `${customer.firstname} ${customer.lastname}`;
                }
            }
            // Add ticket info if available
            if (paymentForm.ticket_id) {
                const ticket = openTickets.find(t => t.id == paymentForm.ticket_id);
                if (ticket) printablePayment.ticket = ticket;
            }

            setPaymentModalOpen(false);
            setIsSubmitting(false);
            resetPaymentForm();
            setConfirmConfig({ isOpen: false });
            router.reload({ preserveScroll: true });

        } catch (error) {
            console.error("Payment submission failed", error);
            setConfirmConfig(prev => ({ ...prev, loading: false }));
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
            // Clean amount (remove commas) before sending
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
        // Remove all non-numeric characters except the decimal point
        const numericValue = value.replace(/[^0-9.]/g, '');

        // Split by decimal point to limit decimals to 2 places
        const parts = numericValue.split('.');
        let integerPart = parts[0];
        let decimalPart = parts[1];

        // Format integer part with commas
        const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

        let finalValue = formattedInteger;
        if (decimalPart !== undefined) {
            finalValue += '.' + decimalPart.slice(0, 2);
        }

        setter({
            ...form,
            [field]: finalValue,
        });
    };

    const handlePrintReceipt = (payment, onAfterPrint = null) => {
        setReceiptToPrint(payment);
        // Add class to body to trigger print styles
        document.body.classList.add("printing-receipt");

        // Wait for state to update and DOM to be ready
        setTimeout(() => {
            window.print();

            // Cleanup after print dialog closes (in most browsers that block)
            // For non-blocking browsers, this might run immediately, which is why we delay slightly more 
            // or rely on user action if strictly needed. But standard pattern:
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
            discount: row.discount || "",
        }));
        setPaymentModalOpen(true);
    };

    const handlePaymentAction = (paymentId, action) => {
        setConfirmConfig({
            isOpen: true,
            title: "Confirm Action",
            description: `Are you sure you want to ${action} this payment?`,
            subtitle: action === 'reject'
                ? "Please provide a reason for rejecting this payment. This will be visible to the frontdesk."
                : "This action will update the payment status and may affect ticket balances.",
            color: action === 'reject' ? 'danger' : 'success',
            label: action.toUpperCase(),
            showNotesField: action === 'reject',
            notesLabel: "Rejection Reason",
            notesPlaceholder: "e.g., NSF (Non-Sufficient Funds), Signature mismatch, Account closed...",
            notesRequired: action === 'reject',
            notesRows: 6,
            onConfirm: async (notes) => {
                setConfirmConfig(prev => ({ ...prev, loading: true }));
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

    const ledgerColumns = [
        {
            label: "Date",
            render: (row) =>
                new Date(row.payment_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                }),
        },
        {
            label: "Ticket / Invoice",
            render: (row) => (
                <div>
                    <strong>{row.ticket?.ticket_number || row.invoice_number || "—"}</strong>
                    <div className="text-xs text-gray-500">
                        {row.ticket?.description || row.notes || ""}
                    </div>
                </div>
            ),
        },
        {
            label: "Customer",
            render: (row) => row.customer?.full_name || row.payer_name || "Walk-in",
        },
        {
            label: "Method",
            render: (row) => (
                <div>
                    <div>{row.payment_method ? row.payment_method.replace("_", " ") : "—"}</div>
                    {row.payment_method === 'check' && row.metadata && (
                        <div className="text-xs text-muted">
                            {row.metadata.bank_name} | {row.metadata.cheque_number}
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Amount",
            render: (row) => (
                <div className="flex flex-col">
                    <strong className={row.status === 'pending' ? "text-warning" : "text-green-600"}>
                        {formatPeso(row.amount)}
                    </strong>
                    {row.status === 'pending' && <span className="text-xs text-warning font-bold">PENDING</span>}
                    {row.status === 'rejected' && <span className="text-xs text-danger font-bold">REJECTED</span>}
                </div>
            ),
        },
        {
            label: "OR / Ref",
            render: (row) =>
                row.official_receipt_number || row.payment_reference || "—",
        },
        {
            label: "Proof",
            render: (row) =>
                row.documents?.length ? (
                    <>
                        <span className="badge badge-success">
                            {row.documents.length} file(s)
                        </span>
                        <button
                            onClick={() => handlePreviewFile(row)}
                            className="btn btn-sm btn-outline-primary ml-1"
                            style={{ padding: "2px 8px", fontSize: "11px" }}
                            title="Photo preview"
                        >
                            <i className="ti-eye"></i>
                        </button>
                    </>

                ) : (
                    <span className="badge badge-light text-muted">None</span>
                ),
        },
        {
            label: "Action",
            render: (row) => (
                <div className="flex gap-1">
                    {row.status === 'pending' && (
                        <>
                            <button
                                className="btn btn-success btn-sm btn-outline"
                                onClick={() => handlePaymentAction(row.id, 'clear')}
                                title="Clear Cheque"
                            >
                                <i className="ti-check"></i>
                            </button>
                            <button
                                className="btn btn-danger btn-sm btn-outline"
                                onClick={() => handlePaymentAction(row.id, 'reject')}
                                title="Reject Cheque"
                            >
                                <i className="ti-close"></i>
                            </button>
                        </>
                    )}
                    <button
                        className="btn btn-primary btn-sm btn-outline"
                        onClick={() => handlePrintReceipt(row)}
                        title="Print Official Receipt"
                        disabled={row.status === 'rejected'}
                    >
                        <i className="ti-printer"></i>
                    </button>
                </div>
            ),
        }
    ];

    const receivablesColumns = [
        {
            label: "Ticket #",
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-primary">
                        {row.ticket_number || `#${row.ticket_id}`}
                    </span>
                    {row.has_rejected_payment && (
                        <div className="flex flex-col mt-1">
                            <span className="badge badge-danger text-[10px] p-1 flex items-center w-fit" title="Click process to see details or record new payment">
                                <i className="ti-alert mr-1"></i> BOUNCED/REJECTED
                            </span>
                            {row.last_rejected_payment?.notes && (
                                <span className="text-danger text-xs mt-1 italic">
                                    Reason: {row.last_rejected_payment.notes}
                                </span>
                            )}
                        </div>
                    )}
                    {row.job_type?.discount > 0 && (
                        <span className="badge badge-success text-[10px] p-1 mt-1 flex items-center w-fit">
                            <i className="ti-gift mr-1"></i> PROMO
                        </span>
                    )}
                </div>
            )
        },
        { label: "Customer", render: (row) => row.name },
        {
            label: "Description",
            render: (row) => (
                <span className="text-sm text-gray-600">
                    {row.description ? (row.description.length > 50 ? row.description.substring(0, 50) + '...' : row.description) : '—'}
                </span>
            )
        },
        { label: "Total Amount", render: (row) => formatPeso(row.total_invoiced) },
        { label: "Paid", render: (row) => formatPeso(row.total_paid) },
        {
            label: "Balance",
            render: (row) => (
                <span className="text-danger font-semibold">{formatPeso(row.balance)}</span>
            ),
        },
        {
            label: "Due Date",
            render: (row) =>
                row.due_date
                    ? new Date(row.due_date).toLocaleDateString()
                    : "—",
        },
        {
            label: "Action",
            render: (row) => (
                hasPermission('finance', 'create') && (
                    <button
                        className="btn btn-primary btn-sm btn-rounded-md"
                        onClick={() => handleProcessPayment(row)}
                    >
                        <i className="ti-wallet m-r-5"></i>
                        Process Payment
                    </button>
                )
            ),
        },
    ];

    const expenseColumns = [
        {
            label: "Date",
            render: (row) =>
                new Date(row.expense_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                }),
        },
        { label: "Category", render: (row) => row.category },
        { label: "Description", render: (row) => row.description },
        { label: "Vendor", render: (row) => row.vendor || "—" },
        {
            label: "Amount",
            render: (row) => (
                <span className="text-danger font-semibold">
                    {formatPeso(row.amount)}
                </span>
            ),
        },
        {
            label: "Method",
            render: (row) =>
                row.payment_method ? row.payment_method.replace("_", " ") : "—",
        },
    ];

    const renderSummaryCards = () => (
        <div className="row">
            <div className="col-lg-3 col-md-6">
                <div className="card">
                    <div className="card-body">
                        <h5>Collections (This Month)</h5>
                        <h2 className="m-b-0">{formatPeso(summary.collections_month)}</h2>
                    </div>
                </div>
            </div>
            <div className="col-lg-3 col-md-6">
                <div className="card">
                    <div className="card-body">
                        <h5>Expenses (This Month)</h5>
                        <h2 className="m-b-0 text-danger">
                            {formatPeso(summary.expenses_month)}
                        </h2>
                    </div>
                </div>
            </div>
            <div className="col-lg-3 col-md-6">
                <div className="card">
                    <div className="card-body">
                        <h5>Net Cash Flow</h5>
                        <h2
                            className={`m-b-0 ${summary.net_cash_flow_month >= 0
                                ? "text-success"
                                : "text-danger"
                                }`}
                        >
                            {formatPeso(summary.net_cash_flow_month)}
                        </h2>
                    </div>
                </div>
            </div>
            <div className="col-lg-3 col-md-6">
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
        </div>
    );

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
                                columns={ledgerColumns}
                                data={ledger?.data || []}
                                pagination={ledger}
                                emptyMessage="No payments recorded yet."
                            />
                        </div>
                    </div>
                );
            case "pending_payments":
                return (
                    <div className="card">
                        <div className="card-title">
                            <h4>Pending Payments (Cheques)</h4>
                        </div>
                        <div className="card-body">
                            <DataTable
                                columns={ledgerColumns}
                                data={pendingPayments}
                                emptyMessage="No pending cheque payments."
                            />
                        </div>
                    </div>
                );
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
                                emptyMessage="No outstanding balances. Great job!"
                            />
                        </div>
                    </div>
                );
            case "expenses":
                return (
                    <div className="card">
                        <div className="card-title">
                            <div className="flex items-center gap-3">
                                <h4 className="m-b-0">Expenses</h4>
                                <button
                                    className="btn btn-outline-primary btn-sm btn-rounded-md ml-auto"
                                    onClick={() => setExpenseModalOpen(true)}
                                >
                                    <i className="ti-plus text-xs m-r-5"></i> Add Expense
                                </button>
                            </div>
                        </div>
                        <div className="card-body">
                            <DataTable
                                columns={expenseColumns}
                                data={expenses?.data || []}
                                pagination={expenses}
                                emptyMessage="No expenses recorded."
                            />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };


    const handleTicketChange = (ticketId) => {
        const selected = ticketOptions.find((option) => option.value === ticketId);
        setPaymentForm((prev) => ({
            ...prev,
            ticket_id: ticketId,
            customer_id: selected?.customer_id || "",
        }));
    };

    const handleCustomerChange = (customerId) => {
        setPaymentForm((prev) => ({
            ...prev,
            customer_id: customerId,
            ticket_id: customerId ? prev.ticket_id : "",
        }));
    };

    const renderPaymentModal = () => (
        <Modal
            title="Record Payment"
            isOpen={paymentModalOpen}
            onClose={() => {
                setPaymentModalOpen(false);
                resetPaymentForm();
            }}
            size="6xl"
            staticBackdrop={true}
        >
            {/* Header - Customer and Ticket Info */}
            <div className="mb-4 pb-3 border-bottom">
                <label className="form-label text-gray-500 uppercase text-xs font-bold">Process Payment For</label>
                <div className="text-xl font-bold text-primary mb-2">
                    {paymentForm.payer_name || "Selected Customer"}
                </div>
                {paymentForm.ticket_id && (
                    <div className="text-sm text-gray-600 mb-2">
                        <i className="ti-ticket mr-1"></i>
                        Ticket: {openTickets.find(t => t.id === paymentForm.ticket_id)?.ticket_number || `#${paymentForm.ticket_id}`}
                    </div>
                )}
            </div>

            <div className="row">
                {/* LEFT COLUMN - Payment Summary  */}
                <div className="col-md-5">
                    {selectedReceivable?.has_rejected_payment && (
                        <div className="alert alert-danger mb-4">
                            <h6 className="font-bold">
                                <i className="ti-alert mr-2"></i>
                                PREVIOUS PAYMENT REJECTED
                            </h6>
                            <div className="text-xs uppercase mt-1">
                                <strong>Date:</strong> {new Date(selectedReceivable.last_rejected_payment.payment_date).toLocaleDateString()} <br />
                                <strong>Method:</strong> {selectedReceivable.last_rejected_payment.payment_method} <br />
                                {selectedReceivable.last_rejected_payment.metadata && (
                                    <>
                                        <strong>Bank/Cheque #:</strong> {selectedReceivable.last_rejected_payment.metadata.bank_name} | {selectedReceivable.last_rejected_payment.metadata.cheque_number} <br />
                                    </>
                                )}
                                <strong>Reason:</strong> {selectedReceivable.last_rejected_payment.notes || "No reason provided"}
                            </div>
                        </div>
                    )}
                    {paymentForm.ticket_id && (() => {
                        const selectedTicket = openTickets.find(t => t.id === paymentForm.ticket_id);
                        if (!selectedTicket) return null;

                        const isCheck = paymentForm.payment_method === 'check';

                        // Calculate POS style pricing
                        const subtotal = parseFloat(selectedTicket.subtotal || selectedTicket.total_amount || 0);
                        const discountPercent = parseFloat(paymentForm.discount || 0);
                        const discountAmount = subtotal * (discountPercent / 100);
                        const ticketTotal = subtotal - discountAmount;

                        const previousPayments = parseFloat(selectedTicket.amount_paid || 0);
                        // Strip commas for calculation
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
                                        {selectedTicket.description && (
                                            <div className="pb-2 mb-2 border-bottom">
                                                <small className="text-muted uppercase text-xs font-bold">Item/Description:</small>
                                                <div className="font-weight-bold text-dark">{selectedTicket.description}</div>
                                            </div>
                                        )}

                                        {/* Subtotal */}
                                        <div className="d-flex justify-content-between align-items-center py-1">
                                            <span className="text-muted">Subtotal:</span>
                                            <span className="font-weight-bold">
                                                {formatPeso(subtotal)}
                                            </span>
                                        </div>

                                        {/* Discount */}
                                        {discountPercent > 0 && (
                                            <div className="d-flex justify-content-between align-items-center py-1 text-success">
                                                <span>
                                                    <i className="ti-tag mr-1"></i>
                                                    Discount ({discountPercent}%):
                                                </span>
                                                <span className="font-weight-bold">
                                                    -{formatPeso(discountAmount)}
                                                </span>
                                            </div>
                                        )}

                                        {/* Ticket Total (After Discount) */}
                                        <div className="d-flex justify-content-between align-items-center py-2 border-top mt-2">
                                            <span className="font-bold">Net Amount:</span>
                                            <span className="font-bold">
                                                {formatPeso(ticketTotal)}
                                            </span>
                                        </div>

                                        {/* Previous Payments */}
                                        {previousPayments > 0 && (
                                            <div className="d-flex justify-content-between align-items-center py-1">
                                                <span className="text-muted">Less: Paid:</span>
                                                <span className="text-info">
                                                    -{formatPeso(previousPayments)}
                                                </span>
                                            </div>
                                        )}

                                        {/* Balance Before Payment */}
                                        <div className="d-flex justify-content-between align-items-center py-3 border-top border-bottom my-2 bg-white px-3 rounded-lg shadow-sm">
                                            <span className="font-weight-bold text-uppercase text-xs tracking-wider">Balance Due:</span>
                                            <span className="font-weight-bold text-danger" style={{ fontSize: '1.4rem' }}>
                                                {formatPeso(balanceBeforePayment)}
                                            </span>
                                        </div>

                                        {/* Current Payment */}
                                        {currentPayment > 0 && (
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
                                                        {isCheck && (
                                                            <div className="text-danger font-bold text-[10px] uppercase">
                                                                (Pending Clearance)
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Change */}
                                                {change > 0 && (
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
                                                )}

                                                {balanceAfterPayment === 0 && change === 0 && (
                                                    <div className="mt-3 p-2 bg-success text-white rounded text-center font-bold text-uppercase text-sm shadow-sm">
                                                        <i className="ti-check-box mr-2"></i>
                                                        Paid In Full
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
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
                                            payment_date: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="form-group">
                                <label className="form-label">Payment Method</label>
                                <select
                                    className="form-control"
                                    value={paymentForm.payment_method}
                                    onChange={(e) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            payment_method: e.target.value,
                                        })
                                    }
                                >
                                    {paymentMethods.map((method) => (
                                        <option key={method} value={method}>
                                            {method.replace("_", " ")}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {paymentForm.payment_method === 'check' && (
                            <>
                                <div className="col-md-6">
                                    <div className="form-group">
                                        <label className="form-label font-bold text-primary">Bank Name</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="e.g. BDO, BPI, MBTC"
                                            value={paymentForm.bank_name}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, bank_name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="form-group">
                                        <label className="form-label font-bold text-primary">Cheque #</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={paymentForm.cheque_number}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, cheque_number: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="form-group">
                                        <label className="form-label font-bold text-primary">Cheque Date</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={paymentForm.cheque_date}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, cheque_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
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
                                        disabled={!hasPermission('tickets', 'price_edit')}
                                    />
                                    <div className="input-group-append">
                                        <span className="input-group-text bg-success text-white">%</span>
                                    </div>
                                </div>
                                {!hasPermission('tickets', 'price_edit') && (
                                    <small className="text-muted">No permission to edit discount.</small>
                                )}
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="form-group">
                                <label className="form-label font-bold text-primary">Amount Received (₱)</label>
                                <div className="input-group">
                                    <div className="input-group-prepend">
                                        <span className="input-group-text bg-primary text-white">₱</span>
                                    </div>
                                    <input
                                        type="text"
                                        className={`form-control form-control-lg font-bold ${paymentErrors.amount ? "border-danger" : ""}`}
                                        placeholder="0.00"
                                        value={paymentForm.amount}
                                        onChange={(e) => {
                                            handleCurrencyInputChange(setPaymentForm, paymentForm, 'amount', e.target.value);
                                            if (paymentErrors.amount) {
                                                setPaymentErrors({ ...paymentErrors, amount: "" });
                                            }
                                        }}
                                    />
                                </div>
                                {paymentErrors.amount && (
                                    <span className="text-danger small">{paymentErrors.amount}</span>
                                )}
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
                                            allocation: e.target.value,
                                        })
                                    }
                                >
                                    <option value="downpayment">Downpayment</option>
                                    <option value="balance">Balance</option>
                                    <option value="full">Full Payment</option>
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
                                            official_receipt_number: e.target.value,
                                        })
                                    }
                                />
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
                                            payment_reference: e.target.value,
                                        })
                                    }
                                />
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
                                            invoice_number: e.target.value,
                                        })
                                    }
                                />
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
                                            notes: e.target.value,
                                        })
                                    }
                                ></textarea>
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
                                            attachments: Array.from(e.target.files),
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>



            </div >
            {
                paymentErrors.submit && (
                    <div className="alert alert-danger mt-3">
                        <i className="ti-alert mr-2"></i>
                        {paymentErrors.submit}
                    </div>
                )
            }
            < div className="flex justify-end gap-3 mt-6 border-t pt-4" >
                <button
                    className="btn btn-secondary"
                    onClick={() => {
                        setPaymentModalOpen(false);
                        resetPaymentForm();
                    }}
                    disabled={isSubmitting}
                >
                    Cancel
                </button>
                <button
                    className="btn btn-primary"
                    onClick={handlePaymentSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <i className="fa fa-spinner fa-spin m-r-5"></i> Saving...
                        </>
                    ) : (
                        <>
                            <i className="ti-check m-r-5"></i> Save Payment
                        </>
                    )}
                </button>
            </div >
        </Modal >
    );

    const renderExpenseModal = () => (
        <Modal
            title="Add Expense"
            isOpen={expenseModalOpen}
            onClose={() => {
                setExpenseModalOpen(false);
                resetExpenseForm();
            }}
            size="lg"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="form-label">Category</label>
                    <select
                        className="form-control"
                        value={expenseForm.category}
                        onChange={(e) =>
                            setExpenseForm({ ...expenseForm, category: e.target.value })
                        }
                    >
                        {expenseCategories.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
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
                                expense_date: e.target.value,
                            })
                        }
                    />
                </div>
                <div>
                    <label className="form-label">Payment Method</label>
                    <select
                        className="form-control"
                        value={expenseForm.payment_method}
                        onChange={(e) =>
                            setExpenseForm({
                                ...expenseForm,
                                payment_method: e.target.value,
                            })
                        }
                    >
                        {paymentMethods.map((method) => (
                            <option key={method} value={method}>
                                {method.replace("_", " ")}
                            </option>
                        ))}
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
                                reference_number: e.target.value,
                            })
                        }
                    />
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
                                description: e.target.value,
                            });
                            if (expenseErrors.description) {
                                setExpenseErrors({ ...expenseErrors, description: "" });
                            }
                        }}
                        required
                    />
                    {expenseErrors.description && (
                        <span className="text-danger small">{expenseErrors.description}</span>
                    )}
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
                                vendor: e.target.value,
                            })
                        }
                    />
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
                            required
                        />
                    </div>
                    {expenseErrors.amount && (
                        <span className="text-danger small">{expenseErrors.amount}</span>
                    )}
                </div>
                <div className="md:col-span-2">
                    <label className="form-label">Related Ticket (optional)</label>
                    <select
                        className="form-control"
                        value={expenseForm.ticket_id}
                        onChange={(e) =>
                            setExpenseForm({
                                ...expenseForm,
                                ticket_id: e.target.value,
                            })
                        }
                    >
                        <option value="">None</option>
                        {ticketOptions.map((ticket) => (
                            <option key={ticket.value} value={ticket.value}>
                                {ticket.label}
                            </option>
                        ))}
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
                                notes: e.target.value,
                            })
                        }
                    ></textarea>
                </div>
            </div>
            {expenseErrors.submit && (
                <div className="alert alert-danger mt-3">
                    <i className="ti-alert mr-2"></i>
                    {expenseErrors.submit}
                </div>
            )}
            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
                <button
                    className="btn btn-secondary"
                    onClick={() => {
                        setExpenseModalOpen(false);
                        resetExpenseForm();
                    }}
                    disabled={isExpenseSubmitting}
                >
                    Cancel
                </button>
                <button
                    className="btn btn-primary"
                    onClick={handleExpenseSubmit}
                    disabled={isExpenseSubmitting}
                >
                    {isExpenseSubmitting ? (
                        <>
                            <i className="fa fa-spinner fa-spin m-r-5"></i> Saving...
                        </>
                    ) : (
                        <>
                            <i className="ti-check m-r-5"></i> Save Expense
                        </>
                    )}
                </button>
            </div>
        </Modal>
    );

    return (
        <>
            <PreviewModal
                isOpen={show}
                onClose={() => setShow(false)}
                fileUrl={filepath}
                title="Document Preview"
            />

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
                            {flash?.success && (
                                <FlashMessage type="success" message={flash.success} />
                            )}
                            {flash?.error && (
                                <FlashMessage type="error" message={flash.error} />
                            )}
                        </div>
                    </div>

                    {auth.user.role === 'admin' && renderSummaryCards()}

                    <div className="card">
                        <div className="card-body">
                            <div className="tabs flex justify-between items-center">
                                <div className="tab-control">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.key}
                                            className={`btn btn-sm m-r-3 ${activeTab === tab.key ? "btn-primary" : "btn-light"
                                                }`}
                                            onClick={() => handleTabChange(tab.key)}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                                {renderTableControls()}
                            </div>

                        </div>

                    </div>

                    <div className="m-t-10">{renderTabContent()}</div>

                </section>

                {renderPaymentModal()}
                {renderExpenseModal()}

                <Modal
                    isOpen={confirmConfig.isOpen}
                    onClose={() => !confirmConfig.loading && setConfirmConfig({ ...confirmConfig, isOpen: false })}
                    title={confirmConfig.title}
                    size="md"
                    staticBackdrop={true}
                >
                    <Confirmation
                        {...confirmConfig}
                        onCancel={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
                        onSubmit={confirmConfig.onConfirm}
                    />
                </Modal>

                {show && (
                    <PreviewModal
                        show={show}
                        setShow={setShow}
                        file={{ file_path: filepath }}
                    />
                )}

                {/* Print Styles */}
                <style>{`
                    @media print {
                        body.printing-receipt {
                            visibility: hidden;
                        }
                        body.printing-receipt .official-receipt-print-wrapper {
                            visibility: visible;
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            height: 100%;
                            z-index: 9999;
                            background: white;
                            display: block !important;
                        }
                        body.printing-receipt .official-receipt-print-wrapper * {
                            visibility: visible;
                        }
                        /* Hide everything else explicitly if needed */
                        #main-content, .modal, nav, header, aside {
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
            </AdminLayout>
        </>
    );
}

