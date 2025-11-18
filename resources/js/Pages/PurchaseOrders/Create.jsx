import React, { useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Footer from "@/Components/Layouts/Footer";
import FlashMessage from "@/Components/Common/FlashMessage";
import FormInput from "@/Components/Common/FormInput";

export default function PurchaseOrdersCreate({
    user = {},
    notifications = [],
    messages = [],
    stockItems = [],
}) {
    const [items, setItems] = useState([{ stock_item_id: "", quantity: 0, unit_cost: 0, notes: "" }]);
    const [formData, setFormData] = useState({
        supplier: "",
        supplier_contact: "",
        supplier_email: "",
        order_date: new Date().toISOString().split("T")[0],
        expected_delivery_date: "",
        tax: 0,
        shipping_cost: 0,
        notes: "",
        internal_notes: "",
    });
    const { flash } = usePage().props;

    const handleAddItem = () => {
        setItems([...items, { stock_item_id: "", quantity: 0, unit_cost: 0, notes: "" }]);
    };

    const handleRemoveItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        
        // Auto-fill unit cost from stock item if available
        if (field === "stock_item_id") {
            const stockItem = stockItems.find((si) => si.id === parseInt(value));
            if (stockItem) {
                newItems[index].unit_cost = stockItem.unit_cost || 0;
            }
        }
        
        setItems(newItems);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validate items
        const validItems = items.filter(
            (item) => item.stock_item_id && item.quantity > 0 && item.unit_cost >= 0
        );
        
        if (validItems.length === 0) {
            alert("Please add at least one valid item.");
            return;
        }

        router.post("/purchase-orders", {
            ...formData,
            items: validItems,
        }, {
            preserveState: false,
            preserveScroll: true,
        });
    };

    return (
        <AdminLayout user={user} notifications={notifications} messages={messages}>
            <Head title="Create Purchase Order" />

            {flash?.success && <FlashMessage type="success" message={flash.success} />}
            {flash?.error && <FlashMessage type="error" message={flash.error} />}

            <div className="row">
                <div className="col-lg-8 p-r-0 title-margin-right">
                    <div className="page-header">
                        <div className="page-title">
                            <h1>
                                Create <span>Purchase Order</span>
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
                                    <a href="/purchase-orders">Purchase Orders</a>
                                </li>
                                <li className="breadcrumb-item active">Create</li>
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
                                        <div className="card-title mt-3">
                                            <h4>Purchase Order Details</h4>
                                        </div>
                                        <div className="card-body">
                                            <form onSubmit={handleSubmit}>
                                                <div className="row">
                                                    <div className="col-md-6">
                                                        <FormInput
                                                            label="Supplier"
                                                            type="text"
                                                            name="supplier"
                                                            value={formData.supplier}
                                                            onChange={(e) =>
                                                                setFormData({ ...formData, supplier: e.target.value })
                                                            }
                                                        />
                                                    </div>
                                                    <div className="col-md-6">
                                                        <FormInput
                                                            label="Supplier Contact"
                                                            type="text"
                                                            name="supplier_contact"
                                                            value={formData.supplier_contact}
                                                            onChange={(e) =>
                                                                setFormData({ ...formData, supplier_contact: e.target.value })
                                                            }
                                                        />
                                                    </div>
                                                    <div className="col-md-6">
                                                        <FormInput
                                                            label="Supplier Email"
                                                            type="email"
                                                            name="supplier_email"
                                                            value={formData.supplier_email}
                                                            onChange={(e) =>
                                                                setFormData({ ...formData, supplier_email: e.target.value })
                                                            }
                                                        />
                                                    </div>
                                                    <div className="col-md-6">
                                                        <FormInput
                                                            label="Order Date"
                                                            type="date"
                                                            name="order_date"
                                                            value={formData.order_date}
                                                            onChange={(e) =>
                                                                setFormData({ ...formData, order_date: e.target.value })
                                                            }
                                                        />
                                                    </div>
                                                    <div className="col-md-6">
                                                        <FormInput
                                                            label="Expected Delivery Date"
                                                            type="date"
                                                            name="expected_delivery_date"
                                                            value={formData.expected_delivery_date}
                                                            onChange={(e) =>
                                                                setFormData({ ...formData, expected_delivery_date: e.target.value })
                                                            }
                                                        />
                                                    </div>
                                                    <div className="col-md-3">
                                                        <FormInput
                                                            label="Tax"
                                                            type="number"
                                                            name="tax"
                                                            value={formData.tax}
                                                            onChange={(e) =>
                                                                setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })
                                                            }
                                                            step="0.01"
                                                            min="0"
                                                        />
                                                    </div>
                                                    <div className="col-md-3">
                                                        <FormInput
                                                            label="Shipping Cost"
                                                            type="number"
                                                            name="shipping_cost"
                                                            value={formData.shipping_cost}
                                                            onChange={(e) =>
                                                                setFormData({ ...formData, shipping_cost: parseFloat(e.target.value) || 0 })
                                                            }
                                                            step="0.01"
                                                            min="0"
                                                        />
                                                    </div>
                                                    <div className="col-md-6">
                                                        <FormInput
                                                            label="Notes"
                                                            type="textarea"
                                                            name="notes"
                                                            value={formData.notes}
                                                            onChange={(e) =>
                                                                setFormData({ ...formData, notes: e.target.value })
                                                            }
                                                        />
                                                    </div>
                                                    <div className="col-md-6">
                                                        <FormInput
                                                            label="Internal Notes"
                                                            type="textarea"
                                                            name="internal_notes"
                                                            value={formData.internal_notes}
                                                            onChange={(e) =>
                                                                setFormData({ ...formData, internal_notes: e.target.value })
                                                            }
                                                        />
                                                    </div>
                                                </div>

                                                <hr className="my-4" />

                                                <div className="d-flex justify-content-between align-items-center mb-3">
                                                    <h5>Items</h5>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-primary"
                                                        onClick={handleAddItem}
                                                    >
                                                        <i className="ti-plus"></i> Add Item
                                                    </button>
                                                </div>

                                                <div className="table-responsive">
                                                    <table className="table table-bordered">
                                                        <thead>
                                                            <tr>
                                                                <th>Stock Item</th>
                                                                <th>Quantity</th>
                                                                <th>Unit Cost</th>
                                                                <th>Total</th>
                                                                <th>Notes</th>
                                                                <th>Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {items.map((item, index) => (
                                                                <tr key={index}>
                                                                    <td>
                                                                        <select
                                                                            className="form-control"
                                                                            value={item.stock_item_id}
                                                                            onChange={(e) =>
                                                                                handleItemChange(index, "stock_item_id", e.target.value)
                                                                            }
                                                                            required
                                                                        >
                                                                            <option value="">Select Item</option>
                                                                            {stockItems.map((si) => (
                                                                                <option key={si.id} value={si.id}>
                                                                                    {si.name} ({si.sku})
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="number"
                                                                            className="form-control"
                                                                            step="0.01"
                                                                            min="0.01"
                                                                            value={item.quantity}
                                                                            onChange={(e) =>
                                                                                handleItemChange(index, "quantity", parseFloat(e.target.value) || 0)
                                                                            }
                                                                            required
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="number"
                                                                            className="form-control"
                                                                            step="0.01"
                                                                            min="0"
                                                                            value={item.unit_cost}
                                                                            onChange={(e) =>
                                                                                handleItemChange(index, "unit_cost", parseFloat(e.target.value) || 0)
                                                                            }
                                                                            required
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        ${((item.quantity || 0) * (item.unit_cost || 0)).toFixed(2)}
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control"
                                                                            value={item.notes}
                                                                            onChange={(e) =>
                                                                                handleItemChange(index, "notes", e.target.value)
                                                                            }
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        {items.length > 1 && (
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-sm btn-danger"
                                                                                onClick={() => handleRemoveItem(index)}
                                                                            >
                                                                                <i className="ti-trash"></i>
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                <div className="d-flex justify-content-end gap-2 mt-4">
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary"
                                                        onClick={() => router.get("/purchase-orders")}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button type="submit" className="btn btn-primary">
                                                        <i className="ti-save"></i> Create Purchase Order
                                                    </button>
                                                </div>
                                            </form>
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

