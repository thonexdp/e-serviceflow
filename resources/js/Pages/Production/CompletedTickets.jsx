import React, { useState, useRef } from "react";
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

const TeamMemberCell = ({ productionRecords }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);


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

  const toggleDropdown = () => {
    if (!isExpanded && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX - 220 + rect.width
      });
    }
    setIsExpanded(!isExpanded);
  };

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
        <>
          {/* Backdrop to close on click outside */}
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1040 }}
            onClick={() => setIsExpanded(false)} />

          <div
            className="card shadow-lg border p-3"
            style={{
              position: "fixed",
              zIndex: 1050,
              minWidth: "240px",
              left: `${coords.left}px`,
              top: `${coords.top + 5}px`,
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
        </>
      }
    </div>);

};

export default function CompletedTickets({
  user = {},
  notifications = [],
  messages = [],
  tickets = { data: [] },
  filters = {}
}) {
  const [openViewModal, setViewModalOpen] = useState(false);
  const [openTimelineModal, setTimelineModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState(null);
  const [selectedEvidenceImage, setSelectedEvidenceImage] = useState(null);
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
    setSelectedTicket(null);
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
              <span className="text-muted text-xs">
                <strong>Type:</strong> {row.job_type.name}
              </span>
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
      label: "Actions",
      key: "actions",
      render: (row) =>
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
        </div>

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
      {selectedPreviewFile &&
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={() => setSelectedPreviewFile(null)}>

          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Preview</h5>
                <button
                  type="button"
                  className="close"
                  onClick={() => setSelectedPreviewFile(null)}>

                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body text-center">
                <img
                  src={selectedPreviewFile.file_path}
                  alt={selectedPreviewFile.file_name}
                  className="img-fluid"
                  style={{ maxHeight: '70vh' }} />

              </div>
            </div>
          </div>
        </div>
      }

      {/* Evidence Image Preview Modal */}
      {selectedEvidenceImage &&
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={() => setSelectedEvidenceImage(null)}>

          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Evidence Photo</h5>
                <button
                  type="button"
                  className="close"
                  onClick={() => setSelectedEvidenceImage(null)}>

                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body text-center">
                <img
                  src={selectedEvidenceImage.file_path}
                  alt={selectedEvidenceImage.file_name}
                  className="img-fluid"
                  style={{ maxHeight: '70vh' }} />

                <div className="mt-3">
                  <p><strong>Uploaded by:</strong> {selectedEvidenceImage.user?.name || 'Unknown'}</p>
                  <p><strong>Date:</strong> {selectedEvidenceImage.uploaded_at ? formatDate(selectedEvidenceImage.uploaded_at) : 'N/A'}</p>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedEvidenceImage(null)}>

                  Close
                </button>
                <a
                  href={selectedEvidenceImage.file_path}
                  download={selectedEvidenceImage.file_name}
                  className="btn btn-primary">

                  <i className="ti-download mr-2"></i>Download
                </a>
              </div>
            </div>
          </div>
        </div>
      }


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
                        <div className="col-md-6">
                          <SearchBox
                            placeholder="Search completed tickets..."
                            initialValue={filters.search || ""}
                            route="/completed" />

                        </div>
                        <div className="col-md-3">
                          <FormInput
                            label=""
                            type="select"
                            name="date_range"
                            value={filters.date_range || "all"}
                            onChange={(e) => {
                              router.get(buildUrl("/completed"), {
                                ...filters,
                                date_range: e.target.value === "all" ? null : e.target.value
                              }, {
                                preserveState: false,
                                preserveScroll: true
                              });
                            }}
                            options={[
                              { value: "all", label: "All Time" },
                              { value: "today", label: "Today" },
                              { value: "this_week", label: "This Week" },
                              { value: "this_month", label: "This Month" },
                              { value: "last_month", label: "Last Month" }]
                            } />

                        </div>
                        <div className="col-md-3 text-right">
                          <button
                            onClick={() => router.reload()}
                            className="btn btn-outline-success"
                            title="Refresh Data">

                            <i className="ti-reload mr-2"></i> Refresh
                          </button>
                        </div>
                      </div>

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