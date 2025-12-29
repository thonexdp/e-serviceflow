import React, { useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import FlashMessage from "@/Components/Common/FlashMessage";
import { formatDate } from "@/Utils/formatDate";
import { formatPeso } from "@/Utils/currency";
import { useRoleApi } from "@/Hooks/useRoleApi";
import Modal from "@/Components/Main/Modal";
import Confirmation from "@/Components/Common/Confirmation";
import ApplicationLogo from "@/Components/ApplicationLogo";

export default function PurchaseOrdersShow({
    user = {},
    notifications = [],
    messages = [],
    purchaseOrder = {}
}) {
    const { flash } = usePage().props;
    const { buildUrl } = useRoleApi();
    const [openApproveModal, setApproveModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [statusPO, setStatusPO] = useState("");


    const handleCloseModal = () => {
        setApproveModalOpen(false);
    };

    const handleConfirmApprove = () => {
        setLoading(true);
        let pathend = "";
        if (statusPO === 'cancel') {
            pathend = "cancel";
        } else if (statusPO === 'ordered') {
            pathend = "mark-ordered";
        } else if (statusPO === 'approve') {
            pathend = "approve";
        }


        router.post(buildUrl(`/purchase-orders/${purchaseOrder.id}/${pathend}`), {}, {
            preserveState: false,
            preserveScroll: true,
            onSuccess: () => {
                setLoading(false);
                handleCloseModal();
            },
            onError: () => {
                setLoading(false);
            }
        });
    };

    const getStatusBadge = (status) => {
        const classes = {
            draft: "badge-secondary",
            pending: "badge-info",
            approved: "badge-primary",
            ordered: "badge-warning",
            received: "badge-success",
            cancelled: "badge-danger"
        };
        return (
            <span className={`badge ${classes[status] || "badge-secondary"}`}>
                {status?.toUpperCase()}
            </span>);

    };

    return (
        <AdminLayout user={user} notifications={notifications} messages={messages}>
            <Head title={`Purchase Order - ${purchaseOrder.po_number}`} />

            {flash?.success && <FlashMessage type="success" message={flash.success} />}
            {flash?.error && <FlashMessage type="error" message={flash.error} />}

            <Modal
                title={statusPO === "cancel" ? "Cancel Purchase Order?" : statusPO === "approve" ? "Approve Purchase Order?" : "Mark Purchase Order?"}
                isOpen={openApproveModal}
                onClose={handleCloseModal}
                size="md"
                submitButtonText={null}>

                <Confirmation
                    label={statusPO === "cancel" ? "Confirm" : statusPO === "approve" ? "Approve" : "Mark as Ordered"}
                    loading={loading}
                    onCancel={handleCloseModal}
                    onSubmit={handleConfirmApprove}
                    description={statusPO === "cancel" ? `Cancel this purchase order?` : statusPO === "approve" ? `Approve this purchase order?` : `Mark this purchase order as ordered?`}
                    color={`${statusPO === "cancel" ? "danger" : statusPO === "approve" ? "success" : "warning"}`} />

            </Modal>

            <div className="row">
                <div className="col-lg-8 p-r-0 title-margin-right">
                    <div className="page-header">
                        <div className="page-title">
                            <h1>
                                Purchase Order <span>{purchaseOrder.po_number}</span>
                            </h1>
                        </div>
                    </div>
                </div>
                <div className="col-lg-4 p-l-0 title-margin-left">
                    <div className="page-header">
                        <div className="page-title">
                            <ol className="breadcrumb">
                                {/* <li className="breadcrumb-item">
                     <a href="/dashboard">Dashboard</a>
                  </li> */}
                                <li className="breadcrumb-item">
                                    <a href={buildUrl("/purchase-orders")}>Purchase Orders</a>
                                </li>
                                <li className="breadcrumb-item active">{purchaseOrder.po_number}</li>
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
                                        <div className="mb-4 d-flex align-items-center">
                                            <img
                                                src="/images/logo.jpg"
                                                alt="RC PrintShoppe Logo"
                                                className="rounded-circle mr-3"
                                                style={{ height: '80px', width: '80px', objectFit: 'cover' }}
                                            />
                                            <h4 className="m-0 font-weight-bold">RC PrintShoppe & General Merchandise</h4>
                                        </div>
                                        <div className="card-title mt-3 d-flex justify-content-between align-items-center">
                                            <h4>Purchase Order Details</h4>
                                            <div>
                                                {getStatusBadge(purchaseOrder.status)}
                                                {purchaseOrder.status === "draft" &&
                                                    <button
                                                        className="btn btn-primary btn-sm ml-2"
                                                        onClick={() => {
                                                            setStatusPO("approve");
                                                            setApproveModalOpen(true);
                                                        }}>

                                                        <i className="ti-check"></i> Approve
                                                    </button>
                                                }
                                                {purchaseOrder.status === "approved" &&
                                                    <button
                                                        className="btn btn-warning btn-sm ml-2"
                                                        onClick={() => {
                                                            setStatusPO("ordered");
                                                            setApproveModalOpen(true);
                                                        }}>

                                                        <i className="ti-shopping-cart"></i> Mark as Ordered
                                                    </button>
                                                }
                                                {!["received", "cancelled"].includes(purchaseOrder.status) &&
                                                    <button
                                                        className="btn btn-danger btn-sm ml-2"
                                                        onClick={() => {
                                                            setStatusPO("cancel");
                                                            setApproveModalOpen(true);
                                                        }}>


                                                        <i className="ti-close"></i> Cancel
                                                    </button>
                                                }
                                            </div>
                                        </div>
                                        <div className="card-body">
                                            <div className="row mb-4">
                                                <div className="col-md-6">
                                                    <p><strong>PO Number:</strong> {purchaseOrder.po_number}</p>
                                                    <p><strong>Supplier:</strong> {purchaseOrder.supplier || "N/A"}</p>
                                                    <p><strong>Contact:</strong> {purchaseOrder.supplier_contact || "N/A"}</p>
                                                    <p><strong>Email:</strong> {purchaseOrder.supplier_email || "N/A"}</p>
                                                </div>
                                                <div className="col-md-6">
                                                    <p><strong>Order Date:</strong> {formatDate(purchaseOrder.order_date)}</p>
                                                    {/* <p><strong>Expected Delivery:</strong> {formatDate(purchaseOrder.expected_delivery_date)}</p> */}
                                                    {purchaseOrder.received_date &&
                                                        <p><strong>Received Date:</strong> {formatDate(purchaseOrder.received_date)}</p>
                                                    }
                                                    <p><strong>Created By:</strong> {purchaseOrder.creator?.name || "N/A"}</p>
                                                    {purchaseOrder.approver &&
                                                        <p><strong>Approved By:</strong> {purchaseOrder.approver?.name}</p>
                                                    }
                                                </div>
                                            </div>

                                            {purchaseOrder.notes &&
                                                <div className="mb-3">
                                                    <strong>Notes:</strong>
                                                    <p>{purchaseOrder.notes}</p>
                                                </div>
                                            }

                                            <hr />

                                            <h5 className="mb-3">Items</h5>
                                            <div className="table-responsive">
                                                <table className="table table-bordered">
                                                    <thead>
                                                        <tr>
                                                            <th>Item</th>
                                                            <th>SKU</th>
                                                            <th>Quantity</th>
                                                            <th>Unit Cost</th>
                                                            <th>Total</th>
                                                            <th>Received</th>
                                                            <th>Remaining</th>
                                                            <th>Notes</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {purchaseOrder.items?.map((item) =>
                                                            <tr key={item.id}>
                                                                <td>{item.stock_item?.name}</td>
                                                                <td>{item.stock_item?.sku}</td>
                                                                <td>
                                                                    {parseFloat(item.quantity).toFixed(2)} {item.stock_item?.base_unit_of_measure}
                                                                </td>
                                                                <td>{formatPeso(parseFloat(item.unit_cost).toFixed(2))}</td>
                                                                <td>{formatPeso(parseFloat(item.total_cost).toFixed(2))}</td>
                                                                <td>
                                                                    {parseFloat(item.received_quantity || 0).toFixed(2)} {item.stock_item?.base_unit_of_measure}
                                                                </td>
                                                                <td>
                                                                    {parseFloat(item.remaining_quantity || 0).toFixed(2)} {item.stock_item?.base_unit_of_measure}
                                                                </td>
                                                                <td>
                                                                    {item.notes || '-'}
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="row mt-4">
                                                <div className="col-md-6"></div>
                                                <div className="col-md-6">
                                                    <table className="table">
                                                        <tbody>
                                                            <tr>
                                                                <td><strong>Subtotal:</strong></td>
                                                                <td className="text-right">{formatPeso(parseFloat(purchaseOrder.subtotal || 0).toFixed(2))}</td>
                                                            </tr>
                                                            <tr>
                                                                <td><strong>Tax:</strong></td>
                                                                <td className="text-right">{formatPeso(parseFloat(purchaseOrder.tax || 0).toFixed(2))}</td>
                                                            </tr>
                                                            <tr>
                                                                <td><strong>Shipping:</strong></td>
                                                                <td className="text-right">{formatPeso(parseFloat(purchaseOrder.shipping_cost || 0).toFixed(2))}</td>
                                                            </tr>
                                                            <tr>
                                                                <td><strong>Total:</strong></td>
                                                                <td className="text-right">
                                                                    <strong>{formatPeso(parseFloat(purchaseOrder.total_amount || 0).toFixed(2))}</strong>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            <div className="d-flex justify-content-end gap-2 mt-4">
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary"
                                                    onClick={() => router.get(buildUrl("/purchase-orders"))}>

                                                    Back to List
                                                </button>
                                                {(purchaseOrder.status === "approved" || purchaseOrder.status === "ordered") &&
                                                    <button
                                                        type="button"
                                                        className="btn btn-success"
                                                        onClick={() => {

                                                            router.get(buildUrl(`/purchase-orders?receive_po_id=${purchaseOrder.id}`));
                                                        }}>

                                                        <i className="ti-check"></i> Receive Items
                                                    </button>
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        </AdminLayout>);

}