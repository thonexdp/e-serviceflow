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
    // flash = {},
    user = {},
    notifications = [],
    messages = [],
}) {
    const [activeTab, setActiveTab] = useState("receivables");
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
        attachments: [],
    });
    const { api, buildUrl } = useRoleApi();
    const { flash, auth } = usePage().props;


    const [show, setShow] = useState(false);
    const [filepath, setFilepath] = useState("");

    const [receiptToPrint, setReceiptToPrint] = useState(null);

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
        setLocalSearch("");
        if (filters.search) {
            router.get(
                buildUrl("finance"),
                {},
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }
            );
        }
    };

    // Auto-update when filters prop changes (if search is cleared from URL)
    React.useEffect(() => {
        setLocalSearch(filters.search || "");
    }, [filters.search]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            preserveScroll: true,
            onFinish: () => setIsRefreshing(false),
        });
    };

    const filteredReceivables = useMemo(() => {
        if (!localSearch) return receivables;
        const query = localSearch.toLowerCase();
        return receivables.filter(
            (r) =>
                r.ticket_number?.toLowerCase().includes(query) ||
                r.name?.toLowerCase().includes(query) ||
                r.description?.toLowerCase().includes(query) ||
                String(r.total_invoiced).includes(query) ||
                String(r.balance).includes(query)
        );
    }, [receivables, localSearch]);

    const renderTableControls = () => (
        <div className="flex items-center gap-2">
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
            attachments: [],
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

        const formData = new FormData();
        Object.entries(paymentForm).forEach(([key, value]) => {
            if (key === "attachments") {
                value.forEach((file) => formData.append("attachments[]", file));
            } else if (key === "amount") {
                // Ensure amount is clean (no commas)
                formData.append(key, String(value).replace(/,/g, ''));
            } else if (value !== null && value !== "") {
                formData.append(key, value);
            }
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
            resetPaymentForm();

            // Prompt to print
            // if (window.confirm("Payment recorded successfully! Do you want to print the Official Receipt now?")) {
            //     handlePrintReceipt(printablePayment, () => {
            //         router.reload({ preserveScroll: true });
            //     });
            // } else {
            router.reload({ preserveScroll: true });
            //  }

        } catch (error) {
            console.error("Payment submission failed", error);
            setPaymentErrors({
                submit: error.response?.data?.message || "Failed to record payment."
            });
        } finally {
            setIsSubmitting(false);
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
        setPaymentForm((prev) => ({
            ...prev,
            ticket_id: row.ticket_id,
            customer_id: row.customer_id,
            payer_name: row.name,
        }));
        setPaymentModalOpen(true);
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
            render: (row) =>
                row.payment_method ? row.payment_method.replace("_", " ") : "—",
        },
        {
            label: "Amount",
            render: (row) => (
                <strong className="text-green-600">{formatPeso(row.amount)}</strong>
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
                <button
                    className="btn btn-primary btn-sm btn-outline"
                    onClick={() => handlePrintReceipt(row)}
                    title="Print Official Receipt"
                >
                    <i className="ti-printer"></i>
                </button>
            ),
        }
    ];

    const receivablesColumns = [
        {
            label: "Ticket #",
            render: (row) => (
                <span className="font-semibold text-primary">
                    {row.ticket_number || `#${row.ticket_id}`}
                </span>
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
                <button
                    className="btn btn-primary btn-sm btn-rounded-md"
                    onClick={() => handleProcessPayment(row)}
                >
                    <i className="ti-wallet m-r-5"></i>
                    Process Payment
                </button>
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
                                    className="btn btn-outline-primary btn-sm btn-rounded"
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
            // case "cashFlow":
            //     return (
            //         <div className="card">
            //             <div className="card-title">
            //                 <h4>Cash Flow (Last 30 days)</h4>
            //             </div>
            //             <div className="card-body table-responsive">
            //                 <table className="table table-striped">
            //                     <thead>
            //                         <tr>
            //                             <th>Date</th>
            //                             <th>Type</th>
            //                             <th>Description</th>
            //                             <th>Method</th>
            //                             <th>Amount</th>
            //                             <th>Running Balance</th>
            //                         </tr>
            //                     </thead>
            //                     <tbody>
            //                         {cashFlow.length ? (
            //                             cashFlow.map((entry) => (
            //                                 <tr key={entry.id}>
            //                                     <td>
            //                                         {new Date(
            //                                             entry.entry_date
            //                                         ).toLocaleDateString()}
            //                                     </td>
            //                                     <td>
            //                                         <span
            //                                             className={`badge ${entry.type === "inflow"
            //                                                 ? "badge-success"
            //                                                 : "badge-danger"
            //                                                 }`}
            //                                         >
            //                                             {entry.type}
            //                                         </span>
            //                                     </td>
            //                                     <td>{entry.description}</td>
            //                                     <td>
            //                                         {entry.method
            //                                             ? entry.method.replace("_", " ")
            //                                             : "—"}
            //                                     </td>
            //                                     <td
            //                                         className={
            //                                             entry.type === "inflow"
            //                                                 ? "text-success"
            //                                                 : "text-danger"
            //                                         }
            //                                     >
            //                                         {formatPeso(entry.amount)}
            //                                     </td>
            //                                     <td>{formatPeso(entry.running_balance)}</td>
            //                                 </tr>
            //                             ))
            //                         ) : (
            //                             <tr>
            //                                 <td colSpan="6" className="text-center">
            //                                     No cash flow activity yet.
            //                                 </td>
            //                             </tr>
            //                         )}
            //                     </tbody>
            //                 </table>
            //             </div>
            //         </div>
            //     );
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
                    {paymentForm.ticket_id && (() => {
                        const selectedTicket = openTickets.find(t => t.id === paymentForm.ticket_id);
                        if (!selectedTicket) return null;

                        const ticketTotal = parseFloat(selectedTicket.total_amount || 0);
                        const previousPayments = parseFloat(selectedTicket.amount_paid || 0);
                        // Strip commas for calculation
                        const currentPayment = parseFloat(String(paymentForm.amount || 0).replace(/,/g, ''));
                        const balanceBeforePayment = ticketTotal - previousPayments;
                        const balanceAfterPayment = Math.max(balanceBeforePayment - currentPayment, 0);
                        const change = currentPayment > balanceBeforePayment ? currentPayment - balanceBeforePayment : 0;

                        return (
                            <div className="card border-2 border-primary" style={{ position: 'sticky', top: '0' }}>
                                <div className="card-body bg-light">
                                    <h5 className="card-title text-primary mb-3">
                                        <i className="ti-receipt mr-2"></i>
                                        Payment Summary
                                    </h5>

                                    <div className="space-y-2">
                                        {/* Ticket Description */}
                                        {selectedTicket.description && (
                                            <div className="pb-2 mb-2 border-bottom">
                                                <small className="text-muted">Description:</small>
                                                <div className="font-weight-bold">{selectedTicket.description}</div>
                                            </div>
                                        )}

                                        {/* Ticket Total */}
                                        <div className="d-flex justify-content-between align-items-center py-2">
                                            <span className="text-muted">Ticket Total:</span>
                                            <span className="font-weight-bold">
                                                {formatPeso(ticketTotal)}
                                            </span>
                                        </div>

                                        {/* Previous Payments */}
                                        {previousPayments > 0 && (
                                            <div className="d-flex justify-content-between align-items-center py-2">
                                                <span className="text-muted">Less: Previous Payments:</span>
                                                <span className="text-success">
                                                    -{formatPeso(previousPayments)}
                                                </span>
                                            </div>
                                        )}

                                        {/* Balance Before Payment */}
                                        <div className="d-flex justify-content-between align-items-center py-2 border-top">
                                            <span className="font-weight-bold">Balance Due:</span>
                                            <span className="font-weight-bold text-danger">
                                                {formatPeso(balanceBeforePayment)}
                                            </span>
                                        </div>

                                        {/* Current Payment */}
                                        {currentPayment > 0 && (
                                            <>
                                                <div className="d-flex justify-content-between align-items-center py-2 bg-white px-3 rounded">
                                                    <span className="text-primary font-weight-bold">
                                                        <i className="ti-arrow-down mr-1"></i>
                                                        Amount Paying Now:
                                                    </span>
                                                    <span className="text-primary font-weight-bold" style={{ fontSize: '1.1rem' }}>
                                                        {formatPeso(currentPayment)}
                                                    </span>
                                                </div>

                                                {/* Balance After Payment */}
                                                <div className="d-flex justify-content-between align-items-center py-3 border-top border-bottom bg-white px-3 rounded mt-2">
                                                    <span className="font-weight-bold">
                                                        Balance After Payment:
                                                    </span>
                                                    <span className={`font-weight-bold ${balanceAfterPayment === 0 ? 'text-success' : 'text-warning'}`} style={{ fontSize: '1.2rem' }}>
                                                        {formatPeso(balanceAfterPayment)}
                                                    </span>
                                                </div>

                                                {/* Change */}
                                                {change > 0 && (
                                                    <div className="alert alert-success mt-3 mb-0">
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <span className="font-weight-bold">
                                                                Change to Return:
                                                            </span>
                                                            <span className="font-weight-bold" style={{ fontSize: '1.3rem' }}>
                                                                {formatPeso(change)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Payment Status Badge */}
                                                {balanceAfterPayment === 0 && (
                                                    <div className="alert alert-success mt-3 mb-0 text-center">
                                                        <i className="ti-check-box mr-2"></i>
                                                        <strong>PAID IN FULL</strong>
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



            </div>
            {paymentErrors.submit && (
                <div className="alert alert-danger mt-3">
                    <i className="ti-alert mr-2"></i>
                    {paymentErrors.submit}
                </div>
            )}
            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
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
            </div>
        </Modal>
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

