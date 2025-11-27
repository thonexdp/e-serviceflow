import React, { useState, useEffect } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Modal from "@/Components/Main/Modal";
import DataTable from "@/Components/Common/DataTable";
import SearchBox from "@/Components/Common/SearchBox";
import FlashMessage from "@/Components/Common/FlashMessage";
import FormInput from "@/Components/Common/FormInput";
import { useRoleApi } from "@/Hooks/useRoleApi";

export default function Mockups({
    user = {},
    notifications = [],
    messages = [],
    tickets = { data: [] },
    filters = {},
}) {
    const [openReviewModal, setReviewModalOpen] = useState(false);
    const [openUploadModal, setUploadModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [uploadFiles, setUploadFiles] = useState([]);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const { flash } = usePage().props;
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
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        setUploadFiles(files);
    };

    const handleApprove = () => {
        if (!selectedTicket) return;

        setLoading(true);
        router.post(buildUrl(`/mock-ups/${selectedTicket.id}/approve`), {
            notes: notes,
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
        });
    };

    const handleRequestRevision = () => {
        if (!selectedTicket || !notes.trim()) {
            alert("Please provide notes for the revision request.");
            return;
        }

        setLoading(true);
        router.post(buildUrl(`/mock-ups/${selectedTicket.id}/revision`), {
            notes: notes,
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
        });
    };

    const handleDownload = (fileId, filename) => {
        window.open(buildUrl(`/mock-ups/files/${fileId}/download`), '_blank');
    };

    const handlePreview = (filepath) => {
        const imageUrl = `/storage/${filepath}`;
        setSelectedImage(imageUrl);
    };

    const getDesignStatusBadge = (status) => {
        const classes = {
            pending: "badge-warning",
            in_review: "badge-info",
            revision_requested: "badge-danger",
            approved: "badge-success",
            mockup_uploaded: "badge-primary",
        };
        const labels = {
            pending: "Pending Review",
            in_review: "In Review",
            revision_requested: "Revision Requested",
            approved: "Approved",
            mockup_uploaded: "Mock-up Uploaded",
        };
        return (
            <div className={`badge ${classes[status] || "badge-secondary"}`}>
                {labels[status] || status?.toUpperCase() || "PENDING"}
            </div>
        );
    };

    const getActionButton = (ticket) => {
        if (ticket.design_status === "pending" || ticket.design_status === "revision_requested") {
            return (
                <button
                    type="button"
                    className="btn btn-link btn-outline btn-sm text-blue-500"
                    onClick={() => handleUpload(ticket)}
                >
                    <i className="ti-upload"></i> Upload Mock-up
                </button>
            );
        } else if (ticket.design_status === "mockup_uploaded") {
            return (
                <button
                    type="button"
                    className="btn btn-link btn-outline btn-sm text-green-500"
                    onClick={() => handleReview(ticket)}
                >
                    <i className="ti-eye"></i> Review
                </button>
            );
        } else {
            return (
                <button
                    type="button"
                    className="btn btn-link btn-outline btn-sm text-blue-500"
                    onClick={() => handleReview(ticket)}
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
        {
            label: "Customer",
            key: "customer",
            render: (row) =>
                row.customer
                    ? `${row.customer.firstname} ${row.customer.lastname}`
                    : "N/A",
        },
        { label: "Description", key: "description" },
        {
            label: "Design Status",
            key: "design_status",
            render: (row) => getDesignStatusBadge(row.design_status),
        },
        {
            label: "Action",
            key: "action",
            render: (row) => getActionButton(row),
        },
    ];

    const customerFiles = selectedTicket?.files?.filter(f => f.type === 'customer') || [];
    const mockupFiles = selectedTicket?.files?.filter(f => f.type === 'mockup') || [];

    return (
        <AdminLayout
            user={user}
            notifications={notifications}
            messages={messages}
        >
            <Head title="Mock-ups" />

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
                size="6xl"
            >
                {selectedTicket && (
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
                                <p className="text-muted">
                                    Status: {getDesignStatusBadge(selectedTicket.design_status)}
                                </p>
                            </div>

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
                                            {customerFiles.length > 0 ? (
                                                customerFiles.map((file) => (
                                                    <tr key={file.id}>
                                                        <td>{file.filename}</td>
                                                        <td>{new Date(file.created_at).toLocaleDateString()}</td>
                                                        <td>
                                                            <div className="btn-group">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-link btn-sm text-blue-500"
                                                                    onClick={() => handleDownload(file.id, file.filename)}
                                                                >
                                                                    <i className="ti-download"></i> Download
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-link btn-sm text-green-500"
                                                                    onClick={() => handlePreview(file.filepath)}
                                                                >
                                                                    <i className="ti-eye"></i> Preview
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="3" className="text-center text-muted">No customer files</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {mockupFiles.length > 0 && (
                                <>
                                    <hr className="my-3" />
                                    <div className="mb-4">
                                        <h6>Mock-up Files:</h6>
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
                                                            <td>{file.filename}</td>
                                                            <td>{new Date(file.created_at).toLocaleDateString()}</td>
                                                            <td>
                                                                <div className="btn-group">
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-link btn-sm text-blue-500"
                                                                        onClick={() => handleDownload(file.id, file.filename)}
                                                                    >
                                                                        <i className="ti-download"></i> Download
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-link btn-sm text-green-500"
                                                                        onClick={() => handlePreview(file.filepath)}
                                                                    >
                                                                        <i className="ti-eye"></i> Preview
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}

                            <hr className="my-3" />

                            <div className="mb-4">
                                <FormInput
                                    label="Notes"
                                    type="textarea"
                                    name="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add notes..."
                                    rows={3}
                                />
                            </div>

                            <div className="d-flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={handleApprove}
                                    disabled={loading || selectedTicket.design_status === 'approved'}
                                >
                                    <i className="ti-check"></i> Approve
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-warning"
                                    onClick={handleRequestRevision}
                                    disabled={loading}
                                >
                                    <i className="ti-reload"></i> Request Revision
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleCloseModals}
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        {/* Right Side - Image Preview */}
                        <div className="col-md-5">
                            <div className="sticky-top" style={{ top: '20px' }}>
                                <h6 className="mb-3">Image Preview</h6>
                                {selectedImage ? (
                                    <div className="border rounded p-2 bg-light">
                                        <img
                                            src={selectedImage}
                                            alt="Preview"
                                            className="img-fluid rounded"
                                            style={{ maxHeight: '500px', width: '100%', objectFit: 'contain' }}
                                        />
                                    </div>
                                ) : (
                                    <div className="border rounded p-5 text-center text-muted bg-light" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div>
                                            <i className="ti-image" style={{ fontSize: '48px' }}></i>
                                            <p className="mt-3">Click "Preview" on any file to view it here</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Upload Modal */}
            <Modal
                title={`Upload Mock-up - Ticket #${selectedTicket?.ticket_number}`}
                isOpen={openUploadModal}
                onClose={handleCloseModals}
                size="6xl"
            >
                {selectedTicket && (
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
                            </div>

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
                                            {customerFiles.length > 0 ? (
                                                customerFiles.map((file) => (
                                                    <tr key={file.id}>
                                                        <td>{file.filename}</td>
                                                        <td>{new Date(file.created_at).toLocaleDateString()}</td>
                                                        <td>
                                                            <div className="btn-group">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-link btn-sm text-blue-500"
                                                                    onClick={() => handleDownload(file.id, file.filename)}
                                                                >
                                                                    <i className="ti-download"></i> Download
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-link btn-sm text-green-500"
                                                                    onClick={() => handlePreview(file.filepath)}
                                                                >
                                                                    <i className="ti-eye"></i> Preview
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="3" className="text-center text-muted">No customer files</td>
                                                </tr>
                                            )}
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
                                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                                        >
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <svg
                                                    className="w-8 h-8 mb-3 text-gray-400"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                                    />
                                                </svg>
                                                <p className="mb-2 text-sm text-gray-500">
                                                    <span className="font-semibold">Click to upload Design</span> or drag and drop
                                                </p>
                                                <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                                            </div>
                                            <input
                                                id="dropzone-file"
                                                type="file"
                                                className="hidden"
                                                multiple
                                                accept="image/*,.pdf"
                                                onChange={handleFileSelect}
                                            />
                                        </label>
                                    </div>
                                    {uploadFiles.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-sm font-semibold">Selected Files:</p>
                                            <ul className="list-group">
                                                {uploadFiles.map((file, index) => (
                                                    <li key={index} className="list-group-item">
                                                        {file.name} ({(file.size / 1024).toFixed(2)} KB)
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
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
                                    rows={3}
                                />
                            </div>

                            <div className="d-flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleUploadMockup}
                                    disabled={loading || uploadFiles.length === 0}
                                >
                                    <i className="ti-upload"></i> Upload & Send for Approval
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleCloseModals}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>

                        {/* Right Side - Image Preview */}
                        <div className="col-md-5">
                            <div className="sticky-top" style={{ top: '20px' }}>
                                <h6 className="mb-3">Image Preview</h6>
                                {selectedImage ? (
                                    <div className="border rounded p-2 bg-light">
                                        <img
                                            src={selectedImage}
                                            alt="Preview"
                                            className="img-fluid rounded"
                                            style={{ maxHeight: '500px', width: '100%', objectFit: 'contain' }}
                                        />
                                    </div>
                                ) : (
                                    <div className="border rounded p-5 text-center text-muted bg-light" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div>
                                            <i className="ti-image" style={{ fontSize: '48px' }}></i>
                                            <p className="mt-3">Click "Preview" on any file to view it here</p>
                                        </div>
                                    </div>
                                )}
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
                                                <div className="col-md-5">
                                                    <SearchBox
                                                        placeholder="Search tickets..."
                                                        initialValue={filters.search || ""}
                                                        route="/mock-ups"
                                                    />
                                                </div>
                                                <div className="col-md-4">
                                                    <FormInput
                                                        label=""
                                                        type="select"
                                                        name="design_status"
                                                        value={filters.design_status || "all"}
                                                        onChange={(e) => {
                                                            router.get(buildUrl("/mock-ups"), {
                                                                ...filters,
                                                                design_status: e.target.value === "all" ? null : e.target.value
                                                            }, {
                                                                preserveState: false,
                                                                preserveScroll: true,
                                                            });
                                                        }}
                                                        options={[
                                                            { value: "all", label: "All Status" },
                                                            { value: "pending", label: "Pending Review" },
                                                            { value: "in_review", label: "In Review" },
                                                            { value: "revision_requested", label: "Revision Requested" },
                                                            { value: "approved", label: "Approved" },
                                                            { value: "mockup_uploaded", label: "Mock-up Uploaded" },
                                                        ]}
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-4">
                                                <DataTable
                                                    columns={ticketColumns}
                                                    data={tickets.data}
                                                    pagination={tickets}
                                                    emptyMessage="No tickets found."
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
