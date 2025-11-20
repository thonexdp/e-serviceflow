import React from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router } from "@inertiajs/react";
import Footer from "@/Components/Layouts/Footer";
import DataTable from "@/Components/Common/DataTable";
import { formatDate } from "@/Utils/formatDate";

export default function InventoryMovements({
    user = {},
    notifications = [],
    messages = [],
    stockItem = {},
    movements = { data: [] },
}) {
    const getMovementTypeBadge = (type) => {
        const classes = {
            in: "badge-success",
            out: "badge-danger",
            adjustment: "badge-warning",
            transfer: "badge-info",
        };
        return (
            <span className={`badge ${classes[type] || "badge-secondary"}`}>
                {type?.toUpperCase()}
            </span>
        );
    };

    const movementColumns = [
        {
            label: "#",
            key: "index",
            render: (row, index) =>
                (movements.current_page - 1) * movements.per_page + index + 1,
        },
        {
            label: "Date",
            key: "created_at",
            render: (row) => formatDate(row.created_at),
        },
        {
            label: "Type",
            key: "movement_type",
            render: (row) => getMovementTypeBadge(row.movement_type),
        },
        {
            label: "Quantity",
            key: "quantity",
            render: (row) => (
                <span className={row.movement_type === "in" ? "text-success" : "text-danger"}>
                    {row.movement_type === "in" ? "+" : "-"}
                    {parseFloat(row.quantity).toFixed(2)} {stockItem.base_unit_of_measure}
                </span>
            ),
        },
        {
            label: "Unit Cost",
            key: "unit_cost",
            render: (row) => `₱${parseFloat(row.unit_cost || 0).toFixed(2)}`,
        },
        {
            label: "Total Cost",
            key: "total_cost",
            render: (row) => `₱${parseFloat(row.total_cost || 0).toFixed(2)}`,
        },
        {
            label: "Stock Before",
            key: "stock_before",
            render: (row) => `${parseFloat(row.stock_before).toFixed(2)} ${stockItem.base_unit_of_measure}`,
        },
        {
            label: "Stock After",
            key: "stock_after",
            render: (row) => `${parseFloat(row.stock_after).toFixed(2)} ${stockItem.base_unit_of_measure}`,
        },
        {
            label: "User",
            key: "user",
            render: (row) => row.user?.name || "System",
        },
        {
            label: "Notes",
            key: "notes",
            render: (row) => row.notes || "-",
        },
    ];

    return (
        <AdminLayout user={user} notifications={notifications} messages={messages}>
            <Head title={`Stock Movements - ${stockItem.name}`} />

            <div className="row">
                <div className="col-lg-8 p-r-0 title-margin-right">
                    <div className="page-header">
                        <div className="page-title">
                            <h1>
                                Stock Movements <span>{stockItem.name}</span>
                            </h1>
                        </div>
                    </div>
                </div>
                <div className="col-lg-4 p-l-0 title-margin-left">
                    <div className="page-header">
                        <div className="page-title">
                            <ol className="breadcrumb">
                                <li className="breadcrumb-item">
                                    <a href="/dashboard">Dashboard</a>
                                </li>
                                <li className="breadcrumb-item">
                                    <a href="/inventory">Inventory</a>
                                </li>
                                <li className="breadcrumb-item active">Movements</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            <section id="main-content">
                <div className="content-wrap">
                    <div className="main">
                        <div className="container-fluid">
                            <div className="row">
                                <div className="col-lg-12">
                                    <div className="card">
                                        <div className="card-title mt-3 d-flex justify-content-between align-items-center">
                                            <h4>
                                                Stock Movements - {stockItem.name} ({stockItem.sku})
                                            </h4>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => router.get("/inventory")}
                                            >
                                                <i className="ti-arrow-left"></i> Back to Inventory
                                            </button>
                                        </div>
                                        <div className="card-body">
                                            <div className="row mb-3">
                                                <div className="col-md-3">
                                                    <p><strong>Current Stock:</strong> {parseFloat(stockItem.current_stock || 0).toFixed(2)} {stockItem.base_unit_of_measure}</p>
                                                </div>
                                                <div className="col-md-3">
                                                    <p><strong>Minimum Level:</strong> {parseFloat(stockItem.minimum_stock_level || 0).toFixed(2)} {stockItem.base_unit_of_measure}</p>
                                                </div>
                                                <div className="col-md-3">
                                                    <p><strong>Unit Cost:</strong> ₱{parseFloat(stockItem.unit_cost || 0).toFixed(2)}</p>
                                                </div>
                                            </div>

                                            <DataTable
                                                columns={movementColumns}
                                                data={movements.data}
                                                pagination={movements}
                                                emptyMessage="No stock movements found."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </AdminLayout>
    );
}

