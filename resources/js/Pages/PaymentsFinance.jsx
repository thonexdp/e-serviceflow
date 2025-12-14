import React, { useMemo, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import DataTable from "@/Components/Common/DataTable";
import Modal from "@/Components/Main/Modal";
import FlashMessage from "@/Components/Common/FlashMessage";
import { formatPeso } from "@/Utils/currency";
import PreviewModal from "@/Components/Main/PreviewModal";
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
    const [activeTab, setActiveTab] = useState("ledger");
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
    const { api } = useRoleApi();
    const { flash, auth } = usePage().props;


    const [show, setShow] = useState(false);
    const [filepath, setFilepath] = useState("");

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

    const tabs = [
        { key: "ledger", label: "Payment Ledger" },
        { key: "receivables", label: "Receivables" },
        { key: "expenses", label: "Expenses" },
        { key: "cashFlow", label: "Cash Flow" },
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
            } else if (value !== null && value !== "") {
                formData.append(key, value);
            }
        });

        setIsSubmitting(true);
        setPaymentErrors({});
        try {
            await api.post("/payments", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setPaymentModalOpen(false);
            resetPaymentForm();
            router.reload({ preserveScroll: true });
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
            await api.post("/expenses", expenseForm);
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
    ];

    const receivablesColumns = [
        { label: "Customer", render: (row) => row.name },
        { label: "Total Invoiced", render: (row) => formatPeso(row.total_invoiced) },
        { label: "Total Paid", render: (row) => formatPeso(row.total_paid) },
        {
            label: "Balance",
            render: (row) => (
                <span className="text-danger font-semibold">{formatPeso(row.balance)}</span>
            ),
        },
        {
            label: "Open Tickets",
            render: (row) => row.open_tickets,
        },
        {
            label: "Last Payment",
            render: (row) =>
                row.last_payment_at
                    ? new Date(row.last_payment_at).toLocaleDateString()
                    : "—",
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
                        <div className="card-title flex justify-between items-center">
                            <h4>Payment Ledger</h4>
                            {/* <button
                                className="btn btn-primary"
                                onClick={() => setPaymentModalOpen(true)}
                            >
                                <i className="ti-plus m-r-5"></i> Record Payment
                            </button> */}
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
                                data={receivables}
                                emptyMessage="No outstanding balances. Great job!"
                            />
                        </div>
                    </div>
                );
            case "expenses":
                return (
                    <div className="card">
                        <div className="card-title flex justify-between items-center">
                            <h4>Expenses</h4>
                            <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => setExpenseModalOpen(true)}
                            >
                                <i className="ti-plus text-xs m-r-5"></i> Add Expense
                            </button>
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
            case "cashFlow":
                return (
                    <div className="card">
                        <div className="card-title">
                            <h4>Cash Flow (Last 30 days)</h4>
                        </div>
                        <div className="card-body table-responsive">
                            <table className="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Type</th>
                                        <th>Description</th>
                                        <th>Method</th>
                                        <th>Amount</th>
                                        <th>Running Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cashFlow.length ? (
                                        cashFlow.map((entry) => (
                                            <tr key={entry.id}>
                                                <td>
                                                    {new Date(
                                                        entry.entry_date
                                                    ).toLocaleDateString()}
                                                </td>
                                                <td>
                                                    <span
                                                        className={`badge ${entry.type === "inflow"
                                                            ? "badge-success"
                                                            : "badge-danger"
                                                            }`}
                                                    >
                                                        {entry.type}
                                                    </span>
                                                </td>
                                                <td>{entry.description}</td>
                                                <td>
                                                    {entry.method
                                                        ? entry.method.replace("_", " ")
                                                        : "—"}
                                                </td>
                                                <td
                                                    className={
                                                        entry.type === "inflow"
                                                            ? "text-success"
                                                            : "text-danger"
                                                    }
                                                >
                                                    {formatPeso(entry.amount)}
                                                </td>
                                                <td>{formatPeso(entry.running_balance)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="text-center">
                                                No cash flow activity yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
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
            size="xl"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="form-label">Ticket (optional)</label>
                    <select
                        className="form-control"
                        value={paymentForm.ticket_id}
                        onChange={(e) => handleTicketChange(e.target.value)}
                    >
                        <option value="">Select open ticket</option>
                        {ticketOptions.map((ticket) => (
                            <option key={ticket.value} value={ticket.value}>
                                {ticket.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="form-label">Customer</label>
                    <select
                        className="form-control"
                        value={paymentForm.customer_id}
                        onChange={(e) => handleCustomerChange(e.target.value)}
                    >
                        <option value="">Walk-in / New</option>
                        {customerOptions.map((customer) => (
                            <option key={customer.value} value={customer.value}>
                                {customer.label}
                            </option>
                        ))}
                    </select>
                </div>
                {!paymentForm.customer_id && (
                    <div className="md:col-span-2">
                        <label className="form-label">Payer Name</label>
                        <input
                            type="text"
                            className={`form-control ${paymentErrors.payer ? "border-danger" : ""}`}
                            placeholder="Walk-in customer name"
                            value={paymentForm.payer_name}
                            onChange={(e) => {
                                setPaymentForm({
                                    ...paymentForm,
                                    payer_name: e.target.value,
                                });
                                if (paymentErrors.payer) {
                                    setPaymentErrors({ ...paymentErrors, payer: "" });
                                }
                            }}
                        />
                        {paymentErrors.payer && (
                            <span className="text-danger small">{paymentErrors.payer}</span>
                        )}
                    </div>
                )}
                <div>
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
                <div>
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
                <div>
                    <label className="form-label">Amount</label>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={`form-control ${paymentErrors.amount ? "border-danger" : ""}`}
                        placeholder="0.00"
                        value={paymentForm.amount}
                        onChange={(e) => {
                            setPaymentForm({
                                ...paymentForm,
                                amount: e.target.value,
                            });
                            if (paymentErrors.amount) {
                                setPaymentErrors({ ...paymentErrors, amount: "" });
                            }
                        }}
                    />
                    {paymentErrors.amount && (
                        <span className="text-danger small">{paymentErrors.amount}</span>
                    )}
                </div>
                <div>
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
                <div>
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
                <div>
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
                <div className="md:col-span-2">
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
                <div className="md:col-span-2">
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
                <div className="md:col-span-2">
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
                    <label className="form-label">Amount</label>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={`form-control ${expenseErrors.amount ? "border-danger" : ""}`}
                        value={expenseForm.amount}
                        onChange={(e) => {
                            setExpenseForm({
                                ...expenseForm,
                                amount: e.target.value,
                            });
                            if (expenseErrors.amount) {
                                setExpenseErrors({ ...expenseErrors, amount: "" });
                            }
                        }}
                        required
                    />
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
                            <div className="tabs">
                                <div className="tab-control">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.key}
                                            className={`btn btn-sm m-r-3 ${activeTab === tab.key ? "btn-primary" : "btn-light"
                                                }`}
                                            onClick={() => setActiveTab(tab.key)}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="m-t-10">{renderTabContent()}</div>

                </section>

                {renderPaymentModal()}
                {renderExpenseModal()}
            </AdminLayout>
        </>
    );
}

