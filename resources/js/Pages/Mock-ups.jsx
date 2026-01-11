import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { getColorName, getFullColorName } from "@/Utils/colors";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Modal from "@/Components/Main/Modal";
import DataTable from "@/Components/Common/DataTable";
import SearchBox from "@/Components/Common/SearchBox";
import FlashMessage from "@/Components/Common/FlashMessage";
import FormInput from "@/Components/Common/FormInput";
import DateRangeFilter from "@/Components/Common/DateRangeFilter";
import { useRoleApi } from "@/Hooks/useRoleApi";

export default function Mockups({
  user = {},
  notifications = [],
  messages = [],
  tickets = { data: [] },
  filters = {},
  branches = []
}) {
  const [openReviewModal, setReviewModalOpen] = useState(false);
  const [openUploadModal, setUploadModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState(null);
  const [selectedPreviewTicket, setSelectedPreviewTicket] = useState(null);
  const [previewToPrint, setPreviewToPrint] = useState(null);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [dateRange, setDateRange] = useState(filters.date_range || "");

  const [notes, setNotes] = useState("");
  const [showRevisionNotes, setShowRevisionNotes] = useState(false);
  const [loading, setLoading] = useState(false);
  const { flash, auth } = usePage().props;
  const { buildUrl } = useRoleApi();

  const handleReview = (ticket) => {
    setSelectedTicket(ticket);
    setSelectedImage(null);
    setReviewModalOpen(true);
  };

  const handleUpload = (ticket) => {
    setSelectedTicket(ticket);
    setUploadFiles([]);
    setNotes("");
    setSelectedImage(null);
    setUploadModalOpen(true);
  };

  const handleCloseModals = () => {
    setReviewModalOpen(false);
    setUploadModalOpen(false);
    setSelectedTicket(null);
    setSelectedImage(null);
    setUploadFiles([]);
    setNotes("");
    setShowRevisionNotes(false);
    setSelectedPreviewFile(null);
    setSelectedPreviewTicket(null);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setUploadFiles(files);
  };

  const handleApprove = () => {
    if (!selectedTicket) return;

    setLoading(true);
    router.post(buildUrl(`/mock-ups/${selectedTicket.id}/approve`), {
      notes: notes
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
      }
    });
  };

  const handleRequestRevision = () => {
    if (!selectedTicket || !notes.trim()) {
      alert("Please provide notes for the revision request.");
      return;
    }

    setLoading(true);
    router.post(buildUrl(`/mock-ups/${selectedTicket.id}/revision`), {
      notes: notes
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
      }
    });
  };

  const handleUploadMockup = () => {
    if (!selectedTicket || uploadFiles.length === 0) {
      alert("Please select at least one file to upload.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    uploadFiles.forEach((file) => {
      formData.append("files[]", file);
    });
    if (notes) {
      formData.append("notes", notes);
    }

    router.post(buildUrl(`/mock-ups/${selectedTicket.id}/upload`), formData, {
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
      }
    });
  };
  const handleStatusToggle = (status) => {
    let currentStatuses = filters.design_status
      ? (Array.isArray(filters.design_status) ? [...filters.design_status] : filters.design_status.split(','))
      : ['pending', 'in_review', 'revision_requested', 'mockup_uploaded'];

    if (currentStatuses.includes(status)) {
      currentStatuses = currentStatuses.filter(s => s !== status);
    } else {
      currentStatuses.push(status);
    }

    router.get(buildUrl("mock-ups"), {
      ...filters,
      design_status: currentStatuses.length > 0 ? currentStatuses : ['none']
    }, {
      preserveState: false,
      preserveScroll: true
    });
  };


  const handleDownload = (fileId, filename) => {
    const url = buildUrl(`/mock-ups/files/${fileId}/download`);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAllTicketFiles = (ticket) => {
    if (!ticket) return [];
    const mockupFiles = ticket.mockup_files || [];
    const customerFiles = ticket.customer_files || (ticket.files?.filter(f => f.type === 'customer')) || [];
    return [...customerFiles, ...mockupFiles];
  };

  const handlePreview = (filepath) => {
    setSelectedImage(filepath);
  };

  const handleNextPreview = () => {
    const allFiles = getAllTicketFiles(selectedPreviewTicket);
    const currentIndex = allFiles.findIndex(f => f.file_path === selectedPreviewFile?.file_path);
    if (currentIndex !== -1 && currentIndex < allFiles.length - 1) {
      setSelectedPreviewFile(allFiles[currentIndex + 1]);
    }
  };

  const handlePrevPreview = () => {
    const allFiles = getAllTicketFiles(selectedPreviewTicket);
    const currentIndex = allFiles.findIndex(f => f.file_path === selectedPreviewFile?.file_path);
    if (currentIndex !== -1 && currentIndex > 0) {
      setSelectedPreviewFile(allFiles[currentIndex - 1]);
    }
  };

  const handlePrint = () => {
    if (!selectedPreviewFile || !selectedPreviewTicket) return;

    setPreviewToPrint({
      file: selectedPreviewFile,
      ticket: selectedPreviewTicket
    });

    document.body.classList.add("printing-preview");

    setTimeout(() => {
      window.print();
      document.body.classList.remove("printing-preview");
      setPreviewToPrint(null);
    }, 500);
  };

  const handleClaimTicket = (ticketId) => {
    setLoading(true);
    router.post(buildUrl(`/mock-ups/${ticketId}/claim`), {}, {
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
      }
    });
  };

  const handleReleaseTicket = (ticketId) => {
    setLoading(true);
    router.post(buildUrl(`/mock-ups/${ticketId}/release`), {}, {
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
      }
    });
  };

  const getDesignStatusBadge = (status) => {
    const classes = {
      pending: "badge-warning",
      in_review: "badge-info",
      revision_requested: "badge-danger",
      approved: "badge-success",
      mockup_uploaded: "badge-primary"
    };
    const labels = {
      pending: "Pending Review",
      in_review: "In Review",
      revision_requested: "Revision Requested",
      approved: "Approved",
      mockup_uploaded: "Mock-up Uploaded"
    };
    return (
      <div className={`badge ${classes[status] || "badge-secondary"}`}>
        {labels[status] || status?.toUpperCase() || "PENDING"}
      </div>);

  };

  const getActionButton = (ticket) => {
    const isAssignedToMe = ticket.assigned_to_user_id === auth?.user?.id;
    const isAssignedToOther = ticket.assigned_to_user_id && !isAssignedToMe;

    if (ticket.design_status === "pending" || ticket.design_status === "revision_requested") {
      return (
        <div className="btn-group-vertical">
          <div className="btn-group">
            {!isAssignedToMe && !isAssignedToOther &&
              <button
                type="button"
                className="btn btn-link btn-sm text-primary"
                onClick={() => handleClaimTicket(ticket.id)}
                disabled={loading}
                title="Claim this ticket">

                <i className="ti-hand-point-up"></i> Claim
              </button>
            }
            {isAssignedToMe &&
              <button
                type="button"
                className={`btn btn-link btn-sm ${ticket.design_status === 'revision_requested' ? 'text-warning' : 'text-orange-500'}`}
                onClick={() => handleUpload(ticket)}>

                <i className={ticket.design_status === 'revision_requested' ? 'ti-reload' : 'ti-upload'}></i> {ticket.design_status === 'revision_requested' ? 'Revise' : 'Upload'}
              </button>
            }
            {isAssignedToOther &&
              <button
                type="button"
                className="btn btn-link btn-sm text-muted"
                disabled
                title={`Assigned to ${ticket.assigned_to_user?.name || 'another user'}`}>

                <i className="ti-lock"></i> Locked
              </button>
            }
          </div>
          {isAssignedToMe &&
            <button
              type="button"
              className="btn btn-link btn-sm text-secondary"
              onClick={() => handleReleaseTicket(ticket.id)}
              disabled={loading}
              title="Release this ticket">

              <i className="ti-hand-point-down"></i> Release
            </button>
          }
        </div>);

    } else if (ticket.design_status === "mockup_uploaded") {
      return (
        <div className="btn-group-vertical">
          <div className="btn-group">
            <button
              type="button"
              className="btn btn-link btn-sm text-green-500"
              onClick={() => handleReview(ticket)}>

              <i className="ti-eye"></i> Review
            </button>
            {!isAssignedToMe && !isAssignedToOther &&
              <button
                type="button"
                className="btn btn-link btn-sm text-primary"
                onClick={() => handleClaimTicket(ticket.id)}
                disabled={loading}
                title="Claim this ticket">

                <i className="ti-hand-point-up"></i> Claim
              </button>
            }
          </div>
          {isAssignedToMe &&
            <button
              type="button"
              className="btn btn-link btn-sm text-secondary"
              onClick={() => handleReleaseTicket(ticket.id)}
              disabled={loading}
              title="Release this ticket">

              <i className="ti-hand-point-down"></i> Release
            </button>
          }
        </div>);

    } else {
      return (
        <button
          type="button"
          className="btn btn-link btn-sm text-orange-500"
          onClick={() => handleReview(ticket)}>

          <i className="ti-eye"></i> View
        </button>);

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
      render: (row) => {
        // Get preview file - prefer mockup files, fallback to customer files
        const mockupFiles = row.mockup_files || [];
        const customerFiles = row.files?.filter((f) => f.type === 'customer') || [];
        const previewFile = mockupFiles.length > 0
          ? mockupFiles[mockupFiles.length - 1]
          : customerFiles.length > 0
            ? customerFiles[customerFiles.length - 1]
            : null;

        return (
          <div className="d-flex align-items-center">
            {previewFile && (
              <img
                src={previewFile.file_path}
                alt="Preview"
                className="img-thumbnail mr-2"
                style={{ width: '60px', height: '60px', objectFit: 'cover', cursor: 'pointer' }}
                onClick={() => {
                  setSelectedPreviewFile(previewFile);
                  setSelectedPreviewTicket(row);
                }}
              />
            )}
            <div className="flex flex-col leading-tight">
              <strong className="leading-tight">{row.ticket_number}</strong>
            </div>
          </div>
        );
      }
    },
    {
      label: "Customer",
      key: "customer",
      render: (row) =>
        row.customer ?
          `${row.customer.firstname} ${row.customer.lastname}` :
          "N/A"
    },
    {
      label: "Description",
      key: "description",
      render: (row) => (
        <div>
          {row.job_type && (
            <div className="text-muted small mb-1 d-flex align-items-center gap-2">
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
          <div>{row.description}</div>
        </div>
      )
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
            </span>);

        }
        return <span className="text-muted">Unassigned</span>;
      }
    },
    {
      label: "Design Status",
      key: "design_status",
      render: (row) => (
        <div className="d-flex flex-column gap-1">
          <div>{getDesignStatusBadge(row.design_status)}</div>
          {row.design_notes && (
            <div className="small text-muted text-wrap" style={{ maxWidth: '200px', lineHeight: '1.2' }}>
              <strong>Notes:</strong> {row.design_notes}
            </div>
          )}
          {row.updated_by_user && (
            <div className="small text-muted mt-1">
              <i className="ti-user mr-1" style={{ fontSize: '10px' }}></i>
              by: {row.updated_by_user.name}
            </div>
          )}
        </div>
      )
    },
    {
      label: "Actions",
      key: "action",
      render: (row) => getActionButton(row)
    }];


  const customerFiles = selectedTicket?.files?.filter((f) => f.type === 'customer') || [];
  const mockupFiles = selectedTicket?.files?.filter((f) => f.type === 'mockup') || [];

  return (
    <AdminLayout
      user={user}
      notifications={notifications}
      messages={messages}>

      <Head title="Mock-ups" />

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
              <h1>
                Mock-ups <span>Management</span>
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
                <li className="breadcrumb-item active">Mock-ups</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <Modal
        title={`Review Design - Ticket #${selectedTicket?.ticket_number}`}
        isOpen={openReviewModal}
        onClose={handleCloseModals}
        size="9xl">

        {selectedTicket &&
          <div className="row flex-row-reverse">
            {/* Right Side - Form Content */}
            <div className="col-md-5 border-left">
              <div className="mb-4">
                <h5>
                  Customer: <b>{selectedTicket.customer?.firstname} {selectedTicket.customer?.lastname}</b>
                </h5>
                <h5>
                  Description: <b>{selectedTicket.description}</b>
                </h5>
                <div className="d-flex justify-content-between align-items-center">
                  <span>Status: {getDesignStatusBadge(selectedTicket.design_status)}</span>
                </div>
              </div>

              {selectedTicket.design_description && (
                <div className="design-description-review mb-4 p-3 bg-white border rounded shadow-sm">
                  <h6 className="font-weight-bold text-primary mb-2">
                    <i className="ti-info-alt mr-1"></i> Design Elaboration:
                  </h6>
                  <div
                    className="tiptap-content small text-dark p-2"
                    dangerouslySetInnerHTML={{ __html: selectedTicket.design_description }}
                  />
                </div>
              )}

              {selectedTicket.design_notes && (
                <div className="alert alert-warning border shadow-sm mb-4">
                  <h6 className="font-weight-bold mb-2">
                    <i className="ti-back-right mr-1"></i> Previous/Revision Notes:
                  </h6>
                  <p className="mb-0 italic text-dark font-weight-500">
                    "{selectedTicket.design_notes}"
                  </p>
                </div>
              )}

              <hr className="my-3" />

              <div className="mb-4">
                <h6>Customer Files:</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-bordered">
                    <thead>
                      <tr>
                        <th>Filename</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerFiles.length > 0 ?
                        customerFiles.map((file) =>
                          <tr key={file.id}>
                            <td className="max-w-[120px] truncate" title={file.file_name}>{file.file_name}</td>
                            <td>
                              <div className="btn-group">
                                <button
                                  type="button"
                                  className="btn btn-link btn-sm text-orange-500 p-0 mr-2"
                                  onClick={() => handleDownload(file.id, file.file_name)}>
                                  <i className="ti-download"></i>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-link btn-sm text-green-500 p-0"
                                  onClick={() => handlePreview(file.file_path)}>
                                  <i className="ti-eye"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) :
                        <tr>
                          <td colSpan="2" className="text-center text-muted">No customer files</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              {mockupFiles.length > 0 &&
                <div className="mb-4">
                  <h6>Mock-up Files:</h6>
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered">
                      <thead>
                        <tr>
                          <th>Filename</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockupFiles.map((file) =>
                          <tr key={file.id}>
                            <td className="max-w-[120px] truncate" title={file.file_name}>{file.file_name}</td>
                            <td>
                              <div className="btn-group">
                                <button
                                  type="button"
                                  className="btn btn-link btn-sm text-orange-500 p-0 mr-2"
                                  onClick={() => handleDownload(file.id, file.file_name)}>
                                  <i className="ti-download"></i>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-link btn-sm text-green-500 p-0"
                                  onClick={() => handlePreview(file.file_path)}>
                                  <i className="ti-eye"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              }

              {/* Actions Section */}
              <div className="mt-4">
                {selectedTicket.design_status === "mockup_uploaded" ? (
                  <div className="card shadow-sm border-primary bg-light-blue">
                    <div className="card-body p-3">
                      <h6 className="card-title text-primary mb-3">
                        <i className="ti-star mr-1"></i> Design Review
                      </h6>

                      {showRevisionNotes ? (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                          <FormInput
                            label="What needs to be revised?"
                            type="textarea"
                            name="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Please be specific about the changes needed..."
                            rows={4}
                            required
                          />
                          <div className="d-flex gap-2 mt-2">
                            <button
                              type="button"
                              className="btn btn-warning flex-grow-1"
                              onClick={handleRequestRevision}
                              disabled={loading || !notes.trim()}
                            >
                              <i className="ti-check mr-1"></i> Send Revision
                            </button>
                            <button
                              type="button"
                              className="btn btn-light"
                              onClick={() => setShowRevisionNotes(false)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="d-flex flex-column gap-3">
                          <button
                            type="button"
                            className="btn btn-success btn-lg py-3 shadow-sm hover-up"
                            onClick={handleApprove}
                            disabled={loading}
                          >
                            <i className="ti-check mr-2"></i> APPROVE DESIGN
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-warning"
                            onClick={() => setShowRevisionNotes(true)}
                          >
                            <i className="ti-reload mr-2"></i> Request Revision
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="alert alert-secondary text-center small p-2">
                    {selectedTicket.design_status === 'approved' ? (
                      <span className="text-success font-weight-bold">
                        <i className="ti-check-box mr-2"></i> Design Approved.
                      </span>
                    ) : (
                      <span>Current status: <b>{selectedTicket.design_status.replace('_', ' ')}</b></span>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  className="btn btn-secondary btn-block btn-sm mt-3"
                  onClick={handleCloseModals}
                >
                  Close Review
                </button>
              </div>
            </div>

            {/* Left Side - Image Preview */}
            <div className="col-md-7">
              <div className="sticky-top" style={{ top: '0px' }}>
                <h6 className="mb-2 d-flex justify-content-between align-items-center">
                  <span>Design Preview</span>
                </h6>
                {selectedImage ? (
                  <div className="border rounded p-2 bg-white shadow-sm mockup-preview-container text-center">
                    <img
                      src={selectedImage}
                      alt="Preview"
                      className="img-fluid rounded"
                      style={{ maxHeight: '75vh', maxWidth: '100%', objectFit: 'contain' }}
                    />
                  </div>
                ) : mockupFiles.length > 0 ? (
                  <div className="border rounded p-2 bg-white shadow-sm mockup-preview-container text-center">
                    <img
                      src={mockupFiles[mockupFiles.length - 1].file_path}
                      alt="Latest Mockup"
                      className="img-fluid rounded"
                      style={{ maxHeight: '75vh', maxWidth: '100%', objectFit: 'contain' }}
                    />
                    <p className="mt-2 small text-muted">Showing latest uploaded mock-up</p>
                  </div>
                ) : customerFiles.length > 0 ? (
                  <div className="border rounded p-2 bg-white shadow-sm mockup-preview-container text-center">
                    <img
                      src={customerFiles[customerFiles.length - 1].file_path}
                      alt="Latest Customer File"
                      className="img-fluid rounded"
                      style={{ maxHeight: '75vh', maxWidth: '100%', objectFit: 'contain' }}
                    />
                    <p className="mt-2 small text-muted">Showing latest customer attachment</p>
                  </div>
                ) : (
                  <div className="border rounded p-5 text-center text-muted bg-light d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '400px' }}>
                    <i className="ti-image" style={{ fontSize: '64px', opacity: 0.3 }}></i>
                    <p className="mt-3 font-italic">No design files available yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        }
      </Modal>

      {/* Upload Modal */}
      <Modal
        title={`Upload Mock-up - Ticket #${selectedTicket?.ticket_number}`}
        isOpen={openUploadModal}
        onClose={handleCloseModals}
        size="6xl">

        {selectedTicket &&
          <div className="row">
            {/* Left Side - Form Content */}
            <div className="col-md-7">
              <div className="mb-4">
                <h5>
                  Customer: <b>{selectedTicket.customer?.firstname} {selectedTicket.customer?.lastname}</b>
                </h5>
                <h5>
                  Description: <b>{selectedTicket.description}</b>
                </h5>
                <div className="mt-2 text-muted">
                  <i className="ti-tag mr-1"></i>
                  Status: {getDesignStatusBadge(selectedTicket.design_status)}
                </div>
              </div>

              {selectedTicket.design_status === 'revision_requested' && selectedTicket.design_notes && (
                <div className="alert alert-warning border mb-4 shadow-sm animate-in fade-in duration-500">
                  <h6 className="text-warning-emphasis font-weight-bold mb-2">
                    <i className="ti-info-alt mr-2"></i>REVISION REQUESTED
                  </h6>
                  <div className="bg-white p-3 rounded border border-warning-subtle small shadow-inner">
                    <strong>Reason for Revision:</strong>
                    <p className="mt-2 mb-0 text-dark-emphasis italic line-height-1.4">
                      "{selectedTicket.design_notes}"
                    </p>
                  </div>
                  <div className="mt-2 small text-muted">
                    <i className="ti-user mr-1"></i>
                    requested by: {selectedTicket.updated_by_user?.name || 'Administrator'}
                  </div>
                </div>
              )}

              <hr className="my-3" />

              <div className="mb-4">
                <h6>Customer Files:</h6>
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
                      {customerFiles.length > 0 ?
                        customerFiles.map((file) =>
                          <tr key={file.id}>
                            <td>{file.file_name}</td>
                            <td>{new Date(file.created_at).toLocaleDateString()}</td>
                            <td>
                              <div className="btn-group">
                                <button
                                  type="button"
                                  className="btn btn-link btn-sm text-orange-500"
                                  onClick={() => handleDownload(file.id, file.file_name)}>

                                  <i className="ti-download"></i> Download
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-link btn-sm text-green-500"
                                  onClick={() => handlePreview(file.file_path)}>

                                  <i className="ti-eye"></i> Preview
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) :

                        <tr>
                          <td colSpan="3" className="text-center text-muted">No customer files</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              <hr className="my-3" />

              <div className="mb-4">
                <h6>Upload Mock-up Files:</h6>
                <div className="mt-3">
                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="dropzone-file"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">

                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg
                          className="w-8 h-8 mb-3 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">

                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />

                        </svg>
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload Design</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, up to 10MB</p>
                      </div>
                      <input
                        id="dropzone-file"
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/*"
                        onChange={handleFileSelect} />

                    </label>
                  </div>
                  {uploadFiles.length > 0 &&
                    <div className="mt-3">
                      <p className="text-sm font-semibold">Selected Files:</p>
                      <ul className="list-group">
                        {uploadFiles.map((file, index) =>
                          <li key={index} className="list-group-item">
                            {file.name} ({(file.size / 1024).toFixed(2)} KB)
                          </li>
                        )}
                      </ul>
                    </div>
                  }
                </div>
              </div>

              <div className="mb-4">
                <FormInput
                  label="Notes to Customer"
                  type="textarea"
                  name="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes for the customer..."
                  rows={3} />

              </div>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className={selectedTicket.design_status === 'revision_requested' ? 'btn btn-warning shadow-sm' : 'btn btn-primary shadow-sm'}
                  onClick={handleUploadMockup}
                  disabled={loading || uploadFiles.length === 0}>

                  <i className={selectedTicket.design_status === 'revision_requested' ? 'ti-reload mr-1' : 'ti-upload mr-1'}></i>
                  {selectedTicket.design_status === 'revision_requested' ? 'Update Revision' : 'Upload & Send for Approval'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModals}>

                  Cancel
                </button>
              </div>
            </div>

            {/* Right Side - Image Preview */}
            <div className="col-md-5">
              <div className="sticky-top" style={{ top: '20px' }}>
                <h6 className="mb-3">Image Preview</h6>
                {selectedImage ?
                  <div className="border rounded p-2 bg-light">
                    <img
                      src={selectedImage}
                      alt="Preview"
                      className="img-fluid rounded"
                      style={{ maxHeight: '500px', width: '100%', objectFit: 'contain' }} />

                  </div> :

                  <div className="border rounded p-5 text-center text-muted bg-light" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div>
                      <i className="ti-image" style={{ fontSize: '48px' }}></i>
                      <p className="mt-3">Click "Preview" on any file to view it here</p>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </Modal>

      <Modal
        title="Design File Preview"
        isOpen={!!selectedPreviewFile}
        onClose={() => {
          setSelectedPreviewFile(null);
          setSelectedPreviewTicket(null);
        }}
        size="10xl">
        {selectedPreviewFile && (
          <div className="row">
            <div className="col-md-7">
              <div className="border rounded p-2 bg-dark shadow-sm mockup-preview-container text-center position-relative" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={selectedPreviewFile.file_path}
                  alt={selectedPreviewFile.file_name}
                  className="img-fluid"
                  style={{ maxHeight: '75vh', maxWidth: '100%', objectFit: 'contain' }}
                />

                {/* Navigation Controls */}
                {getAllTicketFiles(selectedPreviewTicket).length > 1 && (
                  <>
                    <button
                      onClick={handlePrevPreview}
                      disabled={getAllTicketFiles(selectedPreviewTicket).findIndex(f => f.file_path === selectedPreviewFile.file_path) === 0}
                      className="btn btn-dark btn-circle position-absolute"
                      style={{ left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.7, zIndex: 10 }}
                    >
                      <i className="ti-angle-left"></i>
                    </button>
                    <button
                      onClick={handleNextPreview}
                      disabled={getAllTicketFiles(selectedPreviewTicket).findIndex(f => f.file_path === selectedPreviewFile.file_path) === getAllTicketFiles(selectedPreviewTicket).length - 1}
                      className="btn btn-dark btn-circle position-absolute"
                      style={{ right: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.7, zIndex: 10 }}
                    >
                      <i className="ti-angle-right"></i>
                    </button>

                    <div className="position-absolute" style={{ bottom: '20px', left: '50%', transform: 'translateX(-50%)' }}>
                      <span className="badge badge-dark opacity-75 px-3 py-2">
                        {getAllTicketFiles(selectedPreviewTicket).findIndex(f => f.file_path === selectedPreviewFile.file_path) + 1} / {getAllTicketFiles(selectedPreviewTicket).length}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails row */}
              {getAllTicketFiles(selectedPreviewTicket).length > 1 && (
                <div className="mt-3 d-flex gap-2 overflow-x-auto pb-2 justify-content-center">
                  {getAllTicketFiles(selectedPreviewTicket).map((file, idx) => (
                    <img
                      key={idx}
                      src={file.file_path}
                      alt={`Thumb ${idx}`}
                      className={`img-thumbnail cursor-pointer ${selectedPreviewFile.file_path === file.file_path ? 'border-primary ring-2 ring-primary' : 'opacity-50'}`}
                      style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                      onClick={() => setSelectedPreviewFile(file)}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="col-md-5 border-left">
              <div className="p-3">
                <h5 className="font-weight-bold mb-3">Design Information</h5>
                <hr />
                {selectedPreviewTicket?.ticket_number && (
                  <div className="mb-3">
                    <p className="mb-1 text-muted small uppercase font-weight-bold">Ticket Number</p>
                    <p className="mb-0 font-weight-500">{selectedPreviewTicket.ticket_number}</p>
                  </div>
                )}
                {selectedPreviewTicket?.customer && (
                  <div className="mb-3">
                    <p className="mb-1 text-muted small uppercase font-weight-bold">Customer</p>
                    <p className="mb-0 font-weight-500">{selectedPreviewTicket.customer.firstname} {selectedPreviewTicket.customer.lastname}</p>
                  </div>
                )}
                {selectedPreviewTicket?.description && (
                  <div className="mb-3">
                    <p className="mb-1 text-muted small uppercase font-weight-bold">Description</p>
                    <p className="mb-0 font-weight-500">{selectedPreviewTicket.description}</p>
                  </div>
                )}
                <div className="mb-3">
                  <p className="mb-1 text-muted small uppercase font-weight-bold">Filename</p>
                  <p className="mb-0 font-weight-500">{selectedPreviewFile.file_name}</p>
                </div>
                <div className="mb-3">
                  <p className="mb-1 text-muted small uppercase font-weight-bold">Uploaded On</p>
                  <p className="mb-0 font-weight-500">{new Date(selectedPreviewFile.created_at).toLocaleString()}</p>
                </div>

                {selectedPreviewTicket?.design_description && (
                  <div className="mt-4">
                    <p className="mb-2 text-primary small uppercase font-weight-bold">Design Description / Elaboration</p>
                    <div
                      className="p-3 bg-light border rounded shadow-inner tiptap-content"
                      style={{ maxHeight: '300px', overflowY: 'auto' }}
                      dangerouslySetInnerHTML={{ __html: selectedPreviewTicket.design_description }}
                    />
                  </div>
                )}

                <div className="mt-5 d-flex flex-column gap-2">
                  <button
                    type="button"
                    className="btn btn-primary btn-block py-2"
                    onClick={() => handleDownload(selectedPreviewFile.id, selectedPreviewFile.file_name)}>
                    <i className="ti-download mr-2"></i>Download Design File
                  </button>
                  <button
                    type="button"
                    className="btn btn-info btn-block py-2"
                    onClick={handlePrint}>
                    <i className="ti-printer mr-2"></i>Print Preview
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-block py-2"
                    onClick={() => {
                      setSelectedPreviewFile(null);
                      setSelectedPreviewTicket(null);
                    }}>
                    Close Preview
                  </button>
                </div>
              </div>
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
                      <h4>Mock-ups Lists</h4>
                    </div>
                    <div className="card-body">
                      <div className="row mt-4 align-items-center">
                        <div className="col-md-3">
                          <SearchBox
                            placeholder="Search tickets..."
                            initialValue={filters.search || ""}
                            route="mock-ups" />
                        </div>
                        <div className="col-md-3">
                          <div className="dropdown">
                            <button
                              className="btn btn-outline-secondary dropdown-toggle w-100 text-left d-flex justify-content-between align-items-center"
                              type="button"
                              id="statusFilterDropdown"
                              data-toggle="dropdown"
                              aria-haspopup="true"
                              aria-expanded="false"
                              style={{ height: '38px', borderRadius: '4px', marginTop: '-20px' }}
                            >
                              <span className="text-truncate">
                                {filters.design_status
                                  ? (Array.isArray(filters.design_status) ? filters.design_status.length : 1) + ' Statuses'
                                  : 'Filter Status'}
                              </span>
                            </button>
                            <div className="dropdown-menu shadow-sm w-100" aria-labelledby="statusFilterDropdown" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                              <h6 className="dropdown-header">Select Status</h6>
                              <div className="dropdown-divider"></div>
                              {[
                                { value: "pending", label: "Pending Review" },
                                // { value: "in_review", label: "In Review" },
                                { value: "revision_requested", label: "Revision Requested" },
                                { value: "mockup_uploaded", label: "Mock-up Uploaded" },
                                { value: "approved", label: "Approved" }
                              ].map((opt) => {
                                const isChecked = filters.design_status
                                  ? (Array.isArray(filters.design_status) ? filters.design_status.includes(opt.value) : filters.design_status === opt.value)
                                  : opt.value !== 'approved';

                                return (
                                  <div className="dropdown-item p-0 px-2 mb-1" key={opt.value}>
                                    <div className="custom-control custom-checkbox">
                                      <input
                                        type="checkbox"
                                        className="custom-control-input"
                                        id={`status-${opt.value}`}
                                        checked={isChecked}
                                        onChange={() => handleStatusToggle(opt.value)}
                                      />
                                      <label
                                        className="custom-control-label small d-block w-100 cursor-pointer"
                                        htmlFor={`status-${opt.value}`}
                                        style={{ cursor: 'pointer' }}
                                      >
                                        {opt.label}
                                      </label>
                                    </div>
                                  </div>
                                );
                              })}
                              <div className="dropdown-divider"></div>
                              <button
                                className="dropdown-item btn-link text-center text-primary small font-weight-bold"
                                onClick={() => router.get(buildUrl("mock-ups"), { ...filters, design_status: null })}
                              >
                                Reset to Default
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-4 mb-4">
                          <DateRangeFilter
                            filters={filters}
                            route="mock-ups"
                            buildUrl={buildUrl}
                          />
                        </div>
                        <div className="col-md-2 text-right">
                          <button
                            onClick={() => router.reload()}
                            className="btn btn-outline-primary btn-sm"
                            title="Refresh Data">
                            <i className="ti-reload mr-1"></i> Refresh
                          </button>
                        </div>
                      </div>

                      {/* Active Filters Indicator */}
                      {(filters.search || filters.design_status || filters.date_range || filters.branch_id) &&
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
                              {filters.design_status ? (
                                <span className="badge badge-info mr-2 text-capitalize">
                                  Status: {Array.isArray(filters.design_status)
                                    ? filters.design_status.map(s => s.replace(/_/g, " ")).join(", ")
                                    : filters.design_status.replace(/_/g, " ")}
                                </span>
                              ) : (
                                <span className="badge badge-secondary mr-2">
                                  Status: Default (Excludes Approved)
                                </span>
                              )}
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
                              <button
                                type="button"
                                className="btn btn-link btn-sm text-danger p-0 ml-2"
                                onClick={() => router.get(buildUrl("mock-ups"), {})}>
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
                          emptyMessage="No tickets found." />

                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hidden Print Preview - Portaled to Body */}
      {createPortal(
        <div id="preview-print-overlay" style={{ display: previewToPrint ? 'block' : 'none' }}>
          {previewToPrint && (
            <div className="preview-print-container bg-white text-black" style={{
              fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
              fontSize: '11pt',
              width: '297mm',
              minHeight: '210mm',
              margin: '0 auto',
              boxSizing: 'border-box',
              position: 'relative',
              color: '#333',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}>
              <div style={{ display: 'flex', width: '100%', minHeight: '100%' }}>
                {/* Left Side - Image (only on first page) */}
                <div
                  className="print-image-container"
                  style={{
                    width: '70%',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    border: '1px solid #ddd',
                    padding: '10px',
                    flexShrink: 0
                  }}>
                  <img
                    src={previewToPrint.file.file_path}
                    alt={previewToPrint.file.file_name}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '180mm',
                      objectFit: 'contain'
                    }}
                  />
                </div>

                {/* Right Side - Design Description Only */}
                <div style={{
                  width: '30%',
                  paddingLeft: '5px',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '100%'
                }}>
                  {previewToPrint.ticket.design_description ? (
                    <div
                      className="tiptap-content print-description"
                      style={{
                        fontSize: '11pt',
                        padding: '5px',
                        border: '1px solid #eee',
                        borderRadius: '4px',
                        minHeight: '100%'
                      }}
                      dangerouslySetInnerHTML={{ __html: previewToPrint.ticket.design_description }}
                    />
                  ) : (
                    <div style={{
                      fontSize: '11pt',
                      color: '#999',
                      fontStyle: 'italic',
                      padding: '20px'
                    }}>
                      No design description available
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}

      <style>{`
        @media print {
          @page {
            margin: 0;
            size: A4 landscape;
          }
          body.printing-preview {
            visibility: hidden;
            overflow: visible !important;
            height: auto !important;
          }
          #app {
            display: none !important;
          }
          
          body.printing-preview #preview-print-overlay,
          body.printing-preview #preview-print-overlay .preview-print-container {
            visibility: visible !important;
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            z-index: 99999 !important;
            overflow: visible !important;
            page-break-inside: avoid;
          }
          body.printing-preview #preview-print-overlay * {
            visibility: visible !important;
          }
          
          /* Image only on first page - keep together */
          body.printing-preview #preview-print-overlay .print-image-container {
            page-break-inside: avoid;
          }
          
          /* Allow description to flow across pages */
          body.printing-preview #preview-print-overlay .print-description {
            overflow: visible !important;
            max-height: none !important;
            page-break-inside: auto;
            break-inside: auto;
          }
          
          body.printing-preview #preview-print-overlay .print-description * {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Ensure content can flow to new pages */
          body.printing-preview #preview-print-overlay .preview-print-container > div {
            page-break-inside: auto;
          }
        }
      `}</style>

    </AdminLayout>);

}