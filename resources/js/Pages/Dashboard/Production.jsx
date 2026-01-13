import React, { useState, useEffect } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Modal from "@/Components/Main/Modal";
import DataTable from "@/Components/Common/DataTable";
import SearchBox from "@/Components/Common/SearchBox";
import FormInput from "@/Components/Common/FormInput";
import ProductionBoard from "@/Components/Production/ProductionBoard";
import { formatDate } from "@/Utils/formatDate";
import CardStatistics from "@/Components/Common/CardStatistics";
import { toast } from "react-hot-toast";

export default function Productions({
  user = {},
  notifications = [],
  messages = [],
  tickets = { data: [] },
  stockItems = [],
  filters = {},
  summary = {}
}) {

  const [activeView, setActiveView] = useState("table");
  const [autoPageInterval, setAutoPageInterval] = useState(10);
  const [autoPageEnabled, setAutoPageEnabled] = useState(false);
  const [openViewModal, setViewModalOpen] = useState(false);
  const [openUpdateModal, setUpdateModalOpen] = useState(false);
  const [openStockModal, setStockModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [producedQuantity, setProducedQuantity] = useState(0);
  const [stockConsumptions, setStockConsumptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showFullscreenControls, setShowFullscreenControls] = useState(false);
  const [updatedTicketIds, setUpdatedTicketIds] = useState(new Set());
  const { flash, auth } = usePage().props;
  const isAdmin = auth?.user?.role === 'admin';
  const assignedWorkflowSteps = auth?.user?.workflow_steps || [];

  const perPage = 10;


  const canUpdateTicket = (ticket) => {
    if (isAdmin) return true;
    if (!auth?.user?.is_production) return false;


    if (!assignedWorkflowSteps || assignedWorkflowSteps.length === 0) {
      return false;
    }


    if (ticket.status === 'ready_to_print') {

      if (ticket.job_type?.workflow_steps) {
        const workflowOrder = ['design', 'printing', 'lamination_heatpress', 'cutting', 'sewing', 'dtf_press'];
        for (const step of workflowOrder) {
          if (ticket.job_type.workflow_steps[step]) {
            const canUpdate = assignedWorkflowSteps.includes(step);
            if (!canUpdate) {
              console.log('Ready to print - User not assigned to first step:', {
                firstStep: step,
                assignedSteps: assignedWorkflowSteps,
                ticket: ticket.ticket_number
              });
            }
            return canUpdate;
          }
        }
      }
      return false;
    }


    if (ticket.current_workflow_step) {
      const canUpdate = assignedWorkflowSteps.includes(ticket.current_workflow_step);
      if (!canUpdate) {
        console.log('In production - User not assigned to current step:', {
          currentStep: ticket.current_workflow_step,
          assignedSteps: assignedWorkflowSteps,
          ticket: ticket.ticket_number
        });
      }
      return canUpdate;
    }

    return false;
  };


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
      delays: summary.delays || delays
    };
  };

  const stats = calculateSummary();


  const secondInterval = 20000;
  useEffect(() => {
    let timer;
    const interval = isFullscreen ? secondInterval : autoPageInterval * 1000;
    const shouldPage = isFullscreen || autoPageEnabled && tickets?.links?.length > 3;

    if (shouldPage) {
      timer = setInterval(() => {
        const nextPage = tickets.current_page < tickets.last_page ?
          tickets.current_page + 1 :
          1;

        router.visit(`${window.location.pathname}?per_page=${isFullscreen ? perPage : filters.per_page || 10}&page=${nextPage}`, {
          preserveScroll: true,
          preserveState: true,
          only: ['tickets']
        });
      }, interval);
    }
    return () => clearInterval(timer);
  }, [autoPageEnabled, autoPageInterval, isFullscreen, tickets.current_page, tickets.last_page, filters.per_page]);


  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);


  useEffect(() => {
    if (isFullscreen) {
      router.visit(`${window.location.pathname}?per_page=${perPage}&page=1`, {
        preserveScroll: true,
        preserveState: true,
        only: ['tickets']
      });
    } else if (!isFullscreen && filters.per_page === perPage) {

      router.visit(`${window.location.pathname}?per_page=10&page=1`, {
        preserveScroll: true,
        preserveState: true,
        only: ['tickets']
      });
    }
  }, [isFullscreen]);


  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement);


      if (!isCurrentlyFullscreen && isFullscreen) {

        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    if (isFullscreen) {
      const element = document.documentElement;


      const requestFullscreen =
        element.requestFullscreen ||
        element.webkitRequestFullscreen ||
        element.mozRequestFullScreen ||
        element.msRequestFullscreen;

      if (requestFullscreen) {
        try {
          const result = requestFullscreen.call(element);
          if (result && typeof result.catch === 'function') {
            result.catch((err) => {
              console.error('Error attempting to enable fullscreen:', err);
            });
          }
        } catch (err) {
          console.error('Error attempting to enable fullscreen:', err);
        }
      }

      document.body.classList.add("production-fullscreen");
      document.querySelector(".header")?.classList.add("d-none");
      document.querySelector(".sidebar")?.classList.add("d-none");
      document.querySelector(".footer")?.closest('.container-fluid')?.classList.add("d-none");
      const content = document.querySelector(".content-wrap");
      if (content) content.style.padding = "0";
    } else {
      // Check if document is actually in fullscreen before trying to exit
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      if (isCurrentlyFullscreen) {
        const exitFullscreen =
          document.exitFullscreen ||
          document.webkitExitFullscreen ||
          document.mozCancelFullScreen ||
          document.msExitFullscreen;

        if (exitFullscreen) {
          try {
            const result = exitFullscreen.call(document);
            if (result && typeof result.catch === 'function') {
              result.catch((err) => {
                // Silently handle errors - document might have already exited fullscreen
                console.warn('Fullscreen exit warning (can be ignored):', err.message);
              });
            }
          } catch (err) {
            console.warn('Fullscreen exit warning (can be ignored):', err.message);
          }
        }
      }

      document.body.classList.remove("production-fullscreen");
      document.querySelector(".header")?.classList.remove("d-none");
      document.querySelector(".sidebar")?.classList.remove("d-none");
      document.querySelector(".footer")?.closest('.container-fluid')?.classList.remove("d-none");
      const content = document.querySelector(".content-wrap");
      if (content) content.style.padding = "";
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);

      // Only clean up UI classes, don't try to exit fullscreen in cleanup
      // The fullscreen state will be handled by the browser or the next effect run
      document.body.classList.remove("production-fullscreen");
      document.querySelector(".header")?.classList.remove("d-none");
      document.querySelector(".sidebar")?.classList.remove("d-none");
      const content = document.querySelector(".content-wrap");
      if (content) content.style.padding = "";
    };
  }, [isFullscreen]);


  useEffect(() => {
    let wakeLock = null;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isFullscreen) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
          console.log('Wake Lock is active');
        } catch (err) {
          console.error(`${err.name}, ${err.message}`);
        }
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLock !== null) {
        await wakeLock.release();
        wakeLock = null;
        console.log('Wake Lock released');
      }
    };


    const handleVisibilityChange = async () => {
      if (isFullscreen && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    if (isFullscreen) {
      requestWakeLock();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isFullscreen]);


  useEffect(() => {
    if (!isFullscreen) return;

    const handleMouseMove = (e) => {
      const topThreshold = 100;
      setShowFullscreenControls(e.clientY <= topThreshold);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [isFullscreen]);


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


    const channel = window.Echo.private(`user.${auth.user.id}`);


    const handleTicketUpdate = (data) => {
      console.log('🔔 Dashboard Production received ticket update:', data);

      // Extract ticket ID and ticket_number from the broadcast data
      // The event broadcasts with structure: { ticket: { id, ticket_number, ... }, notification: { ... } }
      const ticketId = data?.ticket?.id;
      const ticketNumber = data?.ticket?.ticket_number;

      if (ticketId || ticketNumber) {
        const identifier = ticketId || ticketNumber;
        console.log('✅ Adding ticket to blink list:', identifier);
        setUpdatedTicketIds(prev => new Set([...prev, identifier]));

        // Remove blinking effect after 3 seconds (6 blinks at 0.5s each)
        setTimeout(() => {
          setUpdatedTicketIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(identifier);
            return newSet;
          });
        }, 3000);
      }

      router.reload({
        only: ['tickets', 'summary'],
        preserveScroll: true,
        preserveState: true
      });


      // Always show notification regardless of fullscreen state
      toast.success(data.notification?.message || 'Production updated', {
        icon: '🔔',
        duration: 3000,
        position: 'top-right',
      });
    };


    channel.listen('.ticket.status.changed', handleTicketUpdate);


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
                @keyframes blink {
                    0%, 100% {
                        background-color: transparent;
                    }
                    50% {
                        background-color: rgba(102, 126, 234, 0.2);
                    }
                }
                .row-updated-blink {
                    animation: blink 0.5s ease-in-out 6;
                }
            `;
      document.head.appendChild(style);
    }


    return () => {
      console.log('🔌 Cleaning up production board WebSocket...');
      if (channel) {
        channel.stopListening('.ticket.status.changed');
      }
    };
  }, [auth?.user?.id, isFullscreen]);

  const toggleFullscreen = () => {
    const nextFullscreen = !isFullscreen;
    setIsFullscreen(nextFullscreen);

    if (nextFullscreen) {
      setActiveView("table");
      setAutoPageEnabled(false);
    } else {
      setAutoPageEnabled(false);

      window.scrollTo({ top: 0, behavior: 'instant' });
    }
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
        }
      }
    );
  };

  const handleUpdateProgress = () => {
    if (!selectedTicket) return;

    const quantity = parseInt(producedQuantity) || 0;
    if (quantity < 0 || quantity > selectedTicket.quantity) {
      toast.error(`Quantity must be between 0 and ${selectedTicket.quantity}`);
      return;
    }

    setLoading(true);
    const status =
      quantity >= selectedTicket.quantity ? "completed" : "in_production";

    router.post(
      `/production/${selectedTicket.id}/update`,
      {
        produced_quantity: quantity,
        status: status
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
        }
      }
    );
  };

  const handleMarkCompleted = (ticketId) => {
    if (
      !confirm(
        "Mark this ticket as completed? Stock will be automatically deducted."
      ))

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
        }
      }
    );
  };

  const handleOpenStockModal = (ticket) => {
    setSelectedTicket(ticket);


    const initialConsumptions = [];
    if (ticket.job_type?.stock_requirements) {
      ticket.job_type.stock_requirements.forEach((req) => {
        const requiredQty =
          parseFloat(req.quantity_per_unit) * ticket.quantity;
        initialConsumptions.push({
          stock_item_id: req.stock_item_id,
          quantity: requiredQty.toFixed(2),
          notes: req.notes || ""
        });
      });
    }


    if (initialConsumptions.length === 0) {
      initialConsumptions.push({
        stock_item_id: "",
        quantity: "",
        notes: ""
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
        notes: ""
      }]
    );
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
      toast.error("Please add at least one stock consumption record.");
      return;
    }

    setLoading(true);
    router.post(
      `/production/${selectedTicket.id}/record-stock`,
      {
        stock_consumptions: validConsumptions.map((c) => ({
          stock_item_id: parseInt(c.stock_item_id),
          quantity: parseFloat(c.quantity),
          notes: c.notes || null
        }))
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
        }
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
      ready_to_print: "text-info",
      in_production: "text-warning",
      completed: "text-success",
      pending: "text-secondary"
    };
    const labels = {
      ready_to_print: "Ready to Print",
      in_production: "In Progress",
      completed: "Completed",
      pending: "Pending"
    };
    return (
      <b className={`${classes[status] || "text-black"}`}>
        {labels[status] || status?.toUpperCase() || "PENDING"}
      </b>);

  };

  const getActionButton = (ticket) => {
    const canUpdate = canUpdateTicket(ticket);

    if (ticket.status === "ready_to_print") {
      return (
        <div className="btn-group">
          <button
            type="button"
            className="btn btn-link btn-sm text-orange-500"
            onClick={() => handleView(ticket)}>

            <i className="ti-eye"></i> View
          </button>
          <button
            type="button"
            className="btn btn-link btn-sm text-green-500"
            onClick={() => handleStartProduction(ticket.id)}
            disabled={loading || !canUpdate}
            title={!canUpdate ? "You are not assigned to this workflow step" : ""}>

            <i className="ti-play"></i> Start
          </button>
        </div>);

    } else if (ticket.status === "in_production") {
      return (
        <div className="btn-group">
          <button
            type="button"
            className="btn btn-link btn-sm text-orange-500"
            onClick={() => handleUpdate(ticket)}
            disabled={!canUpdate}
            title={!canUpdate ? "You are not assigned to this workflow step" : ""}>

            <i className="ti-pencil"></i> Update
          </button>
          {ticket.produced_quantity >= ticket.quantity && canUpdate &&
            <button
              type="button"
              className="btn btn-link btn-sm text-success"
              onClick={() => handleMarkCompleted(ticket.id)}
              disabled={loading}>

              <i className="ti-check"></i> Complete
            </button>
          }
          {!canUpdate &&
            <span className="text-muted small">
              <i className="ti-lock"></i> Not your turn
            </span>
          }
        </div>);

    } else if (ticket.status === "completed") {
      return (
        <span className="text-success">
          <i className="ti-check"></i> Completed
          {ticket.stock_consumptions &&
            ticket.stock_consumptions.length > 0 &&
            <small className="d-block text-muted">
              Stock deducted automatically
            </small>
          }
        </span>);

    } else {
      return (
        <button
          type="button"
          className="btn btn-link btn-sm text-orange-500"
          onClick={() => handleView(ticket)}>

          <i className="ti-eye"></i> View
        </button>);

    }
  };

  const getWorkflowBadge = (workflowStep) => {
    if (!workflowStep) return <span className="text-muted">Not Started</span>;
    const WORKFLOW_STEPS_LOCAL = [
      { key: 'printing', label: 'Printing', icon: 'ti-printer', color: '#2196F3' },
      { key: 'lamination_heatpress', label: 'Lamination/Heatpress', icon: 'ti-layers', color: '#FF9800' },
      { key: 'cutting', label: 'Cutting', icon: 'ti-cut', color: '#F44336' },
      { key: 'sewing', label: 'Sewing', icon: 'ti-pin-alt', color: '#E91E63' },
      { key: 'dtf_press', label: 'DTF Press', icon: 'ti-stamp', color: '#673AB7' },
      { key: 'qa', label: 'Quality Assurance', icon: 'ti-check-box', color: '#4CAF50' }];

    const step = WORKFLOW_STEPS_LOCAL.find((s) => s.key === workflowStep);
    if (!step) return <span className="text-muted">{workflowStep}</span>;

    return (
      <div className="badge" style={{ backgroundColor: step.color, color: 'white' }}>
        <i className={`${step.icon} mr-1`}></i>
        {step.label}
      </div>);

  };

  const getDaysUntilDue = (dateString, isFullscreen) => {
    if (!dateString) return null;
    const dueDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <div className="text-danger font-weight-bold" style={{ fontSize: isFullscreen ? '1.1rem' : '0.8rem' }}>{Math.abs(diffDays)} days overdue</div>;
    } else if (diffDays === 0) {
      return <div className="text-warning font-weight-bold" style={{ fontSize: isFullscreen ? '1.1rem' : '0.8rem' }}>Due today</div>;
    } else if (diffDays <= 2) {
      return <div className="text-warning font-weight-bold" style={{ fontSize: isFullscreen ? '1.1rem' : '0.8rem' }}>{diffDays} days left</div>;
    } else {
      return <div className="text-muted font-weight-bold" style={{ fontSize: isFullscreen ? '1.1rem' : '0.8rem' }}>{diffDays} days left</div>;
    }
  };


  const ticketColumns = [
    {
      label: "Ticket ID",
      key: "ticket_number",
      render: (row) =>
        <div className="d-flex align-items-center" style={{ maxWidth: isFullscreen ? '350px' : '250px' }}>
          {row.mockup_files && row.mockup_files.length > 0 &&
            <div className="mr-3">
              <img
                src={row.mockup_files[0].file_path}
                alt="Preview"
                className="img-thumbnail"
                style={{
                  width: isFullscreen ? '80px' : '70px',
                  height: isFullscreen ? '60px' : '70px',
                  objectFit: isFullscreen ? 'contain' : 'cover',
                  objectPosition: 'center',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  backgroundColor: isFullscreen ? '#f5f5f5' : 'transparent',
                  border: isFullscreen ? '1px solid #e0e0e0' : 'none'
                }}
                onClick={() => handleView(row)} />

            </div>
          }
          <div style={{ overflow: 'hidden' }}>
            {row.job_type &&
              <div className="text-muted font-weight-bold mb-1" style={{
                fontSize: isFullscreen ? '1rem' : '0.8rem',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {row.job_type.name}
              </div>
            }
            {row.ticket_number}
          </div>
        </div>

    },
    {
      label: "Description",
      key: "description",
      render: (row) =>
        <div style={{ maxWidth: isFullscreen ? '500px' : '300px' }}>
          <div className="font-weight-bold" style={{
            fontSize: isFullscreen ? '1.15rem' : '1rem',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            lineHeight: '1.2'
          }}>{row.description}</div>
          <div className="text-primary font-weight-bold" style={{ fontSize: isFullscreen ? '1rem' : '0.85rem' }}>
            {row.customer?.firstname} {row.customer?.lastname}
          </div>
        </div>

    },
    {
      label: "Quantity / Progress",
      key: "quantity",
      render: (row) => {
        const totalQty = row.total_quantity || (row.quantity || 0) + (row.free_quantity || 0);
        const currentStep = row.current_workflow_step;
        let stepQuantity = 0;

        if (row.status === 'completed') {
          stepQuantity = totalQty;
        } else if (currentStep && row.workflow_progress) {
          const stepProgress = row.workflow_progress.find((wp) => wp.workflow_step === currentStep);
          stepQuantity = stepProgress?.completed_quantity || 0;
        } else {
          stepQuantity = row.produced_quantity || 0;
        }

        const percentage = totalQty > 0 ? Math.round(stepQuantity / totalQty * 100) : 0;

        return (
          <div style={{ minWidth: '100px' }}>
            <div className="d-flex justify-content-between mb-1">
              <span className={stepQuantity >= totalQty ? "text-success font-weight-bold" : "text-warning font-weight-bold"} style={{ fontSize: '1rem' }}>
                {stepQuantity} / {totalQty}
              </span>
              <span className="font-weight-semibold" style={{ color: '#667eea', fontSize: '1rem' }}>{percentage}%</span>
            </div>
            <div className="progress shadow-sm" style={{ height: isFullscreen ? '14px' : '8px', borderRadius: '10px' }}>
              <div
                className={`progress-bar progress-bar-striped progress-bar-animated ${stepQuantity >= totalQty ? 'bg-success' : 'bg-warning'}`}
                style={{ width: `${percentage}%` }}>
              </div>
            </div>
          </div>);

      }
    },
    {
      label: "Workflow",
      key: "current_workflow_step",
      render: (row) =>
        <div style={{ transform: isFullscreen ? 'scale(1.2)' : 'none', transformOrigin: 'left' }}>
          {getWorkflowBadge(row.current_workflow_step)}
        </div>

    },
    {
      label: "Assigned Users & Progress",
      key: "assigned_to",
      render: (row) => {
        const users = row.assigned_users && row.assigned_users.length > 0 ?
          row.assigned_users :
          row.assigned_to_user ? [row.assigned_to_user] : [];

        if (users.length === 0) return <span className="text-muted small italic">Unassigned</span>;

        return (
          <div className="d-flex flex-wrap gap-2" style={{ maxWidth: isFullscreen ? '400px' : '250px' }}>
            {users.map((user) => {
              const userQty = row.production_records ?
                row.production_records.
                  filter((r) => r.user_id === user.id && r.workflow_step === row.current_workflow_step).
                  reduce((sum, r) => sum + (r.quantity_produced || 0), 0) :
                0;

              return (
                <div
                  key={user.id}
                  className="d-flex align-items-center bg-white shadow-sm "
                  style={{
                    padding: isFullscreen ? '2px 8px' : '2px 8px',
                    fontSize: isFullscreen ? '0.8rem' : '0.75rem',
                    borderLeft: '4px solid #667eea !important'
                  }}>

                  <span className="font-weight-bold mr-2 text-dark">
                    {user.name}
                  </span>
                  <span
                    className="badge badge-primary px-2"
                    style={{
                      borderRadius: '10px',
                      backgroundColor: userQty > 0 ? '#667eea' : '#6c757d',
                      fontSize: isFullscreen ? '0.85rem' : '0.7rem'
                    }}>

                    {userQty}
                  </span>
                </div>);

            })}
          </div>);

      }
    },
    {
      label: "Due Date",
      key: "due_date",
      render: (row) =>
        <div className="text-center">
          <div className="font-weight-bold" style={{ fontSize: isFullscreen ? '1.2rem' : '1rem', color: '#1a1a1a' }}>
            {formatDate(row.due_date)}
          </div>
          {getDaysUntilDue(row.due_date, isFullscreen)}
        </div>

    },
    {
      label: "Status",
      key: "status",
      render: (row) =>
        <div style={{
          fontSize: '1rem',
          whiteSpace: 'nowrap',
          fontWeight: 'bold'
        }}>
          {getStatusBadge(row.status)}
        </div>

    },
    {
      label: "Material Status",
      key: "material_status",
      render: (row) => {
        const hasMaterialsDeducted = row.materials_deducted === true || row.materials_deducted === 1;
        return (
          <div className="text-center">
            {hasMaterialsDeducted ? (
              <div className="badge badge-success" style={{ fontSize: isFullscreen ? '0.9rem' : '0.75rem' }}>
                <i className="ti-check mr-1"></i>
                Materials Deducted
              </div>
            ) : (
              <div className="badge badge-secondary" style={{ fontSize: isFullscreen ? '0.9rem' : '0.75rem' }}>
                <i className="ti-time mr-1"></i>
                Pending Deduction
              </div>
            )}
          </div>
        );
      }
    },
    {
      label: "Actions",
      key: "actions",
      render: (row) => {
        const hasMaterialsDeducted = row.materials_deducted === true || row.materials_deducted === 1;
        const canUpdate = canUpdateTicket(row);
        
        return (
          <div className="btn-group" style={{ minWidth: '150px' }}>
            {getActionButton(row)}
            {!isFullscreen && row.status !== 'completed' && !hasMaterialsDeducted && (
              <button
                type="button"
                className="btn btn-link btn-sm text-primary"
                onClick={() => handleOpenStockModal(row)}
                disabled={!canUpdate}
                title={!canUpdate ? "You are not assigned to this workflow step" : "Record material usage"}>
                <i className="ti-package"></i> Deduct Materials
              </button>
            )}
          </div>
        );
      }
    }];


  return (
    <AdminLayout
      user={user}
      notifications={notifications}
      messages={messages}>

      <Head title="Production Monitor" />

      <div
        className={`position-fixed d-flex align-items-center gap-3 fullscreen-controls`}
        style={{
          top: isFullscreen ? "10px" : "15px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          backgroundColor: "rgba(255,255,255,0.95)",
          padding: "8px 24px",
          borderRadius: "50px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          backdropFilter: "blur(10px)",
          opacity: isFullscreen ? showFullscreenControls ? 1 : 0 : 1,
          pointerEvents: isFullscreen ? showFullscreenControls ? 'auto' : 'none' : 'auto',
          transition: "opacity 0.3s ease-in-out"
        }}>

        {/* Auto Page Controls */}
        {/* <div className="d-flex align-items-center gap-2 mr-3 border-right pr-3">
             <div className="custom-control custom-switch">
                 <input
                     type="checkbox"
                     className="custom-control-input"
                     id="autoPageSwitch"
                     checked={autoPageEnabled}
                     onChange={(e) => setAutoPageEnabled(e.target.checked)}
                 />
                 <label className="custom-control-label small font-weight-bold" htmlFor="autoPageSwitch" style={{ cursor: 'pointer' }}>
                     Auto-Page
                 </label>
             </div>
             {autoPageEnabled && (
                 <div className="d-flex align-items-center gap-2 ml-2">
                     <input
                         type="number"
                         className="form-control form-control-sm"
                         style={{ width: '60px', borderRadius: '4px' }}
                         value={autoPageInterval}
                         onChange={(e) => setAutoPageInterval(Math.max(5, parseInt(e.target.value) || 5))}
                         title="Seconds per page"
                     />
                     <small className="text-muted font-weight-bold">sec</small>
                 </div>
             )}
          </div> */}

        {/* View Switcher */}
        <div className="btn-group btn-group-sm mr-3 shadow-sm border rounded overflow-hidden">
          <button
            type="button"
            className={`btn ${activeView === 'table' ? 'btn-primary' : 'btn-light'}`}
            onClick={() => setActiveView('table')}>

            <i className="ti-layout-grid2 mr-1"></i> Table
          </button>
          <button
            type="button"
            className={`btn ${activeView === 'board' ? 'btn-primary' : 'btn-light'}`}
            onClick={() => setActiveView('board')}>

            <i className="ti-view-list mr-1"></i> Board
          </button>
        </div>

        <button
          type="button"
          className="btn shadow-sm"
          onClick={toggleFullscreen}
          style={{
            borderRadius: "25px",
            padding: "8px 16px",
            fontSize: "12px",
            fontWeight: "bold",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            backgroundColor: isFullscreen ? "#dc3545" : "#667eea",
            border: "none",
            color: "white",
            transition: "all 0.3s ease"
          }}>

          {isFullscreen ?
            <>
              <i className="ti-close mr-1"></i> Exit Monitor
            </> :

            <>
              <i className="ti-fullscreen mr-1"></i> TV/Monitor View
            </>
          }
        </button>
      </div>

      {/* Header / Logo Section */}
      {isFullscreen ?
        <div className="d-flex align-items-center justify-content-between p-4 mb-3 border-bottom bg-white shadow-sm" style={{ height: '100px' }}>
          <div className="d-flex align-items-center">
            <img
              src="/images/logo.jpg"
              alt="Company Logo"
              style={{ height: '70px', marginRight: '25px', objectFit: 'contain' }}
              onError={(e) => { e.target.src = '/images/logo.jpg'; }} />

            <div>
              <h2 className="mb-0 font-weight-bold" style={{ fontSize: '2.5rem', letterSpacing: '-1px', color: '#1a1a1a' }}>
                PRODUCTION MONITOR
              </h2>
              <p className="mb-0 text-muted font-weight-bold" style={{ fontSize: '1.1rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
                Real-time Shopfloor Workflow
              </p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="mb-0 font-weight-bold" style={{ fontSize: '3.5rem', color: '#667eea', lineHeight: '1' }}>
              {currentTime.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true
              })}
            </h2>
            <p className="mb-0 text-muted font-weight-bold" style={{ fontSize: '1.2rem' }}>
              {currentTime.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </p>
          </div>
        </div> :

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
      }

      {/* Summary Cards (Only when not in fullscreen) */}
      {
        !isFullscreen &&
        <div className="row mb-4">
          <div className="col-lg-3 col-md-6 mb-3">
            <CardStatistics
              label="Total Items Produced Today"
              statistics={stats.total}
              icon="ti-package"
              color="bg-info" />

          </div>
          <div className="col-lg-3 col-md-6 mb-3">
            <CardStatistics
              label="In Progress"
              statistics={stats.inProgress}
              icon="ti-settings"
              color="bg-warning" />

          </div>
          <div className="col-lg-3 col-md-6 mb-3">
            <CardStatistics
              label="Finished Today"
              statistics={stats.finished}
              icon="ti-check"
              color="bg-success" />

          </div>
          <div className="col-lg-3 col-md-6 mb-3">
            <CardStatistics
              label="Delayed Tickets"
              statistics={stats.delays}
              icon="ti-alert"
              color="bg-danger" />

          </div>
        </div>

      }

      <section id="main-content">
        <div
          className="content-wrap"
          style={
            isFullscreen ? { marginLeft: "0", padding: "0" } : {}
          }>

          <div
            className="main"
            style={isFullscreen ? { padding: "0" } : {}}>

            <div
              className="container-fluid"
              style={
                isFullscreen ?
                  { maxWidth: "100%", padding: "0" } :
                  {}
              }>

              <div className="row">
                <div className="col-lg-12">
                  <div
                    className="card p-0 m-0"
                    style={{
                      border: "none",
                      boxShadow: isFullscreen ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
                      background: isFullscreen ? 'transparent' : 'white'
                    }}>

                    {!isFullscreen &&
                      <div className="card-title mt-3 px-4">
                        <div className="d-flex justify-content-between align-items-center">
                          <h4>Production Activity</h4>
                          <div className="d-flex align-items-center gap-3">
                            <SearchBox
                              placeholder="Search tickets..."
                              initialValue={filters.search || ""}
                              route="/production" />

                          </div>
                        </div>
                      </div>
                    }

                    <div className="card-body" style={{ padding: isFullscreen ? '0' : '1.25rem' }}>
                      <div>
                        {activeView === 'board' ?
                          <ProductionBoard tickets={tickets.data} isFullscreen={isFullscreen} /> :

                          <div className={isFullscreen ? "table-fullscreen-container" : ""}>
                            <DataTable
                              columns={ticketColumns}
                              data={tickets.data}
                              pagination={isFullscreen ? null : tickets}
                              emptyMessage="No tickets found in the production queue."
                              getRowClassName={(row) => {
                                const isUpdated = updatedTicketIds.has(row.id) ||
                                  (row.ticket_number && updatedTicketIds.has(row.ticket_number));
                                return isUpdated ? 'row-updated-blink' : '';
                              }} />

                          </div>
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

      <style>{`
                body.production-fullscreen {
                    overflow-x: hidden;
                    background: #f8f9fa !important;
                }
                body.production-fullscreen .header,
                body.production-fullscreen .sidebar,
                body.production-fullscreen .footer {
                    display: none !important;
                }
                body.production-fullscreen .content-wrap {
                    margin-left: 0 !important;
                    width: 100% !important;
                    padding: 0 !important;
                }
                body.production-fullscreen #main-content {
                    padding: 0 !important;
                }
                body.production-fullscreen .table-fullscreen-container {
                    background: white;
                    border-radius: 0;
                    box-shadow: none;
                    padding: 0;
                    width: 100%;
                    height: calc(100vh - 110px);
                    overflow: hidden;
                }
                body.production-fullscreen .table-fullscreen-container .table {
                    width: 100% !important;
                    margin-bottom: 0;
                }
                body.production-fullscreen .table-fullscreen-container .table-responsive {
                    height: 100%;
                    overflow: hidden;
                    width: 100%;
                }
                body.production-fullscreen .table th {
                    font-size: 1.2rem;
                    padding: 20px 15px;
                    background-color: #f8f9fa;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                body.production-fullscreen .table td {
                    padding: 20px 15px;
                    vertical-align: middle;
                }
                body.production-fullscreen .table th:nth-last-child(1),
                body.production-fullscreen .table td:nth-last-child(1) {
                    min-width: 180px;
                    white-space: nowrap;
                }
                .fullscreen-controls {
                    transition: opacity 0.3s ease-in-out;
                }
                
                /* Hide scrollbars in fullscreen mode */
                body.production-fullscreen .table-fullscreen-container::-webkit-scrollbar,
                body.production-fullscreen .table-fullscreen-container .table-responsive::-webkit-scrollbar,
                body.production-fullscreen .production-board::-webkit-scrollbar,
                body.production-fullscreen .workflow-column .card-body::-webkit-scrollbar {
                    display: none;
                    width: 0;
                    height: 0;
                }
                body.production-fullscreen .table-fullscreen-container,
                body.production-fullscreen .table-fullscreen-container .table-responsive,
                body.production-fullscreen .production-board,
                body.production-fullscreen .workflow-column .card-body {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                
                @keyframes slideInRight {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(400px); opacity: 0; }
                }
            `}</style>
    </AdminLayout>);

}