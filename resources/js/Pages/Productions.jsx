import React, { useState, useEffect } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Modal from "@/Components/Main/Modal";
import DataTable from "@/Components/Common/DataTable";
import SearchBox from "@/Components/Common/SearchBox";
import FlashMessage from "@/Components/Common/FlashMessage";
import FormInput from "@/Components/Common/FormInput";
import Confirmation from "@/Components/Common/Confirmation";
import { formatDate } from "@/Utils/formatDate";
import { useRoleApi } from "@/Hooks/useRoleApi";

const WORKFLOW_STEPS = [
    { key: 'design', label: 'Design', icon: 'ti-pencil-alt', color: '#9C27B0' },
    { key: 'printing', label: 'Printing', icon: 'ti-printer', color: '#2196F3' },
    { key: 'lamination_heatpress', label: 'Lamination/Heatpress', icon: 'ti-layers', color: '#FF9800' },
    { key: 'cutting', label: 'Cutting', icon: 'ti-cut', color: '#F44336' },
    { key: 'sewing', label: 'Sewing', icon: 'ti-pin-alt', color: '#E91E63' },
    { key: 'dtf_press', label: 'DTF Press', icon: 'ti-stamp', color: '#673AB7' },
    // { key: 'assembly', label: 'Assembly', icon: 'ti-package', color: '#009688' },
    // { key: 'quality_check', label: 'Quality Check', icon: 'ti-check-box', color: '#4CAF50' },
];

export default function Productions({
    user = {},
    notifications = [],
    messages = [],
    tickets = { data: [] },
    stockItems = [],
    filters = {},
}) {
    const [openViewModal, setViewModalOpen] = useState(false);
    const [openUpdateModal, setUpdateModalOpen] = useState(false);
    const [openStockModal, setStockModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [producedQuantity, setProducedQuantity] = useState(0);
    const [currentWorkflowStep, setCurrentWorkflowStep] = useState(null);
    const [stockConsumptions, setStockConsumptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedPreviewFile, setSelectedPreviewFile] = useState(null);
    const [confirmationModal, setConfirmationModal] = useState(false);
    const [confirmationType, setConfirmationType] = useState(null);
    const [confirmationData, setConfirmationData] = useState(null);
    const [updateModalMessage, setUpdateModalMessage] = useState(null);
    const { flash, auth } = usePage().props;
    const { buildUrl } = useRoleApi();

    // Helper function to show confirmation dialog
    const showConfirmation = (type, data = null) => {
        console.log('✅ showConfirmation called with type:', type, 'data:', data);
        setConfirmationType(type);
        setConfirmationData(data);
        setConfirmationModal(true);
    };

    // Helper function to show alert
    const showAlert = (type, data) => {
        showConfirmation(type, data);
    };

    // Get user's assigned workflow steps
    const getUserAssignedWorkflowSteps = () => {
        if (!auth?.user) return [];
        if (auth.user.role === 'admin') return []; // Admin sees all
        if (auth.user.role !== 'Production') return [];

        // Get workflow steps from user object
        if (auth.user.workflow_steps && Array.isArray(auth.user.workflow_steps)) {
            return auth.user.workflow_steps.map(ws => ws.workflow_step || ws);
        }
        return [];
    };

    const assignedWorkflowSteps = getUserAssignedWorkflowSteps();
    const isAdmin = auth?.user?.role === 'admin';

    // Check if user can access a ticket based on workflow assignment
    const canAccessTicket = (ticket) => {
        if (isAdmin) return true;
        if (auth?.user?.role !== 'Production') return true;
        if (assignedWorkflowSteps.length === 0) return false;

        // For ready_to_print, all production users can see
        if (ticket.status === 'ready_to_print') return true;

        // For in_production/completed, check if current_workflow_step matches user's assignments
        if (ticket.current_workflow_step) {
            return assignedWorkflowSteps.includes(ticket.current_workflow_step);
        }

        return false;
    };

    // Check if user can update a specific workflow step
    const canUpdateWorkflowStep = (workflowStep) => {
        if (isAdmin) return true;
        if (auth?.user?.role !== 'Production') return true;
        if (assignedWorkflowSteps.length === 0) return false;
        return assignedWorkflowSteps.includes(workflowStep);
    };

    // WebSocket real-time updates for production queue
    useEffect(() => {
        if (!window.Echo) {
            console.warn('Echo not initialized. Real-time updates disabled.');
            return;
        }

        if (!auth?.user?.id) {
            console.warn('User ID not available for WebSocket connection');
            return;
        }


        // Subscribe to user's private channel
        const channel = window.Echo.private(`user.${auth.user.id}`);

        // Listen for ticket status changes
        const handleTicketUpdate = (data) => {

            // Refresh the tickets data
            router.reload({
                only: ['tickets'],
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    console.log('✅ Production queue refreshed');
                }
            });
        };

        // Listen for the ticket status changed event
        channel.listen('.ticket.status.changed', handleTicketUpdate);

        // Cleanup on unmount
        return () => {
            console.log('🔌 Cleaning up production queue WebSocket...');
            if (channel) {
                channel.stopListening('.ticket.status.changed');
            }
        };
    }, []); // Run once on mount

    const handleView = (ticket) => {
        setSelectedTicket(ticket);
        setViewModalOpen(true);
    };

    const handleUpdate = (ticket) => {
        if (!canAccessTicket(ticket)) {
            showAlert('not_assigned_workflow', { message: 'You are not assigned to this workflow step.' });
            return;
        }

        // Check if ticket is assigned to another user
        if (ticket.assigned_to_user_id && ticket.assigned_to_user_id !== auth?.user?.id && !isAdmin) {
            const assignedUserName = ticket.assigned_to_user?.name || 'another user';
            showAlert('ticket_assigned', { message: `This ticket is currently assigned to ${assignedUserName}. Please claim it first.` });
            return;
        }

        setSelectedTicket(ticket);
        setUpdateModalMessage(null); // Clear any previous messages
        const currentStep = ticket.current_workflow_step || getFirstWorkflowStep(ticket);
        setCurrentWorkflowStep(currentStep);

        // Get quantity from workflow progress for current step, or use ticket's produced_quantity
        let quantityToShow = ticket.produced_quantity || 0;
        if (currentStep && ticket.workflow_progress) {
            const stepProgress = ticket.workflow_progress.find(wp => wp.workflow_step === currentStep);
            if (stepProgress) {
                quantityToShow = stepProgress.completed_quantity || 0;
            } else {
                // No record for this step, reset to 0
                quantityToShow = 0;
            }
        }

        setProducedQuantity(quantityToShow);
        setUpdateModalOpen(true);
    };

    const handleClaimTicket = (ticketId) => {
        setLoading(true);
        router.post(buildUrl(`/queue/${ticketId}/claim`), {}, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                setLoading(false);
            },
            onError: () => {
                setLoading(false);
            },
            onFinish: () => {
                setLoading(false);
            },
        });
    };

    const handleReleaseTicket = (ticketId) => {
        showConfirmation('release_ticket', { ticketId });
    };

    const confirmReleaseTicket = (ticketId) => {
        setLoading(true);
        router.post(buildUrl(`/queue/${ticketId}/release`), {}, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                setLoading(false);
            },
            onError: () => {
                setLoading(false);
            },
            onFinish: () => {
                setLoading(false);
            },
        });
    };

    const getFirstWorkflowStep = (ticket) => {
        if (!ticket?.job_type?.workflow_steps) return null;
        const workflowSteps = ticket.job_type.workflow_steps;
        const firstStep = WORKFLOW_STEPS.find(step => workflowSteps[step.key]);
        return firstStep?.key || null;
    };

    const getActiveWorkflowSteps = (ticket) => {
        if (!ticket?.job_type?.workflow_steps) return [];
        const workflowSteps = ticket.job_type.workflow_steps;
        return WORKFLOW_STEPS.filter(step => workflowSteps[step.key]);
    };

    const getNextWorkflowStep = (ticket, currentStep) => {
        const activeSteps = getActiveWorkflowSteps(ticket);
        const currentIndex = activeSteps.findIndex(step => step.key === currentStep);
        if (currentIndex === -1 || currentIndex === activeSteps.length - 1) return null;
        return activeSteps[currentIndex + 1]?.key || null;
    };

    const getPreviousWorkflowStep = (ticket, currentStep) => {
        const activeSteps = getActiveWorkflowSteps(ticket);
        const currentIndex = activeSteps.findIndex(step => step.key === currentStep);
        if (currentIndex <= 0) return null;
        return activeSteps[currentIndex - 1]?.key || null;
    };

    const handleCloseModals = () => {
        console.log('✅ handleCloseModals called');
        setLoading(false);
        setViewModalOpen(false);
        setUpdateModalOpen(false);
        setStockModalOpen(false);
        setSelectedTicket(null);
        setProducedQuantity(0);
        setStockConsumptions([]);
        setSelectedPreviewFile(null);
        setUpdateModalMessage(null);
        // NOTE: Don't clear confirmation data here - it's needed by the confirmation modal
        // Confirmation data will be cleared when the confirmation modal closes
    };

    const handleCloseConfirmationModal = () => {
        console.log('✅ handleCloseConfirmationModal called');
        setConfirmationModal(false);
        setConfirmationType(null);
        setConfirmationData(null);
    };

    const handleDownload = (fileId, filename) => {
        const url = buildUrl(`/files/${fileId}/download`);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleStartProduction = (ticketId) => {
        // Auto-claim ticket when starting production if not already claimed
        const ticket = tickets.data.find(t => t.id === ticketId);
        if (ticket && !ticket.assigned_to_user_id) {
            // First claim, then start
            setLoading(true);
            router.post(buildUrl(`/queue/${ticketId}/claim`), {}, {
                preserveScroll: true,
                preserveState: false,
                onSuccess: () => {
                    router.post(buildUrl(`/queue/${ticketId}/start`), {}, {
                        preserveScroll: true,
                        preserveState: false,
                        onSuccess: () => {
                            setLoading(false);
                        },
                        onError: () => {
                            setLoading(false);
                        },
                        onFinish: () => {
                            setLoading(false);
                        },
                    });
                },
                onError: (errors) => {
                    console.error('❌ Error claiming ticket:', errors);
                    setLoading(false);
                },
                onFinish: () => {
                    setLoading(false);
                },
            });
        } else {
            setLoading(true);
            router.post(buildUrl(`/queue/${ticketId}/start`), {}, {
                preserveScroll: true,
                preserveState: false,
                onSuccess: () => {
                    setLoading(false);
                },
                onError: () => {
                    setLoading(false);
                },
                onFinish: () => {
                    setLoading(false);
                },
            });
        }
    };

    const handleUpdateProgress = () => {
        if (!selectedTicket) return;

        // Clear previous messages
        setUpdateModalMessage(null);

        // Check if ticket is assigned to another user
        if (selectedTicket.assigned_to_user_id && selectedTicket.assigned_to_user_id !== auth?.user?.id && !isAdmin) {
            const assignedUserName = selectedTicket.assigned_to_user?.name || 'another user';
            setUpdateModalMessage({ type: 'error', text: `This ticket is currently assigned to ${assignedUserName}. Please claim it first.` });
            return;
        }

        // Check if user can update this workflow step
        if (!canUpdateWorkflowStep(currentWorkflowStep)) {
            setUpdateModalMessage({ type: 'error', text: 'You are not assigned to this workflow step.' });
            return;
        }

        const quantity = parseInt(producedQuantity) || 0;
        const maxQuantity = selectedTicket.total_quantity || (selectedTicket.quantity || 0) + (selectedTicket.free_quantity || 0);
        if (quantity < 0 || quantity > maxQuantity) {
            setUpdateModalMessage({ type: 'error', text: `Quantity must be between 0 and ${maxQuantity}` });
            return;
        }

        setLoading(true);

        // Determine status based on workflow completion
        const activeSteps = getActiveWorkflowSteps(selectedTicket);
        const currentStepIndex = activeSteps.findIndex(step => step.key === currentWorkflowStep);
        const isLastStep = currentStepIndex === activeSteps.length - 1;
        const status = (quantity >= maxQuantity && isLastStep) ? 'completed' : 'in_production';

        router.post(buildUrl(`/queue/${selectedTicket.id}/update`), {
            produced_quantity: quantity,
            current_workflow_step: currentWorkflowStep,
            status: status,
        }, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: (page) => {
                setUpdateModalMessage({ type: 'success', text: 'Progress updated successfully!' });
                setLoading(false);
                // Auto-close after 1.5 seconds
                setTimeout(() => {
                    handleCloseModals();
                }, 1500);
            },
            onError: (errors) => {
                setUpdateModalMessage({ type: 'error', text: errors?.message || 'Failed to update progress. Please try again.' });
                setLoading(false);
            },
            onFinish: () => {
                setLoading(false);
            },
        });
    };

    const handleMarkCompleted = (ticketId) => {
        showConfirmation('mark_completed', { ticketId });
    };

    const confirmMarkCompleted = (ticketId) => {
        console.log('✅ confirmMarkCompleted called with ticketId:', ticketId);

        if (!ticketId) {
            console.error('❌ No ticketId provided to confirmMarkCompleted');
            return;
        }

        setLoading(true);
        console.log('🚀 Making API call to complete ticket:', ticketId);

        router.post(buildUrl(`/queue/${ticketId}/complete`), {}, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: (page) => {
                console.log('✅ Ticket marked as completed successfully');
                setLoading(false);
                handleCloseModals();
            },
            onError: (errors) => {
                console.error('❌ Error marking ticket as completed:', errors);
                setLoading(false);
            },
            onFinish: () => {
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
                const requiredQty = parseFloat(req.quantity_per_unit) * (ticket.total_quantity || ticket.quantity);
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
            showAlert('stock_required', { message: 'Please add at least one stock consumption record.' });
            return;
        }

        setLoading(true);
        router.post(buildUrl(`/queue/${selectedTicket.id}/record-stock`), {
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
            onFinish: () => {
                setLoading(false);
            },
        });
    };

    const handleQuickAdd = (amount) => {
        const current = parseInt(producedQuantity) || 0;
        const maxQuantity = selectedTicket?.total_quantity || selectedTicket?.quantity || 0;
        const newValue = Math.min(current + amount, maxQuantity);
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
        const canAccess = canAccessTicket(ticket);
        const isAssignedToMe = ticket.assigned_to_user_id === auth?.user?.id;
        const isAssignedToOther = ticket.assigned_to_user_id && !isAssignedToMe;
        const canUpdate = ticket.current_workflow_step ? canUpdateWorkflowStep(ticket.current_workflow_step) : true;

        if (ticket.status === "ready_to_print") {
            return (
                <div className="btn-group-vertical">
                    <div className="btn-group">
                        <button
                            type="button"
                            className="btn btn-link btn-sm text-blue-500"
                            onClick={() => handleView(ticket)}
                        >
                            <i className="ti-eye"></i> View
                        </button>
                        {canAccess && !isAssignedToOther && (
                            <>
                                {!isAssignedToMe && (
                                    <button
                                        type="button"
                                        className="btn btn-link btn-sm text-primary"
                                        onClick={() => handleClaimTicket(ticket.id)}
                                        disabled={loading}
                                        title="Claim this ticket"
                                    >
                                        <i className="ti-hand-point-up"></i> Claim
                                    </button>
                                )}
                                {isAssignedToMe && (
                                    <button
                                        type="button"
                                        className="btn btn-link btn-sm text-green-500"
                                        onClick={() => handleStartProduction(ticket.id)}
                                        disabled={loading}
                                    >
                                        <i className="ti-play"></i> Start
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                    {isAssignedToMe && (
                        <button
                            type="button"
                            className="btn btn-link btn-sm text-secondary"
                            onClick={() => handleReleaseTicket(ticket.id)}
                            disabled={loading}
                            title="Release this ticket"
                        >
                            <i className="ti-hand-point-down"></i> Release
                        </button>
                    )}
                </div>
            );
        } else if (ticket.status === "in_production") {
            const activeSteps = getActiveWorkflowSteps(ticket);
            const isLastStep = activeSteps.length > 0 &&
                ticket.current_workflow_step === activeSteps[activeSteps.length - 1]?.key;

            return (
                <div className="btn-group-vertical">
                    <div className="btn-group">
                        {canUpdate && (isAssignedToMe || !ticket.assigned_to_user_id) ? (
                            <button
                                type="button"
                                className="btn btn-link btn-sm text-blue-500"
                                onClick={() => handleUpdate(ticket)}
                            >
                                <i className="ti-pencil"></i> Update
                            </button>
                        ) : isAssignedToOther ? (
                            <button
                                type="button"
                                className="btn btn-link btn-sm text-muted"
                                disabled
                                title={`Assigned to ${ticket.assigned_to_user?.name || 'another user'}`}
                            >
                                <i className="ti-lock"></i> Locked
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="btn btn-link btn-sm text-muted"
                                disabled
                                title="Not assigned to this workflow step"
                            >
                                <i className="ti-lock"></i> Locked
                            </button>
                        )}
                        {!isAssignedToMe && !isAssignedToOther && canUpdate && (
                            <button
                                type="button"
                                className="btn btn-link btn-sm text-primary"
                                onClick={() => handleClaimTicket(ticket.id)}
                                disabled={loading}
                                title="Claim this ticket"
                            >
                                <i className="ti-hand-point-up"></i> Claim
                            </button>
                        )}
                        {canUpdate && isAssignedToMe && ticket.produced_quantity >= (ticket.total_quantity || ticket.quantity) && isLastStep && (
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
                    {isAssignedToMe && (
                        <button
                            type="button"
                            className="btn btn-link btn-sm text-secondary"
                            onClick={() => handleReleaseTicket(ticket.id)}
                            disabled={loading}
                            title="Release this ticket"
                        >
                            <i className="ti-hand-point-down"></i> Release
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
            label: "Quantity / Workflow",
            key: "quantity",
            render: (row) => {
                const isCompleted = row.status === 'completed';
                const currentStep = row.current_workflow_step;
                let stepLabel = 'Not Started';
                let stepQuantity = 0;
                let totalQty = row.total_quantity || (row.quantity || 0) + (row.free_quantity || 0);

                if (isCompleted) {
                    // If ticket is completed, show completed status and 100% quantity
                    stepLabel = 'Completed';
                    stepQuantity = totalQty; // Always show 100% when completed
                } else if (currentStep) {
                    stepLabel = WORKFLOW_STEPS.find(s => s.key === currentStep)?.label || currentStep;

                    // Get quantity for current workflow step from workflow progress
                    if (row.workflow_progress) {
                        const stepProgress = row.workflow_progress.find(wp => wp.workflow_step === currentStep);
                        if (stepProgress) {
                            stepQuantity = stepProgress.completed_quantity || 0;
                        }
                    } else {
                        // Fallback to ticket's produced_quantity if no workflow progress
                        stepQuantity = row.produced_quantity || 0;
                    }
                } else {
                    // No current step, use produced_quantity
                    stepQuantity = row.produced_quantity || 0;
                }

                return (
                    <div>
                        <span>
                            <b className={stepQuantity >= totalQty ? "text-success" : "text-warning"}>
                                {stepQuantity}
                            </b>
                            {" / "}
                            <b>{totalQty}</b>
                        </span>
                        <div className="mt-1">
                            <small className={isCompleted ? "badge badge-success" : "badge badge-info"}>
                                <i className={isCompleted ? "ti-check mr-1" : "ti-layout-list-thumb mr-1"}></i>
                                {stepLabel}
                            </small>
                        </div>
                    </div>
                );
            },
        },
        {
            label: "Assigned To",
            key: "assigned_to",
            render: (row) => {
                if (row.assigned_to_user) {
                    const isAssignedToMe = row.assigned_to_user_id === auth?.user?.id;
                    return (
                        <span className={isAssignedToMe ? "text-success font-weight-bold" : "text-info"}>
                            <i className="ti-user mr-1"></i>
                            {row.assigned_to_user.name}
                            {isAssignedToMe && <small className="ml-1">(You)</small>}
                        </span>
                    );
                }
                return <span className="text-muted">Unassigned</span>;
            },
        },
        {
            label: "Status",
            key: "status",
            render: (row) => getStatusBadge(row.status),
        },
        {
            label: "Due Date",
            key: "due_date",
            render: (row) =>
                formatDate(row.due_date),
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

            {/* Flash Messages */}
            {flash?.success && (
                <FlashMessage type="success" message={flash.success} />
            )}
            {flash?.error && (
                <FlashMessage type="error" message={flash.error} />
            )}

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
                                    <strong>Quantity:</strong> {
                                        (() => {
                                            const currentStep = selectedTicket.current_workflow_step;
                                            let stepQty = 0;
                                            if (currentStep && selectedTicket.workflow_progress) {
                                                const stepProgress = selectedTicket.workflow_progress.find(wp => wp.workflow_step === currentStep);
                                                stepQty = stepProgress?.completed_quantity || 0;
                                            } else {
                                                stepQty = selectedTicket.produced_quantity || 0;
                                            }
                                            const totalQty = selectedTicket.total_quantity || (selectedTicket.quantity || 0) + (selectedTicket.free_quantity || 0);
                                            return `${stepQty} / ${totalQty}`;
                                        })()
                                    }
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
                                <div className="row">
                                    <div className="col-md-7">
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
                                                            <td className="max-w-[150px] truncate" title={file.file_name}>{file.file_name}</td>
                                                            <td>{new Date(file.created_at).toLocaleDateString()}</td>
                                                            <td>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-link btn-sm text-blue-500"
                                                                    onClick={() => handleDownload(file.id, file.file_name)}
                                                                >
                                                                    <i className="ti-download"></i> Download
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-link btn-sm text-blue-500"
                                                                    onClick={() => setSelectedPreviewFile(file)}
                                                                >
                                                                    <i className="ti-image"></i> Preview
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div className="col-md-5">
                                        <div className="card">
                                            <div className="card-body text-center">
                                                {selectedPreviewFile && (
                                                    <img
                                                        src={selectedPreviewFile?.file_path}
                                                        alt={selectedPreviewFile?.file_name}
                                                        className="img-fluid mb-2"
                                                        style={{ maxHeight: "280px", objectFit: "contain" }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
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
                size="5xl"
            >
                {selectedTicket && (
                    <div>
                        <div className="mb-4">
                            <div className="row">
                                <div className="col-md-8">
                                    <h4 className="mb-2">
                                        <strong>{selectedTicket.description}</strong>
                                    </h4>
                                    <p className="text-muted mb-1">
                                        <strong>Job Type:</strong> {selectedTicket.job_type?.name || 'N/A'}
                                    </p>
                                    <p className="mb-0">
                                        <strong>Status:</strong> {getStatusBadge(selectedTicket.status)}
                                    </p>
                                </div>
                                <div className="col-md-4 text-right">
                                    <h3 className="mb-1">
                                        <span className={producedQuantity >= (selectedTicket.total_quantity || (selectedTicket.quantity || 0) + (selectedTicket.free_quantity || 0)) ? "text-success" : "text-warning"}>
                                            {producedQuantity} / {selectedTicket.total_quantity || (selectedTicket.quantity || 0) + (selectedTicket.free_quantity || 0)}
                                        </span>
                                    </h3>
                                    <small className="text-muted">Items Produced</small>
                                </div>
                            </div>
                        </div>

                        <hr className="my-4" />

                        {/* Alert Message */}
                        {updateModalMessage && (
                            <div className={`alert alert-${updateModalMessage.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`} role="alert">
                                <i className={`ti-${updateModalMessage.type === 'success' ? 'check' : 'alert'} mr-2`}></i>
                                {updateModalMessage.text}
                                <button
                                    type="button"
                                    className="close"
                                    onClick={() => setUpdateModalMessage(null)}
                                    aria-label="Close"
                                >
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            </div>
                        )}

                        {/* Workflow Steps Progress */}
                        {getActiveWorkflowSteps(selectedTicket).length > 0 && (
                            <div className="mb-4">
                                <h5 className="mb-3 font-weight-bold">
                                    <i className="ti-layout-list-thumb mr-2"></i>Production Workflow
                                </h5>
                                <div className="workflow-stepper">
                                    <div className="d-flex align-items-center justify-content-between position-relative" style={{ padding: '20px 0' }}>
                                        {/* Progress Line */}
                                        <div
                                            className="position-absolute"
                                            style={{
                                                top: '50%',
                                                left: '0',
                                                right: '0',
                                                height: '4px',
                                                backgroundColor: '#e0e0e0',
                                                zIndex: 0,
                                                transform: 'translateY(-50%)'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    height: '100%',
                                                    backgroundColor: '#4CAF50',
                                                    width: `${(getActiveWorkflowSteps(selectedTicket).findIndex(s => s.key === currentWorkflowStep) / (getActiveWorkflowSteps(selectedTicket).length - 1)) * 100}%`,
                                                    transition: 'width 0.3s ease'
                                                }}
                                            />
                                        </div>

                                        {getActiveWorkflowSteps(selectedTicket).map((step, index) => {
                                            const isCurrent = step.key === currentWorkflowStep;
                                            const currentIndex = getActiveWorkflowSteps(selectedTicket).findIndex(s => s.key === currentWorkflowStep);
                                            const isPast = currentIndex > index;

                                            // Check if step is completed based on workflow progress
                                            const stepProgress = selectedTicket?.workflow_progress?.find(wp => wp.workflow_step === step.key);
                                            const isCompleted = stepProgress?.is_completed || false;

                                            const canSelect = canUpdateWorkflowStep(step.key);
                                            // Show green if completed, current color if current, green if past, gray if future
                                            const stepColor = isCompleted ? '#4CAF50' : (isCurrent ? step.color : (isPast ? '#4CAF50' : '#ccc'));
                                            const opacity = canSelect ? 1 : 0.5;

                                            return (
                                                <div
                                                    key={step.key}
                                                    className="text-center position-relative"
                                                    style={{ flex: 1, zIndex: 1, opacity }}
                                                >
                                                    <div
                                                        className={`d-inline-flex align-items-center justify-content-center rounded-circle shadow-sm mb-2 ${canSelect ? '' : 'cursor-not-allowed'}`}
                                                        style={{
                                                            width: '60px',
                                                            height: '60px',
                                                            backgroundColor: stepColor,
                                                            border: isCurrent ? '4px solid #fff' : 'none',
                                                            boxShadow: isCurrent ? `0 0 0 4px ${step.color}40` : '0 2px 4px rgba(0,0,0,0.1)',
                                                            transition: 'all 0.3s ease',
                                                            cursor: canSelect ? 'pointer' : 'not-allowed'
                                                        }}
                                                        onClick={() => {
                                                            if (canSelect) {
                                                                const newStep = step.key;
                                                                setCurrentWorkflowStep(newStep);
                                                                setUpdateModalMessage(null);

                                                                // Load quantity from workflow progress for the new step
                                                                const stepProgress = selectedTicket?.workflow_progress?.find(wp => wp.workflow_step === newStep);
                                                                if (stepProgress) {
                                                                    setProducedQuantity(stepProgress.completed_quantity || 0);
                                                                } else {
                                                                    // No record for this step, reset to 0
                                                                    setProducedQuantity(0);
                                                                }
                                                            } else {
                                                                setUpdateModalMessage({ type: 'error', text: 'You are not assigned to this workflow step.' });
                                                            }
                                                        }}
                                                    >
                                                        <i className={`${step.icon} text-white`} style={{ fontSize: '1.5rem' }}></i>
                                                    </div>
                                                    <div>
                                                        <small
                                                            className={`d-block font-weight-bold ${isCurrent ? 'text-dark' : 'text-muted'}`}
                                                            style={{ fontSize: '0.85rem' }}
                                                        >
                                                            {step.label}
                                                        </small>
                                                        {isCurrent && !isCompleted && (
                                                            <span className="badge badge-primary badge-pill mt-1" style={{ fontSize: '0.7rem' }}>
                                                                Current
                                                            </span>
                                                        )}
                                                        {(isPast || isCompleted) && (
                                                            <i className="ti-check text-success d-block mt-1"></i>
                                                        )}
                                                        {isCompleted && (
                                                            <small className="text-success d-block mt-1" style={{ fontSize: '0.7rem' }}>
                                                                Completed
                                                            </small>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Workflow Navigation Buttons */}
                                <div className="d-flex justify-content-center gap-2 mt-4">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => {
                                            const prevStep = getPreviousWorkflowStep(selectedTicket, currentWorkflowStep);
                                            if (prevStep && canUpdateWorkflowStep(prevStep)) {
                                                setCurrentWorkflowStep(prevStep);
                                                setUpdateModalMessage(null);

                                                // Load quantity from workflow progress for the previous step
                                                const stepProgress = selectedTicket?.workflow_progress?.find(wp => wp.workflow_step === prevStep);
                                                if (stepProgress) {
                                                    setProducedQuantity(stepProgress.completed_quantity || 0);
                                                } else {
                                                    // No record for this step, reset to 0
                                                    setProducedQuantity(0);
                                                }
                                            } else if (prevStep) {
                                                setUpdateModalMessage({ type: 'error', text: 'You are not assigned to the previous workflow step.' });
                                            }
                                        }}
                                        disabled={!getPreviousWorkflowStep(selectedTicket, currentWorkflowStep) || !canUpdateWorkflowStep(getPreviousWorkflowStep(selectedTicket, currentWorkflowStep))}
                                    >
                                        <i className="ti-arrow-left"></i> Previous Step
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary"
                                        onClick={() => {
                                            const nextStep = getNextWorkflowStep(selectedTicket, currentWorkflowStep);
                                            if (nextStep && canUpdateWorkflowStep(nextStep)) {
                                                setCurrentWorkflowStep(nextStep);
                                                setUpdateModalMessage(null);

                                                // Load quantity from workflow progress for the next step, or reset to 0
                                                const stepProgress = selectedTicket?.workflow_progress?.find(wp => wp.workflow_step === nextStep);
                                                if (stepProgress) {
                                                    setProducedQuantity(stepProgress.completed_quantity || 0);
                                                } else {
                                                    // No record for this step, reset to 0
                                                    setProducedQuantity(0);
                                                }
                                            } else if (nextStep) {
                                                setUpdateModalMessage({ type: 'error', text: 'You are not assigned to the next workflow step.' });
                                            }
                                        }}
                                        disabled={!getNextWorkflowStep(selectedTicket, currentWorkflowStep) || !canUpdateWorkflowStep(getNextWorkflowStep(selectedTicket, currentWorkflowStep))}
                                    >
                                        Next Step <i className="ti-arrow-right"></i>
                                    </button>
                                </div>
                            </div>
                        )}

                        <hr className="my-4" />

                        {/* Quantity Input */}
                        <div className="mb-4">
                            <h5 className="mb-3 font-weight-bold">
                                <i className="ti-package mr-2"></i>Production Quantity
                            </h5>
                            <div className="row align-items-center">
                                <div className="col-md-4">
                                    <FormInput
                                        label="Produced Quantity"
                                        type="number"
                                        name="produced_quantity"
                                        value={producedQuantity}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            setProducedQuantity(Math.min(val, selectedTicket.total_quantity || (selectedTicket.quantity || 0) + (selectedTicket.free_quantity || 0)));
                                        }}
                                        placeholder="0"
                                        min="0"
                                        max={selectedTicket.total_quantity || (selectedTicket.quantity || 0) + (selectedTicket.free_quantity || 0)}
                                        required
                                    />
                                </div>

                                <div className="col-md-8">
                                    <label className="block text-sm font-medium mb-2">Quick Add:</label>
                                    <div className="d-flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => handleQuickAdd(1)}
                                        >
                                            +1
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => handleQuickAdd(5)}
                                        >
                                            +5
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => handleQuickAdd(10)}
                                        >
                                            +10
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => handleQuickAdd(50)}
                                        >
                                            +50
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary btn-sm"
                                            onClick={() => setProducedQuantity(selectedTicket.total_quantity || selectedTicket.quantity)}
                                        >
                                            <i className="ti-check"></i> Set to Max
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-3">
                                <div className="d-flex justify-content-between mb-1">
                                    <span className="text-muted small">Production Progress</span>
                                    <span className="font-weight-bold">
                                        {Math.round((producedQuantity / (selectedTicket.total_quantity || (selectedTicket.quantity || 0) + (selectedTicket.free_quantity || 0))) * 100)}%
                                    </span>
                                </div>
                                <div className="progress" style={{ height: "20px" }}>
                                    <div
                                        className={`progress-bar ${producedQuantity >= (selectedTicket.total_quantity || (selectedTicket.quantity || 0) + (selectedTicket.free_quantity || 0))
                                            ? "bg-success"
                                            : "bg-warning"
                                            }`}
                                        role="progressbar"
                                        style={{
                                            width: `${(producedQuantity / (selectedTicket.total_quantity || (selectedTicket.quantity || 0) + (selectedTicket.free_quantity || 0))) * 100}%`,
                                        }}
                                    >
                                        {Math.round((producedQuantity / (selectedTicket.total_quantity || (selectedTicket.quantity || 0) + (selectedTicket.free_quantity || 0))) * 100)}%
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr className="my-4" />

                        {/* Action Buttons */}
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                {currentWorkflowStep && (
                                    <span className="text-muted">
                                        <i className="ti-info-alt mr-1"></i>
                                        Currently at: <strong>{WORKFLOW_STEPS.find(s => s.key === currentWorkflowStep)?.label}</strong>
                                    </span>
                                )}
                            </div>
                            <div className="d-flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleCloseModals}
                                >
                                    <i className="ti-close mr-2"></i>
                                    Close
                                </button>
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
                                            <i className="ti-save mr-2"></i> Save Progress
                                        </span>
                                    )}
                                </button>
                                {producedQuantity >= (selectedTicket.total_quantity || (selectedTicket.quantity || 0) + (selectedTicket.free_quantity || 0)) &&
                                    currentWorkflowStep === getActiveWorkflowSteps(selectedTicket)[getActiveWorkflowSteps(selectedTicket).length - 1]?.key &&
                                    canUpdateWorkflowStep(currentWorkflowStep) && (
                                        <button
                                            type="button"
                                            className="btn btn-success"
                                            onClick={() => {
                                                handleMarkCompleted(selectedTicket.id)
                                            }}
                                            disabled={loading}
                                        >
                                            <i className="ti-check mr-2"></i> Mark Completed
                                        </button>
                                    )}
                            </div>
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
                                        className="btn btn-sm btn-secondary"
                                        onClick={handleCloseModals}
                                    >
                                        Skip (Record Later)
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-sm btn-success"
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

            {/* Confirmation Modal */}
            <Modal
                title={
                    confirmationType === 'release_ticket' ? 'Release Ticket' :
                        confirmationType === 'mark_completed' ? 'Mark Completed' :
                            confirmationType === 'not_assigned_workflow' ? 'Access Denied' :
                                confirmationType === 'ticket_assigned' ? 'Ticket Assigned' :
                                    confirmationType === 'stock_required' ? 'Validation Error' :
                                        'Alert'
                }
                isOpen={confirmationModal}
                onClose={handleCloseConfirmationModal}
                size="md"
            >
                <Confirmation
                    description={
                        confirmationType === 'release_ticket' ? 'Release this ticket?' :
                            confirmationType === 'mark_completed' ? 'Mark this ticket as completed?' :
                                confirmationData?.message || 'Are you sure?'
                    }
                    subtitle={
                        confirmationType === 'release_ticket' ? 'Other users will be able to claim it.' :
                            confirmationType === 'mark_completed' ? 'Stock will be automatically deducted.' :
                                null
                    }
                    label={
                        confirmationType === 'release_ticket' ? 'Release' :
                            confirmationType === 'mark_completed' ? 'Mark Completed' :
                                'OK'
                    }
                    cancelLabel={
                        (confirmationType === 'release_ticket' || confirmationType === 'mark_completed') ? 'Cancel' : 'Close'
                    }
                    onCancel={handleCloseConfirmationModal}
                    onSubmit={() => {
                        console.log('Confirmation onSubmit triggered. Type:', confirmationType, 'Data:', confirmationData);

                        // Handle action confirmations
                        if (confirmationType === 'release_ticket') {
                            const ticketId = confirmationData?.ticketId;
                            console.log('Releasing ticket:', ticketId);
                            // handleCloseConfirmationModal();
                            confirmReleaseTicket(ticketId);
                        } else if (confirmationType === 'mark_completed') {
                            const ticketId = confirmationData?.ticketId;
                            console.log('Marking ticket completed:', ticketId);
                            handleCloseConfirmationModal();
                            confirmMarkCompleted(ticketId);
                        } else {
                            // For alert-only modals, just close
                            console.log('Alert modal - just closing');
                            handleCloseConfirmationModal();
                        }
                    }}
                    loading={loading}
                    color={
                        confirmationType === 'release_ticket' ? 'warning' :
                            confirmationType === 'mark_completed' ? 'success' :
                                confirmationType === 'not_assigned_workflow' || confirmationType === 'ticket_assigned' || confirmationType === 'stock_required' ? 'danger' :
                                    'primary'
                    }
                    showIcon={true}
                />
            </Modal>

            <section id="main-content">
                <div className="content-wrap">
                    <div className="main">
                        <div className="container-fluid">
                            <div className="row">
                                <div className="col-lg-12">
                                    <div className="card">
                                        <div className="card-title mt-3">
                                            <h4>Production Queue</h4>
                                        </div>
                                        <div className="card-body">
                                            <div className="row mt-4 align-items-center">
                                                <div className="col-md-5">
                                                    <SearchBox
                                                        placeholder="Search tickets..."
                                                        initialValue={filters.search || ""}
                                                        route={buildUrl("/queue")}
                                                    />
                                                </div>
                                                <div className="col-md-4">
                                                    <FormInput
                                                        label=""
                                                        type="select"
                                                        name="status"
                                                        value={filters.status || "all"}
                                                        onChange={(e) => {
                                                            router.get(buildUrl("/queue"), {
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

                                            <div className="mt-4">
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
            </section>

        </AdminLayout>
    );
}
