/**
 * Admin Dashboard - Dynamic Sales Analytics
 * 
 * Features:
 * - Real-time sales metrics from database
 * - Dynamic date filtering (today, week, month, year)
 * - Period-over-period comparison analytics
 * - Daily orders line chart with full month view
 * - Daily revenue stacked bar chart (Sales + Net Income)
 * - Financial calculations: Total Sales, Net Income, COGS, Receivables
 * - User activity tracking (FrontDesk, Designer, Production)
 * 
 * Data Sources:
 * - Tickets: Order/ticket data with payment status
 * - Payments: Payment ledger with posted transactions
 * - Users: Role-based activity tracking
 * 
 * Calculations:
 * - Total Sales: Sum of posted payments (excluding pending status)
 * - Net Income: Sales - Discounts - COGS (30% estimate)
 * - COGS: Cost of Goods Sold (estimated at 30% of sales for printing services)
 * - Receivables: Outstanding balances (pending/partial payments)
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router } from "@inertiajs/react";
import Modal from "@/Components/Main/Modal";
import { LineChart } from "@mui/x-charts/LineChart";
import {
    Box,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import CardStatistics from "@/Components/Common/CardStatistics";

export default function Dashboard({
    user = {},
    notifications = [],
    messages = [],
    filters = {},
    dashboardData = {},
}) {
    const [openPaymentModal, setPaymentModalOpen] = useState(false);

    const handleSave = () => {
        console.log("save");
    };

    const [year, setYear] = useState(filters.year || new Date().getFullYear().toString());
    const [month, setMonth] = useState(filters.month || (new Date().getMonth() + 1).toString().padStart(2, '0'));
    const [dateRange, setDateRange] = useState(filters.date_range || "this_month");
    const [refreshing, setRefreshing] = useState(false);


    // Extract data from backend
    const currentStats = dashboardData.current_stats || {};
    const previousStats = dashboardData.previous_stats || {};
    const dailyOrders = dashboardData.daily_orders || [];
    const dailyRevenue = dashboardData.daily_revenue || [];

    // Calculate percentage changes
    const calculateChange = (current, previous) => {
        if (!previous || previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    const ordersChange = calculateChange(currentStats.total_orders, previousStats.total_orders);
    const completedChange = calculateChange(currentStats.completed_orders, previousStats.completed_orders);
    const salesChange = calculateChange(currentStats.total_sales, previousStats.total_sales);
    const revenueChange = calculateChange(currentStats.net_income, previousStats.net_income);

    // Prepare chart data
    const xData = dailyOrders.map((d) => d.day.toString());
    const yData = dailyOrders.map((d) => d.orders);

    const xDataR = dailyRevenue.map((d) => d.day.toString());
    const yDataSales = dailyRevenue.map((d) => d.sales);
    const yDataNetIncome = dailyRevenue.map((d) => d.net_income);

    const pesoFormatter = (value) => {
        if (value >= 1_000_000_000) {
            return `${(value / 1_000_000_000).toFixed(1)}B`;
        } else if (value >= 1_000_000) {
            return `${(value / 1_000_000).toFixed(1)}M`;
        } else if (value >= 1_000) {
            return `${(value / 1_000).toFixed(1)}K`;
        }
        return `${value}`;
    };

    const refreshDashboard = () => {
        setRefreshing(true);
        router.get(
            "/admin/",
            { date_range: dateRange, year, month },
            {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setRefreshing(false),
            }
        );
    };

    const handleDateRangeChange = (range) => {
        setDateRange(range);
        router.get(
            "/admin/",
            { date_range: range, year, month },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleYearChange = (newYear) => {
        setYear(newYear);
        router.get(
            "/admin/",
            { date_range: dateRange, year: newYear, month },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleMonthChange = (newMonth) => {
        setMonth(newMonth);
        router.get(
            "/admin/",
            { date_range: dateRange, year, month: newMonth },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    return (
        <AdminLayout
            user={user}
            notifications={notifications}
            messages={messages}
        >
            <Head title="Dashboard" />

            <div className="row">
                <div className="col-lg-8 p-r-0 title-margin-right">
                    <div className="page-header">
                        <div className="page-title">
                            <h1>
                                Hello, <span>Welcome Here</span>
                            </h1>
                        </div>
                    </div>
                </div>
                <div className="col-lg-4 p-l-0 title-margin-left">
                    <div className="page-header">
                        <div className="page-title">
                            <ol className="breadcrumb">
                                <li className="breadcrumb-item">
                                    <a href="#">Dashboard</a>
                                </li>
                                <li className="breadcrumb-item active">Home</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                title="Payments"
                isOpen={openPaymentModal}
                onClose={() => setPaymentModalOpen(false)}
                onSave={handleSave}
                size="3xl"
                submitButtonText="Record Payment"
            >
                <form>
                    <div className="mb-4">
                        <h3 className="mb-4">
                            {" "}
                            Record Payment for Ticket #20454-12
                        </h3>
                        <hr />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">
                            Customer : <b>John Doe</b>
                        </label>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">
                            Amount Due : <b> P 2,000.00</b>
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                            <label className="block text-sm font-medium">
                                Paymeny Amount :
                            </label>
                            <input
                                type="text"
                                className="mt-1 w-full border"
                                placeholder="0.00"
                                value=""
                            // value={forms.ticket.due_date}

                            // onChange={(e) =>
                            //     setForms({
                            //         ...forms,
                            //         ticket: {
                            //             ...forms.ticket,
                            //             due_date: e.target.value,
                            //         },
                            //     })
                            // }
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">
                                Payment Method
                            </label>
                            <select class name="" id="">
                                <option value="cash">Cash</option>
                                <option value="cash">Card</option>
                                <option value="cash">Gcash</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 mt-2">
                        <div>
                            <label className="block text-sm font-medium">
                                Notes
                            </label>
                            <input
                                type="text"
                                className="mt-1 w-full border rounded-md p-2" // fixed small width
                                placeholder=""
                                value=""
                            // value={forms.ticket.quantity}
                            // onChange={(e) =>
                            //     setForms({
                            //         ...forms,
                            //         ticket: {
                            //             ...forms.ticket,
                            //             quantity: e.target.value,
                            //         },
                            //     })
                            // }
                            />
                        </div>
                    </div>
                </form>
            </Modal>

            <section id="main-content">
                {/* Date Filter Section */}
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-200">
                        <button
                             onClick={refreshDashboard}
                            className="btn btn-sm btn-link"
                            disabled={refreshing}
                        >
                            <i className={`ti-reload "animate-spin"`}></i>
                            {refreshing ? " Refreshing..." : " Refresh"}
                        </button> |
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <select
                            className="text-sm font-medium text-gray-700 border-none bg-transparent focus:ring-0 p-0 pr-6 cursor-pointer"
                            value={dateRange}
                            onChange={(e) => handleDateRangeChange(e.target.value)}
                        >
                            <option value="today">Today</option>
                            <option value="this_week">This Week</option>
                            <option value="this_month">This Month</option>
                            <option value="last_30_days">Last 30 Days</option>
                            <option value="this_year">This Year</option>
                            {Array.from({ length: new Date().getFullYear() - 2023 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                                <option key={year} value={`year_${year}`}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <div className="col-lg-3">
                        <CardStatistics
                            label="Total Orders"
                            statistics={currentStats.total_orders || 0}
                            icon="ti-ticket"
                            color="bg-primary"
                            statChange={true}
                            changePercent={ordersChange}
                            changeLabel={`vs previous period`}
                        />
                    </div>
                    <div className="col-lg-3">
                        <CardStatistics
                            label="Complete Orders"
                            statistics={currentStats.completed_orders || 0}
                            icon="ti-check-box"
                            color="bg-success"
                            statChange={true}
                            changePercent={completedChange}
                            changeLabel={`vs previous period`}
                        />
                    </div>
                    <div className="col-lg-3">
                        <CardStatistics
                            label="Total Sales"
                            statistics={`₱ ${(currentStats.total_sales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            icon="ti-stats-up"
                            color="bg-info"
                            statChange={true}
                            changePercent={salesChange}
                            changeLabel={`vs previous period`}
                        />
                    </div>
                    <div className="col-lg-3">
                        <CardStatistics
                            label="Net Income"
                            statistics={`₱ ${(currentStats.net_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            icon="ti-money"
                            color="bg-success"
                            statChange={true}
                            changePercent={revenueChange}
                            changeLabel={`vs previous period`}
                        />
                    </div>
                </div>
                <div className="row">
                    <div className="col-lg-6">
                        <div className="card">
                            <div className="card-body">
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="h6" gutterBottom>
                                        Daily Orders
                                    </Typography>

                                    {/* 🔹 Year and Month selectors */}
                                    <Box
                                        sx={{ display: "flex", gap: 1, mb: 2 }}
                                    >
                                        <FormControl size="small">
                                            <InputLabel>Year</InputLabel>
                                            <Select
                                                value={year}
                                                label="Year"
                                                onChange={(e) =>
                                                    handleYearChange(e.target.value)
                                                }
                                                sx={{ minWidth: 100 }}
                                            >
                                                {[2024, 2025, 2026].map((y) => (
                                                    <MenuItem key={y} value={y.toString()}>
                                                        {y}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>

                                        <FormControl size="small">
                                            <InputLabel>Month</InputLabel>
                                            <Select
                                                value={month}
                                                label="Month"
                                                onChange={(e) =>
                                                    handleMonthChange(e.target.value)
                                                }
                                                sx={{ minWidth: 100 }}
                                            >
                                                {['January', 'February', 'March', 'April', 'May', 'June', 
                                                  'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                                                    <MenuItem key={i} value={(i + 1).toString().padStart(2, '0')}>
                                                        {m}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Box>
                                </Box>
                                <Box>
                                    {/* 🔹 Chart */}
                                    <LineChart
                                        xAxis={[
                                            {
                                                data: xData,
                                                label: "Day",
                                                scaleType: "band",
                                            },
                                        ]}
                                        yAxis={[
                                            {
                                                label: "Orders",
                                            },
                                        ]}
                                        series={[
                                            {
                                                data: yData,
                                                label: "Order",
                                                color: "#0b84ff",
                                            },
                                        ]}
                                        width={800}
                                        height={400}
                                    />
                                </Box>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="card">
                            <div className="card-body"></div>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="h6" gutterBottom>
                                    Daily Revenue
                                </Typography>

                                {/* 🔹 Year & Month selectors */}
                                <Box sx={{ display: "flex", justifyContent: 'flex-end', gap: 1, mb: 2 }}>
                                    <FormControl size="small">
                                        <InputLabel>Year</InputLabel>
                                        <Select
                                            size="small"
                                            value={year}
                                            label="Year"
                                            onChange={(e) =>
                                                handleYearChange(e.target.value)
                                            }
                                            sx={{ minWidth: 100 }}
                                        >
                                            {[2024, 2025, 2026].map((y) => (
                                                <MenuItem key={y} value={y.toString()}>
                                                    {y}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <FormControl size="small">
                                        <InputLabel>Month</InputLabel>
                                        <Select
                                            size="small"
                                            value={month}
                                            label="Month"
                                            onChange={(e) =>
                                                handleMonthChange(e.target.value)
                                            }
                                            sx={{ minWidth: 120 }}
                                        >
                                            {['January', 'February', 'March', 'April', 'May', 'June', 
                                              'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                                                <MenuItem key={i} value={(i + 1).toString().padStart(2, '0')}>
                                                    {m}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Box>
                            <Box>

                                {/* 🔹 Stacked Bar Chart - Sales vs Net Income */}
                                <BarChart
                                    xAxis={[
                                        {
                                            data: xDataR,
                                            label: "Day",
                                            scaleType: "band",
                                        },
                                    ]}
                                    yAxis={[
                                        {
                                            label: "Amount (₱)",
                                            valueFormatter: pesoFormatter,
                                        },
                                    ]}
                                    series={[
                                        {
                                            data: yDataNetIncome,
                                            label: "Net Income",
                                            color: "#10b981",
                                            stack: 'total',
                                        },
                                        {
                                            data: yDataSales.map((sales, i) => sales - yDataNetIncome[i]),
                                            label: "COGS",
                                            color: "#f59e0b",
                                            stack: 'total',
                                        },
                                    ]}
                                    width={800}
                                    height={400}
                                />
                            </Box>
                        </div>
                    </div>
                </div>
                
                <div className="row">
                    <div className="col-lg-4">
                        <div className="card">
                            <div className="card-title pr">
                                <h4>Front Desk Activity</h4>
                            </div>
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table student-data-table m-t-20">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Name</th>
                                                <th>Tickets</th>
                                                <th>Last Activity</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(dashboardData.frontdesk_transactions || []).length > 0 ? (
                                                dashboardData.frontdesk_transactions.map((transaction, index) => (
                                                    <tr key={index}>
                                                        <td>{index + 1}</td>
                                                        <td>{transaction.name}</td>
                                                        <td>{transaction.tickets_created}</td>
                                                        <td>{transaction.last_activity}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" className="text-center">No activity</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-4">
                        <div className="card">
                            <div className="card-title pr">
                                <h4>Designer Activity</h4>
                            </div>
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table student-data-table m-t-20">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Name</th>
                                                <th>Tickets</th>
                                                <th>Last Activity</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(dashboardData.designer_transactions || []).length > 0 ? (
                                                dashboardData.designer_transactions.map((transaction, index) => (
                                                    <tr key={index}>
                                                        <td>{index + 1}</td>
                                                        <td>{transaction.name}</td>
                                                        <td>{transaction.tickets_created}</td>
                                                        <td>{transaction.last_activity}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" className="text-center">No activity</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-4">
                        <div className="card">
                            <div className="card-title pr">
                                <h4>Production Activity</h4>
                            </div>
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table student-data-table m-t-20">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Name</th>
                                                <th>Tickets</th>
                                                <th>Last Activity</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(dashboardData.production_transactions || []).length > 0 ? (
                                                dashboardData.production_transactions.map((transaction, index) => (
                                                    <tr key={index}>
                                                        <td>{index + 1}</td>
                                                        <td>{transaction.name}</td>
                                                        <td>{transaction.tickets_created}</td>
                                                        <td>{transaction.last_activity}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" className="text-center">No activity</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                   
                </div>
            </section>

        </AdminLayout>
    );
}
