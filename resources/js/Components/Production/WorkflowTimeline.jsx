import React, { useState } from "react";
import { formatDate } from "@/Utils/formatDate";
import { useRoleApi } from "@/Hooks/useRoleApi";

const WORKFLOW_STEPS = {
    printing: { label: 'Printing', icon: 'ti-printer', color: '#2196F3' },
    lamination_heatpress: { label: 'Lamination/Heatpress', icon: 'ti-layers', color: '#FF9800' },
    cutting: { label: 'Cutting', icon: 'ti-cut', color: '#F44336' },
    sewing: { label: 'Sewing', icon: 'ti-pin-alt', color: '#E91E63' },
    dtf_press: { label: 'DTF Press', icon: 'ti-stamp', color: '#673AB7' },
    embroidery: { label: 'Embroidery', icon: 'ti-pencil-alt', color: '#009688' },
    knitting: { label: 'Knitting', icon: 'ti-layout-grid2', color: '#795548' },
    lasser_cutting: { label: 'Laser Cutting', icon: 'ti-bolt', color: '#FF5722' },
    qa: { label: 'Quality Assurance', icon: 'ti-check-box', color: '#4CAF50' }
};

export default function WorkflowTimeline({ ticket }) {
    const [selectedImage, setSelectedImage] = useState(null);
    const { buildUrl } = useRoleApi();

    if (!ticket) {
        return <div className="text-center text-muted py-5">No timeline data available</div>;
    }


    const workflowProgress = ticket.workflow_progress || [];
    const productionRecords = ticket.production_records || [];
    const workflowLogs = ticket.workflow_logs || [];


    const timelineData = [];


    workflowProgress.forEach((progress) => {
        const stepInfo = WORKFLOW_STEPS[progress.workflow_step] || {
            label: progress.workflow_step,
            icon: 'ti-package',
            color: '#2196F3'
        };


        const relatedRecords = productionRecords.filter(
            (record) => record.workflow_step === progress.workflow_step
        );


        const evidenceFiles = ticket.evidence_files?.filter(
            (file) => file.workflow_step === progress.workflow_step
        ) || [];

        timelineData.push({
            workflow_step: progress.workflow_step,
            step_info: stepInfo,
            completed_quantity: progress.completed_quantity,
            total_quantity: progress.total_quantity,
            is_completed: progress.is_completed,
            completed_at: progress.completed_at,
            updated_at: progress.updated_at,
            production_records: relatedRecords,
            evidence_files: evidenceFiles
        });

        console.log("timelineData:", timelineData);
    });


    const stepOrder = Object.keys(WORKFLOW_STEPS);
    timelineData.sort((a, b) => {
        const aIndex = stepOrder.indexOf(a.workflow_step);
        const bIndex = stepOrder.indexOf(b.workflow_step);
        return aIndex - bIndex;
    });


    const calculateDuration = (start, end) => {
        if (!start || !end) return null;
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffMs = endDate - startDate;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 60) {
            return `${diffMins} mins`;
        } else if (diffMins < 1440) {
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            return `${hours}h ${mins}m`;
        } else {
            const days = Math.floor(diffMins / 1440);
            const hours = Math.floor(diffMins % 1440 / 60);
            return `${days}d ${hours}h`;
        }
    };

    return (
        <div className="workflow-timeline-container">
            {/* Ticket Summary */}
            <div className="card mb-4" style={{ backgroundColor: '#f8f9fa' }}>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-6">
                            <h5 className="mb-2">
                                <strong>{ticket.description}</strong>
                            </h5>
                            <p className="mb-1">
                                <strong>Customer:</strong> {ticket.customer?.firstname} {ticket.customer?.lastname}
                            </p>
                            <p className="mb-1">
                                <strong>Total Quantity:</strong> {ticket.total_quantity || (ticket.quantity || 0) + (ticket.free_quantity || 0)}
                            </p>
                        </div>
                        <div className="col-md-6">
                            <p className="mb-1">
                                <strong>Started:</strong> {ticket.workflow_started_at ? formatDate(ticket.workflow_started_at) : 'Not started'}
                            </p>
                            <p className="mb-1">
                                <strong>Completed:</strong> {ticket.workflow_completed_at ? formatDate(ticket.workflow_completed_at) : 'In progress'}
                            </p>
                            {ticket.workflow_started_at && ticket.workflow_completed_at &&
                                <p className="mb-1">
                                    <strong>Total Duration:</strong> {calculateDuration(ticket.workflow_started_at, ticket.workflow_completed_at)}
                                </p>
                            }
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <div className="timeline-wrapper">
                {timelineData.length === 0 ?
                    <div className="alert alert-info">
                        <i className="ti-info-alt mr-2"></i>
                        No workflow history available yet. Production has not started.
                    </div> :

                    <div className="timeline">
                        {timelineData.map((item, index) => {
                            const isCompleted = item.is_completed;
                            const isInProgress = !isCompleted && item.completed_quantity > 0;
                            const isPending = !isCompleted && item.completed_quantity === 0;

                            return (
                                <div key={item.workflow_step} className="timeline-item mb-4">
                                    <div className="row">
                                        {/* Timeline Icon */}
                                        <div className="col-md-1 text-center">
                                            <div
                                                className="timeline-badge d-inline-flex align-items-center justify-content-center rounded-circle"
                                                style={{
                                                    width: '50px',
                                                    height: '50px',
                                                    backgroundColor: isCompleted ? '#4CAF50' : isInProgress ? item.step_info.color : '#ccc',
                                                    color: 'white',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                }}>

                                                <i className={`${item.step_info.icon}`} style={{ fontSize: '1.5rem' }}></i>
                                            </div>
                                            {index < timelineData.length - 1 &&
                                                <div
                                                    className="timeline-line"
                                                    style={{
                                                        width: '3px',
                                                        height: '100px',
                                                        backgroundColor: isCompleted ? '#4CAF50' : '#e0e0e0',
                                                        margin: '10px auto'
                                                    }}>
                                                </div>
                                            }
                                        </div>

                                        {/* Timeline Content */}
                                        <div className="col-md-11">
                                            <div className="card shadow-sm">
                                                <div className="card-body">
                                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                                        <div>
                                                            <h5 className="mb-1" style={{ color: item.step_info.color }}>
                                                                <i className={`${item.step_info.icon} mr-2`}></i>
                                                                {item.step_info.label}
                                                            </h5>
                                                            {isCompleted &&
                                                                <span className="badge badge-success">
                                                                    <i className="ti-check mr-1"></i>Completed
                                                                </span>
                                                            }
                                                            {isInProgress &&
                                                                <span className="badge badge-warning">
                                                                    <i className="ti-reload mr-1"></i>In Progress
                                                                </span>
                                                            }
                                                            {isPending &&
                                                                <span className="badge badge-secondary">
                                                                    <i className="ti-time mr-1"></i>Pending
                                                                </span>
                                                            }
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="mb-1">
                                                                <strong className={item.completed_quantity >= item.total_quantity ? 'text-success' : 'text-warning'}>
                                                                    {item.completed_quantity}
                                                                </strong>
                                                                {' / '}
                                                                <strong>{item.total_quantity}</strong>
                                                            </div>
                                                            <div className="progress" style={{ width: '150px', height: '8px' }}>
                                                                <div
                                                                    className={`progress-bar ${item.completed_quantity >= item.total_quantity ? 'bg-success' : 'bg-warning'}`}
                                                                    style={{ width: `${item.completed_quantity / item.total_quantity * 100}%` }}>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Timestamps */}
                                                    <div className="row mb-3">
                                                        <div className="col-md-6">
                                                            <small className="text-muted">
                                                                <i className="ti-time mr-1"></i>
                                                                <strong>Last Updated:</strong> {item.updated_at ? formatDate(item.updated_at) : 'N/A'}
                                                            </small>
                                                        </div>
                                                        {item.completed_at &&
                                                            <div className="col-md-6">
                                                                <small className="text-success">
                                                                    <i className="ti-check mr-1"></i>
                                                                    <strong>Completed:</strong> {formatDate(item.completed_at)}
                                                                </small>
                                                            </div>
                                                        }
                                                    </div>

                                                    {/* User Contributions */}
                                                    {item.production_records && item.production_records.length > 0 &&
                                                        <div className="mb-3">
                                                            <h6 className="mb-2">
                                                                <i className="ti-user mr-2"></i>User Contributions:
                                                            </h6>
                                                            <div className="table-responsive">
                                                                <table className="table table-sm table-bordered">
                                                                    <thead className="thead-light">
                                                                        <tr>
                                                                            <th>User</th>
                                                                            <th>Quantity Produced</th>
                                                                            {/* <th>Date & Time</th> */}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {item.production_records.map((record, idx) =>
                                                                            <tr key={idx}>
                                                                                <td>{record.user?.name || 'Unknown'}</td>
                                                                                <td>
                                                                                    <span className="badge badge-info">
                                                                                        {record.quantity_produced || 0} pcs
                                                                                    </span>
                                                                                </td>
                                                                                {/* <td>
                                       {record.recorded_at ? (() => {
                                           const date = new Date(record.recorded_at);
                                           const dateStr = formatDate(record.recorded_at);
                                           const timeStr = date.toLocaleTimeString("en-US", {
                                               hour: "2-digit",
                                               minute: "2-digit",
                                               second: "2-digit",
                                               hour12: true
                                           });
                                           return (
                                               <div>
                                                   <div className="text-muted">{dateStr}</div>
                                                   <div className="text-muted small">{timeStr}</div>
                                               </div>
                                           );
                                       })() : (
                                           <span className="text-muted">N/A</span>
                                       )}
                                    </td> */}
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    }

                                                    {/* Evidence Photos */}
                                                    {item.evidence_files && item.evidence_files.length > 0 &&
                                                        <div>
                                                            <h6 className="mb-2">
                                                                <i className="ti-image mr-2"></i>Production Evidence:
                                                            </h6>
                                                            <div className="row">
                                                                {item.evidence_files.map((file, idx) =>
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
                                                                                onClick={() => setSelectedImage(file)} />

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
                                                    }

                                                    {/* Empty State */}
                                                    {(!item.production_records || item.production_records.length === 0) && (
                                                        !item.evidence_files || item.evidence_files.length === 0) &&
                                                        <div className="text-center text-muted py-2">
                                                            <i className="ti-info-alt mr-2"></i>
                                                            No detailed records or evidence available for this step
                                                        </div>
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>);

                        })}
                    </div>
                }
            </div>

            {/* Payment History Timeline Section */}
            {ticket.payments?.length > 0 &&
                <div className="payment-history-section mt-5">
                    <h4 className="mb-4">
                        <i className="ti-wallet mr-2"></i>Payment History
                    </h4>
                    <div className="timeline-wrapper">
                        <div className="timeline">
                            {ticket.payments.map((payment, idx) =>
                                <div key={payment.id} className="timeline-item mb-4">
                                    <div className="row">
                                        <div className="col-md-1 text-center">
                                            <div
                                                className="timeline-badge d-inline-flex align-items-center justify-content-center rounded-circle"
                                                style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    backgroundColor: payment.status === 'pending' ? '#FFC107' : payment.status === 'rejected' ? '#F44336' : '#4CAF50',
                                                    color: 'white'
                                                }}>

                                                <i className={payment.payment_method === 'check' ? 'ti-receipt' : 'ti-money'}></i>
                                            </div>
                                        </div>
                                        <div className="col-md-11">
                                            <div className="card shadow-sm border-left-success" style={{ borderLeft: `4px solid ${payment.status === 'pending' ? '#FFC107' : payment.status === 'rejected' ? '#F44336' : '#4CAF50'}` }}>
                                                <div className="card-body">
                                                    <div className="d-flex justify-content-between align-items-start">
                                                        <div>
                                                            <h6 className="font-bold mb-1">
                                                                {payment.payment_method?.replace('_', ' ').toUpperCase()} PAYMENT
                                                                {payment.status === 'pending' && <span className="ml-2 badge badge-warning">PENDING CLEARANCE</span>}
                                                                {payment.status === 'rejected' && <span className="ml-2 badge badge-danger">REJECTED / BOUNCED</span>}
                                                            </h6>
                                                            <div className="text-muted small">
                                                                <i className="ti-calendar mr-1"></i>
                                                                {formatDate(payment.payment_date)}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <h5 className="font-bold text-success mb-0">
                                                                ₱{Number(payment.amount).toLocaleString()}
                                                            </h5>
                                                            {payment.official_receipt_number &&
                                                                <div className="text-muted small">OR: {payment.official_receipt_number}</div>
                                                            }
                                                        </div>
                                                    </div>

                                                    {payment.payment_method === 'check' && payment.metadata &&
                                                        <div className="mt-2 p-2 bg-light rounded small">
                                                            <strong>Bank:</strong> {payment.metadata.bank_name} |
                                                            <strong> Cheque #:</strong> {payment.metadata.cheque_number} |
                                                            <strong> Date:</strong> {payment.metadata.cheque_date}
                                                        </div>
                                                    }

                                                    {payment.notes &&
                                                        <p className="mt-2 mb-0 text-muted italic small">
                                                            <i className="ti-info-alt mr-1"></i>"{payment.notes}"
                                                        </p>
                                                    }

                                                    <div className="mt-2 text-right">
                                                        <small className="text-muted">
                                                            Recorded by: {payment.recorded_by?.name || 'System'}
                                                        </small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            }

            {/* Image Preview Modal */}
            {selectedImage &&
                <div
                    className="modal fade show d-block"
                    style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
                    onClick={() => setSelectedImage(null)}>

                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Evidence Photo</h5>
                                <button
                                    type="button"
                                    className="close"
                                    onClick={() => setSelectedImage(null)}>

                                    <span>&times;</span>
                                </button>
                            </div>
                            <div className="modal-body text-center">
                                <img
                                    src={selectedImage.file_path}
                                    alt={selectedImage.file_name}
                                    className="img-fluid"
                                    style={{ maxHeight: '70vh' }} />

                                <div className="mt-3">
                                    <p><strong>Uploaded by:</strong> {selectedImage.user?.name || 'Unknown'}</p>
                                    <p><strong>Date:</strong> {selectedImage.uploaded_at ? formatDate(selectedImage.uploaded_at) : 'N/A'}</p>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setSelectedImage(null)}>

                                    Close
                                </button>
                                <a
                                    href={selectedImage.file_path}
                                    download={selectedImage.file_name}
                                    className="btn btn-primary">

                                    <i className="ti-download mr-2"></i>Download
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            }
        </div>);

}