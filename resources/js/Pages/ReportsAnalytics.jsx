






import React, { useState, useRef } from "react";
import { Head, router } from "@inertiajs/react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { formatPeso } from "@/Utils/currency";
import { formatDate } from "@/Utils/formatDate";
import "../../css/reports.css";

export default function ReportsAnalytics({
    user = {},
    notifications = [],
    messages = [],
    reportType = 'sales',
    dateRange = 'this_month',
    startDate,
    endDate,
    reportData = {},
    filters = {}
}) {
    const printRef = useRef();
    const [selectedReport, setSelectedReport] = useState(reportType);
    const [selectedDateRange, setSelectedDateRange] = useState(dateRange);

    const reportTypes = [
        { value: 'sales', label: 'Sales Reports', icon: 'ti-stats-up' },

        { value: 'receivables', label: 'Receivables', icon: 'ti-receipt' },

        { value: 'inventory', label: 'Inventory Consumption', icon: 'ti-package' },

        { value: 'production', label: 'Production Report', icon: 'ti-settings' },
        { value: 'production_incentives', label: 'Production Incentives', icon: 'ti-gift' },
        { value: 'customer_insights', label: 'Customer Insights', icon: 'ti-user' },
        { value: 'online_orders', label: 'Online Orders', icon: 'ti-shopping-cart' },


        { value: 'expenses', label: 'Expenses Report', icon: 'ti-wallet' },

        { value: 'staff_performance', label: 'Staff Status', icon: 'ti-id-badge' }];


    const dateRanges = [
        { value: 'today', label: 'Today' },
        { value: 'yesterday', label: 'Yesterday' },
        { value: 'this_week', label: 'This Week' },
        { value: 'last_week', label: 'Last Week' },
        { value: 'this_month', label: 'This Month' },
        { value: 'last_month', label: 'Last Month' },
        { value: 'this_year', label: 'This Year' },
        { value: 'last_year', label: 'Last Year' }];


    const handleReportChange = (reportValue) => {
        setSelectedReport(reportValue);
        router.get('/admin/reports', {
            report_type: reportValue,
            date_range: selectedDateRange
        }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const handleDateRangeChange = (range) => {
        setSelectedDateRange(range);
        router.get('/admin/reports', {
            report_type: selectedReport,
            date_range: range
        }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExport = () => {

        alert('Export feature coming soon!');
    };

    return (
        <AdminLayout user={user} notifications={notifications} messages={messages}>
            <Head title="Reports & Analytics" />

            <div className="row no-print">
                <div className="col-lg-8 p-r-0 title-margin-right">
                    <div className="page-header">
                        <div className="page-title">
                            <h1><i className="ti-stats-up"></i> Reports & <span>Analytics</span></h1>
                        </div>
                    </div>
                </div>
                <div className="col-lg-4 p-l-0 title-margin-left">
                    <div className="page-header">
                        <div className="page-title">
                            <ol className="breadcrumb">
                                <li className="breadcrumb-item">
                                    <a href="/admin/">Dashboard</a>
                                </li>
                                <li className="breadcrumb-item active">Reports</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            <section id="main-content">
                <div className="row">
                    {/* Sidebar - Report Types */}
                    <div className="col-lg-3 no-print">
                        <div className="card">
                            <div className="card-title">
                                <h4>Report Types</h4>
                            </div>
                            <div className="card-body">
                                <div className="list-group">
                                    {reportTypes.map((report) =>
                                        <button
                                            key={report.value}
                                            className={`list-group-item list-group-item-action ${selectedReport === report.value ? 'active' : ''}`
                                            }
                                            onClick={() => handleReportChange(report.value)}>

                                            <i className={report.icon}></i> {report.label}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content - Report Display */}
                    <div className="col-lg-9">
                        {/* Filters & Actions */}
                        <div className="card no-print">
                            <div className="card-body">
                                {
                                    selectedReport !== "staff_performance" &&
                                    <div className="row">
                                        <div className="col-md-6">


                                            <label>Date Range:</label>
                                            <select
                                                className="form-control"
                                                value={selectedDateRange}
                                                onChange={(e) => handleDateRangeChange(e.target.value)}>

                                                {dateRanges.map((range) =>
                                                    <option key={range.value} value={range.value}>
                                                        {range.label}
                                                    </option>
                                                )}
                                            </select>
                                        </div>
                                        <div className="col-md-6 text-right">
                                            <label>&nbsp;</label>
                                            <div>
                                                {/* <button
                                                    className="btn btn-primary btn-sm mr-2"
                                                    onClick={handlePrint}>

                                                    <i className="ti-printer"></i> Print
                                                </button> */}
                                                {/* <button
                           className="btn btn-success btn-sm"
                           // onClick={handleExport}
                        >
                           <i className="ti-download"></i> Export
                        </button> */}
                                            </div>
                                        </div>
                                    </div>

                                }
                            </div>
                        </div>

                        {/* Report Content */}
                        <div className="card" ref={printRef}>
                            <div className="card-body">
                                {/* Report Header for Print */}
                                <div className="print-header">
                                    <div className="text-center mb-4">
                                        <h2>RC PrintShoppe</h2>
                                        <h3>{reportTypes.find((r) => r.value === selectedReport)?.label}</h3>
                                        <p>Period: {startDate} to {endDate}</p>
                                        <p>Generated: {new Date().toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Render specific report based on type */}
                                {selectedReport === 'sales' && <SalesReport data={reportData} />}
                                {selectedReport === 'revenue_cashflow' && <RevenueCashflowReport data={reportData} />}
                                {selectedReport === 'receivables' && <ReceivablesReport data={reportData} />}
                                {selectedReport === 'net_income' && <NetIncomeReport data={reportData} />}
                                {selectedReport === 'inventory' && <InventoryReport data={reportData} />}
                                {selectedReport === 'product_profitability' && <ProductProfitabilityReport data={reportData} />}
                                {selectedReport === 'production' && <ProductionReport data={reportData} />}
                                {selectedReport === 'production_incentives' && <ProductionIncentivesReport data={reportData} />}
                                {selectedReport === 'customer_insights' && <CustomerInsightsReport data={reportData} />}
                                {selectedReport === 'online_orders' && <OnlineOrdersReport data={reportData} />}
                                {selectedReport === 'designer_approvals' && <DesignerApprovalsReport data={reportData} />}
                                {selectedReport === 'payment_confirmations' && <PaymentConfirmationsReport data={reportData} />}
                                {selectedReport === 'expenses' && <ExpensesReport data={reportData} />}
                                {selectedReport === 'receipts' && <ReceiptsReport data={reportData} />}
                                {selectedReport === 'staff_performance' && <StaffPerformanceReport data={reportData} />}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Print Styles */}
            <style>{`
                @media print {
                    .no-print {
                        display: none !important;
                    }
                    .header, .sidebar, .footer {
                        display: none !important;
                    }
                    .print-header {
                        display: block !important;
                    }
                    body {
                        margin: 0;
                        padding: 20px;
                    }
                    .card {
                        border: none;
                        box-shadow: none;
                    }
                }
                .print-header {
                    display: none;
                }
            `}</style>
        </AdminLayout>);

}



function SalesReport({ data }) {
    const { daily = [], monthly = [], payment_methods = [], summary = {} } = data;

    return (
        <div>
            <h4>Sales Summary</h4>
            <div className="row mb-4">
                <div className="col-md-3">
                    <div className="stat-card">
                        <h6>Total Sales</h6>
                        <h3>{formatPeso(summary.total_sales || 0)}</h3>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="stat-card">
                        <h6>Transactions</h6>
                        <h3>{summary.total_transactions || 0}</h3>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="stat-card">
                        <h6>Average Transaction</h6>
                        <h3>{formatPeso(summary.average_transaction || 0)}</h3>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="stat-card">
                        <h6>Days in Period</h6>
                        <h3>{summary.days_in_period || 0}</h3>
                    </div>
                </div>
            </div>

            <h5 className="mt-4">Payment Methods Breakdown</h5>
            <table className="table table-striped">
                <thead>
                    <tr>
                        <th>Payment Method</th>
                        <th>Transactions</th>
                        <th className="text-right">Total Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {payment_methods.map((method, index) =>
                        <tr key={index}>
                            <td className="text-capitalize">{method.payment_method}</td>
                            <td>{method.count}</td>
                            <td className="text-right">{formatPeso(method.total)}</td>
                        </tr>
                    )}
                </tbody>
            </table>

            <h5 className="mt-4">Daily Sales</h5>
            <table className="table table-sm">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Transactions</th>
                        <th className="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {daily.map((day, index) =>
                        <tr key={index}>
                            <td>{day.date}</td>
                            <td>{day.transactions}</td>
                            <td className="text-right">{formatPeso(day.total)}</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>);

}

function RevenueCashflowReport({ data }) {
    const { cashflow = [], summary = {} } = data;

    return (
        <div>
            <h4>Revenue & Cashflow Summary</h4>
            <div className="row mb-4">
                <div className="col-md-3">
                    <div className="stat-card bg-success text-white p-2 rounded-sm">
                        <h6>Total Inflow</h6>
                        <h3><b className="text-white">{formatPeso(summary.total_inflow || 0)}</b></h3>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="stat-card bg-danger text-white p-2 rounded-sm">
                        <h6>Total Outflow</h6>
                        <h3><b className="text-white">{formatPeso(summary.total_outflow || 0)}</b></h3>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="stat-card bg-warning text-white p-2 rounded-sm">
                        <h6>Total Expenses</h6>
                        <h3><b className="text-white">{formatPeso(summary.total_expenses || 0)}</b></h3>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="stat-card bg-primary text-white p-2 rounded-sm">
                        <h6>Net Cashflow</h6>
                        <h3><b className="text-white">{formatPeso(summary.net_cashflow || 0)}</b></h3>
                    </div>
                </div>
            </div>

            <h5>Daily Cashflow</h5>
            <table className="table table-striped">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th className="text-right">Inflow</th>
                        <th className="text-right">Outflow</th>
                        <th className="text-right">Expenses</th>
                        <th className="text-right">Net Cashflow</th>
                    </tr>
                </thead>
                <tbody>
                    {cashflow.map((item, index) =>
                        <tr key={index}>
                            <td>{formatDate(item.date)}</td>
                            <td className="text-right text-success">{formatPeso(item.inflow)}</td>
                            <td className="text-right text-danger">{formatPeso(item.outflow)}</td>
                            <td className="text-right text-warning">{formatPeso(item.expenses)}</td>
                            <td className="text-right">
                                <strong className={item.net_cashflow >= 0 ? 'text-success' : 'text-danger'}>
                                    {formatPeso(item.net_cashflow)}
                                </strong>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>);

}

function ReceivablesReport({ data }) {
    const { receivables = [], aging = {}, summary = {} } = data;

    return (
        <div>
            <h4>Receivables Summary</h4>
            <div className="row mb-4">
                <div className="col-md-4">
                    <div className="stat-card">
                        <h6>Total Outstanding</h6>
                        <h3>{formatPeso(summary.total_outstanding || 0)}</h3>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="stat-card">
                        <h6>Total Accounts</h6>
                        <h3>{summary.total_accounts || 0}</h3>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="stat-card">
                        <h6>Average Balance</h6>
                        <h3>{formatPeso(summary.average_balance || 0)}</h3>
                    </div>
                </div>
            </div>

            <h5>Aging Analysis</h5>
            <table className="table table-striped">
                <thead>
                    <tr>
                        <th>Age Bracket</th>
                        <th className="text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Current (Not Due)</td>
                        <td className="text-right">{formatPeso(aging.current || 0)}</td>
                    </tr>
                    <tr className="table-warning">
                        <td>1-30 Days Overdue</td>
                        <td className="text-right">{formatPeso(aging['1_30_days'] || 0)}</td>
                    </tr>
                    <tr className="table-warning">
                        <td>31-60 Days Overdue</td>
                        <td className="text-right">{formatPeso(aging['31_60_days'] || 0)}</td>
                    </tr>
                    <tr className="table-danger">
                        <td>61-90 Days Overdue</td>
                        <td className="text-right">{formatPeso(aging['61_90_days'] || 0)}</td>
                    </tr>
                    <tr className="table-danger">
                        <td>Over 90 Days</td>
                        <td className="text-right">{formatPeso(aging.over_90_days || 0)}</td>
                    </tr>
                </tbody>
            </table>

            <h5 className="mt-4">Outstanding Accounts</h5>
            <table className="table table-sm">
                <thead>
                    <tr>
                        <th>Ticket #</th>
                        <th>Customer</th>
                        <th>Due Date</th>
                        <th>Days Overdue</th>
                        <th className="text-right">Balance</th>
                    </tr>
                </thead>
                <tbody>
                    {receivables.map((item) =>
                        <tr key={item.id} className={item.days_overdue > 30 ? 'table-warning' : ''}>
                            <td>{item.ticket_number}</td>
                            <td>{item.customer?.full_name || 'N/A'}</td>
                            <td>{formatDate(item.due_date)}</td>
                            <td>{item.days_overdue > 0 ? `${item.days_overdue} days` : 'Not due'}</td>
                            <td className="text-right">{formatPeso(item.outstanding_balance)}</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>);

}

function NetIncomeReport({ data }) {
    return (
        <div>
            <h4>Net Income Statement</h4>
            <table className="table table-bordered mt-4">
                <tbody>
                    <tr>
                        <td><strong>Revenue</strong></td>
                        <td className="text-right">{formatPeso(data.revenue || 0)}</td>
                    </tr>
                    <tr>
                        <td style={{ paddingLeft: '30px' }}>Less: Discounts</td>
                        <td className="text-right text-danger">({formatPeso(data.discounts || 0)})</td>
                    </tr>
                    <tr>
                        <td style={{ paddingLeft: '30px' }}>Less: Cost of Goods Sold (COGS)</td>
                        <td className="text-right text-danger">({formatPeso(data.cogs || 0)})</td>
                    </tr>
                    <tr className="table-active">
                        <td><strong>Gross Profit</strong></td>
                        <td className="text-right"><strong>{formatPeso(data.gross_profit || 0)}</strong></td>
                    </tr>
                    <tr>
                        <td style={{ paddingLeft: '30px' }}>Less: Operating Expenses</td>
                        <td className="text-right text-danger">({formatPeso(data.operating_expenses || 0)})</td>
                    </tr>
                    <tr className="table-success">
                        <td><strong>Net Income</strong></td>
                        <td className="text-right"><strong>{formatPeso(data.net_income || 0)}</strong></td>
                    </tr>
                </tbody>
            </table>

            <div className="row mt-4">
                <div className="col-md-6">
                    <div className="stat-card">
                        <h6>Gross Profit Margin</h6>
                        <h3>{(data.gross_margin || 0).toFixed(2)}%</h3>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="stat-card">
                        <h6>Net Profit Margin</h6>
                        <h3>{(data.net_margin || 0).toFixed(2)}%</h3>
                    </div>
                </div>
            </div>
        </div>);

}


function InventoryReport({ data }) {
    const { by_item = [], summary = {} } = data;

    return (
        <div>
            <h4>Inventory Consumption Report</h4>
            <div className="row mb-4">
                <div className="col-md-6">
                    <div className="stat-card">
                        <h6>Total Items Consumed</h6>
                        <h3>{summary.total_items || 0}</h3>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="stat-card">
                        <h6>Total Tickets</h6>
                        <h3>{summary.total_tickets || 0}</h3>
                    </div>
                </div>
            </div>

            {Object.keys(by_item).length > 0 ?
                <table className="table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Total Consumed</th>
                            <th>Unit</th>
                            <th>Tickets Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.values(by_item).map((item, index) =>
                            <tr key={index}>
                                <td>{item.item}</td>
                                <td>{item.total_consumed}</td>
                                <td>{item.unit}</td>
                                <td>{item.tickets_count}</td>
                            </tr>
                        )}
                    </tbody>
                </table> :

                <div className="alert alert-info">No inventory consumption data available for this period.</div>
            }
        </div>);

}

function ProductProfitabilityReport({ data }) {
    const { by_product = [], summary = {} } = data;

    return (
        <div>
            <h4>Product Profitability Analysis</h4>
            <div className="row mb-4">
                <div className="col-md-4">
                    <div className="stat-card">
                        <h6>Total Products</h6>
                        <h3>{summary.total_products || 0}</h3>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="stat-card">
                        <h6>Total Revenue</h6>
                        <h3>{formatPeso(summary.total_revenue || 0)}</h3>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="stat-card">
                        <h6>Total Profit</h6>
                        <h3>{formatPeso(summary.total_profit || 0)}</h3>
                    </div>
                </div>
            </div>

            {Object.keys(by_product).length > 0 ?
                <table className="table">
                    <thead>
                        <tr>
                            <th>Product/Service</th>
                            <th>Quantity</th>
                            <th className="text-right">Revenue</th>
                            <th className="text-right">Actual Cost</th>
                            <th className="text-right">Profit</th>
                            <th className="text-right">Margin %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.values(by_product).map((product, index) =>
                            <tr key={index}>
                                <td>{product.job_type}</td>
                                <td>{product.quantity}</td>
                                <td className="text-right">{formatPeso(product.revenue)}</td>
                                <td className="text-right">{formatPeso(product.actual_cost || product.estimated_cost || 0)}</td>
                                <td className="text-right text-success">{formatPeso(product.profit)}</td>
                                <td className="text-right">{product.margin.toFixed(2)}%</td>
                            </tr>
                        )}
                    </tbody>
                </table> :

                <div className="alert alert-info">No product data available for this period.</div>
            }
        </div>);

}

function ProductionReport({ data }) {
    const { summary = {} } = data;

    return (
        <div>
            <h4>Production Performance Report</h4>
            <div className="row">
                <div className="col-md-3">
                    <div className="stat-card">
                        <h6>Completed</h6>
                        <h3>{summary.total_completed || 0}</h3>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="stat-card">
                        <h6>In Progress</h6>
                        <h3>{summary.total_in_progress || 0}</h3>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="stat-card">
                        <h6>Avg Time (hrs)</h6>
                        <h3>{summary.avg_production_time_hours || 0}</h3>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="stat-card">
                        <h6>Total Produced</h6>
                        <h3>{summary.total_quantity_produced || 0}</h3>
                    </div>
                </div>
            </div>
        </div>);

}

function CustomerInsightsReport({ data }) {
    const { customers: customersData = [], summary = {} } = data;

    const customers = Array.isArray(customersData) ? customersData : Object.values(customersData || {});

    return (
        <div>
            <h4>Customer Insights</h4>
            <div className="row mb-4">
                <div className="col-md-4">
                    <div className="stat-card">
                        <h6>Active Customers</h6>
                        <h3>{summary.total_customers || 0}</h3>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="stat-card">
                        <h6>Total Revenue</h6>
                        <h3>{formatPeso(summary.total_revenue || 0)}</h3>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="stat-card">
                        <h6>Avg Customer Value</h6>
                        <h3>{formatPeso(summary.avg_customer_value || 0)}</h3>
                    </div>
                </div>
            </div>

            <h5>Top Customers</h5>
            <table className="table">
                <thead>
                    <tr>
                        <th>Customer</th>
                        <th>Orders</th>
                        <th className="text-right">Total Spent</th>
                        <th className="text-right">Avg Order</th>
                    </tr>
                </thead>
                <tbody>
                    {customers.slice(0, 20).map((customer) =>
                        <tr key={customer.id}>
                            <td>{customer.name}</td>
                            <td>{customer.total_orders}</td>
                            <td className="text-right">{formatPeso(customer.total_spent)}</td>
                            <td className="text-right">{formatPeso(customer.avg_order_value)}</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>);

}

function OnlineOrdersReport({ data }) {
    const { summary = {} } = data;

    return (
        <div>
            <h4>Online Orders Report</h4>
            <div className="row">
                <div className="col-md-4">
                    <div className="stat-card">
                        <h6>Total Orders</h6>
                        <h3>{summary.total_orders || 0}</h3>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="stat-card">
                        <h6>Pending Value</h6>
                        <h3>{formatPeso(summary.pending_value || 0)}</h3>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="stat-card">
                        <h6>Avg Order Value</h6>
                        <h3>{formatPeso(summary.avg_order_value || 0)}</h3>
                    </div>
                </div>
            </div>
        </div>);

}

function DesignerApprovalsReport({ data }) {
    const { summary = {} } = data;

    return (
        <div>
            <h4>Designer Approvals Report</h4>
            <div className="row">
                <div className="col-md-3">
                    <div className="stat-card">
                        <h6>Total Tickets</h6>
                        <h3><b>{summary.total_tickets || 0}</b></h3>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="stat-card bg-success p-2 rounded-sm">
                        <h6>Approved</h6>
                        <h3><b className="text-white"> {summary.approved || 0} </b></h3>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="stat-card bg-warning p-2 rounded-sm">
                        <h6>Pending</h6>
                        <h3><b className="text-white">{summary.pending || 0}</b></h3>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="stat-card bg-danger p-2 rounded-sm">
                        <h6>Revisions</h6>
                        <h3><b className="text-white">{summary.revisions || 0}</b></h3>
                    </div>
                </div>
            </div>
        </div>);

}

function PaymentConfirmationsReport({ data }) {
    const { summary = {} } = data;

    return (
        <div>
            <h4>Payment Confirmations Report</h4>
            <div className="row">
                <div className="col-md-3">
                    <div className="stat-card bg-warning p-2 rounded-sm">
                        <h6>Pending Count</h6>
                        <h3><b className="text-white">{summary.pending_count || 0}</b></h3>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="stat-card bg-warning p-2 rounded-sm">
                        <h6>Pending Amount</h6>
                        <h3><b className="text-white">{formatPeso(summary.pending_amount || 0)}</b></h3>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="stat-card bg-success p-2 rounded-sm">
                        <h6>Confirmed Count</h6>
                        <h3><b className="text-white">{summary.confirmed_count || 0}</b></h3>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="stat-card bg-success p-2 rounded-sm">
                        <h6>Confirmed Amount</h6>
                        <h3><b className="text-white">{formatPeso(summary.confirmed_amount || 0)}</b></h3>
                    </div>
                </div>
            </div>
        </div>);

}

function ExpensesReport({ data }) {
    const { summary = {}, by_category = [] } = data;

    return (
        <div>
            <h4>Expenses Report</h4>
            <div className="row mb-4">
                <div className="col-md-4">
                    <div className="stat-card">
                        <h6>Total Expenses</h6>
                        <h3>{formatPeso(summary.total_expenses || 0)}</h3>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="stat-card">
                        <h6>Transactions</h6>
                        <h3>{summary.total_transactions || 0}</h3>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="stat-card">
                        <h6>Average</h6>
                        <h3>{formatPeso(summary.avg_expense || 0)}</h3>
                    </div>
                </div>
            </div>

            {Object.keys(by_category).length > 0 &&
                <>
                    <h5>By Category</h5>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Count</th>
                                <th className="text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.values(by_category).map((cat, index) =>
                                <tr key={index}>
                                    <td className="text-capitalize">{cat.category}</td>
                                    <td>{cat.count}</td>
                                    <td className="text-right">{formatPeso(cat.total)}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </>
            }
        </div>);

}

function ReceiptsReport({ data }) {
    const { summary = {} } = data;

    return (
        <div>
            <h4>OR / Receipt Report</h4>
            <div className="row">
                <div className="col-md-6">
                    <div className="stat-card">
                        <h6>Total Receipts</h6>
                        <h3>{summary.total_receipts || 0}</h3>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="stat-card">
                        <h6>Total Amount</h6>
                        <h3>{formatPeso(summary.total_amount || 0)}</h3>
                    </div>
                </div>
            </div>
        </div>);

}

function ProductionIncentivesReport({ data }) {
    const { records = [], summary = {}, filters = {} } = data;

    return (
        <div>
            <h4>Production Incentives Report</h4>
            <div className="row mb-4">
                <div className="col-md-3">
                    <div className="stat-card">
                        <h6>Total Incentives</h6>
                        <h3>{formatPeso(summary.total_incentives || 0)}</h3>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="stat-card">
                        <h6>Total Quantity Produced</h6>
                        <h3>{summary.total_quantity || 0}</h3>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="stat-card">
                        <h6>Total Records</h6>
                        <h3>{summary.total_records || 0}</h3>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="stat-card">
                        <h6>Unique Users</h6>
                        <h3>{summary.unique_users || 0}</h3>
                    </div>
                </div>
            </div>

            {filters.user_id &&
                <div className="alert alert-info mb-3">
                    <i className="ti-filter"></i> Filtered by User: {filters.user_name || 'N/A'}
                </div>
            }

            {filters.job_type_id &&
                <div className="alert alert-info mb-3">
                    <i className="ti-filter"></i> Filtered by Job Type: {filters.job_type_name || 'N/A'}
                </div>
            }

            <h5 className="mt-4">Incentive Records</h5>
            {records && records.length > 0 ?
                <div className="table-responsive">
                    <table className="table table-striped">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>User Name</th>
                                <th>Ticket #</th>
                                <th>Job Type</th>
                                <th>Workflow Step</th>
                                <th className="text-right">Quantity Produced</th>
                                <th className="text-right">Incentive Price</th>
                                <th className="text-right">Total Incentives</th>
                                <th>Evidence</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((record, index) =>
                                <tr key={record.id || index}>
                                    <td>{formatDate(record.created_at || record.date)}</td>
                                    <td>{record.user_name || 'N/A'}</td>
                                    <td>{record.ticket_number || 'N/A'}</td>
                                    <td>{record.job_type_name || 'N/A'}</td>
                                    <td className="text-capitalize">
                                        {record.workflow_step ? record.workflow_step.replace(/_/g, ' ') : 'N/A'}
                                    </td>
                                    <td className="text-right">{record.quantity_produced || 0}</td>
                                    <td className="text-right">{formatPeso(record.incentive_price || 0)}</td>
                                    <td className="text-right">
                                        <strong className="text-success">
                                            {formatPeso(record.incentive_amount || (record.quantity_produced || 0) * (record.incentive_price || 0))}
                                        </strong>
                                    </td>
                                    <td>
                                        {record.evidence_files && record.evidence_files.length > 0 ?
                                            <span className="badge badge-info">
                                                <i className="ti-image"></i> {record.evidence_files.length} file(s)
                                            </span> :

                                            <span className="text-muted">No evidence</span>
                                        }
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="table-active">
                                <th colSpan="6" className="text-right">Total:</th>
                                <th className="text-right">{summary.total_quantity || 0}</th>
                                <th></th>
                                <th className="text-right">
                                    <strong>{formatPeso(summary.total_incentives || 0)}</strong>
                                </th>
                                <th></th>
                            </tr>
                        </tfoot>
                    </table>
                </div> :

                <div className="alert alert-info">No incentive records found for the selected period.</div>
            }

            {/* Summary by Workflow with Detailed User Breakdown */}
            {summary.by_workflow && summary.by_workflow.length > 0 &&
                <>
                    <h5 className="mt-4">Summary by Workflow</h5>
                    {summary.by_workflow.map((workflow) =>
                        <div key={workflow.workflow_step} className="mb-4">
                            <div className="card">
                                <div className="card-header bg-orange-400 text-white">
                                    <h6 className="mb-0 text-capitalize">
                                        {workflow.workflow_step.replace(/_/g, ' ')}
                                        <span className="ml-3 badge badge-light">
                                            <span className="text-orange-400">{workflow.unique_users} User{workflow.unique_users !== 1 ? 's' : ''}</span>
                                        </span>
                                    </h6>
                                </div>
                                <div className="card-body">
                                    <div className="row mb-3">
                                        <div className="col-md-4">
                                            <strong>Total Quantity Produced:</strong> {workflow.total_quantity}
                                        </div>
                                        <div className="col-md-4">
                                            <strong>Total Incentives:</strong> {formatPeso(workflow.total_incentives)}
                                        </div>
                                        <div className="col-md-4">
                                            <strong>No. of Users:</strong> {workflow.unique_users}
                                        </div>
                                    </div>

                                    {workflow.users && workflow.users.length > 0 &&
                                        <>
                                            <h6 className="mt-3 mb-2">User Breakdown:</h6>
                                            <div className="table-responsive">
                                                <table className="table table-sm table-bordered table-striped">
                                                    <thead className="thead-light">
                                                        <tr>
                                                            <th>User Name</th>
                                                            <th className="text-right">Quantity Produced</th>
                                                            <th className="text-right">Total Incentives</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {workflow.users.map((user, index) =>
                                                            <tr key={user.user_id || index}>
                                                                <td>{user.user_name}</td>
                                                                <td className="text-right">{user.total_quantity || 0}</td>
                                                                <td className="text-right font-weight-bold text-success">
                                                                    {formatPeso(user.total_incentives || 0)}
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr className="table-active">
                                                            <th>Total</th>
                                                            <th className="text-right">{workflow.total_quantity}</th>
                                                            <th className="text-right">{formatPeso(workflow.total_incentives)}</th>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </>
                                    }
                                </div>
                            </div>
                        </div>
                    )}
                </>

            }

            {/* Summary by User */}
            {
                summary.by_user && summary.by_user.length > 0 &&
                <>
                    <h5 className="mt-4">Summary by User</h5>
                    <div className="table-responsive">
                        <table className="table table-sm table-bordered">
                            <thead className="thead-light">
                                <tr>
                                    <th>User Name</th>
                                    <th className="text-right">Total Quantity</th>
                                    <th className="text-right">Total Incentives</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.by_user.map((userSummary, index) =>
                                    <tr key={index}>
                                        <td>{userSummary.user_name}</td>
                                        <td className="text-right">{userSummary.total_quantity || 0}</td>
                                        <td className="text-right font-weight-bold text-success">
                                            {formatPeso(userSummary.total_incentives || 0)}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>

            }

            {/* Summary by Job Type */}
            {
                summary.by_job_type && Object.keys(summary.by_job_type).length > 0 &&
                <>
                    <h5 className="mt-4">Summary by Job Type</h5>
                    <table className="table table-sm">
                        <thead>
                            <tr>
                                <th>Job Type</th>
                                <th className="text-right">Total Quantity</th>
                                <th className="text-right">Total Incentives</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.values(summary.by_job_type).map((jobTypeSummary, index) =>
                                <tr key={index}>
                                    <td>{jobTypeSummary.job_type_name}</td>
                                    <td className="text-right">{jobTypeSummary.total_quantity || 0}</td>
                                    <td className="text-right">
                                        <strong>{formatPeso(jobTypeSummary.total_incentives || 0)}</strong>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </>

            }
        </div>);

}

function StaffPerformanceReport({ data }) {
    const { staff = [], summary = {} } = data;
    const [selectedUser, setSelectedUser] = useState(null);
    const [activityLogs, setActivityLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [showLogsModal, setShowLogsModal] = useState(false);

    const loadUserActivityLogs = async (userId) => {
        setLoadingLogs(true);
        setSelectedUser(staff.find((s) => s.id === userId));
        try {
            const response = await fetch(`/admin/users/${userId}/activity-logs`);
            const result = await response.json();
            setActivityLogs(result.data || []);
            setShowLogsModal(true);
            setLoadingLogs(false);
        } catch (error) {
            console.error('Error loading activity logs:', error);
            setLoadingLogs(false);
        }
    };

    return (
        <div>
            <h4>Staff Report</h4>
            <div className="row mb-3">
                <div className="col-md-3">
                    <div className="stat-card">
                        <h6>Total Staff</h6>
                        <h3>{summary.total_staff || 0}</h3>
                    </div>
                </div>
                {summary.by_role && Object.entries(summary.by_role).map(([role, count]) =>
                    <div key={role} className="col-md-3">
                        <div className="stat-card">
                            <h6>{role}</h6>
                            <h3>{count}</h3>
                        </div>
                    </div>
                )}
            </div>

            <table className="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Email</th>
                        <th>Total Activities</th>
                        <th>Recent Activities</th>
                        <th>Last Active</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {staff.map((member) =>
                        <tr key={member.id}>
                            <td>{member.name}</td>
                            <td><i>{member.role}</i></td>
                            <td>{member.email}</td>
                            <td>{member.total_activities || 0}</td>
                            <td>{member.recent_activities || 0}</td>
                            <td>{new Date(member.last_active).toLocaleDateString()}</td>
                            <td>
                                <button
                                    className="btn btn-sm btn-info"
                                    onClick={() => loadUserActivityLogs(member.id)}
                                    title="View Activity Logs">

                                    <i className="ti-time"></i> View Logs
                                </button>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Activity Logs Modal */}
            {showLogsModal &&
                <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    Activity Logs - {selectedUser?.name}
                                </h5>
                                <button
                                    type="button"
                                    className="close"
                                    onClick={() => {
                                        setShowLogsModal(false);
                                        setActivityLogs([]);
                                        setSelectedUser(null);
                                    }}>

                                    <span>&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                {loadingLogs ?
                                    <div className="text-center py-4">
                                        <i className="ti-reload animate-spin text-2xl text-gray-400"></i>
                                        <p className="mt-2 text-gray-500">Loading activity logs...</p>
                                    </div> :
                                    activityLogs.length > 0 ?
                                        <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                            <table className="table table-sm table-striped">
                                                <thead className="sticky top-0 bg-white">
                                                    <tr>
                                                        <th>Date/Time</th>
                                                        <th>Action</th>
                                                        <th>Description</th>
                                                        <th>Related Item</th>
                                                        <th>IP Address</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {activityLogs.map((log) =>
                                                        <tr key={log.id}>
                                                            <td className="text-xs">
                                                                {new Date(log.created_at).toLocaleString()}
                                                            </td>
                                                            <td>
                                                                <span className="badge badge-info badge-sm">
                                                                    {log.action.replace(/_/g, ' ')}
                                                                </span>
                                                            </td>
                                                            <td className="text-sm">{log.description || '-'}</td>
                                                            <td className="text-xs text-muted">
                                                                {log.model_type ? log.model_type.split('\\').pop() : '-'}
                                                            </td>
                                                            <td className="text-xs text-muted">
                                                                {log.ip_address || '-'}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div> :

                                        <div className="text-center py-8 text-gray-500">
                                            <i className="ti-time text-3xl mb-2"></i>
                                            <p>No activity logs found for this user.</p>
                                        </div>
                                }
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowLogsModal(false);
                                        setActivityLogs([]);
                                        setSelectedUser(null);
                                    }}>

                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            }
            {showLogsModal &&
                <div className="modal-backdrop fade show"></div>
            }
        </div>);

}