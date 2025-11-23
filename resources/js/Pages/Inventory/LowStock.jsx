import React from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router } from "@inertiajs/react";
import DataTable from "@/Components/Common/DataTable";
import FlashMessage from "@/Components/Common/FlashMessage";
import { usePage } from "@inertiajs/react";

export default function InventoryLowStock({
    user = {},
    notifications = [],
    messages = [],
    lowStockItems = [],
}) {
    const { flash } = usePage().props;

    const getStockStatusBadge = (stockItem) => {
        if (stockItem.current_stock <= 0) {
            return <span className="badge badge-danger">Out of Stock</span>;
        } else if (stockItem.current_stock <= stockItem.minimum_stock_level) {
            return <span className="badge badge-warning">Low Stock</span>;
        }
        return <span className="badge badge-success">In Stock</span>;
    };

    const columns = [
        {
            label: "#",
            key: "index",
            render: (row, index) => index + 1,
        },
        { label: "SKU", key: "sku" },
        { label: "Name", key: "name" },
        { label: "Category", key: "category" },
        {
            label: "Current Stock",
            key: "current_stock",
            render: (row) => (
                <span>
                    {parseFloat(row.current_stock).toFixed(2)} {row.base_unit_of_measure}
                </span>
            ),
        },
        {
            label: "Minimum Level",
            key: "minimum_stock_level",
            render: (row) => (
                <span>{parseFloat(row.minimum_stock_level).toFixed(2)} {row.base_unit_of_measure}</span>
            ),
        },
        {
            label: "Status",
            key: "status",
            render: (row) => getStockStatusBadge(row),
        },
        {
            label: "Actions",
            key: "actions",
            render: (row) => (
                <div className="btn-group">
                    <button
                        type="button"
                        className="btn btn-link btn-sm text-primary"
                        onClick={() => router.get(`/purchase-orders/create?stock_item_id=${row.id}`)}
                    >
                        <i className="ti-shopping-cart"></i> Create PO
                    </button>
                    <button
                        type="button"
                        className="btn btn-link btn-sm text-blue-500"
                        onClick={() => router.get(`/inventory/${row.id}/movements`)}
                    >
                        <i className="ti-eye"></i> Movements
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AdminLayout user={user} notifications={notifications} messages={messages}>
            <Head title="Low Stock Items" />

            {flash?.success && <FlashMessage type="success" message={flash.success} />}
            {flash?.error && <FlashMessage type="error" message={flash.error} />}

            <div className="row">
                <div className="col-lg-8 p-r-0 title-margin-right">
                    <div className="page-header">
                        <div className="page-title">
                            <h1>
                                Low Stock <span>Items</span>
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
                                <li className="breadcrumb-item active">Low Stock</li>
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
                                            <h4>Low Stock Items ({lowStockItems.length})</h4>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => router.get("/inventory")}
                                            >
                                                <i className="ti-arrow-left"></i> Back to Inventory
                                            </button>
                                        </div>
                                        <div className="card-body">
                                            {lowStockItems.length === 0 ? (
                                                <div className="alert alert-success">
                                                    <i className="ti-check"></i> All stock items are above minimum levels!
                                                </div>
                                            ) : (
                                                <DataTable
                                                    columns={columns}
                                                    data={lowStockItems}
                                                    emptyMessage="No low stock items found."
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        </AdminLayout>
    );
}

