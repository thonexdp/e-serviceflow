import React, { useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router } from "@inertiajs/react";
import CardStatistics from "@/Components/Common/CardStatistics";
import { formatPeso } from "@/Utils/currency";
import { formatDate } from "@/Utils/formatDate";

export default function Cashier({
    user = {},
    notifications = [],
    messages = [],
    statistics = {
        todayCollections: 0,
        monthCollections: 0,
        totalReceivables: 0,
        readyForPickupUnpaid: 0,
        todayTransactionsCount: 0,
    },
    urgentReceivables = [],
    latestCollections = [],
    collectionSummary = {},
    filters = { date_range: "today" },
}) {
    const [refreshing, setRefreshing] = useState(false);

    const refreshDashboard = () => {
        setRefreshing(true);
        router.reload({
            onFinish: () => setRefreshing(false),
        });
    };

    const getCollectionIcon = (method) => {
        switch (method?.toLowerCase()) {
            case 'cash': return 'ti-wallet';
            case 'gcash': return 'ti-mobile';
            case 'bank_transfer': return 'ti-home';
            default: return 'ti-money';
        }
    };

    const getCollectionColor = (method) => {
        switch (method?.toLowerCase()) {
            case 'cash': return 'text-success';
            case 'gcash': return 'text-primary';
            case 'bank_transfer': return 'text-info';
            default: return 'text-muted';
        }
    };

    return (
        <AdminLayout user={user} notifications={notifications} messages={messages}>
            <Head title="Cashier Dashboard" />

            <div className="row">
                <div className="col-lg-8 p-r-0 title-margin-right">
                    <div className="page-header">
                        <div className="page-title">
                            <h1>
                                Cashier <span>Dashboard</span>
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
                                <li className="breadcrumb-item active">Cashier</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            <section id="main-content">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-dark font-weight-bold">Financial Overview</h4>
                    <button
                        onClick={refreshDashboard}
                        className="btn btn-sm btn-outline-primary"
                        disabled={refreshing}
                    >
                        <i className={`ti-reload ${refreshing ? "animate-spin" : ""} mr-1`}></i>
                        {refreshing ? "Refreshing..." : "Refresh Data"}
                    </button>
                </div>

                <div className="row">
                    <div className="col-lg-3">
                        <CardStatistics
                            label="Today's Collections"
                            statistics={formatPeso(statistics.todayCollections)}
                            icon="ti-money"
                            color="bg-success"
                            subtitle={`${statistics.todayTransactionsCount} transactions today`}
                        />
                    </div>
                    <div className="col-lg-3">
                        <CardStatistics
                            label="This Month"
                            statistics={formatPeso(statistics.monthCollections)}
                            icon="ti-stats-up"
                            color="bg-info"
                            subtitle="Total collections MTD"
                        />
                    </div>
                    <div className="col-lg-3">
                        <CardStatistics
                            label="Net Receivables"
                            statistics={formatPeso(statistics.totalReceivables)}
                            icon="ti-receipt"
                            color="bg-danger"
                            subtitle="Total outstanding balances"
                        />
                    </div>
                    <div className="col-lg-3">
                        <CardStatistics
                            label="Ready for Pickup (Unpaid)"
                            statistics={statistics.readyForPickupUnpaid}
                            icon="ti-package"
                            color="bg-warning"
                            subtitle="Completed orders with balance"
                        />
                    </div>
                </div>

                <div className="row mt-3">
                    {/* Collection Summary by Method */}
                    <div className="col-lg-4">
                        <div className="card h-100">
                            <div className="card-title">
                                <h4>Today's Summary by Method</h4>
                            </div>
                            <div className="card-body">
                                <ul className="list-group list-group-flush">
                                    {Object.keys(collectionSummary).length > 0 ? (
                                        Object.entries(collectionSummary).map(([method, total]) => (
                                            <li key={method} className="list-group-item d-flex justify-content-between align-items-center px-0">
                                                <div className="d-flex align-items-center">
                                                    <div className={`p-2 rounded-circle bg-light mr-3`}>
                                                        {
                                                            getCollectionIcon(method) === "ti-money" ? "₱" : <i className={`${getCollectionIcon(method)} ${getCollectionColor(method)}`}></i>
                                                        }
                                                    </div>
                                                    <span className="text-capitalize">{method.replace('_', ' ')}</span>
                                                </div>
                                                <span className="font-weight-bold">{formatPeso(total)}</span>
                                            </li>
                                        ))
                                    ) : (
                                        <div className="text-center py-4 text-muted">
                                            <i className="ti-face-smile d-block f-s-30 mb-2"></i>
                                            <p>No collections yet today.</p>
                                        </div>
                                    )}
                                </ul>
                                {statistics.todayCollections > 0 && (
                                    <div className="mt-4 p-3 bg-success-light rounded">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="text-dark font-weight-bold">Grand Total</span>
                                            <span className="h4 mb-0 text-success font-weight-bold">{formatPeso(statistics.todayCollections)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Latest Collections Feed */}
                    <div className="col-lg-8">
                        <div className="card">
                            <div className="card-title pr flex justify-between">
                                <h4>Latest Collections</h4>
                                <a href={route('cashier.finance.index')} className="btn btn-sm btn-link text-primary p-0">View Ledger</a>
                            </div>
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table student-data-table m-t-10">
                                        <thead>
                                            <tr>
                                                <th>Time</th>
                                                <th>Ticket #</th>
                                                <th>Customer</th>
                                                <th>Method</th>
                                                <th className="text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {latestCollections.length > 0 ? (
                                                latestCollections.map((p) => (
                                                    <tr key={p.id}>
                                                        <td className="text-muted small">
                                                            {new Date(p.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="font-weight-bold">
                                                            {p.ticket_number}
                                                            {p.has_promo && (
                                                                <span className="badge badge-success ml-1" style={{ fontSize: '10px' }}>PROMO</span>
                                                            )}
                                                        </td>
                                                        <td>{p.customer_name}</td>
                                                        <td>
                                                            <span className={`badge badge-pill badge-light ${getCollectionColor(p.method)} text-capitalize`}>
                                                                {getCollectionIcon(p.method) === "ti-money" ? "₱ " : <i className={`${getCollectionIcon(p.method)} mr-1`}></i>}
                                                                {p.method.replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="text-right font-weight-bold text-success">
                                                            {formatPeso(p.amount)}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-4 text-muted">
                                                        No transactions recorded today.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    {/* Urgent Receivables */}
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-title pr flex justify-between">
                                <h4>Ready for Pickup - Pending Payment (Urgent)</h4>
                                <span className="badge badge-danger">{statistics.readyForPickupUnpaid} Priority Tickets</span>
                            </div>
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table table-hover student-data-table">
                                        <thead>
                                            <tr>
                                                <th>Ticket ID</th>
                                                <th>Customer</th>
                                                <th>Finished Date</th>
                                                <th>Total Amount</th>
                                                <th>Balance</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {urgentReceivables.length > 0 ? (
                                                urgentReceivables.map((t) => (
                                                    <tr key={t.id}>
                                                        <td>
                                                            <span className="font-weight-bold">{t.ticket_number}</span>
                                                            {t.has_promo && (
                                                                <span className="badge badge-success ml-1" style={{ fontSize: '10px' }}>PROMO</span>
                                                            )}
                                                        </td>
                                                        <td>{t.customer_name}</td>
                                                        <td>{formatDate(t.updated_at)}</td>
                                                        <td>{formatPeso(t.total_amount)}</td>
                                                        <td>
                                                            <span className="text-danger font-weight-bold">
                                                                {formatPeso(t.balance)}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <button
                                                                className="btn btn-sm btn-primary rounded-pill px-3"
                                                                onClick={() => router.visit(route('cashier.finance.index', { search: t.ticket_number }))}
                                                            >
                                                                ₱ Pay
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="6" className="text-center py-4 text-muted">
                                                        Great! No unpaid completed orders at the moment.
                                                    </td>
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
