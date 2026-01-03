import React, { useState, useEffect } from "react";
import { getColorName, getFullColorName } from "@/Utils/colors";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Modal from "@/Components/Main/Modal";
import DataTable from "@/Components/Common/DataTable";
import SearchBox from "@/Components/Common/SearchBox";
import FlashMessage from "@/Components/Common/FlashMessage";
import FormInput from "@/Components/Common/FormInput";
import { formatDate } from "@/Utils/formatDate";
import { useRoleApi } from "@/Hooks/useRoleApi";
import WorkflowTimeline from "@/Components/Production/WorkflowTimeline";
import TicketAssigner from "@/Components/Production/TicketAssigner";
import Confirmation from "@/Components/Common/Confirmation";

const WORKFLOW_STEPS = {
  printing: { label: 'Printing', icon: 'ti-printer', color: '#2196F3' },
  lamination_heatpress: { label: 'Lamination/Heatpress', icon: 'ti-layers', color: '#FF9800' },
  cutting: { label: 'Cutting', icon: 'ti-cut', color: '#F44336' },
  sewing: { label: 'Sewing', icon: 'ti-pin-alt', color: '#E91E63' },
  dtf_press: { label: 'DTF Press', icon: 'ti-stamp', color: '#673AB7' },
  qa: { label: 'Quality Assurance', icon: 'ti-check-box', color: '#4CAF50' }
};

export default function WorkflowView({
  user = {},
  notifications = [],
  messages = [],
  tickets = { data: [] },
  filters = {},
  workflowStep = 'printing',
  productionUsers = []
}) {
  const [openViewModal, setViewModalOpen] = useState(false);
  const [openUpdateModal, setUpdateModalOpen] = useState(false);
  const [openTimelineModal, setTimelineModalOpen] = useState(false);
  const [openStartConfirmModal, setStartConfirmModalOpen] = useState(false);
  const [openProceedConfirmModal, setProceedConfirmModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketToStart, setTicketToStart] = useState(null);
  const [ticketToProceed, setTicketToProceed] = useState(null);
  const [producedQuantity, setProducedQuantity] = useState(0);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [ticketsToBatchUpdate, setTicketsToBatchUpdate] = useState(new Set());
  const [selectedPreviewFile, setSelectedPreviewFile] = useState(null);
  const [selectedEvidenceImage, setSelectedEvidenceImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updateModalMessage, setUpdateModalMessage] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userQuantities, setUserQuantities] = useState({});
  const [userEvidenceFiles, setUserEvidenceFiles] = useState({});
  const [updatedTicketIds, setUpdatedTicketIds] = useState(new Set());
  const { flash, auth } = usePage().props;
  const { buildUrl } = useRoleApi();
  const isProductionHead = auth?.user?.role === 'Production' && auth?.user?.is_head;
  const isAdmin = auth?.user?.role === 'admin';
  const canOnlyPrint = auth?.user?.can_only_print || false;


  const workflowInfo = WORKFLOW_STEPS[workflowStep] || { label: workflowStep, icon: 'ti-package', color: '#2196F3' };


  useEffect(() => {
    if (!window.Echo || !auth?.user?.id) return;

    const channel = window.Echo.private(`user.${auth.user.id}`);
    const handleTicketUpdate = (data) => {

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

      // Show notification toast
      if (data?.notification) {
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
            max-width: 350px;
          ">
            <i class="ti-bell mr-2"></i>${data.notification.message || 'Production updated'}
          </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
          notification.style.animation = 'slideOutRight 0.3s ease-in';
          setTimeout(() => notification.remove(), 300);
        }, 3000);
      }

      router.reload({
        only: ['tickets'],
        preserveScroll: true,
        preserveState: true
      });
    };

    channel.listen('.ticket.status.changed', handleTicketUpdate);

    // Add animation styles if not already present
    if (!document.getElementById('workflow-notification-animations')) {
      const style = document.createElement('style');
      style.id = 'workflow-notification-animations';
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

    return () => {
      if (channel) {
        channel.stopListening('.ticket.status.changed');
      }
    };
  }, [auth?.user?.id]);

  const handleView = (ticket) => {
    setSelectedTicket(ticket);
    setViewModalOpen(true);
  };

  const handleViewTimeline = (ticket) => {
    console.log(ticket);
    setSelectedTicket(ticket);
    setTimelineModalOpen(true);
  };

  const handleAssignUsers = (ticket, userIds) => {
    if (!isProductionHead && !isAdmin) {
      return;
    }

    router.post(buildUrl(`/queue/${ticket.id}/assign-users`), {
      user_ids: userIds,
      workflow_step: ticket.current_workflow_step || workflowStep
    }, {
      preserveScroll: true,
      preserveState: true,
      onError: (errors) => {
        console.error('Assignment error:', errors);
      }
    });
  };

  const handleUpdate = (ticket) => {
    setSelectedTicket(ticket);
    setUpdateModalMessage(null);


    const assignedUsers = ticket.assigned_users || [];
    const initialQuantities = {};
    const initialEvidence = {};

    assignedUsers.forEach((user) => {
      const userRecord = ticket.production_records?.find(
        (r) => r.user_id === user.id && r.workflow_step === workflowStep
      );
      initialQuantities[user.id] = userRecord?.quantity_produced || 0;
      initialEvidence[user.id] = [];
    });

    setUserQuantities(initialQuantities);
    setUserEvidenceFiles(initialEvidence);
    setEvidenceFiles([]);
    setProducedQuantity(0);

    setUpdateModalOpen(true);
  };

  const handleStartWork = (ticket) => {
    setTicketToStart(ticket);
    setStartConfirmModalOpen(true);
  };

  const handleConfirmStart = () => {
    if (!ticketToStart) return;
    setLoading(true);
    setStartConfirmModalOpen(false);
    router.post(buildUrl(`/workflow/${workflowStep}/start/${ticketToStart.id}`), {}, {
      preserveScroll: true,
      preserveState: false,
      onFinish: () => {
        setLoading(false);
        setTicketToStart(null);
      }
    });
  };

  const handleProceedToNext = (ticket) => {
    setTicketToProceed(ticket);
    setProceedConfirmModalOpen(true);
  };

  const handleConfirmProceed = () => {
    if (!ticketToProceed) return;
    setLoading(true);
    setProceedConfirmModalOpen(false);
    router.post(buildUrl(`/workflow/${workflowStep}/complete/${ticketToProceed.id}`), {}, {
      preserveScroll: true,
      preserveState: false,
      onSuccess: () => {
        router.reload({ only: ['tickets'], preserveScroll: true });
      },
      onFinish: () => {
        setLoading(false);
        setTicketToProceed(null);
      }
    });
  };

  const handleUpdateUserQuantity = (userId, quantity) => {
    const maxQuantity = selectedTicket?.total_quantity || (selectedTicket?.quantity || 0) + (selectedTicket?.free_quantity || 0);
    const qty = Math.max(0, Math.min(parseInt(quantity) || 0, maxQuantity));
    setUserQuantities((prev) => ({
      ...prev,
      [userId]: qty
    }));
  };

  const handleAddUserEvidence = (userId, files) => {
    const fileArray = Array.from(files);
    setUserEvidenceFiles((prev) => ({
      ...prev,
      [userId]: [...(prev[userId] || []), ...fileArray]
    }));
  };

  const handleRemoveUserEvidence = (userId, index) => {
    setUserEvidenceFiles((prev) => ({
      ...prev,
      [userId]: prev[userId].filter((_, i) => i !== index)
    }));
  };

  const calculateTotalProgress = () => {
    return Object.values(userQuantities).reduce((sum, qty) => sum + (parseInt(qty) || 0), 0);
  };

  const handleUpdateProgress = () => {
    if (!selectedTicket) return;

    setUpdateModalMessage(null);

    const assignedUsers = selectedTicket.assigned_users || [];
    const maxQuantity = selectedTicket.total_quantity || (selectedTicket.quantity || 0) + (selectedTicket.free_quantity || 0);
    const totalProgress = calculateTotalProgress();


    if (totalProgress > maxQuantity) {
      setUpdateModalMessage({ type: 'error', text: `Total quantity (${totalProgress}) cannot exceed ${maxQuantity}` });
      return;
    }


    const hasUpdates = assignedUsers.some((user) => {
      const qty = userQuantities[user.id] || 0;
      const evidence = userEvidenceFiles[user.id] || [];
      return qty > 0 || evidence.length > 0;
    });

    if (!hasUpdates) {
      setUpdateModalMessage({ type: 'error', text: 'Please enter at least one quantity or upload evidence for at least one user.' });
      return;
    }

    setLoading(true);


    const usersToUpdate = assignedUsers.filter((user) => {
      const qty = parseInt(userQuantities[user.id]) || 0;
      const evidence = userEvidenceFiles[user.id] || [];
      return qty > 0 || evidence.length > 0;
    });

    if (usersToUpdate.length === 0) {
      setUpdateModalMessage({ type: 'error', text: 'No updates to save.' });
      setLoading(false);
      return;
    }

    // Batch all user updates into a single request
    const formData = new FormData();
    formData.append('workflow_step', workflowStep);

    // Build user updates array
    const userUpdates = [];
    usersToUpdate.forEach((user) => {
      const userQty = parseInt(userQuantities[user.id]) || 0;
      userUpdates.push({
        user_id: user.id,
        quantity_produced: userQty
      });
    });

    // Append user updates as JSON
    formData.append('user_updates', JSON.stringify(userUpdates));

    // Append evidence files for each user
    let evidenceFileIndex = 0;
    usersToUpdate.forEach((user) => {
      const userEvidence = userEvidenceFiles[user.id] || [];
      userEvidence.forEach((file) => {
        if (file instanceof File) {
          formData.append(`evidence_files[${evidenceFileIndex}][file]`, file);
          formData.append(`evidence_files[${evidenceFileIndex}][user_id]`, user.id);
          evidenceFileIndex++;
        }
      });
    });

    const endpoint = buildUrl(`/workflow/${workflowStep}/update/${selectedTicket.id}`);

    router.post(endpoint, formData, {
      preserveScroll: true,
      preserveState: false,
      forceFormData: true,
      onSuccess: () => {
        // Check if workflow should auto-complete
        const shouldAutoComplete = totalProgress >= maxQuantity;
        if (shouldAutoComplete) {
          router.post(buildUrl(`/workflow/${workflowStep}/complete/${selectedTicket.id}`), {}, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
              setUpdateModalMessage({
                type: 'success',
                text: `${workflowInfo.label} completed and moved to next step!`
              });
              setLoading(false);
              // Close modal and reload to show ticket has moved to next workflow
              setTimeout(() => {
                handleCloseModals();
                router.reload({ only: ['tickets'], preserveScroll: true });
              }, 1500);
            },
            onError: (errors) => {
              setUpdateModalMessage({ type: 'error', text: errors?.message || 'Failed to complete workflow.' });
              setLoading(false);
            },
            onFinish: () => {
              setLoading(false);
            }
          });
        } else {
          setUpdateModalMessage({
            type: 'success',
            text: 'Progress updated successfully!'
          });
          setTimeout(() => {
            handleCloseModals();
            router.reload({ only: ['tickets'], preserveScroll: true });
          }, 1500);
          setLoading(false);
        }
      },
      onError: (errors) => {
        setUpdateModalMessage({ type: 'error', text: errors?.message || 'Failed to update progress.' });
        setLoading(false);
      },
      onFinish: () => {
        handleCloseModals();
        setLoading(false);
      }
    });
  };

  const handleCompleteWorkflow = () => {
    if (!selectedTicket) return;

    if (confirm(`Mark ${workflowInfo.label} as completed for this ticket?`)) {
      setLoading(true);
      router.post(buildUrl(`/workflow/${workflowStep}/complete/${selectedTicket.id}`), {}, {
        preserveScroll: true,
        preserveState: false,
        onSuccess: () => {
          handleCloseModals();
        },
        onFinish: () => setLoading(false)
      });
    }
  };

  const handleCloseModals = () => {
    setViewModalOpen(false);
    setUpdateModalOpen(false);
    setTimelineModalOpen(false);
    setStartConfirmModalOpen(false);
    setProceedConfirmModalOpen(false);
    setSelectedTicket(null);
    setTicketToStart(null);
    setTicketToProceed(null);
    setProducedQuantity(0);
    setEvidenceFiles([]);
    setUpdateModalMessage(null);
    setLoading(false);
    setSelectedUserId(null);
    setUserQuantities({});
    setUserEvidenceFiles({});
    setSelectedPreviewFile(null);
    setSelectedEvidenceImage(null);
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

  const handleQuickAdd = (userId, amount) => {
    const current = parseInt(userQuantities[userId]) || 0;
    const maxQuantity = selectedTicket?.total_quantity || selectedTicket?.quantity || 0;
    const totalProgress = calculateTotalProgress();
    const available = maxQuantity - (totalProgress - current);
    const newValue = Math.min(current + amount, current + available);
    handleUpdateUserQuantity(userId, newValue);
  };

  const getStatusBadge = (status) => {
    const classes = {
      ready_to_print: "badge-info",
      in_production: "badge-primary",
      completed: "badge-success",
      pending: "badge-warning"
    };
    const labels = {
      ready_to_print: "Ready to Print",
      in_production: "In Progress",
      completed: "Completed",
      pending: "Pending"
    };
    return (
      <div className={`badge ${classes[status] || "badge-secondary"}`}>
        {labels[status] || status?.toUpperCase() || "PENDING"}
      </div>);

  };

  const getWorkflowStatus = (ticket) => {
    if (!ticket.workflow_progress) return { status: 'Not Started', color: 'secondary' };

    const stepProgress = ticket.workflow_progress.find((wp) => wp.workflow_step === workflowStep);
    if (!stepProgress) return { status: 'Not Started', color: 'secondary' };

    if (stepProgress.is_completed) {
      return { status: 'Completed', color: 'success' };
    } else if (stepProgress.completed_quantity > 0) {
      return { status: 'In Progress', color: 'info' };
    } else {
      return { status: 'Pending', color: 'warning' };
    }
  };


  const ticketColumns = [
    {
      label: "#",
      key: "index",
      render: (row, index) =>
        (tickets.current_page - 1) * tickets.per_page + index + 1
    },
    {
      label: "Ticket / Preview",
      key: "ticket_number",
      render: (row) =>
        <div className="d-flex align-items-center">
          {row.mockup_files && row.mockup_files.length > 0 &&
            <img
              src={row.mockup_files[row.mockup_files.length - 1].file_path}
              alt="Preview"
              className="img-thumbnail mr-2"
              style={{ width: '60px', height: '60px', objectFit: 'cover', cursor: 'pointer' }}
              onClick={() => handleView(row)} />

          }
          <div className="flex flex-col leading-tight">
            <strong className="leading-tight">{row.ticket_number}</strong>

            {row.job_type && (
              <div className="text-muted text-xs d-flex align-items-center gap-2">
                <span><strong>Type:</strong> {row.job_type.name}</span>
                {row.selected_color && (
                  <div className="d-flex align-items-center ml-2">
                    <span
                      className="badge badge-light border d-flex align-items-center gap-1 py-1 px-2 shadow-sm"
                      style={{ fontSize: '9px', borderRadius: '12px', backgroundColor: '#f8f9fa' }}
                    >
                      <div
                        className="rounded-circle border"
                        style={{ width: '8px', height: '8px', backgroundColor: row.selected_color }}
                      ></div>
                      <span className="text-dark font-weight-bold">
                        {getFullColorName(row.selected_color, row.job_type)}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            )}


            <span className="text-muted text-xs leading-tight">
              {row.description}
            </span>
          </div>

        </div>

    },
    {
      label: "Quantity",
      key: "quantity",
      render: (row) => {
        const totalQty = row.total_quantity || (row.quantity || 0) + (row.free_quantity || 0);
        let stepQuantity = 0;

        if (row.workflow_progress) {
          const stepProgress = row.workflow_progress.find((wp) => wp.workflow_step === workflowStep);
          stepQuantity = stepProgress?.completed_quantity || 0;
        }

        const percentage = totalQty > 0 ? Math.round(stepQuantity / totalQty * 100) : 0;

        return (
          <div>
            <span className="font-weight-bold">
              <span className={stepQuantity >= totalQty ? "text-success" : "text-warning"}>
                {stepQuantity}
              </span>
              {" / "}
              {totalQty}
            </span>
            <div className="progress mt-1" style={{ height: '6px' }}>
              <div
                className={`progress-bar ${stepQuantity >= totalQty ? 'bg-success' : 'bg-warning'}`}
                style={{ width: `${percentage}%` }}>
              </div>
            </div>
            <small className="text-muted">{percentage}%</small>
          </div>);

      }
    },
    {
      label: "Workflow Status",
      key: "workflow_status",
      render: (row) => {
        const status = getWorkflowStatus(row);
        return (
          <span className={`badge badge-${status.color}`}>
            {status.status}
          </span>);

      }
    },
    {
      label: "Assigned To",
      key: "assigned_to",
      render: (row) =>
        <TicketAssigner
          ticket={row}
          productionUsers={productionUsers}
          isProductionHead={isProductionHead}
          isAdmin={isAdmin}
          canOnlyPrint={canOnlyPrint}
          auth={auth}
          onAssign={handleAssignUsers} />


    },
    {
      label: "Due Date",
      key: "due_date",
      render: (row) => {
        const dueDate = new Date(row.due_date);
        const today = new Date();
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        return (
          <div>
            <div>{formatDate(row.due_date)}</div>
            {diffDays < 0 &&
              <small className="text-danger font-weight-bold">{Math.abs(diffDays)}d overdue</small>
            }
            {diffDays >= 0 && diffDays <= 2 &&
              <small className="text-warning">{diffDays}d left</small>
            }
          </div>);

      }
    },
    {
      label: "Actions",
      key: "actions",
      render: (row) => {
        const status = getWorkflowStatus(row);
        const isProductionHead = auth?.user?.is_head || auth?.user?.role === 'admin';


        const userWorkflowSteps = auth?.user?.workflow_steps || [];
        const hasWorkflowStepAccess = auth?.user?.role === 'admin' || userWorkflowSteps.includes(workflowStep);


        const assignedUsers = row.assigned_users || (row.assigned_to_user ? [row.assigned_to_user] : []);
        const isUserAssigned = assignedUsers.some((u) => u.id === auth?.user?.id);


        const isPrintingWorkflow = workflowStep === 'printing';
        const canAccessForCanOnlyPrint = canOnlyPrint && isPrintingWorkflow && (row.status === 'ready_to_print' || row.status === 'in_production');


        const userHasAccess = hasWorkflowStepAccess || canAccessForCanOnlyPrint;
        const canStart = isProductionHead || isUserAssigned && userHasAccess;


        const canUpdate = (isUserAssigned || isProductionHead) && (
          status.status === 'In Progress' || status.status === 'Pending' || status.status === 'Completed' ||
          canAccessForCanOnlyPrint && row.status === 'ready_to_print');

        return (
          <div className="btn-group-vertical btn-group-sm">
            {status.status === 'Completed' && (isProductionHead || isAdmin) &&
              <button
                type="button"
                className="btn btn-link btn-sm text-success"
                onClick={() => handleProceedToNext(row)}
                disabled={loading}>

                <i className="ti-arrow-right"></i> Proceed to Next
              </button>
            }
            {status.status === 'Not Started' && canStart ?
              <button
                type="button"
                className="btn btn-link btn-sm text-green-500"
                onClick={() => handleStartWork(row)}
                disabled={loading}>

                <i className="ti-control-play"></i> Start
              </button> :

              canUpdate &&
              <button
                type="button"
                className="btn btn-link btn-sm text-orange-500"
                onClick={() => handleUpdate(row)}>

                <i className="ti-pencil"></i> Update
              </button>
            }
            <button
              type="button"
              className="btn btn-link btn-sm text-purple-500"
              onClick={() => handleViewTimeline(row)}>

              <i className="ti-time"></i> Timeline
            </button>
            <button
              type="button"
              className="btn btn-link btn-sm text-muted"
              onClick={() => handleView(row)}>

              <i className="ti-eye"></i> View
            </button>
          </div>);

      }
    }];


  const mockupFiles = selectedTicket?.mockup_files || [];

  return (
    <AdminLayout
      user={user}
      notifications={notifications}
      messages={messages}>

      <Head title={`${workflowInfo.label} - Production Workflow`} />

      {/* Flash Messages */}
      {flash?.success &&
        <FlashMessage type="success" message={flash.success} />
      }
      {flash?.error &&
        <FlashMessage type="error" message={flash.error} />
      }

      <div className="row">
        <div className="col-lg-8 p-r-0 title-margin-right">
          <div className="page-header">
            <div className="page-title">
              <h1 style={{ color: workflowInfo.color }}>
                <i className={`${workflowInfo.icon} mr-2`}></i>
                {workflowInfo.label} <span>Workflow</span>
              </h1>
            </div>
          </div>
        </div>
        <div className="col-lg-4 p-l-0 title-margin-left">
          <div className="page-header">
            <div className="page-title">
              <ol className="breadcrumb">
                <li className="breadcrumb-item">
                  <a href="/production/">Dashboard</a>
                </li>
                <li className="breadcrumb-item active">{workflowInfo.label}</li>
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
        size="6xl">

        {selectedTicket &&
          <div>
            {/* Ticket Info - Compact */}
            <div className="row mb-3">
              <div className="col-md-4">
                <p className="mb-1"><strong>Customer:</strong> {selectedTicket.customer?.firstname} {selectedTicket.customer?.lastname}</p>
                <p className="mb-1"><strong>Description:</strong> {selectedTicket.description}</p>
              </div>
              <div className="col-md-4">
                <p className="mb-1"><strong>Quantity:</strong> {selectedTicket.total_quantity || (selectedTicket.quantity || 0) + (selectedTicket.free_quantity || 0)}</p>
                <p className="mb-1"><strong>Due Date:</strong> {formatDate(selectedTicket.due_date)}</p>
              </div>
              <div className="col-md-4">
                <p className="mb-1"><strong>Status:</strong> {getStatusBadge(selectedTicket.status)}</p>
              </div>
            </div>

            <hr className="my-2" />

            {/* Design Files - Maximized Space */}
            <div className="mb-4">
              <h5 className="mb-3"><i className="ti-image mr-2"></i>Design Files</h5>
              {mockupFiles.length > 0 ? (
                <div className="row">
                  {(() => {
                    const file = mockupFiles[mockupFiles.length - 1];

                    return (
                      <div key={file.id} className="col-md-12 col-lg-12 mb-2">
                        <div className="card">
                          <img
                            src={file.file_path}
                            alt={file.file_name}
                            className="card-img-top"
                            style={{ height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                            onClick={() => setSelectedPreviewFile(file)}
                          />

                          <div className="card-body p-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-block btn-primary"
                              onClick={() => handleDownload(file.id, file.file_name)}
                            >
                              <i className="ti-download"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-muted">No design files available</p>
              )}
            </div>

          </div>
        }
      </Modal>

      {/* Update Progress Modal */}
      <Modal
        title={`Update ${workflowInfo.label} - Ticket #${selectedTicket?.ticket_number}`}
        isOpen={openUpdateModal}
        onClose={handleCloseModals}
        size="5xl">

        {selectedTicket && (() => {
          const assignedUsers = selectedTicket.assigned_users || [];
          const maxQuantity = selectedTicket.total_quantity || (selectedTicket.quantity || 0) + (selectedTicket.free_quantity || 0);
          const totalProgress = calculateTotalProgress();
          const progressPercentage = maxQuantity > 0 ? Math.round(totalProgress / maxQuantity * 100) : 0;

          return (
            <div>
              <div className="mb-4">
                <h4>{selectedTicket.description}</h4>
                <p className="text-muted">Update production progress for {workflowInfo.label}</p>
              </div>

              {/* Alert Message */}
              {updateModalMessage &&
                <div className={`alert alert-${updateModalMessage.type === 'success' ? 'success' : 'danger'}`}>
                  {updateModalMessage.text}
                </div>
              }

              {/* Total Progress Summary */}
              <div className="card mb-4" style={{ backgroundColor: '#f8f9fa' }}>
                <div className="card-body">
                  <div className="row align-items-center">
                    <div className="col-md-6">
                      <h5 className="mb-2">
                        <i className="ti-bar-chart mr-2"></i>Total Progress
                      </h5>
                      <div className="d-flex align-items-baseline">
                        <span className="h3 mb-0 mr-2" style={{ color: totalProgress >= maxQuantity ? '#28a745' : '#ffc107' }}>
                          {totalProgress}
                        </span>
                        <span className="text-muted">/ {maxQuantity} pcs</span>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="progress" style={{ height: "30px" }}>
                        <div
                          className={`progress-bar ${totalProgress >= maxQuantity ? "bg-success" : "bg-warning"}`}
                          style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                          role="progressbar">

                          <strong>{progressPercentage}%</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <hr />

              {/* Per-User Production Inputs */}
              <div className="mb-4">
                <h5 className="mb-3">
                  <i className="ti-user mr-2"></i>Production by User
                </h5>
                <p className="text-muted small mb-3">
                  Each assigned user can input their own produced quantity and upload evidence.
                </p>

                {assignedUsers.length === 0 ?
                  <div className="alert alert-warning">
                    <i className="ti-alert mr-2"></i>No users assigned to this ticket.
                  </div> :

                  <div className="row">
                    {assignedUsers.map((user) => {
                      const userQty = parseInt(userQuantities[user.id]) || 0;
                      const userEvidence = userEvidenceFiles[user.id] || [];
                      const isCurrentUser = user.id === auth?.user?.id;
                      const userRecord = selectedTicket.production_records?.find(
                        (r) => r.user_id === user.id && r.workflow_step === workflowStep
                      );
                      const previousQty = userRecord?.quantity_produced || 0;

                      return (
                        <div key={user.id} className="col-md-6 mb-4">
                          <div className="card h-100" style={{ borderLeft: `4px solid ${isCurrentUser ? '#28a745' : '#fb8c00'}` }}>
                            <div className="card-header" style={{ backgroundColor: isCurrentUser ? '#e8f5e9' : '#f8f9fa' }}>
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  <strong>{user.name}</strong>
                                  {isCurrentUser &&
                                    <span className="badge badge-success ml-2">You</span>
                                  }
                                </div>
                                {previousQty > 0 &&
                                  <small className="text-muted">
                                    Previous: <strong>{previousQty}</strong> pcs
                                  </small>
                                }
                              </div>
                            </div>
                            <div className="card-body">
                              {/* Quantity Input */}
                              <div className="mb-3">
                                <label className="font-weight-bold mb-2">
                                  Produced Quantity
                                </label>
                                <div className="row align-items-center">
                                  <div className="col-6">
                                    <FormInput
                                      type="number"
                                      name={`quantity_${user.id}`}
                                      value={userQty}
                                      onChange={(e) => handleUpdateUserQuantity(user.id, e.target.value)}
                                      placeholder="0"
                                      min="0"
                                      max={maxQuantity} />

                                  </div>
                                  <div className="col-6">
                                    <div className="d-flex flex-wrap gap-1">
                                      <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={() => handleQuickAdd(user.id, 1)}
                                        title="Add 1">

                                        +1
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={() => handleQuickAdd(user.id, 5)}
                                        title="Add 5">

                                        +5
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={() => handleQuickAdd(user.id, 10)}
                                        title="Add 10">

                                        +10
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                {userQty > 0 &&
                                  <div className="mt-2">
                                    <small className="text-muted">
                                      {userQty} pcs produced by {user.name}
                                    </small>
                                  </div>
                                }
                              </div>

                              {/* Evidence Upload for this user */}
                              <div className="mb-2">
                                <label className="font-weight-bold mb-2 small">
                                  <i className="ti-image mr-1"></i>Evidence Photos
                                </label>
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  className="form-control form-control-sm"
                                  onChange={(e) => handleAddUserEvidence(user.id, e.target.files)} />

                                <small className="text-muted">Upload photos as proof of work</small>
                              </div>

                              {/* Evidence Preview */}
                              {userEvidence.length > 0 &&
                                <div className="mt-2">
                                  <div className="row">
                                    {userEvidence.map((file, index) =>
                                      <div key={index} className="col-6 mb-2">
                                        <div className="position-relative">
                                          <img
                                            src={URL.createObjectURL(file)}
                                            alt={`Evidence ${index + 1}`}
                                            className="img-thumbnail"
                                            style={{ width: '100%', height: '80px', objectFit: 'cover', cursor: 'pointer' }}
                                            onClick={() => {
                                              const preview = window.open();
                                              preview.document.write(`<img src="${URL.createObjectURL(file)}" style="max-width:100%;height:auto;"/>`);
                                            }} />

                                          <button
                                            type="button"
                                            className="btn btn-sm btn-danger position-absolute"
                                            style={{ top: '2px', right: '2px', padding: '2px 6px' }}
                                            onClick={() => handleRemoveUserEvidence(user.id, index)}
                                            title="Remove">

                                            <i className="ti-close" style={{ fontSize: '12px' }}></i>
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              }
                            </div>
                          </div>
                        </div>);

                    })}
                  </div>
                }
              </div>

              <hr />

              {/* Action Buttons */}
              <div className="d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModals}
                  disabled={loading}>

                  Close
                </button>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleUpdateProgress}
                    disabled={loading}>

                    {loading ?
                      <>
                        <span className="spinner-border spinner-border-sm mr-2" role="status"></span>
                        Saving...
                      </> :

                      <>
                        <i className="ti-save mr-2"></i>
                        {totalProgress >= maxQuantity ? 'Save & Complete' : 'Save Progress'}
                      </>
                    }
                  </button>
                </div>
              </div>
            </div>);

        })()}
      </Modal>

      {/* Timeline Modal */}
      <Modal
        title={`Workflow Timeline - Ticket #${selectedTicket?.ticket_number}`}
        isOpen={openTimelineModal}
        onClose={handleCloseModals}
        size="5xl">

        {selectedTicket &&
          <WorkflowTimeline ticket={selectedTicket} />
        }
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        title="Design File Preview"
        isOpen={!!selectedPreviewFile}
        onClose={() => setSelectedPreviewFile(null)}
        zIndex="z-[60]"
        size="4xl">
        {selectedPreviewFile &&
          <div className="text-center">
            <img
              src={selectedPreviewFile.file_path}
              alt={selectedPreviewFile.file_name}
              className="img-fluid"
              style={{ maxHeight: '70vh' }} />
          </div>
        }
      </Modal>

      {/* Evidence Image Preview Modal */}
      <Modal
        title="Evidence Photo"
        isOpen={!!selectedEvidenceImage}
        onClose={() => setSelectedEvidenceImage(null)}
        zIndex="z-[60]"
        size="4xl">
        {selectedEvidenceImage &&
          <div className="modal-body text-center">
            <img
              src={selectedEvidenceImage.file_path}
              alt={selectedEvidenceImage.file_name}
              className="img-fluid"
              style={{ maxHeight: '70vh' }} />

            <div className="mt-3 text-left">
              <p className="mb-1"><strong>Uploaded by:</strong> {selectedEvidenceImage.user?.name || 'Unknown'}</p>
              <p className="mb-0"><strong>Date:</strong> {selectedEvidenceImage.uploaded_at ? formatDate(selectedEvidenceImage.uploaded_at) : 'N/A'}</p>
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t pt-3">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedEvidenceImage(null)}>
                Close
              </button>
              <a
                href={selectedEvidenceImage.file_path}
                download={selectedEvidenceImage.file_name}
                className="btn btn-primary btn-sm">
                <i className="ti-download mr-2"></i>Download
              </a>
            </div>
          </div>
        }
      </Modal>

      {/* Start Work Confirmation Modal */}
      <Modal
        title={`Start ${workflowInfo.label} Workflow`}
        isOpen={openStartConfirmModal}
        onClose={handleCloseModals}
        size="md">

        {ticketToStart &&
          <Confirmation
            label="Start Work"
            description={`Start ${workflowInfo.label} workflow for Ticket #${ticketToStart.ticket_number}?`}
            subtitle={`This will change the ticket status to "In Progress" and begin the ${workflowInfo.label} workflow step.`}
            color="success"
            icon="ti-control-play"
            loading={loading}
            onCancel={handleCloseModals}
            onSubmit={handleConfirmStart} />

        }
      </Modal>

      {/* Proceed to Next Step Confirmation Modal */}
      <Modal
        title={`Proceed to Next Workflow Step`}
        isOpen={openProceedConfirmModal}
        onClose={handleCloseModals}
        size="md">

        {ticketToProceed &&
          <Confirmation
            label="Proceed"
            description={`Move Ticket #${ticketToProceed.ticket_number} to the next workflow step?`}
            subtitle={`This will complete the ${workflowInfo.label} step and move the ticket to the next stage in the workflow.`}
            color="success"
            icon="ti-arrow-right"
            loading={loading}
            onCancel={handleCloseModals}
            onSubmit={handleConfirmProceed} />

        }
      </Modal>

      <section id="main-content">
        <div className="content-wrap">
          <div className="main">
            <div className="container-fluid">
              <div className="row">
                <div className="col-lg-12">
                  <div className="card">
                    <div className="card-title mt-3">
                      <h4 style={{ color: workflowInfo.color }}>
                        <i className={`${workflowInfo.icon} mr-2`}></i>
                        {workflowInfo.label} Queue
                      </h4>
                      <p className="text-muted">Tickets currently assigned to {workflowInfo.label}</p>
                    </div>
                    <div className="card-body">
                      <div className="row mt-4 align-items-center">
                        <div className="col-md-4">
                          <SearchBox
                            placeholder="Search tickets..."
                            initialValue={filters.search || ""}
                            route={`/workflow/${workflowStep}`} />

                        </div>
                        <div className="col-md-4"></div>
                        <div className="col-md-4 text-right">
                          <button
                            onClick={() => router.visit(buildUrl(`/workflow/${workflowStep}`), {
                              preserveState: false,
                              preserveScroll: true
                            })}

                            className="btn btn-outline-primary"
                            title="Refresh Data"
                            style={{ borderColor: workflowInfo.color, color: workflowInfo.color }}>

                            <i className="ti-reload mr-2"></i> Refresh
                          </button>
                        </div>
                      </div>

                      <div className="mt-4">
                        <DataTable
                          columns={ticketColumns}
                          data={tickets.data}
                          pagination={tickets}
                          emptyMessage={`No tickets in ${workflowInfo.label} queue.`}
                          getRowClassName={(row) => {
                            const isUpdated = updatedTicketIds.has(row.id) ||
                              (row.ticket_number && updatedTicketIds.has(row.ticket_number));
                            return isUpdated ? 'row-updated-blink' : '';
                          }} />

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
            `}</style>
    </AdminLayout>);

}