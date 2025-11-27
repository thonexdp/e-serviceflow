import React, { useState, useEffect } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Footer from "@/Components/Layouts/Footer";
import Modal from "@/Components/Main/Modal";
import DataTable from "@/Components/Common/DataTable";
import SearchBox from "@/Components/Common/SearchBox";
import FlashMessage from "@/Components/Common/FlashMessage";
import FormInput from "@/Components/Common/FormInput";
import { formatDate } from "@/Utils/formatDate";

export default function Productions({
    user = {},
    notifications = [],
    messages = [],
    tickets = { data: [] },
    stockItems = [],
    filters = {},
    summary = {},
}) {
    const [openViewModal, setViewModalOpen] = useState(false);
    const [openUpdateModal, setUpdateModalOpen] = useState(false);
    const [openStockModal, setStockModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [producedQuantity, setProducedQuantity] = useState(0);
    const [stockConsumptions, setStockConsumptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const { flash } = usePage().props;

    // Calculate summary statistics from tickets data
    const calculateSummary = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const allTickets = tickets.data || [];
        const total = allTickets.length;
        const inProgress = allTickets.filter(t => t.status === 'in_production').length;
        const finished = allTickets.filter(t => t.status === 'completed').length;
        const delays = allTickets.filter(t => {
            if (!t.due_date) return false;
            const dueDate = new Date(t.due_date);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate < today && t.status !== 'completed';
        }).length;

        return {
            total: summary.total || total,
            inProgress: summary.inProgress || inProgress,
            finished: summary.finished || finished,
            delays: summary.delays || delays,
        };
    };

    const stats = calculateSummary();

    // Handle fullscreen mode
    useEffect(() => {
        if (isFullscreen) {
            document.body.classList.add('production-fullscreen');
            document.querySelector('.header')?.classList.add('d-none');
            document.querySelector('.sidebar')?.classList.add('d-none');
        } else {
            document.body.classList.remove('production-fullscreen');
            document.querySelector('.header')?.classList.remove('d-none');
            document.querySelector('.sidebar')?.classList.remove('d-none');
        }
        
        return () => {
            document.body.classList.remove('production-fullscreen');
            document.querySelector('.header')?.classList.remove('d-none');
            document.querySelector('.sidebar')?.classList.remove('d-none');
        };
    }, [isFullscreen]);

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const handleView = (ticket) => {
        setSelectedTicket(ticket);
        setViewModalOpen(true);
    };

    const handleUpdate = (ticket) => {
        setSelectedTicket(ticket);
        setProducedQuantity(ticket.produced_quantity || 0);
        setUpdateModalOpen(true);
    };

    const handleCloseModals = () => {
        setViewModalOpen(false);
        setUpdateModalOpen(false);
        setStockModalOpen(false);
        setSelectedTicket(null);
        setProducedQuantity(0);
        setStockConsumptions([]);
    };

    const handleStartProduction = (ticketId) => {
        setLoading(true);
        router.post(`/production/${ticketId}/start`, {}, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                setLoading(false);
            },
            onError: () => {
                setLoading(false);
            },
        });
    };

    const handleUpdateProgress = () => {
        if (!selectedTicket) return;

        const quantity = parseInt(producedQuantity) || 0;
        if (quantity < 0 || quantity > selectedTicket.quantity) {
            alert(`Quantity must be between 0 and ${selectedTicket.quantity}`);
            return;
        }

        setLoading(true);
        const status = quantity >= selectedTicket.quantity ? 'completed' : 'in_production';

        router.post(`/production/${selectedTicket.id}/update`, {
            produced_quantity: quantity,
            status: status,
        }, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                handleCloseModals();
                setLoading(false);
            },
            onError: () => {
                setLoading(false);
            },
        });
    };

    const handleMarkCompleted = (ticketId) => {
        if (!confirm("Mark this ticket as completed? Stock will be automatically deducted.")) return;

        setLoading(true);
        router.post(`/production/${ticketId}/complete`, {}, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                setLoading(false);
            },
            onError: () => {
                setLoading(false);
            },
        });
    };

    const handleOpenStockModal = (ticket) => {
        setSelectedTicket(ticket);
        
        // Pre-populate with suggested stocks based on job type requirements
        const initialConsumptions = [];
        if (ticket.job_type?.stock_requirements) {
            ticket.job_type.stock_requirements.forEach(req => {
                const requiredQty = parseFloat(req.quantity_per_unit) * ticket.quantity;
                initialConsumptions.push({
                    stock_item_id: req.stock_item_id,
                    quantity: requiredQty.toFixed(2),
                    notes: req.notes || '',
                });
            });
        }
        
        // If no requirements, add one empty row
        if (initialConsumptions.length === 0) {
            initialConsumptions.push({
                stock_item_id: '',
                quantity: '',
                notes: '',
            });
        }
        
        setStockConsumptions(initialConsumptions);
        setStockModalOpen(true);
    };

    const handleAddStockConsumption = () => {
        setStockConsumptions([...stockConsumptions, {
            stock_item_id: '',
            quantity: '',
            notes: '',
        }]);
    };

    const handleRemoveStockConsumption = (index) => {
        setStockConsumptions(stockConsumptions.filter((_, i) => i !== index));
    };

    const handleStockConsumptionChange = (index, field, value) => {
        const updated = [...stockConsumptions];
        updated[index][field] = value;
        setStockConsumptions(updated);
    };

    const handleRecordStockConsumption = (e) => {
        e.preventDefault();
        if (!selectedTicket) return;

        const validConsumptions = stockConsumptions.filter(
            c => c.stock_item_id && parseFloat(c.quantity) > 0
        );

        if (validConsumptions.length === 0) {
            alert("Please add at least one stock consumption record.");
            return;
        }

        setLoading(true);
        router.post(`/production/${selectedTicket.id}/record-stock`, {
            stock_consumptions: validConsumptions.map(c => ({
                stock_item_id: parseInt(c.stock_item_id),
                quantity: parseFloat(c.quantity),
                notes: c.notes || null,
            })),
        }, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                handleCloseModals();
                setLoading(false);
            },
            onError: () => {
                setLoading(false);
            },
        });
    };

    const handleQuickAdd = (amount) => {
        const current = parseInt(producedQuantity) || 0;
        const newValue = Math.min(current + amount, selectedTicket?.quantity || 0);
        setProducedQuantity(newValue);
    };

    const getStatusBadge = (status) => {
        const classes = {
            ready_to_print: "badge-info",
            in_production: "badge-warning",
            completed: "badge-success",
            pending: "badge-secondary",
        };
        const labels = {
            ready_to_print: "Ready to Print",
            in_production: "In Progress",
            completed: "Completed",
            pending: "Pending",
        };
        return (
            <div className={`badge ${classes[status] || "badge-secondary"}`}>
                {labels[status] || status?.toUpperCase() || "PENDING"}
            </div>
        );
    };

    const getActionButton = (ticket) => {
        if (ticket.status === "ready_to_print") {
            return (
                <div className="btn-group">
                    <button
                        type="button"
                        className="btn btn-link btn-sm text-blue-500"
                        onClick={() => handleView(ticket)}
                    >
                        <i className="ti-eye"></i> View
                    </button>
                    <button
                        type="button"
                        className="btn btn-link btn-sm text-green-500"
                        onClick={() => handleStartProduction(ticket.id)}
                        disabled={loading}
                    >
                        <i className="ti-play"></i> Start
                    </button>
                </div>
            );
        } else if (ticket.status === "in_production") {
            return (
                <div className="btn-group">
                    <button
                        type="button"
                        className="btn btn-link btn-sm text-blue-500"
                        onClick={() => handleUpdate(ticket)}
                    >
                        <i className="ti-pencil"></i> Update
                    </button>
                    {ticket.produced_quantity >= ticket.quantity && (
                        <button
                            type="button"
                            className="btn btn-link btn-sm text-success"
                            onClick={() => handleMarkCompleted(ticket.id)}
                            disabled={loading}
                        >
                            <i className="ti-check"></i> Complete
                        </button>
                    )}
                </div>
            );
        } else if (ticket.status === "completed") {
            return (
                <span className="text-success">
                    <i className="ti-check"></i> Completed
                    {ticket.stock_consumptions && ticket.stock_consumptions.length > 0 && (
                        <small className="d-block text-muted">
                            Stock deducted automatically
                        </small>
                    )}
                </span>
            );
        } else {
            return (
                <button
                    type="button"
                    className="btn btn-link btn-sm text-blue-500"
                    onClick={() => handleView(ticket)}
                >
                    <i className="ti-eye"></i> View
                </button>
            );
        }
    };

    // Define table columns
    const ticketColumns = [
        {
            label: "#",
            key: "index",
            render: (row, index) =>
                (tickets.current_page - 1) * tickets.per_page + index + 1,
        },
        { label: "Ticket ID", key: "ticket_number" },
        { label: "Description", key: "description" },
        {
            label: "Employee/Team",
            key: "employee",
            render: (row) => {
                // Check if employee/team data exists, otherwise show placeholder
                const employeeName = row.assigned_to?.name || row.employee?.name || row.team?.name || 'Unassigned';
                const teamName = row.team?.name || row.employee?.team || '';
                return (
                    <div>
                        <div className="font-weight-bold">{employeeName}</div>
                        {teamName && <small className="text-muted">{teamName}</small>}
                    </div>
                );
            },
        },
        {
            label: "Quantity",
            key: "quantity",
            render: (row) => (
                <span>
                    <b className={row.produced_quantity >= row.quantity ? "text-success" : "text-warning"}>
                        {row.produced_quantity || 0}
                    </b>
                    {" / "}
                    <b>{row.quantity}</b>
                </span>
            ),
        },
        {
            label: "Status",
            key: "status",
            render: (row) => getStatusBadge(row.status),
        },
        {
            label: "Due Date",
            key: "due_date",
            render: (row) => {
                const dueDate = row.due_date ? new Date(row.due_date) : null;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isOverdue = dueDate && dueDate < today && row.status !== 'completed';
                return (
                    <span className={isOverdue ? "text-danger font-weight-bold" : ""}>
                        {formatDate(row.due_date)}
                        {isOverdue && <i className="ti-alert ml-1"></i>}
                    </span>
                );
            },
        },
        {
            label: "Action",
            key: "action",
            render: (row) => getActionButton(row),
        },
    ];

    const mockupFiles = selectedTicket?.mockup_files || [];

    return (
        <AdminLayout
            user={user}
            notifications={notifications}
            messages={messages}
        >
            <Head title="Production Queue" />

            {/* Fullscreen Toggle Button */}
            <div className="position-fixed" style={{ 
                top: isFullscreen ? '10px' : '20px', 
                right: isFullscreen ? '10px' : '20px', 
                zIndex: 9999 
            }}>
                <button
                    type="button"
                    className="btn shadow-lg"
                    onClick={toggleFullscreen}
                    style={{
                        borderRadius: '50px',
                        padding: isFullscreen ? '10px 20px' : '12px 24px',
                        fontSize: isFullscreen ? '14px' : '16px',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        backgroundColor: isFullscreen ? '#dc3545' : '#007bff',
                        border: 'none',
                        color: 'white',
                        transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }}
                >
                    {isFullscreen ? (
                        <>
                            <i className="ti-close mr-2"></i> Exit Fullscreen
                        </>
                    ) : (
                        <>
                            <i className="ti-fullscreen mr-2"></i> Fullscreen Mode
                        </>
                    )}
                </button>
            </div>

            {/* Flash Messages */}
            {flash?.success && (
                <FlashMessage type="success" message={flash.success} />
            )}
            {flash?.error && (
                <FlashMessage type="error" message={flash.error} />
            )}

            {/* Summary Cards */}
            <div className="row mb-4" style={{ 
                marginTop: isFullscreen ? '20px' : '0',
                marginBottom: isFullscreen ? '30px' : '20px',
            }}>
                <div className="col-lg-3 col-md-6 mb-3">
                    <div className="card shadow-sm border-0" style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '15px',
                        color: 'white',
                        transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div className="card-body p-4">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-white-50 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                                        Total Tickets
                                    </h6>
                                    <h2 className="mb-0" style={{ fontSize: '36px', fontWeight: 'bold' }}>
                                        {stats.total}
                                    </h2>
                                </div>
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <i className="ti-clipboard" style={{ fontSize: '28px' }}></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-lg-3 col-md-6 mb-3">
                    <div className="card shadow-sm border-0" style={{
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        borderRadius: '15px',
                        color: 'white',
                        transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div className="card-body p-4">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-white-50 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                                        In Progress
                                    </h6>
                                    <h2 className="mb-0" style={{ fontSize: '36px', fontWeight: 'bold' }}>
                                        {stats.inProgress}
                                    </h2>
                                </div>
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <i className="ti-reload" style={{ fontSize: '28px' }}></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-lg-3 col-md-6 mb-3">
                    <div className="card shadow-sm border-0" style={{
                        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        borderRadius: '15px',
                        color: 'white',
                        transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div className="card-body p-4">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-white-50 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                                        Finished
                                    </h6>
                                    <h2 className="mb-0" style={{ fontSize: '36px', fontWeight: 'bold' }}>
                                        {stats.finished}
                                    </h2>
                                </div>
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <i className="ti-check" style={{ fontSize: '28px' }}></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-lg-3 col-md-6 mb-3">
                    <div className="card shadow-sm border-0" style={{
                        background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                        borderRadius: '15px',
                        color: 'white',
                        transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div className="card-body p-4">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-white-50 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                                        Delays
                                    </h6>
                                    <h2 className="mb-0" style={{ fontSize: '36px', fontWeight: 'bold' }}>
                                        {stats.delays}
                                    </h2>
                                </div>
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <i className="ti-alert" style={{ fontSize: '28px' }}></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {!isFullscreen && (
                <div className="row">
                    <div className="col-lg-8 p-r-0 title-margin-right">
                        <div className="page-header">
                            <div className="page-title">
                                <h1>
                                    Production Queue <span>Management</span>
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
                                    <li className="breadcrumb-item active">Production Queue</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isFullscreen && (
                <div className="row mb-4">
                    <div className="col-12 text-center">
                        <h1 className="display-4 font-weight-bold mb-2" style={{ 
                            color: '#333',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                        }}>
                            Production Queue Dashboard
                        </h1>
                        <p className="text-muted mb-0" style={{ 
                            fontSize: '20px',
                            fontWeight: '500',
                        }}>
                            {new Date().toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </p>
                        <p className="text-muted" style={{ fontSize: '16px' }}>
                            {new Date().toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                second: '2-digit'
                            })}
                        </p>
                    </div>
                </div>
            )}

            {/* View Modal */}
            <Modal
                title={`Ticket Details - #${selectedTicket?.ticket_number}`}
                isOpen={openViewModal}
                onClose={handleCloseModals}
                size="5xl"
            >
                {selectedTicket && (
                    <div>
                        <div className="row mb-4">
                            <div className="col-md-6">
                                <h5>
                                    Customer: <b>{selectedTicket.customer?.firstname} {selectedTicket.customer?.lastname}</b>
                                </h5>
                                <h5>
                                    Description: <b>{selectedTicket.description}</b>
                                </h5>
                                <p>
                                    Status: {getStatusBadge(selectedTicket.status)}
                                </p>
                            </div>
                            <div className="col-md-6">
                                <p>
                                    <strong>Quantity:</strong> {selectedTicket.produced_quantity || 0} / {selectedTicket.quantity}
                                </p>
                                <p>
                                    <strong>Due Date:</strong> {selectedTicket.due_date ? new Date(selectedTicket.due_date).toLocaleDateString() : "N/A"}
                                </p>
                                {selectedTicket.size_value && (
                                    <p>
                                        <strong>Size:</strong> {selectedTicket.size_value} {selectedTicket.size_unit || ""}
                                    </p>
                                )}
                            </div>
                        </div>

                        <hr className="my-3" />

                        <div className="mb-4">
                            <h6>Design Files:</h6>
                            {mockupFiles.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="table table-sm table-bordered">
                                        <thead>
                                            <tr>
                                                <th>Filename</th>
                                                <th>Uploaded</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mockupFiles.map((file) => (
                                                <tr key={file.id}>
                                                    <td>{file.filename}</td>
                                                    <td>{new Date(file.created_at).toLocaleDateString()}</td>
                                                    <td>
                                                        <a
                                                            href={`/mock-ups/files/${file.id}/download`}
                                                            target="_blank"
                                                            className="btn btn-link btn-sm text-blue-500"
                                                        >
                                                            <i className="ti-download"></i> Download
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-muted">No design files available</p>
                            )}
                        </div>

                        {selectedTicket.status === "ready_to_print" && (
                            <div className="d-flex justify-content-end gap-2">
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={() => {
                                        handleCloseModals();
                                        handleStartProduction(selectedTicket.id);
                                    }}
                                    disabled={loading}
                                >
                                    <i className="ti-play"></i> Start Production
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleCloseModals}
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Update Progress Modal */}
            <Modal
                title={`Update Production - Ticket #${selectedTicket?.ticket_number}`}
                isOpen={openUpdateModal}
                onClose={handleCloseModals}
                size="4xl"
            >
                {selectedTicket && (
                    <div>
                        <div className="mb-4">
                            <h4>
                                Description: <b>{selectedTicket.description}</b>
                            </h4>
                            <p>
                                Status: {getStatusBadge(selectedTicket.status)}
                            </p>
                        </div>

                        <hr className="my-3" />

                        <div className="mb-4">
                            <div className="row align-items-center">
                                <div className="col-md-12 mb-3">
                                    <h3 className="text-lg font-semibold">
                                        Produced so far:{" "}
                                        <span className={producedQuantity >= selectedTicket.quantity ? "text-success" : "text-warning"}>
                                            {producedQuantity} / {selectedTicket.quantity}
                                        </span>
                                    </h3>
                                    <div className="progress mt-2" style={{ height: "25px" }}>
                                        <div
                                            className={`progress-bar ${
                                                producedQuantity >= selectedTicket.quantity
                                                    ? "bg-success"
                                                    : "bg-warning"
                                            }`}
                                            role="progressbar"
                                            style={{
                                                width: `${(producedQuantity / selectedTicket.quantity) * 100}%`,
                                            }}
                                        >
                                            {Math.round((producedQuantity / selectedTicket.quantity) * 100)}%
                                        </div>
                                    </div>
                                </div>

                                <div className="col-md-5">
                                    <FormInput
                                        label="Produced Quantity"
                                        type="number"
                                        name="produced_quantity"
                                        value={producedQuantity}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            setProducedQuantity(Math.min(val, selectedTicket.quantity));
                                        }}
                                        placeholder="0"
                                        min="0"
                                        max={selectedTicket.quantity}
                                        required
                                    />
                                </div>

                                <div className="col-md-7">
                                    <label className="block text-sm font-medium mb-2">Quick Add:</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => handleQuickAdd(1)}
                                        >
                                            <i className="ti-plus"></i> +1
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => handleQuickAdd(2)}
                                        >
                                            <i className="ti-plus"></i> +2
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => handleQuickAdd(5)}
                                        >
                                            <i className="ti-plus"></i> +5
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => handleQuickAdd(10)}
                                        >
                                            <i className="ti-plus"></i> +10
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary btn-sm"
                                            onClick={() => setProducedQuantity(selectedTicket.quantity)}
                                        >
                                            Set to Max
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr className="my-3" />

                        <div className="d-flex justify-content-end gap-2">
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleUpdateProgress}
                                disabled={loading}
                            >
                                {loading ? (
                                    <span>
                                        <i className="ti-reload mr-2 animate-spin"></i> Saving...
                                    </span>
                                ) : (
                                    <span>
                                        <i className="ti-save"></i> Save Progress
                                    </span>
                                )}
                            </button>
                            {producedQuantity >= selectedTicket.quantity && (
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={() => {
                                        handleMarkCompleted(selectedTicket.id)
                                    }}
                                    disabled={loading}
                                >
                                    <i className="ti-check"></i> Mark Completed
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleCloseModals}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Stock Consumption Modal */}
            <Modal
                title={`Record Stock Consumption - Ticket #${selectedTicket?.ticket_number}`}
                isOpen={openStockModal}
                onClose={handleCloseModals}
                size="5xl"
            >
                {selectedTicket && (
                    <div>
                        <div className="mb-4">
                            <h5>
                                Job: <b>{selectedTicket.job_type?.name || 'N/A'}</b>
                            </h5>
                            <p>
                                Quantity Produced: <b>{selectedTicket.produced_quantity || selectedTicket.quantity}</b> {selectedTicket.job_type?.price_by || 'pcs'}
                            </p>
                            {selectedTicket.job_type?.stock_requirements?.length > 0 && (
                                <div className="alert alert-info">
                                    <i className="ti-info"></i> Suggested stocks based on job type requirements are pre-filled. Adjust as needed.
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleRecordStockConsumption}>
                            <div className="table-responsive">
                                <table className="table table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Stock Item</th>
                                            <th>Quantity</th>
                                            <th>Unit</th>
                                            <th>Available</th>
                                            <th>Notes</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stockConsumptions.map((consumption, index) => {
                                            const stockItem = stockItems.find(si => si.id === parseInt(consumption.stock_item_id));
                                            return (
                                                <tr key={index}>
                                                    <td>
                                                        <select
                                                            className="form-control"
                                                            value={consumption.stock_item_id}
                                                            onChange={(e) => handleStockConsumptionChange(index, 'stock_item_id', e.target.value)}
                                                            required
                                                        >
                                                            <option value="">Select Stock Item</option>
                                                            {stockItems.map((si) => (
                                                                <option key={si.id} value={si.id}>
                                                                    {si.name} ({si.sku}) - {parseFloat(si.current_stock).toFixed(2)} {si.base_unit_of_measure} available
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
                                                            value={consumption.quantity}
                                                            onChange={(e) => handleStockConsumptionChange(index, 'quantity', e.target.value)}
                                                            required
                                                        />
                                                    </td>
                                                    <td>
                                                        {stockItem ? stockItem.base_unit_of_measure : '-'}
                                                    </td>
                                                    <td>
                                                        {stockItem ? (
                                                            <span className={parseFloat(stockItem.current_stock) >= parseFloat(consumption.quantity || 0) ? 'text-success' : 'text-danger'}>
                                                                {parseFloat(stockItem.current_stock).toFixed(2)} {stockItem.base_unit_of_measure}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={consumption.notes}
                                                            onChange={(e) => handleStockConsumptionChange(index, 'notes', e.target.value)}
                                                            placeholder="Optional notes"
                                                        />
                                                    </td>
                                                    <td>
                                                        {stockConsumptions.length > 1 && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-danger"
                                                                onClick={() => handleRemoveStockConsumption(index)}
                                                            >
                                                                <i className="ti-trash"></i>
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="d-flex justify-content-between align-items-center mt-3">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    onClick={handleAddStockConsumption}
                                >
                                    <i className="ti-plus"></i> Add Another Item
                                </button>
                                <div className="d-flex gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={handleCloseModals}
                                    >
                                        Skip (Record Later)
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-success"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <span><i className="ti-reload mr-2 animate-spin"></i> Recording...</span>
                                        ) : (
                                            <span><i className="ti-save"></i> Record Consumption</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}
            </Modal>

            <section id="main-content" style={isFullscreen ? { padding: '20px', margin: '0' } : {}}>
                <div className="content-wrap" style={isFullscreen ? { marginLeft: '0', padding: '0' } : {}}>
                    <div className="main" style={isFullscreen ? { padding: '0' } : {}}>
                        <div className="container-fluid" style={isFullscreen ? { maxWidth: '100%', padding: '0 20px' } : {}}>
                            <div className="row">
                                <div className="col-lg-12">
                                    <div className="card shadow-sm" style={{
                                        borderRadius: isFullscreen ? '20px' : '10px',
                                        border: 'none',
                                        overflow: 'hidden',
                                    }}>
                                        {!isFullscreen && (
                                            <div className="card-title mt-3 px-4">
                                                <h4>Production Queue</h4>
                                            </div>
                                        )}
                                        <div className="card-body" style={{ padding: isFullscreen ? '30px' : '20px' }}>
                                            {!isFullscreen && (
                                                <div className="row mt-4 align-items-center">
                                                    <div className="col-md-5">
                                                        <SearchBox
                                                            placeholder="Search tickets..."
                                                            initialValue={filters.search || ""}
                                                            route="/production"
                                                        />
                                                    </div>
                                                    <div className="col-md-4">
                                                        <FormInput
                                                            label=""
                                                            type="select"
                                                            name="status"
                                                            value={filters.status || "all"}
                                                            onChange={(e) => {
                                                                router.get("/production", {
                                                                    ...filters,
                                                                    status: e.target.value === "all" ? null : e.target.value
                                                                }, {
                                                                    preserveState: false,
                                                                    preserveScroll: true,
                                                                });
                                                            }}
                                                            options={[
                                                                { value: "all", label: "All Status" },
                                                                { value: "ready_to_print", label: "Ready to Print" },
                                                                { value: "in_production", label: "In Progress" },
                                                                { value: "completed", label: "Completed" },
                                                            ]}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div className={isFullscreen ? "mt-4" : "mt-4"}>
                                                <div style={isFullscreen ? {
                                                    fontSize: '16px',
                                                } : {}}>
                                                    <DataTable
                                                        columns={ticketColumns}
                                                        data={tickets.data}
                                                        pagination={tickets}
                                                        emptyMessage="No tickets ready for production."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {!isFullscreen && <Footer />}
            
            {/* Fullscreen Mode Styles */}
            <style>{`
                body.production-fullscreen {
                    overflow-x: hidden;
                    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                    min-height: 100vh;
                }
                body.production-fullscreen .header,
                body.production-fullscreen .sidebar {
                    display: none !important;
                }
                body.production-fullscreen .content-wrap {
                    margin-left: 0 !important;
                    width: 100% !important;
                    padding: 0 !important;
                }
                body.production-fullscreen #main-content {
                    padding-top: 0 !important;
                    background: transparent;
                }
                body.production-fullscreen .main {
                    background: transparent;
                }
                .production-fullscreen .card {
                    box-shadow: 0 10px 40px rgba(0,0,0,0.15) !important;
                    background: white;
                }
                .production-fullscreen table {
                    font-size: 16px;
                }
                .production-fullscreen .table {
                    border-collapse: separate;
                    border-spacing: 0;
                }
                .production-fullscreen .table th {
                    font-size: 17px;
                    padding: 18px 15px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .production-fullscreen .table th:first-child {
                    border-top-left-radius: 10px;
                }
                .production-fullscreen .table th:last-child {
                    border-top-right-radius: 10px;
                }
                .production-fullscreen .table td {
                    padding: 18px 15px;
                    font-size: 16px;
                    vertical-align: middle;
                    border-bottom: 1px solid #e9ecef;
                }
                .production-fullscreen .table tbody tr {
                    transition: all 0.2s;
                    background: white;
                }
                .production-fullscreen .table tbody tr:hover {
                    background-color: #f8f9fa;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }
                .production-fullscreen .table tbody tr:last-child td:first-child {
                    border-bottom-left-radius: 10px;
                }
                .production-fullscreen .table tbody tr:last-child td:last-child {
                    border-bottom-right-radius: 10px;
                }
                .production-fullscreen .badge {
                    padding: 8px 16px;
                    font-size: 14px;
                    font-weight: 600;
                    border-radius: 20px;
                }
            `}</style>
        </AdminLayout>
    );
}
