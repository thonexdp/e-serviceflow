import React, { useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router } from "@inertiajs/react";
import Modal from "@/Components/Main/Modal";
import PreviewModal from "@/Components/Main/PreviewModal";
import CardStatistics from "@/Components/Common/CardStatistics";
import { formatDate } from "@/Utils/formatDate";

export default function Dashboard({
    user = {},
    notifications = [],
    messages = [],
    statistics = {
        ticketsPendingReview: 0,
        revisionRequested: 0,
        mockupsUploadedToday: 0,
        approvedDesign: 0,
    },
    ticketsPendingReview = [],
    revisionRequested = [],
    mockupsUploadedToday = [],
    filters = { date_range: "this_month" },
}) {
    const [refreshing, setRefreshing] = useState(false);
    const [dateRange, setDateRange] = useState(
        filters.date_range || "this_month"
    );
    const [openReviewModal, setReviewModalOpen] = useState(false);
    const [openUploadModal, setUploadModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [previewModal, setPreviewModal] = useState({ isOpen: false, fileUrl: null });

    const refreshDashboard = () => {
        setRefreshing(true);
        router.reload({
            onFinish: () => setRefreshing(false),
        });
    };

    const handleDateRangeChange = (range) => {
        setDateRange(range);
        router.get(
            "/designer/",
            { date_range: range },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleViewTicket = (ticketId) => {
        // router.visit(`/designer/mock-ups/${ticketId}`);
        router.visit(`/designer/mock-ups`);
    };

    const handlePreviewFile = (file) => {
        const filePath = file.filepath || `/storage/${file.filepath}`;
        setPreviewModal({ isOpen: true, fileUrl: filePath });
    };

    const handleReviewTicket = (ticket) => {
        setSelectedTicket(ticket);
        setReviewModalOpen(true);
    };

    const handleSave = () => {
        if (!selectedTicket) return;
        handleViewTicket(selectedTicket.id);
    };

    const getDesignStatusBadge = (status) => {
        const statusMap = {
            pending: { class: "badge-warning", label: "Pending Review" },
            revision_requested: { class: "badge-danger", label: "Revision Requested" },
            mockup_uploaded: { class: "badge-info", label: "Mock-up Uploaded" },
            approved: { class: "badge-success", label: "Approved" },
        };
        const statusInfo = statusMap[status] || { class: "badge-secondary", label: status || "Pending" };
        return (
            <span className={`badge ${statusInfo.class}`}>
                {statusInfo.label}
            </span>
        );
    };

    // Generate year options from current year to 2020 (descending)
    const currentYear = new Date().getFullYear();
    const yearOptions = [];
    for (let year = currentYear; year >= 2020; year--) {
        yearOptions.push(year);
    }

    return (
        <AdminLayout
            user={user}
            notifications={notifications}
            messages={messages}
        >
            <Head title="Designer Dashboard" />

            {/* Review Modal */}
            <Modal
                title="Review Ticket"
                isOpen={openReviewModal}
                onClose={() => {
                    setReviewModalOpen(false);
                    setSelectedTicket(null);
                }}
                onSave={handleSave}
                size="3xl"
                submitButtonText="View Details"
            >
                {selectedTicket && (
                    <form>
                        <div className="mb-4">
                            <h3>
                                Record Payment for Ticket: <b>#{selectedTicket.ticket_number}</b>
                            </h3>
                            <div>
                                <h5>
                                    Customer : <b>{selectedTicket.customer?.name || "Unknown"}</b>
                                </h5>
                            </div>
                            <div>
                                <h5>
                                    Description : <b>{selectedTicket.description}</b>
                                </h5>
                            </div>
                            <hr className="my-3" />
                            <div>
                                <h6>Files :</h6>
                                {selectedTicket.customer_files && selectedTicket.customer_files.length > 0 ? (
                                    <ul>
                                        {selectedTicket.customer_files.map((file) => (
                                            <li key={file.id} className="mb-2">
                                                <span className="mr-2">{file.filename}</span>
                                                <div className="btn-group ml-3">
                                                    <a
                                                        href={`/storage/${file.filepath}`}
                                                        download
                                                        className="btn btn-link btn-outline btn-sm text-blue-500"
                                                    >
                                                        <span className="ti-download"></span> Download
                                                    </a>
                                                    <button
                                                        type="button"
                                                        className="btn btn-link btn-outline btn-sm text-green-800"
                                                        onClick={() => handlePreviewFile(file)}
                                                    >
                                                        <span className="ti-eye"></span> Preview
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-muted">No files uploaded</p>
                                )}
                            </div>
                            <hr className="my-3" />
                            <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => router.visit(`/designer/mock-ups`)}
                            >
                                <i className="ti-arrow-right"></i> Goto Mock-up Page
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Preview Modal */}
            <PreviewModal
                isOpen={previewModal.isOpen}
                onClose={() => setPreviewModal({ isOpen: false, fileUrl: null })}
                fileUrl={previewModal.fileUrl}
                title="File Preview"
            />

            <div className="row">
                <div className="col-lg-8 p-r-0 title-margin-right">
                    <div className="page-header">
                        <div className="page-title">
                            <h1>
                                Designer <span>Dashboard</span>
                            </h1>
                        </div>
                    </div>
                </div>
                <div className="col-lg-4 p-l-0 title-margin-left">
                    <div className="page-header">
                        <div className="page-title">
                            <ol className="breadcrumb">
                                <li className="breadcrumb-item">
                                    <a href="#">Dashboard</a>
                                </li>
                                <li className="breadcrumb-item active">Designer</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            <section id="main-content">
                {/* Header with Date Filter */}
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-gray-800">Design Dashboard</h1>
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-200">
                        <button
                            onClick={refreshDashboard}
                            className="btn btn-sm btn-link"
                            disabled={refreshing}
                        >
                            <i className={`ti-reload ${refreshing ? "animate-spin" : ""}`}></i>
                            {refreshing ? " Refreshing..." : " Refresh"}
                        </button>
                        <span className="text-gray-400">|</span>
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <select
                            className="text-sm font-medium text-gray-700 border-none bg-transparent focus:ring-0 p-0 pr-6 cursor-pointer"
                            value={dateRange}
                            onChange={(e) => handleDateRangeChange(e.target.value)}
                        >
                            <option value="today">Today</option>
                            <option value="this_week">This Week</option>
                            <option value="this_month">This Month</option>
                            <option value="last_30_days">Last 30 Days</option>
                            <option value="this_year">This Year</option>
                            {yearOptions.map((year) => (
                                <option key={year} value={`year_${year}`}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="row mb-4">
                    <div className="col-lg-3">
                        <CardStatistics
                            label="Tickets Pending Review"
                            statistics={statistics.ticketsPendingReview}
                            icon="ti-clipboard"
                            color="bg-warning"
                        />
                    </div>
                    <div className="col-lg-3">
                        <CardStatistics
                            label="Revision Requested"
                            statistics={statistics.revisionRequested}
                            icon="ti-reload"
                            color="bg-danger"
                        />
                    </div>
                    <div className="col-lg-3">
                        <CardStatistics
                            label="Mock-Ups Uploaded Today"
                            statistics={statistics.mockupsUploadedToday}
                            icon="ti-upload"
                            color="bg-primary"
                        />
                    </div>
                    <div className="col-lg-3">
                        <CardStatistics
                            label="Approved Design"
                            statistics={statistics.approvedDesign}
                            icon="ti-check-box"
                            color="bg-success"
                        />
                    </div>
                </div>

                {/* Tickets Lists */}
                <div className="row">
                    {/* Tickets Pending Review */}
                    <div className="col-lg-4">
                        <div className="card shadow-sm">
                            <div className="card-header bg-warning">
                                <div className="d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0 text-white">
                                        <i className="ti-clipboard mr-2"></i>
                                        Tickets Pending Review
                                    </h5>
                                    <span className="badge badge-light">
                                        <span className="text-black">{ticketsPendingReview.length}</span>
                                    </span>
                                </div>
                            </div>
                            <div className="card-body p-0">
                                <div className="table-responsive" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                                    <table className="table table-hover mb-0">
                                        <tbody>
                                            {ticketsPendingReview.length > 0 ? (
                                                ticketsPendingReview.map((ticket) => (
                                                    <tr
                                                        key={ticket.id}
                                                        className="cursor-pointer hover:bg-gray-50"
                                                        onClick={() => handleReviewTicket(ticket)}
                                                    >
                                                        <td>
                                                            <div className="d-flex flex-column">
                                                                <strong className="text-primary">
                                                                    #{ticket.ticket_number}
                                                                </strong>
                                                                <small className="text-muted">
                                                                    {ticket.customer?.name || "Unknown"}
                                                                </small>
                                                                <small className="text-muted mt-1">
                                                                    {ticket.description?.substring(0, 50)}
                                                                    {ticket.description?.length > 50 ? "..." : ""}
                                                                </small>
                                                                {ticket.due_date && (
                                                                    <small className="text-warning mt-1">
                                                                        <i className="ti-calendar mr-1"></i>
                                                                        Due: {formatDate(ticket.due_date)}
                                                                    </small>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="text-right">
                                                            {ticket.customer_files && ticket.customer_files.length > 0 && (
                                                                <span className="badge badge-info">
                                                                    <i className="ti-file mr-1"></i>
                                                                    {ticket.customer_files.length} file{ticket.customer_files.length > 1 ? "s" : ""}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td className="text-center text-gray-400 py-4">
                                                        <i className="ti-clipboard" style={{ fontSize: "32px" }}></i>
                                                        <p className="mt-2 mb-0">No Tickets Pending Review</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Revision Requested */}
                    <div className="col-lg-4">
                        <div className="card shadow-sm">
                            <div className="card-header bg-danger">
                                <div className="d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0">
                                        <i className="ti-reload mr-2"></i>
                                        Revision Requested
                                    </h5>
                                    <span className="badge badge-light">
                                        <span className="text-black">{revisionRequested.length}</span>
                                    </span>
                                </div>
                            </div>
                            <div className="card-body p-0">
                                <div className="table-responsive" style={{ maxHeight: "500px", overflowY: "auto" }}>
                                    <table className="table table-hover mb-0">
                                        <tbody>
                                            {revisionRequested.length > 0 ? (
                                                revisionRequested.map((ticket) => (
                                                    <tr
                                                        key={ticket.id}
                                                        className="cursor-pointer hover:bg-gray-50"
                                                        onClick={() => handleViewTicket(ticket)}
                                                    >
                                                        <td>
                                                            <div className="d-flex flex-column">
                                                                <strong className="text-danger">
                                                                    #{ticket.ticket_number}
                                                                </strong>
                                                                <small className="text-muted">
                                                                    {ticket.customer?.name || "Unknown"}
                                                                </small>
                                                                <small className="text-muted mt-1">
                                                                    {ticket.description?.substring(0, 50)}
                                                                    {ticket.description?.length > 50 ? "..." : ""}
                                                                </small>
                                                                {ticket.design_notes && (
                                                                    <small className="text-danger mt-1">
                                                                        <i className="ti-comment mr-1"></i>
                                                                        {ticket.design_notes.substring(0, 40)}
                                                                        {ticket.design_notes.length > 40 ? "..." : ""}
                                                                    </small>
                                                                )}
                                                                {ticket.due_date && (
                                                                    <small className="text-warning mt-1">
                                                                        <i className="ti-calendar mr-1"></i>
                                                                        Due: {formatDate(ticket.due_date)}
                                                                    </small>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="text-right">
                                                            {ticket.mockup_files && ticket.mockup_files.length > 0 && (
                                                                <span className="badge badge-info">
                                                                    <i className="ti-file mr-1"></i>
                                                                    {ticket.mockup_files.length} mockup{ticket.mockup_files.length > 1 ? "s" : ""}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td className="text-center text-gray-400 py-4">
                                                        <i className="ti-reload" style={{ fontSize: "32px" }}></i>
                                                        <p className="mt-2 mb-0">No Revision Requested</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mock-Ups Uploaded Today */}
                    <div className="col-lg-4">
                        <div className="card shadow-sm">
                            <div className="card-header bg-primary">
                                <div className="d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0">
                                        <i className="ti-upload mr-2"></i>
                                        Mock-Ups Uploaded Today
                                    </h5>
                                    <span className="badge badge-light">
                                        <span className="text-black">{mockupsUploadedToday.length} </span>
                                    </span>
                                </div>
                            </div>
                            <div className="card-body p-0">
                                <div className="table-responsive" style={{ maxHeight: "500px", overflowY: "auto" }}>
                                    <table className="table table-hover mb-0">
                                        <tbody>
                                            {mockupsUploadedToday.length > 0 ? (
                                                mockupsUploadedToday.map((ticket) => (
                                                    <tr
                                                        key={ticket.id}
                                                        className="cursor-pointer hover:bg-gray-50"
                                                        onClick={() => handleViewTicket(ticket)}
                                                    >
                                                        <td>
                                                            <div className="d-flex flex-column">
                                                                <strong className="text-primary">
                                                                    #{ticket.ticket_number}
                                                                </strong>
                                                                <small className="text-muted">
                                                                    {ticket.customer?.name || "Unknown"}
                                                                </small>
                                                                <small className="text-muted mt-1">
                                                                    {ticket.description?.substring(0, 50)}
                                                                    {ticket.description?.length > 50 ? "..." : ""}
                                                                </small>
                                                                <small className="text-info mt-1">
                                                                    <i className="ti-time mr-1"></i>
                                                                    {formatDate(ticket.updated_at)}
                                                                </small>
                                                            </div>
                                                        </td>
                                                        <td className="text-right">
                                                            {ticket.mockup_files && ticket.mockup_files.length > 0 && (
                                                                <div className="d-flex flex-column align-items-end">
                                                                    <span className="badge badge-success mb-1">
                                                                        <i className="ti-check mr-1"></i>
                                                                        Uploaded
                                                                    </span>
                                                                    <span className="badge badge-info">
                                                                        <i className="ti-file mr-1"></i>
                                                                        {ticket.mockup_files.length} file{ticket.mockup_files.length > 1 ? "s" : ""}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td className="text-center text-gray-400 py-4">
                                                        <i className="ti-upload" style={{ fontSize: "32px" }}></i>
                                                        <p className="mt-2 mb-0">No Mock-Ups Uploaded Today</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </AdminLayout>
    );
}
