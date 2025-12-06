import React, { useState, useEffect } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Modal from "@/Components/Main/Modal";
import DataTable from "@/Components/Common/DataTable";
import SearchBox from "@/Components/Common/SearchBox";
import FlashMessage from "@/Components/Common/FlashMessage";
import FormInput from "@/Components/Common/FormInput";
import ProductionBoard from "@/Components/Production/ProductionBoard";
import { formatDate } from "@/Utils/formatDate";
import CardStatistics from "@/Components/Common/CardStatistics";

export default function Productions({
    user = {},
    notifications = [],
    messages = [],
    tickets = { data: [] },
    stockItems = [],
    filters = {},
    summary = {},
}) {
    const [activeView, setActiveView] = useState("table"); // "table" or "board"
    const [openViewModal, setViewModalOpen] = useState(false);
    const [openUpdateModal, setUpdateModalOpen] = useState(false);
    const [openStockModal, setStockModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [producedQuantity, setProducedQuantity] = useState(0);
    const [stockConsumptions, setStockConsumptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const { flash, auth } = usePage().props;

    // Calculate summary statistics from tickets data
    const calculateSummary = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const allTickets = tickets.data || [];
        const total = allTickets.length;
        const inProgress = allTickets.filter(
            (t) => t.status === "in_production"
        ).length;
        const finished = allTickets.filter(
            (t) => t.status === "completed"
        ).length;
        const delays = allTickets.filter((t) => {
            if (!t.due_date) return false;
            const dueDate = new Date(t.due_date);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate < today && t.status !== "completed";
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
            document.body.classList.add("production-fullscreen");
            document.querySelector(".header")?.classList.add("d-none");
            document.querySelector(".sidebar")?.classList.add("d-none");
        } else {
            document.body.classList.remove("production-fullscreen");
            document.querySelector(".header")?.classList.remove("d-none");
            document.querySelector(".sidebar")?.classList.remove("d-none");
        }

        return () => {
            document.body.classList.remove("production-fullscreen");
            document.querySelector(".header")?.classList.remove("d-none");
            document.querySelector(".sidebar")?.classList.remove("d-none");
        };
    }, [isFullscreen]);

    // WebSocket real-time updates
    useEffect(() => {
        if (!window.Echo) {
            console.warn('Echo not initialized. Real-time updates disabled.');
            return;
        }


        if (!auth?.user?.id) {
            console.warn('User ID not available for WebSocket connection');
            return;
        }

        console.log('🔌 Setting up production board real-time updates...');

        // Subscribe to user's private channel for production updates
        const channel = window.Echo.private(`user.${auth.user.id}`);

        // Listen for ticket status changes
        const handleTicketUpdate = (data) => {
            console.log('📬 Production update received:', data);

            // Refresh the page data to get updated tickets
            router.reload({
                only: ['tickets', 'summary'],
                preserveScroll: true,
                preserveState: true,
            });

            // Show a subtle notification in fullscreen mode
            if (isFullscreen) {
                const notification = document.createElement('div');
                notification.innerHTML = `
                    <div style="
                        position: fixed;
                        top: 80px;
                        right: 20px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 12px 20px;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        z-index: 10000;
                        animation: slideInRight 0.3s ease-out;
                        font-size: 14px;
                        font-weight: 500;
                    ">
                        <i class="ti-bell mr-2"></i>${data.notification?.message || 'Production updated'}
                    </div>
                `;
                document.body.appendChild(notification);

                // Remove notification after 3 seconds
                setTimeout(() => {
                    notification.style.animation = 'slideOutRight 0.3s ease-in';
                    setTimeout(() => notification.remove(), 300);
                }, 3000);
            }
        };

        // Listen for the ticket status changed event
        channel.listen('.ticket.status.changed', handleTicketUpdate);

        // Add CSS animation if not already present
        if (!document.getElementById('production-animations')) {
            const style = document.createElement('style');
            style.id = 'production-animations';
            style.innerHTML = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Cleanup on unmount
        return () => {
            console.log('🔌 Cleaning up production board WebSocket...');
            if (channel) {
                channel.stopListening('.ticket.status.changed');
            }
        };
    }, [isFullscreen]); // Re-run when fullscreen changes

    const toggleFullscreen = () => {
        if (!isFullscreen) {
            setActiveView("board");
        }
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
        router.post(
            `/production/${ticketId}/start`,
            {},
            {
                preserveScroll: true,
                preserveState: false,
                onSuccess: () => {
                    setLoading(false);
                },
                onError: () => {
                    setLoading(false);
                },
            }
        );
    };

    const handleUpdateProgress = () => {
        if (!selectedTicket) return;

        const quantity = parseInt(producedQuantity) || 0;
        if (quantity < 0 || quantity > selectedTicket.quantity) {
            alert(`Quantity must be between 0 and ${selectedTicket.quantity}`);
            return;
        }

        setLoading(true);
        const status =
            quantity >= selectedTicket.quantity ? "completed" : "in_production";

        router.post(
            `/production/${selectedTicket.id}/update`,
            {
                produced_quantity: quantity,
                status: status,
            },
            {
                preserveScroll: true,
                preserveState: false,
                onSuccess: () => {
                    handleCloseModals();
                    setLoading(false);
                },
                onError: () => {
                    setLoading(false);
                },
            }
        );
    };

    const handleMarkCompleted = (ticketId) => {
        if (
            !confirm(
                "Mark this ticket as completed? Stock will be automatically deducted."
            )
        )
            return;

        setLoading(true);
        router.post(
            `/production/${ticketId}/complete`,
            {},
            {
                preserveScroll: true,
                preserveState: false,
                onSuccess: () => {
                    setLoading(false);
                },
                onError: () => {
                    setLoading(false);
                },
            }
        );
    };

    const handleOpenStockModal = (ticket) => {
        setSelectedTicket(ticket);

        // Pre-populate with suggested stocks based on job type requirements
        const initialConsumptions = [];
        if (ticket.job_type?.stock_requirements) {
            ticket.job_type.stock_requirements.forEach((req) => {
                const requiredQty =
                    parseFloat(req.quantity_per_unit) * ticket.quantity;
                initialConsumptions.push({
                    stock_item_id: req.stock_item_id,
                    quantity: requiredQty.toFixed(2),
                    notes: req.notes || "",
                });
            });
        }

        // If no requirements, add one empty row
        if (initialConsumptions.length === 0) {
            initialConsumptions.push({
                stock_item_id: "",
                quantity: "",
                notes: "",
            });
        }

        setStockConsumptions(initialConsumptions);
        setStockModalOpen(true);
    };

    const handleAddStockConsumption = () => {
        setStockConsumptions([
            ...stockConsumptions,
            {
                stock_item_id: "",
                quantity: "",
                notes: "",
            },
        ]);
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
            (c) => c.stock_item_id && parseFloat(c.quantity) > 0
        );

        if (validConsumptions.length === 0) {
            alert("Please add at least one stock consumption record.");
            return;
        }

        setLoading(true);
        router.post(
            `/production/${selectedTicket.id}/record-stock`,
            {
                stock_consumptions: validConsumptions.map((c) => ({
                    stock_item_id: parseInt(c.stock_item_id),
                    quantity: parseFloat(c.quantity),
                    notes: c.notes || null,
                })),
            },
            {
                preserveScroll: true,
                preserveState: false,
                onSuccess: () => {
                    handleCloseModals();
                    setLoading(false);
                },
                onError: () => {
                    setLoading(false);
                },
            }
        );
    };

    const handleQuickAdd = (amount) => {
        const current = parseInt(producedQuantity) || 0;
        const newValue = Math.min(
            current + amount,
            selectedTicket?.quantity || 0
        );
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
                    {ticket.stock_consumptions &&
                        ticket.stock_consumptions.length > 0 && (
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
                const employeeName =
                    row.assigned_to?.name ||
                    row.employee?.name ||
                    row.team?.name ||
                    "Unassigned";
                const teamName = row.team?.name || row.employee?.team || "";
                return (
                    <div>
                        <div className="font-weight-bold">{employeeName}</div>
                        {teamName && (
                            <small className="text-muted">{teamName}</small>
                        )}
                    </div>
                );
            },
        },
        {
            label: "Quantity",
            key: "quantity",
            render: (row) => (
                <span>
                    <b
                        className={
                            row.produced_quantity >= row.quantity
                                ? "text-success"
                                : "text-warning"
                        }
                    >
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
                const isOverdue =
                    dueDate && dueDate < today && row.status !== "completed";
                return (
                    <span
                        className={
                            isOverdue ? "text-danger font-weight-bold" : ""
                        }
                    >
                        {formatDate(row.due_date)}
                        {isOverdue && <i className="ti-alert ml-1"></i>}
                    </span>
                );
            },
        },
    ];

    return (
        <AdminLayout
            user={user}
            notifications={notifications}
            messages={messages}
        >
            <Head title="Dashboard" />

            {/* Fullscreen Toggle Button */}
            {/* Fullscreen Toggle Button */}
            <div
                className="position-fixed"
                style={{
                    top: isFullscreen ? "5px" : "20px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 9999,
                }}
            >
                <button
                    type="button"
                    className="btn shadow-sm"
                    onClick={toggleFullscreen}
                    style={{
                        borderRadius: "10px",
                        padding: "5px 10px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        backgroundColor: isFullscreen ? "#dc3545" : "#007bff",
                        border: "none",
                        color: "white",
                        transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.05)";
                        e.currentTarget.style.boxShadow =
                            "0 6px 16px rgba(0,0,0,0.2)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow =
                            "0 4px 12px rgba(0,0,0,0.15)";
                    }}
                >
                    {isFullscreen ? (
                        <>
                            <i className="ti-close"></i>
                        </>
                    ) : (
                        <>
                            <i className="ti-fullscreen"></i>
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
                                    <li className="breadcrumb-item active">
                                        Production Queue
                                    </li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            )}

    {/* {isFullscreen && (
                <div className="row mb-1">
                    <div className="col-12 text-center">
                        <h3
                            className="font-weight-bold mb-2 text-3xl"
                            style={{
                                color: "#333",
                                textShadow: "2px 2px 4px rgba(0,0,0,0.1)",
                            }}
                        >
                            Production Queue Dashboard
                        </h3>
                        <p
                            className="text-muted mb-0"
                            style={{
                                fontSize: "20px",
                                fontWeight: "500",
                            }}
                        >
                            {new Date().toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </p>
                        <p className="text-muted" style={{ fontSize: "14px" }}>
                            {new Date().toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                            })}
                        </p>
                    </div>
                    <div className="col-12">
                        <div
                            className="alert alert-info"
                            role="alert"
                        >
                            <i className="fa fa-info-circle"></i>{" "}
                            <strong>Quick Update:</strong> Click the
                            pencil icon next to status or payment
                            status to update them quickly.
                        </div>
                    </div>
                </div>
            )} */}

            <div
                className="row mb-4"
                style={{
                    marginTop: isFullscreen ? "20px" : "0",
                    marginBottom: isFullscreen ? "30px" : "20px",
                }}
            >
                <div className="col-lg-3 col-md-6 mb-3">
                    <CardStatistics
                        label="Total Items Produced Today"
                        statistics={stats.total}
                        icon="ti-package"
                        color="bg-info"
                    />
                </div>
                <div className="col-lg-3 col-md-6 mb-3">
                    <CardStatistics
                        label="Ready to Print"
                        statistics={stats.inProgress}
                        icon="ti-printer"
                        color="bg-primary"
                    />
                </div>
                <div className="col-lg-3 col-md-6 mb-3">
                    <CardStatistics
                        label="Finished"
                        statistics={stats.finished}
                        icon="ti-check-box"
                        color="bg-success"
                    />
                </div>
                <div className="col-lg-3 col-md-6 mb-3">
                    <CardStatistics
                        label="Delays"
                        statistics={stats.delays}
                        icon="ti-package"
                        color="bg-danger"
                    />
                </div>
            </div>
        
            <section id="main-content">
                <div
                    className="content-wrap"
                    style={
                        isFullscreen ? { marginLeft: "0", padding: "0" } : {}
                    }
                >
                    <div
                        className="main"
                        style={isFullscreen ? { padding: "0" } : {}}
                    >
                        <div
                            className="container-fluid"
                            style={
                                isFullscreen
                                    ? { maxWidth: "100%", padding: "0 20px" }
                                    : {}
                            }
                        >
                            <div className="row">
                                <div className="col-lg-12">
                                    <div
                                        className="card shadow-sm"
                                        style={{
                                            border: "none",
                                            overflow: "hidden",
                                        }}
                                    >
                                        {!isFullscreen && (
                                            <div className="card-title mt-3 px-4">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <h4>Production Queue</h4>
                                                    <div className="btn-group" role="group">
                                                        <button
                                                            type="button"
                                                            className={`btn btn-sm ${activeView === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                                                            onClick={() => setActiveView('table')}
                                                        >
                                                            <i className="ti-view-list"></i> Table View
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`btn btn-sm ${activeView === 'board' ? 'btn-primary' : 'btn-outline-primary'}`}
                                                            onClick={() => setActiveView('board')}
                                                        >
                                                            <i className="ti-layout-grid2"></i> Board View
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="card-body">
                                            {!isFullscreen && activeView === 'table' && (
                                                <div className="row mt-4 align-items-center">
                                                    <div className="col-md-5">
                                                        <SearchBox
                                                            placeholder="Search tickets..."
                                                            initialValue={
                                                                filters.search ||
                                                                ""
                                                            }
                                                            route="/production"
                                                        />
                                                    </div>
                                                    <div className="col-md-4">
                                                        <FormInput
                                                            label=""
                                                            type="select"
                                                            name="status"
                                                            value={
                                                                filters.status ||
                                                                "all"
                                                            }
                                                            onChange={(e) => {
                                                                router.get(
                                                                    "/production",
                                                                    {
                                                                        ...filters,
                                                                        status:
                                                                            e
                                                                                .target
                                                                                .value ===
                                                                                "all"
                                                                                ? null
                                                                                : e
                                                                                    .target
                                                                                    .value,
                                                                    },
                                                                    {
                                                                        preserveState: false,
                                                                        preserveScroll: true,
                                                                    }
                                                                );
                                                            }}
                                                            options={[
                                                                {
                                                                    value: "all",
                                                                    label: "All Status",
                                                                },
                                                                {
                                                                    value: "ready_to_print",
                                                                    label: "Ready to Print",
                                                                },
                                                                {
                                                                    value: "in_production",
                                                                    label: "In Progress",
                                                                },
                                                                {
                                                                    value: "completed",
                                                                    label: "Completed",
                                                                },
                                                            ]}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div
                                                className={
                                                    isFullscreen || activeView === 'board'
                                                        ? "mt-4"
                                                        : "mt-4"
                                                }
                                            >
                                                {activeView === 'board' ? (
                                                    <ProductionBoard tickets={tickets.data} />
                                                ) : (
                                                    <div>
                                                        <DataTable
                                                            columns={ticketColumns}
                                                            data={tickets.data}
                                                            pagination={tickets}
                                                            emptyMessage="No tickets ready for production."
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* {!isFullscreen && <Footer />} */}

            {/* Fullscreen Mode Styles */}
            <style>{`
                body.production-fullscreen {
                    overflow-x: hidden;
                    // background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
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
                // .production-fullscreen .card {
                //     box-shadow: 0 10px 40px rgba(0,0,0,0.15) !important;
                //     background: white;
                // }
                // .production-fullscreen .badge {
                //     padding: 8px 16px;
                //     font-size: 14px;
                //     font-weight: 600;
                //     border-radius: 20px;
                // }
            `}</style>
        </AdminLayout>
    );
}
