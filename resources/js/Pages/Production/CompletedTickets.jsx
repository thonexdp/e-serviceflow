import React, { useState, useRef } from "react";
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
import DateRangeFilter from "@/Components/Common/DateRangeFilter";

const TeamMemberCell = ({ productionRecords }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState('bottom');
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);


  const userWorkflows = {};
  if (productionRecords) {
    productionRecords.forEach((record) => {
      if (record.user) {
        const userId = record.user.id;
        const workflowStep = record.workflow_step || 'Unknown';

        if (!userWorkflows[userId]) {
          userWorkflows[userId] = {
            name: record.user.name,
            steps: {}
          };
        }

        if (!userWorkflows[userId].steps[workflowStep]) {
          userWorkflows[userId].steps[workflowStep] = 0;
        }
        userWorkflows[userId].steps[workflowStep] += record.quantity_produced || 0;
      }
    });
  }

  const userList = Object.values(userWorkflows);

  if (userList.length === 0) {
    return <span className="text-muted small">No records</span>;
  }

  const totalMembers = userList.length;

  const updatePosition = React.useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const dropdownHeight = 350; // Max height from style
      const dropdownWidth = 240;

      let top = rect.bottom + 5;
      let left = rect.left + rect.width - dropdownWidth;
      let newPlacement = 'bottom';

      // Check if it goes off bottom
      if (top + dropdownHeight > viewportHeight) {
        // If it can fit above, show it on top of the row
        if (rect.top > dropdownHeight) {
          top = rect.top - dropdownHeight - 5;
          newPlacement = 'top';
        } else {
          // If it can't fit above either, try to center it vertically relative to viewport
          // or just pull it up enough to be visible
          top = Math.max(10, viewportHeight - dropdownHeight - 10);
        }
      }

      // Ensure it doesn't go off left/right
      if (left < 10) left = 10;
      if (left + dropdownWidth > viewportWidth - 10) {
        left = viewportWidth - dropdownWidth - 10;
      }

      setCoords({ top, left });
      setPlacement(newPlacement);
    }
  }, []);

  const toggleDropdown = () => {
    if (!isExpanded) {
      updatePosition();
    }
    setIsExpanded(!isExpanded);
  };

  React.useEffect(() => {
    if (!isExpanded) return;

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isExpanded, updatePosition]);

  // Close on click outside
  React.useEffect(() => {
    if (!isExpanded) return;
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded]);

  return (
    <div className="position-relative">
      <button
        ref={buttonRef}
        type="button"
        className={`btn btn-sm ${isExpanded ? 'btn-primary' : 'btn-outline-primary'} py-0 px-2 d-flex align-items-center mb-1`}
        style={{ fontSize: '0.7rem', borderRadius: '12px', whiteSpace: 'nowrap' }}
        onClick={toggleDropdown}>

        <i className={`ti-user mr-1`}></i>
        {totalMembers} Member{totalMembers > 1 ? 's' : ''}
        <i className={`ti-angle-${isExpanded ? 'up' : 'down'} ml-1`} style={{ fontSize: '0.6rem' }}></i>
      </button>

      {isExpanded &&
        <div
          ref={dropdownRef}
          className="card shadow-lg border p-3 animate-in fade-in zoom-in duration-200"
          style={{
            position: "fixed",
            zIndex: 1050,
            minWidth: "240px",
            width: "240px",
            left: `${coords.left}px`,
            top: `${coords.top}px`,
            backgroundColor: "#fff",
            maxHeight: "350px",
            overflowY: "auto",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            borderRadius: "8px",
            border: '1px solid #dee2e6'
          }}>

          <div className="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2">
            <span className="font-weight-bold text-primary" style={{ fontSize: "0.85rem" }}>
              <i className="ti-user mr-1"></i> Team Production
            </span>
            <i
              className="ti-close text-muted cursor-pointer"
              style={{ fontSize: "0.8rem" }}
              onClick={() => setIsExpanded(false)}>
            </i>
          </div>
          {userList.map((u, idx) =>
            <div key={idx} className="mb-3 pb-2 border-bottom last:border-0">
              <div className="small font-weight-bold text-dark d-flex align-items-center mb-1" style={{ fontSize: "0.80rem" }}>
                {u.name}
              </div>
              <div className="mt-1">
                {Object.entries(u.steps).map(([step, qty], sIdx) =>
                  <div key={sIdx} className="d-flex justify-content-between align-items-center ml-2 mb-1" style={{ fontSize: "0.7rem" }}>
                    <span className="text-capitalize text-muted small mr-2">
                      {step.replace(/_/g, " ")}:
                    </span>
                    <span className="badge badge-light border text-dark">
                      <b>{qty}</b> pcs
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      }
    </div>);

};

export default function CompletedTickets({
  user = {},
  notifications = [],
  messages = [],
  tickets = { data: [] },
  filters = {},
  branches = []
}) {
  const [openViewModal, setViewModalOpen] = useState(false);
  const [openTimelineModal, setTimelineModalOpen] = useState(false);
  const [openMaterialModal, setMaterialModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState(null);
  const [selectedEvidenceImage, setSelectedEvidenceImage] = useState(null);
  const [estimatedMaterials, setEstimatedMaterials] = useState([]);
  const [adjustedMaterials, setAdjustedMaterials] = useState({});
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [deductingStock, setDeductingStock] = useState(false);
  const [useEstimatedUsage, setUseEstimatedUsage] = useState(true);
  const [showAdvancedAdjust, setShowAdvancedAdjust] = useState(false);
  const [materialsDeducted, setMaterialsDeducted] = useState(false);
  const [deductedTicketIds, setDeductedTicketIds] = useState(new Set());
  const { flash, auth } = usePage().props;
  const { buildUrl } = useRoleApi();

  const WORKFLOW_STEPS = {
    printing: { label: 'Printing', icon: 'ti-printer', color: '#2196F3' },
    lamination_heatpress: { label: 'Lamination/Heatpress', icon: 'ti-layers', color: '#FF9800' },
    cutting: { label: 'Cutting', icon: 'ti-cut', color: '#F44336' },
    sewing: { label: 'Sewing', icon: 'ti-pin-alt', color: '#E91E63' },
    dtf_press: { label: 'DTF Press', icon: 'ti-stamp', color: '#673AB7' },
    qa: { label: 'Quality Assurance', icon: 'ti-check-box', color: '#4CAF50' }
  };

  const handleView = (ticket) => {
    setSelectedTicket(ticket);
    setViewModalOpen(true);
  };

  const handleViewTimeline = (ticket) => {
    setSelectedTicket(ticket);
    setTimelineModalOpen(true);
  };

  const handleCloseModals = () => {
    setViewModalOpen(false);
    setTimelineModalOpen(false);
    setMaterialModalOpen(false);
    setSelectedTicket(null);
    setSelectedPreviewFile(null);
    setSelectedEvidenceImage(null);
    setEstimatedMaterials([]);
    setAdjustedMaterials({});
    setUseEstimatedUsage(true);
    setShowAdvancedAdjust(false);
    setMaterialsDeducted(false);
  };

  const handleOpenMaterialModal = async (ticket) => {
    setSelectedTicket(ticket);
    setLoadingMaterials(true);
    setMaterialModalOpen(true);
    // Check if materials were already deducted from the database flag
    const isDeducted = ticket.materials_deducted === true || ticket.materials_deducted === 1;
    setMaterialsDeducted(isDeducted);

    try {
      // Fetch estimated materials from backend
      const response = await fetch(buildUrl(`/production/tickets/${ticket.id}/estimated-materials`));
      const data = await response.json();
      setEstimatedMaterials(data.materials || []);

      // Initialize adjusted materials with estimated values
      const initialAdjusted = {};
      (data.materials || []).forEach(material => {
        initialAdjusted[material.stock_item_id] = material.estimated_quantity;
      });
      setAdjustedMaterials(initialAdjusted);
    } catch (error) {
      console.error('Failed to load materials:', error);
      setEstimatedMaterials([]);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const handleConfirmMaterialUsage = () => {
    // Prevent multiple submissions
    if (!selectedTicket || materialsDeducted || deductingStock) return;

    setDeductingStock(true);

    // Prepare materials data
    // Use estimated or adjusted based on mode
    const materialsToDeduct = estimatedMaterials.map(material => ({
      stock_item_id: material.stock_item_id,
      quantity: showAdvancedAdjust
        ? (adjustedMaterials[material.stock_item_id] || material.estimated_quantity)
        : material.estimated_quantity
    }));


    router.post(buildUrl(`/production/tickets/${selectedTicket.id}/deduct-materials`), {
      materials: materialsToDeduct
    }, {
      onSuccess: () => {
        setMaterialsDeducted(true);
        setDeductedTicketIds((prev) => {
          const next = new Set(prev);
          next.add(selectedTicket.id);
          return next;
        });
        // Don't close modal immediately, let user see success message
        // They can close it manually
      },
      onError: (errors) => {
        console.error('Failed to deduct materials:', errors);
      },
      onFinish: () => {
        setDeductingStock(false);
      },
      preserveScroll: true,
      // Keep component state so button stays disabled after success
      preserveState: true
    });
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

  const calculateCompletionTime = (startDate, endDate) => {
    if (!startDate || !endDate) return 'N/A';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours % 24}h`;
    } else {
      return `${diffHours}h`;
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
      label: "Ticket",
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
      label: "Customer",
      key: "customer",
      render: (row) =>
        <div>
          <strong>{row.customer?.firstname} {row.customer?.lastname}</strong>
          <div className="text-muted small">{row.customer?.email}</div>
        </div>

    },
    {
      label: "Qty",
      key: "quantity",
      render: (row) => {
        const totalQty = row.total_quantity || (row.quantity || 0) + (row.free_quantity || 0);
        return (
          <div>
            <span className="badge badge-success">
              {totalQty} pcs
            </span>
            <div className="progress mt-1" style={{ height: '5px' }}>
              <div className="progress-bar bg-success" style={{ width: '100%' }}></div>
            </div>
          </div>);

      }
    },
    {
      label: "Time",
      key: "completion_time",
      render: (row) => {
        const duration = calculateCompletionTime(row.workflow_started_at, row.workflow_completed_at);
        return (
          <div>
            <small className="text-muted">Started:</small>
            <small> {row.workflow_started_at ? formatDate(row.workflow_started_at) : 'N/A'}</small>
            <br />
            <small className="text-muted">Completed:</small>
            <small> {row.workflow_completed_at ? formatDate(row.workflow_completed_at) : 'N/A'}</small>
            {/* <div className="mt-1">
               <span className="badge badge-info">
                   <i className="ti-time mr-1"></i>{duration}
               </span>
            </div> */}
          </div>);

      }
    },
    {
      label: "Team",
      key: "team_members",
      render: (row) => <TeamMemberCell productionRecords={row.production_records} />
    },
    {
      label: "Material Status",
      key: "material_deduction_status",
      render: (row) => {
        const hasMaterialsDeducted = row.materials_deducted === true || row.materials_deducted === 1;

        // Only show for tickets with job types that HAVE a recipe defined
        const hasRecipe = row.job_type &&
          row.job_type.inventory_recipe &&
          Array.isArray(row.job_type.inventory_recipe) &&
          row.job_type.inventory_recipe.length > 0;

        if (!hasRecipe) {
          return <span className="text-muted">N/A</span>;
        }

        return (
          <div className="text-center">
            {hasMaterialsDeducted ? (
              <div>
                <span className="badge badge-success mb-1" style={{ fontSize: '0.75rem' }}>
                  <i className="ti-check mr-1"></i>
                  Deducted
                </span>
                {row.materials_deducted_at && (
                  <div className="text-muted" style={{ fontSize: '0.65rem' }}>
                    {new Date(row.materials_deducted_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            ) : (
              <span className="badge badge-warning pulse-animation" style={{ fontSize: '0.75rem' }}>
                <i className="ti-alert mr-1"></i>
                Pending
              </span>
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

        return (
          <div className="btn-group-vertical btn-group-sm">
            <button
              type="button"
              className="btn btn-link btn-sm text-purple-500"
              onClick={() => handleViewTimeline(row)}>

              <i className="ti-time"></i> Timeline
            </button>
            <button
              type="button"
              className="btn btn-link btn-sm text-orange-500"
              onClick={() => handleView(row)}>

              <i className="ti-eye"></i> View
            </button>
            {auth.user.role === 'admin' && row.job_type &&
              row.job_type.inventory_recipe &&
              Array.isArray(row.job_type.inventory_recipe) &&
              row.job_type.inventory_recipe.length > 0 && (
                <button
                  type="button"
                  className={`btn btn-link btn-sm ${hasMaterialsDeducted ? 'text-success' : 'text-warning'}`}
                  onClick={() => handleOpenMaterialModal(row)}
                  title={hasMaterialsDeducted ? "Materials Already Deducted" : "Confirm Material Usage"}
                  disabled={hasMaterialsDeducted}>

                  <i className={`${hasMaterialsDeducted ? 'ti-check' : 'ti-package'}`}></i> {hasMaterialsDeducted ? 'Confirmed' : 'Materials'}
                </button>
              )}
          </div>
        );
      }
    }];


  const mockupFiles = selectedTicket?.mockup_files || [];

  return (
    <AdminLayout
      user={user}
      notifications={notifications}
      messages={messages}>

      <Head title="Completed Tickets - Production" />

      {/* Flash Messages */}
      {flash?.success &&
        <FlashMessage type="success" message={flash.success} />
      }
      {flash?.error &&
        <FlashMessage type="error" message={flash.error} />
      }

      {/* Material Deduction Summary */}
      {auth.user.role === 'admin' && (() => {
        const completedTickets = tickets.data || [];
        // Only count tickets with job types that have material recipes defined
        const ticketsWithMaterials = completedTickets.filter(t =>
          t.job_type &&
          t.job_type.inventory_recipe &&
          Array.isArray(t.job_type.inventory_recipe) &&
          t.job_type.inventory_recipe.length > 0
        );
        const pendingDeduction = ticketsWithMaterials.filter(t => !(t.materials_deducted === true || t.materials_deducted === 1));
        const alreadyDeducted = ticketsWithMaterials.filter(t => t.materials_deducted === true || t.materials_deducted === 1);

        if (ticketsWithMaterials.length > 0) {
          return (
            <div className="row mb-3">
              <div className="col-12">
                <div className={`alert ${pendingDeduction.length > 0 ? 'alert-warning' : 'alert-success'} d-flex align-items-center justify-content-between`}>
                  <div>
                    <i className={`${pendingDeduction.length > 0 ? 'ti-alert' : 'ti-check'} mr-2`}></i>
                    <strong>Material Deduction Status:</strong>
                    {' '}
                    <span
                      className="cursor-pointer hover:underline"
                      onClick={() => router.get(buildUrl("/production/completed"), { ...filters, material_status: 'deducted' })}
                      title="Click to filter deducted tickets"
                    >
                      {alreadyDeducted.length} of {ticketsWithMaterials.length} tickets have materials deducted
                    </span>
                    {pendingDeduction.length > 0 && (
                      <span
                        className="ml-2 cursor-pointer hover:underline"
                        onClick={() => router.get(buildUrl("/production/completed"), { ...filters, material_status: 'pending' })}
                        title="Click to filter pending materials"
                      >
                        | <strong className="text-danger">{pendingDeduction.length} pending</strong>
                      </span>
                    )}
                  </div>
                  {pendingDeduction.length > 0 && (
                    <div
                      className="cursor-pointer transition-transform hover:scale-105"
                      onClick={() => router.get(buildUrl("/production/completed"), { ...filters, material_status: 'pending' })}
                      title="Click to filter pending materials"
                    >
                      <span className="badge badge-warning badge-lg px-3 py-2">
                        <i className="ti-package mr-1"></i>
                        {pendingDeduction.length} Ticket{pendingDeduction.length !== 1 ? 's' : ''} Need Material Confirmation
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }
      })()}

      <div className="row">
        <div className="col-lg-8 p-r-0 title-margin-right">
          <div className="page-header">
            <div className="page-title">
              <h1 className="text-success">
                <i className="ti-check mr-2"></i>
                Completed Tickets <span>Archive</span>
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
                <li className="breadcrumb-item active">Completed</li>
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
        size="5xl">

        {selectedTicket &&
          <div>
            <div className="alert alert-success mb-4">
              <i className="ti-check mr-2"></i>
              This ticket has been completed and all workflows are finished.
            </div>

            <div className="row mb-4">
              <div className="col-md-6">
                <h5>
                  Customer: <b>{selectedTicket.customer?.firstname} {selectedTicket.customer?.lastname}</b>
                </h5>
                <h5>
                  Description: <b>{selectedTicket.description}</b>
                </h5>
                <p>
                  <strong>Total Quantity:</strong> {selectedTicket.total_quantity || (selectedTicket.quantity || 0) + (selectedTicket.free_quantity || 0)} pcs
                </p>
              </div>
              <div className="col-md-6">
                <p>
                  <strong>Started:</strong> {selectedTicket.workflow_started_at ? formatDate(selectedTicket.workflow_started_at) : 'N/A'}
                </p>
                <p>
                  <strong>Completed:</strong> {selectedTicket.workflow_completed_at ? formatDate(selectedTicket.workflow_completed_at) : 'N/A'}
                </p>
                <p>
                  <strong>Total Time:</strong> {calculateCompletionTime(selectedTicket.workflow_started_at, selectedTicket.workflow_completed_at)}
                </p>
              </div>
            </div>

            <hr className="my-3" />

            <div className="mb-4">
              <h6>Design Files:</h6>
              {/* {mockupFiles.length > 0 ?
                <div className="row">
                  {mockupFiles.map((file) =>
                    <div key={file.id} className="col-md-12 col-lg-12 mb-2">
                      <div className="card">
                        <img
                          src={file.file_path}
                          alt={file.file_name}
                          className="card-img-top"
                          style={{ height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => setSelectedPreviewFile(file)} />

                        <div className="card-body p-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-block btn-primary"
                            onClick={() => handleDownload(file.id, file.file_name)}>

                            <i className="ti-download"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div> :

                <p className="text-muted">No design files available</p>
              } */}
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

            {/* Production Evidence Photos */}
            {selectedTicket.evidence_files && selectedTicket.evidence_files.length > 0 &&
              <div className="mb-4">
                <hr className="my-3" />
                <h6>
                  <i className="ti-image mr-2"></i>Production Evidence Photos:
                </h6>
                {(() => {
                  // Group evidence files by workflow step
                  const evidenceByStep = {};
                  selectedTicket.evidence_files.forEach(file => {
                    const step = file.workflow_step || 'unknown';
                    if (!evidenceByStep[step]) {
                      evidenceByStep[step] = [];
                    }
                    evidenceByStep[step].push(file);
                  });

                  return Object.entries(evidenceByStep).map(([step, files]) => {
                    const stepInfo = WORKFLOW_STEPS[step] || {
                      label: step.replace(/_/g, ' '),
                      icon: 'ti-package',
                      color: '#2196F3'
                    };

                    return (
                      <div key={step} className="mb-3">
                        <h6 className="mb-2" style={{ color: stepInfo.color }}>
                          <i className={`${stepInfo.icon} mr-2`}></i>
                          {stepInfo.label}
                        </h6>
                        <div className="row">
                          {files.map((file, idx) =>
                            <div key={idx} className="col-md-2 col-sm-3 mb-2">
                              <div className="card shadow-sm">
                                <img
                                  src={file.file_path}
                                  alt={file.file_name}
                                  className="card-img-top"
                                  style={{
                                    height: '100px',
                                    objectFit: 'cover',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => setSelectedEvidenceImage(file)} />

                                <div className="card-body p-2">
                                  <small className="text-muted d-block text-truncate" title={file.user?.name}>
                                    <i className="ti-user mr-1"></i>{file.user?.name || 'Unknown'}
                                  </small>
                                  <small className="text-muted d-block">
                                    <i className="ti-calendar mr-1"></i>
                                    {file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString() : 'N/A'}
                                  </small>
                                  <small className="text-muted d-block">
                                    <i className="ti-time mr-1"></i>
                                    {file.uploaded_at ? new Date(file.uploaded_at).toLocaleTimeString() : 'N/A'}
                                  </small>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            }

            <div className="d-flex justify-content-between">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseModals}>

                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  handleCloseModals();
                  handleViewTimeline(selectedTicket);
                }}>

                <i className="ti-time mr-2"></i>View Full Timeline
              </button>
            </div>
          </div>
        }
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

      {/* Material Usage Confirmation Modal */}
      <Modal
        title={
          <div className="d-flex align-items-center">
            <i className="ti-package mr-2"></i>
            Material Deduction - Ticket #{selectedTicket?.ticket_number}
            {showAdvancedAdjust && (
              <span className="badge badge-warning ml-2">Advanced Mode</span>
            )}
          </div>
        }
        isOpen={openMaterialModal}
        onClose={handleCloseModals}
        size="5xl">

        {selectedTicket && (
          <div>
            {materialsDeducted ? (
              <div className="alert alert-success mb-4">
                <i className="ti-check-box mr-2"></i>
                <strong>Materials Deducted Successfully!</strong>
                {' '}Inventory has been updated. You can close this dialog now.
              </div>
            ) : (
              <div className={`alert ${showAdvancedAdjust ? 'alert-warning' : 'alert-info'} mb-4`}>
                <i className={`${showAdvancedAdjust ? 'ti-settings' : 'ti-info-alt'} mr-2`}></i>
                <strong>
                  {showAdvancedAdjust ? 'Advanced Adjustment Mode:' : 'Production Completed:'}
                </strong>
                {showAdvancedAdjust
                  ? ' You can manually adjust quantities to account for waste or misprints.'
                  : ' Review estimated material usage and confirm automatic deduction.'
                }
              </div>
            )}

            <div className="row mb-3">
              <div className="col-md-6">
                <p><strong>Job Type:</strong> {selectedTicket.job_type?.name}</p>
                <p><strong>Quantity Produced:</strong> {selectedTicket.total_quantity || (selectedTicket.quantity + (selectedTicket.free_quantity || 0))} pcs</p>
              </div>
              <div className="col-md-6">
                {selectedTicket.size_value && (
                  <p><strong>Size:</strong> {selectedTicket.size_value} {selectedTicket.size_unit}</p>
                )}
              </div>
            </div>

            <hr className="my-3" />

            {loadingMaterials ? (
              <div className="text-center py-4">
                <i className="fa fa-spinner fa-spin fa-2x"></i>
                <p className="mt-2">Loading materials...</p>
              </div>
            ) : estimatedMaterials.length > 0 ? (
              <div>
                <h6 className="mb-3">
                  <i className="ti-package mr-2"></i>
                  Estimated Material Usage:
                </h6>

                {/* Simple Material List */}
                <div className="card bg-light mb-3">
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-sm table-borderless mb-0">
                        <thead>
                          <tr>
                            <th>Material</th>
                            <th>Current Stock</th>
                            <th>Will Deduct</th>
                            <th>Remaining</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {estimatedMaterials.map((material, index) => {
                            const qtyToDeduct = showAdvancedAdjust
                              ? (adjustedMaterials[material.stock_item_id] || material.estimated_quantity)
                              : material.estimated_quantity;
                            const remaining = material.current_stock - qtyToDeduct;
                            const isSufficient = remaining >= 0;

                            return (
                              <tr key={index} className={!isSufficient ? 'bg-warning' : ''}>
                                <td>
                                  <strong>{material.stock_item_name}</strong>
                                  <br />
                                  <small className="text-muted">{material.stock_item_sku}</small>
                                  {material.is_optional && (
                                    <span className="badge badge-secondary badge-sm ml-2">Optional</span>
                                  )}
                                </td>
                                <td>
                                  <strong>{parseFloat(material.current_stock).toFixed(2)}</strong> {material.base_unit}
                                </td>
                                <td>
                                  <strong className="text-danger">-{parseFloat(qtyToDeduct).toFixed(4)}</strong> {material.base_unit}
                                  <br />
                                  <small className="text-muted">
                                    ({material.avg_per_unit} × {selectedTicket.total_quantity || (selectedTicket.quantity + (selectedTicket.free_quantity || 0))})
                                  </small>
                                </td>
                                <td>
                                  <strong className={remaining < 0 ? 'text-danger' : 'text-success'}>
                                    {parseFloat(remaining).toFixed(2)}
                                  </strong> {material.base_unit}
                                </td>
                                <td>
                                  {isSufficient ? (
                                    <span className="badge badge-success">✓ OK</span>
                                  ) : (
                                    <span className="badge badge-danger">⚠ Low</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Mode Selection */}
                {!materialsDeducted && (
                  <div className="card border-primary mb-3">
                    <div className="card-body">
                      <div className="form-check mb-3">
                        <input
                          type="radio"
                          className="form-check-input"
                          id="useEstimatedUsage"
                          name="deductionMode"
                          checked={useEstimatedUsage && !showAdvancedAdjust}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUseEstimatedUsage(true);
                              setShowAdvancedAdjust(false);
                            }
                          }}
                          disabled={materialsDeducted}
                        />
                        <label className="form-check-label font-weight-bold text-success cursor-pointer" htmlFor="useEstimatedUsage">
                          <i className="ti-check mr-2"></i>
                          Deduct estimated usage (Recommended - Fast & Easy)
                        </label>
                        <p className="text-muted small ml-4 mb-0">
                          System will automatically deduct the calculated material quantities.
                        </p>
                      </div>

                      <div className="form-check">
                        <input
                          type="radio"
                          className="form-check-input"
                          id="showAdvancedAdjust"
                          name="deductionMode"
                          checked={showAdvancedAdjust}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setShowAdvancedAdjust(true);
                              setUseEstimatedUsage(false);
                            }
                          }}
                          disabled={materialsDeducted}
                        />
                        <label className="form-check-label font-weight-bold text-warning cursor-pointer" htmlFor="showAdvancedAdjust">
                          <i className="ti-settings mr-2"></i>
                          Adjust usage (Advanced - For waste/misprint adjustments)
                        </label>
                        <p className="text-muted small ml-4 mb-0">
                          Manually adjust quantities if there was material waste or misprints.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Advanced Adjustment Table (Only shown when enabled) */}
                {showAdvancedAdjust && !materialsDeducted && (
                  <div className="card border-warning mb-3">
                    <div className="card-header bg-warning text-white">
                      <h6 className="mb-0">
                        <i className="ti-pencil mr-2"></i>
                        Manual Adjustment Mode
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="table-responsive">
                        <table className="table table-bordered table-sm">
                          <thead className="thead-light">
                            <tr>
                              <th>Material</th>
                              <th>Estimated</th>
                              <th>Adjusted Quantity</th>
                              <th>Remaining</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {estimatedMaterials.map((material, index) => {
                              const adjustedQty = adjustedMaterials[material.stock_item_id] || material.estimated_quantity;
                              const remaining = material.current_stock - adjustedQty;
                              const isSufficient = remaining >= 0;

                              return (
                                <tr key={index} className={!isSufficient ? 'bg-warning-light' : ''}>
                                  <td>
                                    <strong>{material.stock_item_name}</strong>
                                    <br />
                                    <small className="text-muted">{material.stock_item_sku}</small>
                                  </td>
                                  <td>
                                    {parseFloat(material.estimated_quantity).toFixed(4)} {material.base_unit}
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      className="form-control form-control-sm"
                                      value={adjustedQty}
                                      onChange={(e) => setAdjustedMaterials(prev => ({
                                        ...prev,
                                        [material.stock_item_id]: parseFloat(e.target.value) || 0
                                      }))}
                                      step="0.0001"
                                      min="0"
                                      style={{ width: '150px' }}
                                      disabled={materialsDeducted}
                                    />
                                  </td>
                                  <td className={remaining < 0 ? 'text-danger font-weight-bold' : 'text-success'}>
                                    {parseFloat(remaining).toFixed(2)} {material.base_unit}
                                  </td>
                                  <td>
                                    {isSufficient ? (
                                      <span className="badge badge-success">✓ OK</span>
                                    ) : (
                                      <span className="badge badge-danger">⚠ Insufficient</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="alert alert-warning">
                <i className="ti-alert mr-2"></i>
                No material recipe defined for this job type. Inventory will not be deducted.
              </div>
            )}

            <div className="d-flex justify-content-between mt-4">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseModals}
                disabled={deductingStock}>
                <i className="ti-close mr-2"></i>
                {materialsDeducted ? 'Close' : 'Cancel'}
              </button>
              {estimatedMaterials.length > 0 && !materialsDeducted && (
                <button
                  type="button"
                  className={`btn ${showAdvancedAdjust ? 'btn-warning' : 'btn-primary'} btn-lg`}
                  onClick={handleConfirmMaterialUsage}
                  disabled={deductingStock || materialsDeducted || (!useEstimatedUsage && !showAdvancedAdjust)}>
                  {deductingStock ? (
                    <>
                      <i className="fa fa-spinner fa-spin mr-2"></i>
                      Deducting Stock...
                    </>
                  ) : showAdvancedAdjust ? (
                    <>
                      <i className="ti-pencil-alt mr-2"></i>
                      Update with Adjusted Usage
                    </>
                  ) : (
                    <>
                      <i className="ti-check mr-2"></i>
                      Deduct Estimated Usage
                    </>
                  )}
                </button>
              )}
              {materialsDeducted && estimatedMaterials.length > 0 && (
                <span className="badge badge-success badge-pill px-3 py-2" style={{ fontSize: '14px' }}>
                  <i className="ti-check-box mr-2"></i>
                  Materials Already Deducted (locked for this ticket)
                </span>
              )}
            </div>
          </div>
        )}
      </Modal>


      <section id="main-content">
        <div className="content-wrap">
          <div className="main">
            <div className="container-fluid">
              <div className="row">
                <div className="col-lg-12">
                  <div className="card">
                    <div className="card-title mt-3">
                      <h4 className="text-success">
                        <i className="ti-check mr-2"></i>
                        Completed Production Tickets
                      </h4>
                      <p className="text-muted">All tickets that have completed all workflow steps</p>
                    </div>
                    <div className="card-body">
                      <div className="row mt-4 align-items-center">
                        <div className="col-md-4">
                          <SearchBox
                            placeholder="Search completed tickets..."
                            initialValue={filters.search || ""}
                            route="production/completed" />

                        </div>
                        <div className="col-md-4 mb-4">
                          <DateRangeFilter
                            filters={filters}
                            route="production/completed"
                            buildUrl={buildUrl} />

                        </div>

                        <div className="col-md-4 text-right">
                          <button
                            onClick={() => router.visit('completed')}
                            className="btn btn-outline-success"
                            title="Refresh Data">

                            <i className="ti-reload mr-2"></i> Refresh
                          </button>
                        </div>
                      </div>

                      {/* Active Filters Indicator */}
                      {(filters.search || filters.status || filters.payment_status || filters.date_range || filters.material_status) &&
                        <div className="row mb-3 mt-3">
                          <div className="col-12">
                            <div className="alert alert-light border p-2 mb-0">
                              <small className="text-muted mr-2">
                                <i className="ti-filter mr-1"></i>
                                <strong>Active Filters:</strong>
                              </small>
                              {filters.search &&
                                <span className="badge badge-info mr-2">
                                  Search: {filters.search}
                                </span>
                              }
                              {filters.status &&
                                <span className="badge badge-info mr-2">
                                  Status: {filters.status}
                                </span>
                              }
                              {filters.payment_status &&
                                <span className="badge badge-info mr-2">
                                  Payment: {filters.payment_status}
                                </span>
                              }
                              {filters.date_range &&
                                <span className="badge badge-primary mr-2">
                                  <i className="ti-calendar mr-1"></i>
                                  {filters.date_range === 'custom' ?
                                    `Custom: ${filters.start_date} to ${filters.end_date}` :
                                    filters.date_range.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                                  }
                                </span>
                              }
                              {filters.branch_id &&
                                <span className="badge badge-info mr-2">
                                  Branch: {branches?.find((b) => b.id == filters.branch_id)?.name}
                                </span>
                              }
                              {filters.material_status &&
                                <span className="badge badge-warning mr-2">
                                  <i className="ti-package mr-1"></i>
                                  Materials: {filters.material_status === 'pending' ? 'Pending Confirmation' : 'Deducted'}
                                </span>
                              }
                              <button
                                type="button"
                                className="btn btn-link btn-sm text-danger p-0 ml-2"
                                onClick={() => router.get(buildUrl("/production/completed"), { date_range: 'last_30_days' })}>
                                Clear All
                              </button>
                            </div>
                          </div>
                        </div>
                      }

                      <div className="mt-4">
                        <DataTable
                          columns={ticketColumns}
                          data={tickets.data}
                          pagination={tickets}
                          emptyMessage="No completed tickets found." />

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

// Add CSS for pulse animation
if (typeof document !== 'undefined' && !document.getElementById('material-status-styles')) {
  const style = document.createElement('style');
  style.id = 'material-status-styles';
  style.innerHTML = `
    @keyframes pulse-animation {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.7;
        transform: scale(1.05);
      }
    }
    .pulse-animation {
      animation: pulse-animation 2s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
}