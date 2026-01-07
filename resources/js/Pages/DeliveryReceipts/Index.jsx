import React, { useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, usePage } from "@inertiajs/react";
import Modal from "@/Components/Main/Modal";
import DeliveryReceipt from "@/Components/Tickets/DeliveryReceipt";
import { createPortal } from "react-dom";
import { useRoleApi } from "@/Hooks/useRoleApi";
import { toast } from "react-hot-toast";
import axios from "axios";

export default function DeliveryReceiptsIndex({ user, notifications, messages, customer_order_qrcode }) {
    // const { api } = useRoleApi();
    const [deliveryToPrint, setDeliveryToPrint] = useState(null);
    const [openDeliveryModal, setDeliveryModalOpen] = useState(false);

    const [deliveryForm, setDeliveryForm] = useState({
        deliveredTo: "",
        companyName: "",
        address: "",
        drNo: "",
        date: new Date().toISOString().slice(0, 10),
        ticketNo: "",
        deliveredBy: "",
        modeOfDelivery: "Pick-up",
        deliveryDateTime: "",
        items: Array(6).fill({ description: "", qty: "", total: "" })
    });

    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState("");

    const handleOpenDeliveryModal = () => {
        setDeliveryForm({
            deliveredTo: "",
            companyName: "",
            address: "",
            drNo: "",
            date: new Date().toISOString().slice(0, 10),
            ticketNo: "",
            deliveredBy: "",
            modeOfDelivery: "Pick-up",
            deliveryDateTime: "",
            items: Array(6).fill({ description: "", qty: "", total: "" })
        });
        setSearchError("");
        setDeliveryModalOpen(true);
    };

    const handlePrintDeliveryReceipt = () => {
        setDeliveryToPrint(deliveryForm);
        setDeliveryModalOpen(false);
        document.body.classList.add("printing-dr");
        setTimeout(() => {
            window.print();
            document.body.classList.remove("printing-dr");
            setDeliveryToPrint(null);
        }, 500);
    };

    const handleDRItemChange = (index, field, value) => {
        const newItems = [...deliveryForm.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setDeliveryForm({ ...deliveryForm, items: newItems });
    };

    const addDRRow = () => {
        setDeliveryForm({
            ...deliveryForm,
            items: [...deliveryForm.items, { description: "", qty: "", total: "" }]
        });
    };

    const removeDRRow = (index) => {
        const newItems = deliveryForm.items.filter((_, i) => i !== index);
        setDeliveryForm({
            ...deliveryForm,
            items: newItems.length > 0 ? newItems : [{ description: "", qty: "", total: "" }]
        });
    };

    const handleSearchTicketDR = async (ticketNo) => {
        if (!ticketNo) return;
        setSearching(true);
        setSearchError("");
        try {
            // Use the dedicated JSON search endpoint
            const response = await axios.get(`/api/tickets/search?ticket_number=${ticketNo}`);
            if (response.data && response.data.ticket) {
                const ticket = response.data.ticket;
                setDeliveryForm({
                    ...deliveryForm,
                    deliveredTo: ticket.customer ? `${ticket.customer.firstname} ${ticket.customer.lastname}` : deliveryForm.deliveredTo,
                    companyName: ticket.customer?.company_name || deliveryForm.companyName,
                    address: ticket.customer?.address || deliveryForm.address,
                    ticketNo: ticket.ticket_number,
                    items: [
                        { description: ticket.description || ticket.job_type?.name || "", qty: ticket.quantity || "", total: ticket.total_amount || "" },
                        ...deliveryForm.items.slice(1)
                    ]
                });
                toast.success("Ticket details loaded");
            } else {
                setSearchError(`Ticket "${ticketNo}" not found. Please check the ticket number.`);
            }
        } catch (error) {
            console.error("Search failed", error);
            if (error.response && error.response.status === 404) {
                setSearchError(`Ticket "${ticketNo}" not found. Please check the ticket number.`);
            } else {
                setSearchError("Error connection to the server. Please try again.");
            }
        } finally {
            setSearching(false);
        }
    };

    return (
        <AdminLayout user={user} notifications={notifications} messages={messages}>
            <Head title="Delivery Receipts" />

            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-title d-flex justify-content-between align-items-center">
                                <h4>Delivery Receipts</h4>
                                <button
                                    className="btn btn-danger"
                                    onClick={handleOpenDeliveryModal}
                                >
                                    <i className="ti-printer mr-2"></i> Prepare New Receipt
                                </button>
                            </div>
                            <div className="card-body">
                                <p className="text-muted">
                                    Use this module to prepare and print delivery receipts. You can search for existing tickets or enter details manually.
                                </p>

                                <div className="p-5 text-center border rounded bg-light mt-4">
                                    <i className="ti-receipt text-primary" style={{ fontSize: '48px' }}></i>
                                    <h5 className="mt-3">Ready to print?</h5>
                                    <p>Click the "Prepare New Receipt" button to start.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delivery Receipt Modal */}
            <Modal
                title="Prepare Delivery Receipt"
                isOpen={openDeliveryModal}
                onClose={() => setDeliveryModalOpen(false)}
                size="5xl"
                submitButtonText={null}
            >
                <div className="modal-body p-4">
                    {searchError && (
                        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
                            <strong><i className="ti-alert mr-2"></i> </strong> {searchError}
                            <button type="button" className="close" onClick={() => setSearchError("")}>
                                <span>&times;</span>
                            </button>
                        </div>
                    )}
                    <div className="row">
                        <div className="col-md-8">
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label font-weight-bold">Delivered to</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={deliveryForm.deliveredTo}
                                        onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveredTo: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label font-weight-bold">Company Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={deliveryForm.companyName}
                                        onChange={(e) => setDeliveryForm({ ...deliveryForm, companyName: e.target.value })}
                                    />
                                </div>
                                <div className="col-12 mb-3">
                                    <label className="form-label font-weight-bold">Address</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={deliveryForm.address}
                                        onChange={(e) => setDeliveryForm({ ...deliveryForm, address: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="row">
                                <div className="col-12 mb-3">
                                    <label className="form-label font-weight-bold">Ticket No.</label>
                                    <div className="input-group">
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Enter ticket ID..."
                                            value={deliveryForm.ticketNo}
                                            onChange={(e) => setDeliveryForm({ ...deliveryForm, ticketNo: e.target.value })}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearchTicketDR(deliveryForm.ticketNo)}
                                        />
                                        <button
                                            className="btn btn-outline-primary"
                                            type="button"
                                            onClick={() => handleSearchTicketDR(deliveryForm.ticketNo)}
                                            disabled={searching}
                                        >
                                            {searching ? <i className="fa fa-spinner fa-spin"></i> : <i className="ti-search"></i>}
                                        </button>
                                    </div>
                                </div>
                                <div className="col-12 mb-3">
                                    <label className="form-label font-weight-bold">DR NO.</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={deliveryForm.drNo}
                                        onChange={(e) => setDeliveryForm({ ...deliveryForm, drNo: e.target.value })}
                                    />
                                </div>
                                <div className="col-12 mb-3">
                                    <label className="form-label font-weight-bold">Date</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={deliveryForm.date}
                                        onChange={(e) => setDeliveryForm({ ...deliveryForm, date: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="table-responsive mt-3">
                        <table className="table table-bordered table-sm">
                            <thead className="bg-light">
                                <tr>
                                    <th style={{ width: '50px' }}>No</th>
                                    <th>Description</th>
                                    <th style={{ width: '100px' }}>Qty</th>
                                    <th style={{ width: '150px' }}>Total</th>
                                    <th style={{ width: '40px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {deliveryForm.items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="text-center align-middle">{index + 1}</td>
                                        <td>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm border-0 bg-transparent"
                                                value={item.description}
                                                onChange={(e) => handleDRItemChange(index, 'description', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm border-0 bg-transparent text-center"
                                                value={item.qty}
                                                onChange={(e) => handleDRItemChange(index, 'qty', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm border-0 bg-transparent text-center"
                                                value={item.total}
                                                onChange={(e) => handleDRItemChange(index, 'total', e.target.value)}
                                            />
                                        </td>
                                        <td className="text-center align-middle">
                                            <button
                                                type="button"
                                                className="btn btn-link text-danger p-0"
                                                onClick={() => removeDRRow(index)}
                                                title="Remove Row"
                                            >
                                                <i className="ti-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm mb-3"
                        onClick={addDRRow}
                    >
                        <i className="ti-plus mr-1"></i> Add Row
                    </button>

                    <div className="row mt-3">
                        <div className="col-md-6">
                            <h6 className="font-weight-bold">Delivery Details</h6>
                            <div className="mb-2">
                                <label className="small mb-1">Delivered By</label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={deliveryForm.deliveredBy}
                                    onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveredBy: e.target.value })}
                                />
                            </div>
                            <div className="mb-2">
                                <label className="small mb-1">Mode of Delivery</label>
                                <select
                                    className="form-control form-control-sm"
                                    value={deliveryForm.modeOfDelivery}
                                    onChange={(e) => setDeliveryForm({ ...deliveryForm, modeOfDelivery: e.target.value })}
                                >
                                    <option value="Pick-up">Pick-up</option>
                                    <option value="Courier">Courier</option>
                                    <option value="In-house">In-house office/ Delivery</option>
                                </select>
                            </div>
                            <div className="mb-2">
                                <label className="small mb-1">Date & Time</label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={deliveryForm.deliveryDateTime}
                                    onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryDateTime: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer border-top px-0 pb-0 pt-3 mt-4">
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setDeliveryModalOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={handlePrintDeliveryReceipt}
                        >
                            <i className="ti-printer mr-1"></i> Print Delivery Receipt
                        </button>
                    </div>
                </div>
            </Modal>

            {createPortal(
                <div id="dr-print-overlay" style={{ display: deliveryToPrint ? 'block' : 'none' }}>
                    {deliveryToPrint && (
                        <DeliveryReceipt data={deliveryToPrint} />
                    )}
                </div>,
                document.body
            )}

            <style>{`
                @media print {
                    @page {
                        margin: 0mm;
                        size: A4 landscape;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    body.printing-dr {
                        visibility: hidden;
                        overflow: hidden !important;
                        height: 209mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    body.printing-dr #app {
                        display: none !important;
                    }
                    body.printing-dr #dr-print-overlay {
                        visibility: visible !important;
                        display: block !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        background: white !important;
                        z-index: 99999 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    body.printing-dr #dr-print-overlay * {
                        visibility: visible !important;
                    }
                }
            `}</style>
        </AdminLayout>
    );
}
