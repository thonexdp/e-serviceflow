import React, { useState } from "react";
import { Head, router } from "@inertiajs/react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { formatDate } from "@/Utils/formatDate";

export default function ProductionReports({
    auth,
    records = [],
    summary = {},
    filters = {},
    users = [],
    jobTypes = [],
    dateRange = 'this_month',
    startDate,
    endDate,
}) {
    const [selectedDateRange, setSelectedDateRange] = useState(dateRange);
    const [customStartDate, setCustomStartDate] = useState(startDate);
    const [customEndDate, setCustomEndDate] = useState(endDate);
    const [selectedUser, setSelectedUser] = useState(filters.user_id || '');
    const [selectedJobType, setSelectedJobType] = useState(filters.job_type_id || '');
    const [viewingEvidence, setViewingEvidence] = useState(null); // { record, files }
    const [selectedImage, setSelectedImage] = useState(null);

    const dateRanges = [
        { value: 'today', label: 'Today' },
        { value: 'yesterday', label: 'Yesterday' },
        { value: 'this_week', label: 'This Week' },
        { value: 'last_week', label: 'Last Week' },
        { value: 'this_month', label: 'This Month' },
        { value: 'last_month', label: 'Last Month' },
        { value: 'this_year', label: 'This Year' },
        { value: 'last_year', label: 'Last Year' },
        { value: 'custom', label: 'Custom Range' },
    ];

    const applyFilters = (newDateRange) => {
        const range = newDateRange || selectedDateRange;

        const params = {
            date_range: range,
            user_id: selectedUser,
            job_type_id: selectedJobType,
        };

        if (range === 'custom') {
            params.start_date = customStartDate;
            params.end_date = customEndDate;
        }

        router.get(route('production.reports'), params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleDateRangeChange = (e) => {
        const value = e.target.value;
        setSelectedDateRange(value);
        if (value !== 'custom') {
            applyFilters(value);
        }
    };

    return (
        <AdminLayout user={auth.user}>
            <Head title="Production Reports" />

            <div className="row">
                <div className="col-lg-8 p-r-0 title-margin-right">
                    <div className="page-header">
                        <div className="page-title">
                            <h1>
                                <i className="ti-stats-up mr-2"></i>
                                Production Report
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
                                <li className="breadcrumb-item active">Report</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            <div className="main-content">
                {/* Filters */}
                <div className="card mb-4">
                    <div className="card-body">
                        <div className="row align-items-end">
                            <div className="col-md-3 mb-3">
                                <label>Date Range</label>
                                <select
                                    className="form-control"
                                    value={selectedDateRange}
                                    onChange={handleDateRangeChange}
                                >
                                    {dateRanges.map((range) => (
                                        <option key={range.value} value={range.value}>
                                            {range.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedDateRange === 'custom' && (
                                <>
                                    <div className="col-md-3 mb-3">
                                        <label>Start Date</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={customStartDate}
                                            onChange={(e) => setCustomStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-md-3 mb-3">
                                        <label>End Date</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={customEndDate}
                                            onChange={(e) => setCustomEndDate(e.target.value)}
                                        />
                                    </div>
                                </>
                            )}

                            {/* Show User Filter only if users list is populated (Head/Admin) */}
                            {users.length > 0 && (
                                <div className="col-md-3 mb-3">
                                    <label>User</label>
                                    <select
                                        className="form-control"
                                        value={selectedUser}
                                        onChange={(e) => setSelectedUser(e.target.value)}
                                    >
                                        <option value="">All Users</option>
                                        {users.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="col-md-3 mb-3">
                                <label>Job Type</label>
                                <select
                                    className="form-control"
                                    value={selectedJobType}
                                    onChange={(e) => setSelectedJobType(e.target.value)}
                                >
                                    <option value="">All Job Types</option>
                                    {jobTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-md-auto mb-3">
                                <button
                                    className="btn btn-primary btn-block"
                                    onClick={() => applyFilters()}
                                >
                                    <i className="ti-filter"></i> Apply Filters
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="row mb-4">
                    <div className="col-md-4">
                        <div className="stat-card">
                            <div className="stat-icon bg-primary text-white">
                                <i className="ti-package"></i>
                            </div>
                            <div className="stat-content">
                                <h6 className="text-muted">Total Quantity Produced</h6>
                                <h2 className="mt-2">{summary.total_quantity || 0}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="stat-card">
                            <div className="stat-icon bg-success text-white">
                                <i className="ti-files"></i>
                            </div>
                            <div className="stat-content">
                                <h6 className="text-muted">Total Records</h6>
                                <h2 className="mt-2">{summary.total_records || 0}</h2>
                            </div>
                        </div>
                    </div>
                    {users.length > 0 && (
                        <div className="col-md-4">
                            <div className="stat-card">
                                <div className="stat-icon bg-warning text-white">
                                    <i className="ti-user"></i>
                                </div>
                                <div className="stat-content">
                                    <h6 className="text-muted">Active Users</h6>
                                    <h2 className="mt-2">{summary.unique_users || 0}</h2>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Report Content */}
                <div className="card">
                    <div className="card-body">
                        <h4 className="card-title mb-4">Performance Records</h4>

                        {filters.user_id && (
                            <div className="alert alert-info mb-3">
                                <i className="ti-filter"></i> Filtered by User ID: {filters.user_id}
                            </div>
                        )}

                        {filters.job_type_id && (
                            <div className="alert alert-info mb-3">
                                <i className="ti-filter"></i> Filtered by Job Type ID: {filters.job_type_id}
                            </div>
                        )}

                        {records && records.length > 0 ? (
                            <div className="table-responsive">
                                <table className="table table-striped table-hover">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            {users.length > 0 && <th>User Name</th>}
                                            <th>Ticket #</th>
                                            <th>Job Type</th>
                                            <th>Workflow Step</th>
                                            <th className="text-right">Quantity Produced</th>
                                            <th className="text-center">Evidence</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.map((record) => (
                                            <tr key={record.id}>
                                                <td>{formatDate(record.created_at)}</td>
                                                {users.length > 0 && <td>{record.user_name || 'N/A'}</td>}
                                                <td>{record.ticket_number || 'N/A'}</td>
                                                <td>{record.job_type_name || 'N/A'}</td>
                                                <td className="text-capitalize">
                                                    {record.workflow_step ? record.workflow_step.replace(/_/g, ' ') : 'N/A'}
                                                </td>
                                                <td className="text-right">
                                                    <strong>{record.quantity_produced || 0}</strong>
                                                </td>
                                                <td className="text-center">
                                                    {record.evidence_files && record.evidence_files.length > 0 ? (
                                                        <div className="d-flex justify-content-center gap-1 flex-wrap" style={{ maxWidth: '150px', margin: '0 auto' }}>
                                                            {record.evidence_files.slice(0, 3).map((file) => (
                                                                <img
                                                                    key={file.id}
                                                                    src={file.file_path}
                                                                    alt="evidence"
                                                                    className="img-thumbnail"
                                                                    style={{ width: '35px', height: '35px', objectFit: 'cover', cursor: 'pointer' }}
                                                                    onClick={() => setSelectedImage(file)}
                                                                />
                                                            ))}
                                                            {record.evidence_files.length > 3 && (
                                                                <button
                                                                    className="btn btn-xs btn-info"
                                                                    style={{ padding: '2px 5px', fontSize: '10px' }}
                                                                    onClick={() => setViewingEvidence({ record, files: record.evidence_files })}
                                                                >
                                                                    +{record.evidence_files.length - 3}
                                                                </button>
                                                            )}
                                                            {record.evidence_files.length <= 3 && record.evidence_files.length > 0 && (
                                                                <button
                                                                    className="btn btn-xs btn-link p-0 ml-1"
                                                                    onClick={() => setViewingEvidence({ record, files: record.evidence_files })}
                                                                    title="View all evidence"
                                                                >
                                                                    <i className="ti-zoom-in"></i>
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted small">No evidence</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="table-active font-weight-bold">
                                            <td colSpan={users.length > 0 ? 5 : 4} className="text-right">Total:</td>
                                            <td className="text-right">{summary.total_quantity || 0}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ) : (
                            <div className="alert alert-info text-center p-5">
                                <i className="ti-info-alt text-lg mb-3 d-block"></i>
                                No production records found for the selected period.
                            </div>
                        )}

                        {/* Summaries */}
                        <div className="row mt-5">
                            {summary.by_job_type && summary.by_job_type.length > 0 && (
                                <div className={summary.by_user && summary.by_user.length > 0 ? "col-md-6" : "col-md-12"}>
                                    <h5 className="mb-3">Summary by Job Type</h5>
                                    <div className="table-responsive">
                                        <table className="table table-sm table-bordered">
                                            <thead className="thead-light">
                                                <tr>
                                                    <th>Job Type</th>
                                                    <th className="text-right">Total Quantity</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {summary.by_job_type.map((item, index) => (
                                                    <tr key={index}>
                                                        <td>{item.job_type_name}</td>
                                                        <td className="text-right font-weight-bold">{item.total_quantity}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {summary.by_user && summary.by_user.length > 0 && (
                                <div className="col-md-6">
                                    <h5 className="mb-3">Summary by User</h5>
                                    <div className="table-responsive">
                                        <table className="table table-sm table-bordered">
                                            <thead className="thead-light">
                                                <tr>
                                                    <th>User</th>
                                                    <th className="text-right">Total Quantity</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {summary.by_user.map((item, index) => (
                                                    <tr key={index}>
                                                        <td>{item.user_name}</td>
                                                        <td className="text-right font-weight-bold">{item.total_quantity}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
                {/* Evidence Gallery Modal */}
                {viewingEvidence && (
                    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
                        <div className="modal-dialog modal-lg modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Production Evidence - Ticket #{viewingEvidence.record.ticket_number}</h5>
                                    <button type="button" className="close" onClick={() => setViewingEvidence(null)}>
                                        <span>&times;</span>
                                    </button>
                                </div>
                                <div className="modal-body">
                                    <div className="row">
                                        {viewingEvidence.files.map((file) => (
                                            <div key={file.id} className="col-md-3 col-sm-4 mb-3">
                                                <div className="card h-100 shadow-sm border">
                                                    <img
                                                        src={file.file_path}
                                                        className="card-img-top"
                                                        style={{ height: '120px', objectFit: 'cover', cursor: 'pointer' }}
                                                        onClick={() => setSelectedImage(file)}
                                                        alt={file.file_name}
                                                    />
                                                    <div className="card-body p-2 text-center bg-light">
                                                        <small className="text-muted text-truncate d-block" style={{ fontSize: '10px' }} title={file.file_name}>
                                                            {file.file_name}
                                                        </small>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setViewingEvidence(null)}>Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Image Preview Modal */}
                {selectedImage && (
                    <div
                        className="modal fade show d-block"
                        style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1100 }}
                        onClick={() => setSelectedImage(null)}
                    >
                        <div className="modal-dialog modal-xl modal-dialog-centered" onClick={e => e.stopPropagation()}>
                            <div className="modal-content border-0 bg-transparent shadow-none">
                                <div className="modal-header border-0 pb-0 pr-3">
                                    <button
                                        type="button"
                                        className="close text-white"
                                        style={{ fontSize: '2.5rem', opacity: 1, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                                        onClick={() => setSelectedImage(null)}
                                    >
                                        <span>&times;</span>
                                    </button>
                                </div>
                                <div className="modal-body p-0 text-center">
                                    <img
                                        src={selectedImage.file_path}
                                        className="img-fluid rounded shadow-lg"
                                        style={{ maxHeight: '80vh', border: '5px solid white' }}
                                        alt={selectedImage.file_name}
                                    />
                                    <div className="mt-3 text-white">
                                        <h5 className="mb-0">{selectedImage.file_name}</h5>
                                        <a
                                            href={selectedImage.file_path}
                                            download={selectedImage.file_name}
                                            className="btn btn-primary mt-3 px-4"
                                        >
                                            <i className="ti-download mr-1"></i> Download Image
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .stat-card {
                    background: #fff;
                    border-radius: 4px;
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
                    margin-bottom: 20px;
                }
                .stat-icon {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    margin-right: 15px;
                }
                .stat-content h6 {
                    margin: 0;
                    font-size: 14px;
                }
                .stat-content h2 {
                    margin: 0;
                    font-size: 24px;
                    font-weight: 600;
                }
            `}</style>
        </AdminLayout>
    );
}
