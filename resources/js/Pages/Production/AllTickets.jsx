import React, { useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Modal from "@/Components/Main/Modal";
import DataTable from "@/Components/Common/DataTable";
import SearchBox from "@/Components/Common/SearchBox";
import FlashMessage from "@/Components/Common/FlashMessage";
import FormInput from "@/Components/Common/FormInput";
import { formatDate } from "@/Utils/formatDate";
import { useRoleApi } from "@/Hooks/useRoleApi";
import TicketAssigner from "@/Components/Production/TicketAssigner";
import WorkflowTimeline from "@/Components/Production/WorkflowTimeline";

const WORKFLOW_STEPS = [
  { key: 'printing', label: 'Printing', icon: 'ti-printer', color: '#2196F3' },
  { key: 'lamination_heatpress', label: 'Lamination/Heatpress', icon: 'ti-layers', color: '#FF9800' },
  { key: 'cutting', label: 'Cutting', icon: 'ti-cut', color: '#F44336' },
  { key: 'sewing', label: 'Sewing', icon: 'ti-pin-alt', color: '#E91E63' },
  { key: 'dtf_press', label: 'DTF Press', icon: 'ti-stamp', color: '#673AB7' },
  { key: 'qa', label: 'Quality Assurance', icon: 'ti-check-box', color: '#4CAF50' }];


export default function AllTickets({
  user = {},
  notifications = [],
  messages = [],
  tickets = { data: [] },
  filters = {},
  productionUsers = []
}) {
  const [openViewModal, setViewModalOpen] = useState(false);
  const [openTimelineModal, setTimelineModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState(null);
  const { flash, auth } = usePage().props;
  const { buildUrl } = useRoleApi();
  const isProductionHead = auth?.user?.role === 'Production' && auth?.user?.is_head;
  const isAdmin = auth?.user?.role === 'admin';
  const canOnlyPrint = auth?.user?.can_only_print || false;


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
  };

  const handleAssignUsers = (ticket, userIds) => {
    console.log('✅ handleAssignUsers called with ticket:', ticket, 'userIds:', userIds);
    if (!isProductionHead && !isAdmin) {
      return;
    }

    router.post(buildUrl(`/queue/${ticket.id}/assign-users`), {
      user_ids: userIds,
      workflow_step: ticket.current_workflow_step || null
    }, {
      preserveScroll: true,
      preserveState: true,
      onSuccess: () => {

      },
      onError: (errors) => {
        console.error('Assignment error:', errors);
        showAlert('error', { message: 'Failed to assign users. Please try again.' });
      },
      onFinish: () => {
        console.log('✅ handleAssignUsers onFinish called');

      }
    });








  };

  const handleReassign = (ticket, workflowStep) => {

    const userIds = prompt(`Enter user IDs to assign to ${workflowStep} (comma-separated):`);
    if (userIds) {
      const ids = userIds.split(',').map((id) => parseInt(id.trim())).filter((id) => !isNaN(id));
      handleAssignUsers(ticket, ids, workflowStep);
    }
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

  const getStatusBadge = (status) => {
    const classes = {
      ready_to_print: "badge-info",
      in_production: "badge-warning",
      completed: "badge-success",
      pending: "badge-secondary"
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

  const getWorkflowBadge = (workflowStep) => {
    if (!workflowStep) return <span className="text-muted">Not Started</span>;

    const step = WORKFLOW_STEPS.find((s) => s.key === workflowStep);
    if (!step) return <span className="text-muted">{workflowStep}</span>;

    return (
      <span className="badge" style={{ backgroundColor: step.color, color: 'white' }}>
        <i className={`${step.icon} mr-1`}></i>
        {step.label}
      </span>);

  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <span className="text-danger font-weight-bold">{Math.abs(diffDays)} days overdue</span>;
    } else if (diffDays === 0) {
      return <span className="text-warning font-weight-bold">Due today</span>;
    } else if (diffDays <= 2) {
      return <span className="text-warning">{diffDays} days left</span>;
    } else {
      return <span className="text-muted">{diffDays} days left</span>;
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
      label: "Ticket ID",
      key: "ticket_number",
      render: (row) =>
        <div>
          <strong>{row.ticket_number}</strong>
          {row.mockup_files && row.mockup_files.length > 0 &&
            <div className="mt-1">
              <img
                src={row.mockup_files[0].file_path}
                alt="Preview"
                className="img-thumbnail"
                style={{ width: '50px', height: '50px', objectFit: 'cover', cursor: 'pointer' }}
                onClick={() => handleView(row)} />

            </div>
          }
        </div>

    },
    {
      label: "Description",
      key: "description",
      render: (row) =>
        <div>
          <div className="font-weight-bold">{row.description}</div>
          <small className="text-muted">
            {row.customer?.firstname} {row.customer?.lastname}
          </small>
        </div>

    },
    {
      label: "Quantity",
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
          <div>
            <span className={stepQuantity >= totalQty ? "text-success font-weight-bold" : "text-warning font-weight-bold"}>
              {stepQuantity} / {totalQty}
            </span>
            <div className="progress mt-1" style={{ height: '5px' }}>
              <div
                className={`progress-bar ${stepQuantity >= totalQty ? 'bg-success' : 'bg-warning'}`}
                style={{ width: `${percentage}%` }}>
              </div>
            </div>
          </div>);

      }
    },
    {
      label: "Current Workflow",
      key: "current_workflow_step",
      render: (row) => getWorkflowBadge(row.current_workflow_step)
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
      label: "Status",
      key: "status",
      render: (row) => getStatusBadge(row.status)
    },
    {
      label: "Due Date",
      key: "due_date",
      render: (row) =>
        <div>
          <div>{formatDate(row.due_date)}</div>
          {getDaysUntilDue(row.due_date)}
        </div>

    },
    {
      label: "Actions",
      key: "actions",
      render: (row) =>
        <div className="btn-group-vertical btn-group-sm">
          <button
            type="button"
            className="btn btn-link btn-sm text-orange-500"
            onClick={() => handleView(row)}>

            <i className="ti-eye"></i> View
          </button>
          <button
            type="button"
            className="btn btn-link btn-sm text-purple-500"
            onClick={() => handleViewTimeline(row)}>

            <i className="ti-time"></i> Timeline
          </button>
        </div>

    }];


  const mockupFiles = selectedTicket?.mockup_files || [];

  return (
    <AdminLayout
      user={user}
      notifications={notifications}
      messages={messages}>

      <Head title="All Tickets - Production Head" />

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
                All Production Tickets <span>Overview</span>
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
                <li className="breadcrumb-item active">All Tickets</li>
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
                <p>
                  Current Workflow: {getWorkflowBadge(selectedTicket.current_workflow_step)}
                </p>
              </div>
              <div className="col-md-6">
                <p>
                  <strong>Quantity:</strong> {selectedTicket.total_quantity || (selectedTicket.quantity || 0) + (selectedTicket.free_quantity || 0)}
                </p>
                <p>
                  <strong>Due Date:</strong> {formatDate(selectedTicket.due_date)}
                </p>
                {selectedTicket.size_value &&
                  <p>
                    <strong>Size:</strong> {selectedTicket.size_value} {selectedTicket.size_unit || ""}
                  </p>
                }
              </div>
            </div>

            <hr className="my-3" />

            <div className="mb-4">
              <h6>Design Files:</h6>
              {mockupFiles.length > 0 ?
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
                          {mockupFiles.map((file) =>
                            <tr key={file.id}>
                              <td className="max-w-[150px] truncate" title={file.file_name}>{file.file_name}</td>
                              <td>{formatDate(file.created_at)}</td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-link btn-sm text-orange-500"
                                  onClick={() => handleDownload(file.id, file.file_name)}>

                                  <i className="ti-download"></i> Download
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-link btn-sm text-orange-500"
                                  onClick={() => setSelectedPreviewFile(file)}>

                                  <i className="ti-image"></i> Preview
                                </button>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="col-md-5">
                    <div className="card">
                      <div className="card-body text-center">
                        {selectedPreviewFile &&
                          <img
                            src={selectedPreviewFile?.file_path}
                            alt={selectedPreviewFile?.file_name}
                            className="img-fluid mb-2"
                            style={{ maxHeight: "280px", objectFit: "contain" }} />

                        }
                      </div>
                    </div>
                  </div>
                </div> :

                <p className="text-muted">No design files available</p>
              }
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseModals}>

                Close
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

      <section id="main-content">
        <div className="content-wrap">
          <div className="main">
            <div className="container-fluid">
              <div className="row">
                <div className="col-lg-12">
                  <div className="card">
                    <div className="card-title mt-3">
                      <h4>All Production Tickets</h4>
                      <p className="text-muted">Monitor and manage all tickets across all workflow steps</p>
                    </div>
                    <div className="card-body">
                      <div className="row mt-4 align-items-center">
                        <div className="col-md-4">
                          <SearchBox
                            placeholder="Search tickets..."
                            initialValue={filters.search || ""}
                            route={isAdmin ? `/production/tickets/all` : `/tickets/all`} />

                        </div>
                        <div className="col-md-3">
                          <FormInput
                            label=""
                            type="select"
                            name="status"
                            value={filters.status || "all"}
                            onChange={(e) => {
                              router.get(buildUrl(isAdmin ? `/production/tickets/all` : `/tickets/all`), {
                                ...filters,
                                status: e.target.value === "all" ? null : e.target.value
                              }, {
                                preserveState: false,
                                preserveScroll: true
                              });
                            }}
                            options={[
                              { value: "all", label: "All Status" },
                              { value: "ready_to_print", label: "Ready to Print" },
                              { value: "in_production", label: "In Progress" }]
                            } />

                        </div>
                        <div className="col-md-3">
                          <FormInput
                            label=""
                            type="select"
                            name="workflow_step"
                            value={filters.workflow_step || "all"}
                            onChange={(e) => {
                              router.get(buildUrl(isAdmin ? `/production/tickets/all` : `/tickets/all`), {
                                ...filters,
                                workflow_step: e.target.value === "all" ? null : e.target.value
                              }, {
                                preserveState: false,
                                preserveScroll: true
                              });
                            }}
                            options={[
                              { value: "all", label: "All Workflows" },
                              ...WORKFLOW_STEPS.map((step) => ({
                                value: step.key,
                                label: step.label
                              }))]
                            } />

                        </div>
                        <div className="col-md-2 text-right">
                          <button
                            onClick={() => router.reload()}
                            className="btn btn-outline-primary mr-2"
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

    </AdminLayout>);

}