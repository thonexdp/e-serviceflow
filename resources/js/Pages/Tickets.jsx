
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Modal from "@/Components/Main/Modal";
import CustomerForm from "@/Components/Customers/CustomerForm";
import TicketForm from "@/Components/Tickets/TicketForm";
import DataTable from "@/Components/Common/DataTable";
import FlashMessage from "@/Components/Common/FlashMessage";
import CustomerSearchBox from "@/Components/Common/CustomerSearchBox";
import DateRangeFilter from "@/Components/Common/DateRangeFilter";
import axios from "axios";
import { toast } from "react-hot-toast";
import PreviewModal from "@/Components/Main/PreviewModal";
import DeletionConfirmationModal from "@/Components/Common/DeletionConfirmationModal";
import { formatPeso } from "@/Utils/currency";
import { getColorName, getFullColorName } from "@/Utils/colors";
import { useRoleApi } from "@/Hooks/useRoleApi";
import Quotation from "@/Components/Tickets/Quotation";

export default function Tickets({
  user = {},
  notifications = [],
  messages = [],
  customers = { data: [] },
  tickets = { data: [] },
  selectedCustomer = null,
  filters = {},
  branches = [],
  customer_order_qrcode = "",
  jobCategories = []
}) {
  const [openCustomerModal, setCustomerModalOpen] = useState(false);
  const [openTicketModal, setTicketModalOpen] = useState(false);
  const [openStatusModal, setStatusModalOpen] = useState(false);
  const [openPaymentModal, setPaymentModalOpen] = useState(false);
  const [openVerifyModal, setVerifyModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editingTicket, setEditingTicket] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [_selectedCustomer, setSelectedCustomer] = useState(selectedCustomer);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedID, setSelectedID] = useState(null);
  const [openDeleteModal, setDeleteModalOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const { api, buildUrl } = useRoleApi();
  const { flash, auth } = usePage().props;
  const [error, setError] = useState(null);
  const [statusUpdateError, setStatusUpdateError] = useState("");
  const [verifyFormData, setVerifyFormData] = useState({
    notes: ""
  });
  const [revisionNotes, setRevisionNotes] = useState("");
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [verifyErrors, setVerifyErrors] = useState({});

  const [openQuotationModal, setQuotationModalOpen] = useState(false);
  const [quotationToPrint, setQuotationToPrint] = useState(null);
  const [quotationForm, setQuotationForm] = useState({
    name: "",
    companyName: "",
    address: "",
    validUntil: "",
    quotationNo: "",
    projectDescription: "",
    valueAddedTax: "0",
    others: "0",
    date: new Date().toISOString().slice(0, 10)
  });


  useEffect(() => {
    setSelectedCustomer(selectedCustomer);
  }, [selectedCustomer]);

  const [localSearch, setLocalSearch] = useState(filters.search || "");

  useEffect(() => {
    setLocalSearch(filters.search || "");
  }, [filters.search]);

  const handleFilterChange = (key, value) => {
    const newFilters = {
      search: filters.search,
      status: filters.status,
      payment_status: filters.payment_status,
      customer_id: _selectedCustomer?.id,
      branch_id: filters.branch_id,
      order_by: filters.order_by || 'due_date',
      order_dir: filters.order_dir || 'asc',
      [key]: value
    };


    Object.keys(newFilters).forEach((k) => {
      if (newFilters[k] === '' || newFilters[k] === null || newFilters[k] === undefined) {
        delete newFilters[k];
      }
    });

    router.get(buildUrl("tickets"), newFilters, {
      preserveState: true,
      preserveScroll: true,
      replace: true
    });
  };


  const [show, setShow] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [filepath, setFilepath] = useState("");

  const [statusFormData, setStatusFormData] = useState({
    status: "",
    notes: ""
  });

  const [paymentFormData, setPaymentFormData] = useState({
    ticket_id: null,
    amount: "",
    payment_method: "cash",
    payment_date: new Date().toISOString().slice(0, 10),
    allocation: "downpayment",
    official_receipt_number: "",
    payment_reference: "",
    notes: "",
    attachments: []
  });


  const hasPermission = (module, feature) => {
    if (auth.user.role === 'admin') return true;
    return auth.user.permissions && auth.user.permissions.includes(`${module}.${feature}`);
  };


  const handleCustomerSubmit = async (formData) => {
    
    try {
      const { data } = await api.post(`/customers`, formData);

      if (data.success) {
        setSelectedCustomer({
          ...data?.customer,
          full_name: `${data?.customer?.firstname} ${data?.customer?.lastname}`
        });
      }
      setCustomerModalOpen(false);
    } catch (error) {
      console.error("Add failed:", error, error.response?.data);
    } finally {
      setCustomerModalOpen(false);
    }
  };

  const handleTicketSubmit = (data) => {
    console.log(data);
    const formData = new FormData();
    const arrayKeyMap = {
      ticketAttachments: "attachments[]",
      paymentProofs: "payment_proofs[]"
    };

    Object.entries(data).forEach(([key, value]) => {
      if (key === "file" && value) {
        formData.append("file", value);
        return;
      }

      if (arrayKeyMap[key] && Array.isArray(value)) {
        value.forEach((file) => {
          if (file instanceof File) {
            formData.append(arrayKeyMap[key], file);
          }
        });
        return;
      }

      if (value instanceof File) {
        formData.append(key, value);
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (entry !== null && entry !== "") {
            formData.append(`${key}[]`, entry);
          }
        });
        return;
      }

      if (value !== null && value !== "") {
        formData.append(key, value);
      }
    });

    if (editingTicket) {
      formData.append("_method", "PUT");
      router.post(buildUrl(`tickets/${editingTicket.id}`), formData, {
        onSuccess: () => {
          setTicketModalOpen(false);
          setEditingTicket(null);
        },
        preserveScroll: true
      });
    } else {
      router.post(buildUrl("tickets"), formData, {
        onSuccess: () => {
          setTicketModalOpen(false);
        },
        preserveScroll: true
      });
    }
  };


  const handleOpenStatusModal = (ticket) => {
    setSelectedTicket(ticket);
    setStatusUpdateError("");
    setStatusFormData({
      status: ticket.status || "pending",
      notes: ""
    });
    setStatusModalOpen(true);
  };

  const getAllTicketFiles = (ticket) => {
    if (!ticket) return [];
    const customerFiles = (ticket.customer_files || []).map(f => ({ ...f, type: 'customer' }));
    const mockupFiles = (ticket.mockup_files || []).map(f => ({ ...f, type: 'mockup' }));
    const paymentFiles = (ticket.payments || []).flatMap(p => (p.documents || []).map(d => ({ ...d, file_path: d.file_path, file_name: d.file_name, type: 'payment' })));
    return [...customerFiles, ...mockupFiles, ...paymentFiles];
  };

  const handlePreviewFile = (ticket, path) => {
    // console.log(ticket, path);
    // setSelectedTicket(ticket);
    setFilepath(path);
    setShowPreview(true);
    setRevisionNotes("");
    setShowRevisionInput(false);
  };

  const handleNextFile = () => {
    const allFiles = getAllTicketFiles(selectedTicket);
    const currentIndex = allFiles.findIndex(f => f.file_path === filepath);
    if (currentIndex !== -1 && currentIndex < allFiles.length - 1) {
      setFilepath(allFiles[currentIndex + 1].file_path);
    }
  };

  const handlePrevFile = () => {
    const allFiles = getAllTicketFiles(selectedTicket);
    const currentIndex = allFiles.findIndex(f => f.file_path === filepath);
    if (currentIndex !== -1 && currentIndex > 0) {
      setFilepath(allFiles[currentIndex - 1].file_path);
    }
  };



  const handleOpenPaymentModal = (ticket) => {
    console.log('📊 Ticket Payment Data:', {
      ticket_number: ticket.ticket_number,
      total_amount: ticket.total_amount,
      subtotal: ticket.subtotal,
      original_price: ticket.original_price,
      discount: ticket.discount,
      discount_percentage: ticket.discount_percentage,
      discount_amount: ticket.discount_amount
    });
    setSelectedTicket(ticket);
    setPaymentFormData({
      ticket_id: ticket.id,
      amount: "",
      payment_method: "cash",
      payment_date: new Date().toISOString().slice(0, 10),
      allocation:
        ticket.payments && ticket.payments.length > 0 ?
          "balance" :
          "downpayment",
      official_receipt_number: "",
      payment_reference: "",
      notes: "",
      attachments: []
    });
    setPaymentModalOpen(true);
  };


  const handleStatusUpdate = async () => {
    if (!selectedTicket) return;

    // Check if workflow steps are missing when changing to "In Designer"
    // Only check for custom tickets (job_type_id is null) or "Others" category tickets
    if (statusFormData.status === 'in_designer') {
      // Determine if this is a custom/others ticket
      const isCustomTicket = !selectedTicket.job_type_id || 
        selectedTicket.custom_job_type_description ||
        (typeof selectedTicket.job_type === 'string' && selectedTicket.job_type);
      
      // Only validate workflow steps for custom tickets
      if (isCustomTicket) {
        const hasWorkflowSteps = selectedTicket.custom_workflow_steps && 
          (Array.isArray(selectedTicket.custom_workflow_steps) 
            ? selectedTicket.custom_workflow_steps.length > 0 
            : (typeof selectedTicket.custom_workflow_steps === 'object' 
                ? Object.keys(selectedTicket.custom_workflow_steps).length > 0 
                : false));
        
        if (!hasWorkflowSteps) {
          setStatusUpdateError("Please set the Production Workflow Template first by editing the ticket.");
          return;
        }
      }
    }

    setIsUpdating(true);
    try {
      await api.patch(
        `/tickets/${selectedTicket.id}/update-status`,
        statusFormData
      );

      setStatusModalOpen(false);
      setSelectedTicket(null);
      router.reload({ preserveScroll: true });
    } catch (error) {
      console.error("Status update failed:", error);
      setStatusUpdateError(error.response?.data?.message || "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };


  const handlePaymentUpdate = async () => {
    setError("");
    if (!selectedTicket) return;

    if (!paymentFormData.amount) {
      setError("Please enter the payment amount.");
      return;
    }
    const formData = new FormData();
    formData.append("ticket_id", selectedTicket.id);
    formData.append("payment_method", paymentFormData.payment_method);
    formData.append("payment_date", paymentFormData.payment_date);
    formData.append("amount", paymentFormData.amount);
    if (paymentFormData.allocation) {
      formData.append("allocation", paymentFormData.allocation);
    }
    if (paymentFormData.official_receipt_number) {
      formData.append(
        "official_receipt_number",
        paymentFormData.official_receipt_number
      );
    }
    if (paymentFormData.payment_reference) {
      formData.append("payment_reference", paymentFormData.payment_reference);
    }
    if (paymentFormData.notes) {
      formData.append("notes", paymentFormData.notes);
    }
    formData.append("payment_type", "collection");

    paymentFormData.attachments.forEach((file) => {
      formData.append("attachments[]", file);
    });

    setIsUpdating(true);
    try {
      await api.post("/payments", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setPaymentModalOpen(false);
      setSelectedTicket(null);
      router.reload({ preserveScroll: true });
    } catch (error) {
      console.error("Payment update failed:", error);
      toast.error(error.response?.data?.message || "Failed to record payment.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setCustomerModalOpen(true);
  };

  const handleEditTicket = (ticket) => {

    console.log(ticket);
    setSelectedCustomer(ticket?.customer);
    setEditingTicket(ticket);
    setTicketModalOpen(true);
  };

  const handleConfirmDeleteTicket = () => {
    if (!selectedID) return;
    router.delete(buildUrl(`tickets/${selectedID}`), {
      preserveScroll: true,
      preserveState: false,

      onBefore: () => {
        setLoading(true);
      },
      onSuccess: () => {
        handleCloseModal();
        setLoading(false);
        toast.success(" Ticket deleted successfully.");
      },
      onError: (errors) => {
        setLoading(false);
        toast.error("Failed to delete ticket. Please try again.");
      },


      onFinish: () => {
        setLoading(false);
      }
    });
  };

  const handleCloseModal = () => {
    setDeleteModalOpen(false);
    setTicketToDelete(null);
    setSelectedID(null);
    setCustomerModalOpen(false);
    setEditingCustomer(null);
  };

  const handleDeleteTicket = (ticketId) => {
    const ticket = tickets.data.find(t => t.id === ticketId);
    setTicketToDelete(ticket);
    setSelectedID(ticketId);
    setDeleteModalOpen(true);
  };

  const closeCustomerModal = () => {
    setCustomerModalOpen(false);
    setEditingCustomer(null);
  };

  const closeTicketModal = () => {
    setTicketModalOpen(false);
    setEditingTicket(null);
  };

  const closeStatusModal = () => {
    setStatusModalOpen(false);
    setSelectedTicket(null);
    setStatusFormData({ status: "", notes: "" });
    setStatusUpdateError("");
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setSelectedTicket(null);
    setPaymentFormData({
      ticket_id: null,
      amount: "",
      payment_method: "cash",
      payment_date: new Date().toISOString().slice(0, 10),
      allocation: "downpayment",
      official_receipt_number: "",
      payment_reference: "",
      notes: "",
      attachments: []
    });
  };

  const handleOpenVerifyModal = (ticket) => {
    setSelectedTicket(ticket);
    setVerifyFormData({
      notes: "",
      total_amount: ticket.total_amount || ""
    });
    setVerifyErrors({});
    setVerifyModalOpen(true);
  };

  const closeVerifyModal = () => {
    setVerifyModalOpen(false);
    setSelectedTicket(null);
    setVerifyErrors({});
    setVerifyFormData({ notes: "" });
  };

  const handleVerifyPayment = async () => {
    setIsUpdating(true);
    setVerifyErrors({});

    // Validate that custom orders have a price set
    const errors = {};
    if (selectedTicket && (!selectedTicket.job_type_id || selectedTicket.custom_job_type_description)) {
      if (!verifyFormData.total_amount || parseFloat(verifyFormData.total_amount) <= 0) {
        errors.total_amount = "Please enter the total price for this custom order before confirming.";
        setVerifyErrors(errors);
        setIsUpdating(false);
        return;
      }
    }

    try {
      await api.patch(`/tickets/${selectedTicket.id}/verify-payment`, verifyFormData);

      closeVerifyModal();
      router.reload({ preserveScroll: true });
    } catch (error) {
      console.error("Verification failed", error);
      const errorMessage = error.response?.data?.message || "Failed to verify payment. Please check your data.";
      setVerifyErrors({ general: errorMessage });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleApproveDesign = () => {
    if (!selectedTicket) return;
    setLoading(true);
    router.post(buildUrl(`/mock-ups/${selectedTicket.id}/approve`), {
      notes: ""
    }, {
      onSuccess: () => {
        setShow(false);
        setLoading(false);
      },
      onFinish: () => setLoading(false)
    });
  };

  const handleRequestRevisionDesign = () => {
    if (!selectedTicket || !revisionNotes.trim()) {
      toast.error("Please provide notes for the revision request.");
      return;
    }
    setLoading(true);
    router.post(buildUrl(`/mock-ups/${selectedTicket.id}/revision`), {
      notes: revisionNotes
    }, {
      onSuccess: () => {
        setShow(false);
        setLoading(false);
      },
      onFinish: () => setLoading(false)
    });
  };

  const getStatusBadge = (status) => {
    const classes = {
      pending: "badge-warning",
      in_designer: "badge-info",
      in_production: "badge-primary",
      completed: "badge-success",
      rejected: "badge-danger",
      cancelled: "badge-danger",
      ready_to_print: "badge-pink",
    };
    return (
      <div className={`badge ${classes[status] || "badge-secondary"}`}>
        {status?.replace("_", " ").toUpperCase() || "PENDING"}
      </div>
    );
  };

  const shouldShowDeleteButtonInDataTable = (row) => {
    if (row?.role === 'admin') return false;
    const isAdmin = auth.user.role === 'admin' || auth.user.roles?.some(r => r.name === 'admin');
    const inProgressStatuses = ['in_designer', 'ready_to_print', 'in_production', 'pending'];
    if (row.status && inProgressStatuses.includes(row.status)) {
      return isAdmin;
    }
    if (row.status === 'completed') return false;
    return true;
  };

  const handleOpenQuotationModal = (ticket) => {
    setSelectedTicket(ticket);
    setQuotationForm({
      name: ticket.customer ? `${ticket.customer.firstname} ${ticket.customer.lastname}` : "",
      companyName: ticket.customer?.company_name || "",
      address: ticket.customer?.address || "",
      validUntil: "",
      projectDescription: ticket.description || "",
      valueAddedTax: "0",
      others: "0",
      date: new Date().toISOString().slice(0, 10),
    });
    setQuotationModalOpen(true);
  };

  const handlePrintQuotation = () => {
    setQuotationToPrint({
      ticket: selectedTicket,
      customData: quotationForm,
    });
    setQuotationModalOpen(false);

    document.body.classList.add("printing-quotation");

    setTimeout(() => {
      window.print();
      document.body.classList.remove("printing-quotation");
      setQuotationToPrint(null);
    }, 500);
  };

  const getPaymentStatusBadge = (row) => {
    const { payment_status: status, payment_method } = row;
    const classes = {
      pending: "badge-warning",
      partial: "badge-info",
      paid: "badge-success",
      awaiting_verification: "badge-secondary"
    };

    if (status === 'awaiting_verification') {
      const isWalkin = payment_method === 'cash' || payment_method === 'walkin';
      return (
        <div className={`badge ${isWalkin ? "badge-dark" : "badge-secondary"}`}>
          {isWalkin ? 'WALK-IN ORDER' : 'AWAITING VERIFICATION'}
        </div>);

    }

    return (
      <div className={`badge ${classes[status] || "badge-secondary"}`}>
        {status?.toUpperCase() || "PENDING"}
      </div>);

  };

  const ticketColumns = [
    {
      label: "#",
      key: "index",
      render: (row, index) =>
        (tickets.current_page - 1) * tickets.per_page + index + 1
    },
    {
      label: "Design",
      key: "mockup_files",
      render: (row) => {
        const mockupFiles = row.mockup_files || [];
        const customerFiles = row.customer_files || [];

        const latestMockup = mockupFiles.length > 0 ? mockupFiles[mockupFiles.length - 1] : null;
        const latestCustomerFile = customerFiles.length > 0 ? customerFiles[customerFiles.length - 1] : null;

        const displayFile = latestMockup || latestCustomerFile;
        const isApproved = row.design_status === 'approved';
        const isMockup = !!latestMockup;

        if (!displayFile) {
          return (
            <div className="text-center">
              <span className="badge badge-pill badge-light text-muted" style={{ fontSize: '9px' }}>
                NO DESIGN
              </span>
            </div>);

        }

        return (
          <div className="text-center">
            <div
              className="position-relative d-inline-block p-1 border rounded bg-white shadow-sm"
              style={{ cursor: 'pointer' }}
              onClick={() => handlePreviewFile(row, displayFile.file_path)}>

              <img
                src={displayFile.file_path}
                alt="Design"
                style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '4px' }} />

              <div className="position-absolute" style={{ top: '-6px', right: '-6px' }}>
                {isMockup ?
                  isApproved ?
                    <span className="badge badge-success border border-white shadow-sm" style={{ borderRadius: '50%', padding: '2px 4px' }} title="Approved Mockup">
                      <i className="ti-check" style={{ fontSize: '8px' }}></i>
                    </span> :

                    <span className="badge badge-warning border border-white shadow-sm" style={{ borderRadius: '50%', padding: '2px 4px' }} title="Pending Mockup">
                      <i className="ti-timer" style={{ fontSize: '8px' }}></i>
                    </span> :


                  <span className="badge badge-secondary border border-white shadow-sm" style={{ borderRadius: '50%', padding: '2px 4px' }} title="Customer Attachment">
                    <i className="ti-clip" style={{ fontSize: '8px' }}></i>
                  </span>
                }
              </div>
            </div>
          </div>);

      }
    },
    {
      label: "Ticket ID",
      key: "ticket_number",
      render: (row) =>
        <div>
          <div className="font-weight-bold">{row.ticket_number}</div>
          <span className="text-xs">
            {
              row.job_type?.name && (
                <i className="text-xs">
                  Type: {row.job_type?.name}
                </i>
              )
            }
          </span>
          {row.selected_color && (
            <div className="d-flex align-items-center mt-1">
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


          {row.payments?.some((p) => p.status === 'rejected') &&
            <div className="text-danger font-bold text-[9px] uppercase">
              <i className="ti-alert mr-1"></i> Bounced Payment
            </div>
          }
        </div>

    },
    {
      label: "Customer",
      key: "customer",
      render: (row) =>
        row.customer ?
          `${row.customer.firstname} ${row.customer.lastname}` :
          "N/A"
    },
    ...(auth.user.role === 'admin' ? [{
      label: "Branch",
      key: "order_branch",
      render: (row) => row.order_branch?.name || "N/A"
    }] : []),
    { label: "Description", key: "description" },
    {
      label: "Qty",
      key: "quantity",
      render: (row) =>
        <div>
          {row.quantity} Pcs
          {row.free_quantity > 0 &&
            <div className="text-success small">
              <i className="ti-gift mr-1"></i>
              + {row.free_quantity} Free
            </div>
          }
        </div>

    },
    {
      label: "Due Date",
      key: "due_date",
      render: (row) =>
        row.due_date ?
          new Date(row.due_date).toLocaleDateString() :
          "N/A"
    },
    {
      label: "Payment Status",
      key: "payment_status",
      render: (row) =>
        <div className="d-flex align-items-center">
          {getPaymentStatusBadge(row)}
          {row.payment_status === 'awaiting_verification' &&
            <button
              onClick={() => handleOpenVerifyModal(row)}
              className="btn btn-sm btn-success ml-1"
              style={{ padding: "2px 8px", fontSize: "11px" }}
              title="Verify Payment">

              <i className="ti-check-box"></i> Verify
            </button>
          }
          <button
            onClick={() => handleOpenPaymentModal(row)}
            className="btn btn-sm btn-outline-primary ml-1"
            style={{ padding: "2px 8px", fontSize: "11px" }}
            title="View Payment History">

            <i className="ti-eye"></i>
          </button>
        </div>

    },
    {
      label: "Status",
      key: "status",
      render: (row) =>
        <div>
          {getStatusBadge(row.status)}

          {row.status !== "completed" &&
            row.status !== "cancelled" &&
            <button
              onClick={() => handleOpenStatusModal(row)}
              className="btn btn-sm btn-outline-primary ml-1"
              style={{ padding: "2px 8px", fontSize: "11px" }}
              title="Update Status">

              <i className="ti-pencil"></i>
            </button>
          }

          {row.current_workflow_step && row.status !== "completed" &&
            <div className="text-secondary small">
              <i className="ti-time mr-1"></i>
              <i>{row.current_workflow_step}</i>
            </div>
          }

        </div>

    }];

  return (
    <>



       <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Payment Proof"
        size="5xl">

           <div className="row">
            <div className="col-md-12">
              <div className="border rounded p-2 shadow-sm text-center position-relative" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={filepath}
                  alt="Payment Proof"
                  className="img-fluid"
                  style={{ maxHeight: '75vh', maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>
            </div>
            <div className="pt-3 text-left">
                  <button
                    type="button"
                    className="btn btn-secondary btn-block py-2"
                    onClick={() => setShowPreview(false)}>
                    Close Preview
                  </button>
                </div>
          </div>
        </Modal>

    




      <Modal
        isOpen={show}
        onClose={() => setShow(false)}
        title={`Preview - ${selectedTicket?.ticket_number || 'Details'}`}
        size="6xl">
        {selectedTicket && (
          <div className="row">
            <div className="col-md-7">
              <div className="border rounded p-2 bg-dark shadow-sm mockup-preview-container text-center position-relative" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={filepath}
                  alt="Design Preview"
                  className="img-fluid"
                  style={{ maxHeight: '75vh', maxWidth: '100%', objectFit: 'contain' }}
                />

                {/* Navigation Controls */}
                {getAllTicketFiles(selectedTicket).length > 1 && (
                  <>
                    <button
                      onClick={handlePrevFile}
                      disabled={getAllTicketFiles(selectedTicket).findIndex(f => f.file_path === filepath) === 0}
                      className="btn btn-dark btn-circle position-absolute"
                      style={{ left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.7, zIndex: 10 }}
                    >
                      <i className="ti-angle-left"></i>
                    </button>
                    <button
                      onClick={handleNextFile}
                      disabled={getAllTicketFiles(selectedTicket).findIndex(f => f.file_path === filepath) === getAllTicketFiles(selectedTicket).length - 1}
                      className="btn btn-dark btn-circle position-absolute"
                      style={{ right: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.7, zIndex: 10 }}
                    >
                      <i className="ti-angle-right"></i>
                    </button>

                    <div className="position-absolute" style={{ bottom: '20px', left: '50%', transform: 'translateX(-50%)' }}>
                      <span className="badge badge-dark opacity-75 px-3 py-2">
                        {getAllTicketFiles(selectedTicket).findIndex(f => f.file_path === filepath) + 1} / {getAllTicketFiles(selectedTicket).length}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails row */}
              {getAllTicketFiles(selectedTicket).length > 1 && (
                <div className="mt-3 d-flex gap-2 overflow-x-auto pb-2 justify-content-center">
                  {getAllTicketFiles(selectedTicket).map((file, idx) => (
                    <img
                      key={idx}
                      src={file.file_path}
                      alt={`Thumb ${idx}`}
                      className={`img-thumbnail cursor-pointer ${filepath === file.file_path ? 'border-primary ring-2 ring-primary' : 'opacity-50'}`}
                      style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                      onClick={() => setFilepath(file.file_path)}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="col-md-5 border-left">
              <div className="p-3">
                {selectedTicket.design_description && (
                  <div className="mb-4">
                    <p className="mb-2 text-primary small uppercase font-weight-bold">Design Description / Elaboration</p>
                    <div
                      className="p-3 bg-light border rounded shadow-inner tiptap-content"
                      style={{ maxHeight: '350px', overflowY: 'auto' }}
                      dangerouslySetInnerHTML={{ __html: selectedTicket.design_description }}
                    />
                  </div>
                )}

                {selectedTicket.design_notes && (
                  <div className="alert alert-warning border small mb-3 shadow-sm">
                    <h6 className="font-weight-bold mb-1"><i className="ti-info-alt mr-1"></i> Developer/Designer Notes:</h6>
                    <p className="mb-0 italic text-dark font-weight-500">
                      "{selectedTicket.design_notes}"
                    </p>
                    {selectedTicket.updated_by_user && (
                      <div className="mt-1 x-small opacity-75 text-right">
                        — {selectedTicket.updated_by_user.name}
                      </div>
                    )}
                  </div>
                )}

                {selectedTicket.design_status === 'mockup_uploaded' && (
                  <div className="card border-primary-subtle bg-light shadow-inner mb-3">
                    <div className="card-body p-3">
                      <h6 className="mb-3 text-primary d-flex align-items-center">
                        <i className="ti-star mr-2"></i> Design Approval Workflow
                      </h6>

                      {showRevisionInput ? (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="form-group mb-2">
                            <textarea
                              className="form-control form-control-sm"
                              rows="3"
                              placeholder="Describe what needs to be changed..."
                              value={revisionNotes}
                              onChange={(e) => setRevisionNotes(e.target.value)}
                              autoFocus
                            />
                          </div>
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-warning btn-sm flex-grow-1"
                              onClick={handleRequestRevisionDesign}
                              disabled={loading || !revisionNotes.trim()}
                            >
                              <i className="ti-check mr-1"></i> Send Revision
                            </button>
                            <button
                              className="btn btn-light btn-sm"
                              onClick={() => setShowRevisionInput(false)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-success flex-grow-1 font-weight-bold shadow-sm"
                            onClick={handleApproveDesign}
                            disabled={loading}
                          >
                            <i className="ti-check mr-1"></i> APPROVE DESIGN
                          </button>
                          <button
                            className="btn btn-outline-warning btn-sm"
                            onClick={() => setShowRevisionInput(true)}
                            disabled={loading}
                          >
                            <i className="ti-reload mr-1"></i> Request Revision
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 border-top pt-3">
                  <button
                    type="button"
                    className="btn btn-secondary btn-block py-2"
                    onClick={() => setShow(false)}>
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Customer Modal */}
      <Modal
        title={editingCustomer ? "Edit Customer" : "Add Customer"}
        isOpen={openCustomerModal}
        onClose={closeCustomerModal}
        size="2xl"
        submitButtonText={null}>

        <CustomerForm
          jsonReturn={true}
          customer={editingCustomer}
          onSubmit={handleCustomerSubmit}
          onCancel={closeCustomerModal} />

      </Modal>

      {/* Ticket Modal */}
      <Modal
        title={`${editingTicket ? "Edit Ticket" : "Add Ticket"} - ${_selectedCustomer?.full_name}`
        }
        isOpen={openTicketModal}
        onClose={closeTicketModal}
        size="7xl"
        submitButtonText={null}
        staticBackdrop={true}>

        <TicketForm
          ticket={editingTicket}
          hasPermission={hasPermission}
          customerId={_selectedCustomer?.id}
          onSubmit={handleTicketSubmit}
          onCancel={closeTicketModal}
          branches={branches}
          jobCategories={jobCategories} />

      </Modal>

      {/* Deletion Confirmation Modal with Dependency Checking */}
      <DeletionConfirmationModal
        isOpen={openDeleteModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDeleteTicket}
        itemType="ticket"
        item={ticketToDelete}
        checkUrl={ticketToDelete ? buildUrl(`tickets/${ticketToDelete.id}/check-deletion`) : null}
        title="Delete Ticket"
      />
      <AdminLayout
        user={user}
        notifications={notifications}
        messages={messages}>

        <Head title="Tickets" />

        {/* Flash Messages */}
        {flash?.success &&
          <FlashMessage type="success" message={flash.success} />
        }
        {flash?.error &&
          <FlashMessage type="error" message={flash.error} />
        }

        <div className="row">

          <div className="col-lg-6 p-r-0 title-margin-right">
            <div className="page-header">
              <div className="page-title">
                <h1>
                  Tickets <span>Management</span>
                </h1>
              </div>
            </div>
          </div>
          <div className="col-lg-6 p-l-0 title-margin-left">
            <div className="page-header">
              <div className="page-title">
                <ol className="breadcrumb">
                  <li className="breadcrumb-item">
                    <a href="/dashboard">Dashboard</a>
                  </li>
                  <li className="breadcrumb-item active">
                    Tickets
                  </li>
                  {/* <li className="breadcrumb-item">
                       <a href="#" className="text-orange-500" onClick={() => {
                           router.get(buildUrl("tickets"));
                       }}>
                           <i className="ti-reload"></i> Refresh
                       </a>
                    </li> */}
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Status Update Modal */}
        <Modal
          title="Update Ticket Status"
          isOpen={openStatusModal}
          onClose={closeStatusModal}
          size="lg"
          submitButtonText={null}
          staticBackdrop={true}>

          <div className="modal-body">
            {selectedTicket &&
              <div className="mb-3">
                <div className="alert alert-info">
                  <strong>Ticket:</strong>{" "}
                  {selectedTicket.ticket_number}
                  <br />
                  <strong>Customer:</strong>{" "}
                  {selectedTicket.customer ?
                    `${selectedTicket.customer.firstname} ${selectedTicket.customer.lastname}` :
                    "N/A"}
                  <br />
                  <strong>Current Status:</strong>{" "}
                  {getStatusBadge(selectedTicket.status)}
                </div>
              </div>
            }

            {!!statusUpdateError && (
              <div className="alert alert-danger">
                {statusUpdateError}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="status">
                New Status{" "}
                <span className="text-danger">*</span>
              </label>
              <select
                id="status"
                className="form-control"
                value={statusFormData.status}
                onChange={(e) =>
                  setStatusFormData({
                    ...statusFormData,
                    status: e.target.value
                  })
                }>

                <option value="pending">Pending</option>
                <option value="in_designer">In Designer</option>
                {/* <option value="in_production">In Production</option> */}
                {/* <option value="completed">Completed</option> */}
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Warning message when changing to "In Designer" without workflow steps */}
            {/* Only show for custom tickets (job_type_id is null) or "Others" category tickets */}
            {statusFormData.status === 'in_designer' && selectedTicket && (() => {
              // Determine if this is a custom/others ticket
              const isCustomTicket = !selectedTicket.job_type_id || 
                selectedTicket.custom_job_type_description ||
                (typeof selectedTicket.job_type === 'string' && selectedTicket.job_type);
              
              // Only show warning for custom tickets
              if (!isCustomTicket) {
                return null;
              }
              
              const hasWorkflowSteps = selectedTicket.custom_workflow_steps && 
                (Array.isArray(selectedTicket.custom_workflow_steps) 
                  ? selectedTicket.custom_workflow_steps.length > 0 
                  : (typeof selectedTicket.custom_workflow_steps === 'object' 
                      ? Object.keys(selectedTicket.custom_workflow_steps).length > 0 
                      : false));
              
              if (!hasWorkflowSteps) {
                return (
                  <div className="alert alert-warning border-warning mt-3">
                    <h6 className="alert-heading font-weight-bold">
                      <i className="ti-alert mr-2"></i>
                      Production Workflow Template Required
                    </h6>
                    <p className="mb-2">
                      Before changing the status to <strong>"In Designer"</strong>, you must set the <strong>Production Workflow Template</strong> for this ticket.
                    </p>
                    <p className="mb-0">
                      <strong>Action Required:</strong> Please click <strong>"Edit"</strong> on the ticket to set the Production Workflow Template before proceeding.
                    </p>
                  </div>
                );
              }
              return null;
            })()}

            <div className="form-group">
              <label htmlFor="notes">Notes (Optional)</label>
              <textarea
                id="notes"
                className="form-control"
                rows="3"
                placeholder="Add any notes about this status change..."
                value={statusFormData.notes}
                onChange={(e) =>
                  setStatusFormData({
                    ...statusFormData,
                    notes: e.target.value
                  })
                }>
              </textarea>
            </div>

            <div className="modal-footer border-top pt-3">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={closeStatusModal}
                disabled={isUpdating}>

                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleStatusUpdate}
                disabled={isUpdating}>

                {isUpdating ?
                  <>
                    <i className="fa fa-spinner fa-spin mr-2"></i>
                    Updating...
                  </> :

                  <>
                    <i className="ti-check mr-2"></i>
                    Update Status
                  </>
                }
              </button>
            </div>
          </div>
        </Modal>

        {/* Payment Update Modal - READ ONLY */}
        <Modal
          title="Payment History"
          isOpen={openPaymentModal}
          onClose={closePaymentModal}
          size="4xl"
          submitButtonText={null}
          staticBackdrop={true}>

          <div className="modal-body">
            {selectedTicket?.payments?.some((p) => p.status === 'rejected') &&
              <div className="alert alert-danger mb-4">
                <h5 className="font-bold text-danger">
                  <i className="ti-alert mr-2"></i>
                  ACTION REQUIRED: BOUNCED PAYMENT
                </h5>
                <p className="mb-0 text-sm text-black">
                  <strong>PAYMENT REJECTED</strong> We have received a payment rejection for this ticket. Please contact the customer immediately to secure a new payment via the Cashier.
                </p>
              </div>
            }
            {selectedTicket &&
              <div className="mb-4 border rounded p-3 bg-light">
                <div className="row">
                  <div className="col-md-6">
                    <p className="m-b-5">
                      <strong>Ticket:</strong>{" "}
                      {selectedTicket.ticket_number}
                    </p>
                    <p className="m-b-5">
                      <strong>Customer:</strong>{" "}
                      {selectedTicket.customer ?
                        `${selectedTicket.customer.firstname} ${selectedTicket.customer.lastname}` :
                        "Walk-in"}
                    </p>
                    <p className="m-b-0">
                      <strong>Status:</strong>{" "}
                      {getPaymentStatusBadge(
                        selectedTicket
                      )}
                    </p>
                  </div>
                  <div className="col-md-6">
                    {(() => {
                      const discountPct = parseFloat(selectedTicket.discount_percentage || selectedTicket.discount || 0);
                      const hasDiscount = discountPct > 0;
                      let originalPrice = parseFloat(selectedTicket.original_price || 0);
                      let totalAmount = parseFloat(selectedTicket.total_amount || 0);

                      // Calculate discounted total if we have discount info
                      let finalTotal = totalAmount; // Default to total_amount
                      if (hasDiscount) {
                        // If original_price is not set, use total_amount as original
                        if (originalPrice === 0 && totalAmount > 0) {
                          originalPrice = totalAmount;
                        }

                        // Calculate discounted amount
                        const discountAmount = parseFloat(selectedTicket.discount_amount || 0);
                        const calculatedDiscountAmount = discountAmount > 0 ? discountAmount : (originalPrice * (discountPct / 100));
                        const discountedTotal = originalPrice - calculatedDiscountAmount;
                        finalTotal = discountedTotal; // Use discounted total for balance calculation

                        return (
                          <>
                            <p className="m-b-5 text-muted">
                              <strong>Original Price:</strong>{" "}
                              <span className="text-decoration-line-through">
                                {formatPeso(originalPrice.toFixed(2))}
                              </span>
                            </p>
                            <p className="m-b-5 text-success">
                              <strong>Discount:</strong>{" "}
                              {discountPct}% OFF
                              <span> (-{formatPeso(calculatedDiscountAmount.toFixed(2))})</span>
                            </p>
                            <p className="m-b-5 font-weight-bold">
                              <strong>Total Amount:</strong>{" "}
                              <span className="text-success">
                                {formatPeso(discountedTotal.toFixed(2))}
                              </span>
                            </p>
                            <p className="m-b-5">
                              <strong>Amount Paid:</strong>{" "}
                              {formatPeso(selectedTicket.amount_paid)}
                            </p>
                            <p className="m-b-0 text-danger font-bold border-t pt-1">
                              <strong>Balance:</strong>{" "}
                              {formatPeso(Math.max(0, discountedTotal - parseFloat(selectedTicket.amount_paid || 0)).toFixed(2))}
                            </p>
                          </>
                        );
                      }

                      return (
                        <>
                          <p className="m-b-5">
                            <strong>Subtotal:</strong>{" "}
                            {parseFloat(selectedTicket.subtotal || totalAmount || 0) > 0
                              ? formatPeso((selectedTicket.subtotal || totalAmount))
                              : "To be confirmed"}
                          </p>
                          <p className="m-b-5">
                            <strong>Total Amount:</strong>{" "}
                            {totalAmount > 0
                              ? formatPeso(totalAmount.toFixed(2))
                              : "To be confirmed"}
                          </p>
                          <p className="m-b-5">
                            <strong>Amount Paid:</strong>{" "}
                            {formatPeso(selectedTicket.amount_paid)}
                          </p>
                          <p className="m-b-0 text-danger font-bold border-t pt-1">
                            <strong>Balance:</strong>{" "}
                            {parseFloat(totalAmount || 0) > 0
                              ? formatPeso(Math.max(0, parseFloat(totalAmount || 0) - parseFloat(selectedTicket.amount_paid || 0)).toFixed(2))
                              : "To be confirmed"}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            }

            <div className="row">
              <div className="col-md-12">
                <h5 className="m-b-3">Payment History</h5>
                <div className="alert alert-info mb-3">
                  <i className="ti-info-alt mr-2"></i>
                  <strong>Note:</strong> This is a read-only view. To record new payments, please use the <strong>Payments & Finance</strong> module.
                </div>
                <div className="border rounded p-3 payment-history">
                  {selectedTicket?.payments &&
                    selectedTicket.payments.length ?
                    selectedTicket.payments.map((payment) =>
                      <div
                        key={payment.id}
                        className="border-bottom pb-2 mb-2">

                        <div className="d-flex justify-content-between">
                          <strong>
                            {formatPeso(payment.amount)}
                          </strong>
                          <span className="text-muted text-sm">
                            {new Date(
                              payment.payment_date
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className={`text-sm ${payment.status === 'rejected' ? 'text-danger font-bold' : 'text-gray-600'}`}>
                          {payment.payment_method?.replace("_", " ") || "N/A"}
                          {payment.official_receipt_number &&
                            <> • OR {payment.official_receipt_number}</>
                          }
                          {payment.status === 'rejected' &&
                            <span className="ml-2">• REJECTED: {payment.notes || "No reason provided"}</span>
                          }
                        </div>
                        {payment.payment_reference &&
                          <div className="text-xs text-gray-500">
                            Ref: {payment.payment_reference}
                          </div>
                        }
                        {payment.notes &&
                          <p className="text-xs mt-1">
                            {payment.notes}
                          </p>
                        }
                        {payment.documents?.length ?
                          <>
                            <span className="badge badge-success">
                              {payment.documents.length}{" "}
                              attachment
                              {payment.documents.length > 1 ?
                                "s" :
                                ""}
                            </span>
                            <button
                              onClick={() => handlePreviewFile(null, payment?.documents[0]?.file_path)}
                              className="btn btn-sm btn-outline-primary ml-1"
                              style={{ padding: "2px 8px", fontSize: "11px" }}
                              title="Photo preview">

                              <i className="ti-eye"></i>
                            </button>
                          </> :

                          null}
                      </div>
                    ) :

                    <p className="text-muted m-b-0">
                      No payments recorded yet.
                    </p>
                  }
                </div>
              </div>
            </div>

            <div className="modal-footer border-top pt-3">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={closePaymentModal}>

                Close
              </button>
            </div>
          </div>
        </Modal>

        {/* Verify Payment Modal */}
        <Modal
          title="Verify Order & Payment"
          isOpen={openVerifyModal}
          onClose={closeVerifyModal}
          size="lg"
          submitButtonText={null}>

          <div className="modal-body">
            {verifyErrors.general &&
              <div className="alert alert-danger mb-4">
                <i className="ti-alert mr-2"></i>
                {verifyErrors.general}
              </div>
            }

            {selectedTicket &&
              <div className={`alert ${selectedTicket.payment_method === 'cash' ? 'alert-info' : 'alert-warning'} mb-4`}>
                <h6 className="alert-heading f-s-14">
                  <i className="ti-info-alt mr-2"></i>
                  {selectedTicket.payment_method === 'cash' ?
                    'Walk-in order confirmation' :
                    'Verification required for online payment'}
                </h6>
                <p className="mb-0 small">
                  Ticket: <strong>{selectedTicket.ticket_number}</strong><br />
                  {(() => {
                    const discountPct = parseFloat(selectedTicket.discount_percentage || selectedTicket.discount || 0);
                    const hasDiscount = discountPct > 0;
                    let originalPrice = parseFloat(selectedTicket.original_price || 0);
                    let totalAmount = parseFloat(selectedTicket.total_amount || 0);

                    if (hasDiscount) {
                      // If original_price is not set, use total_amount as original
                      if (originalPrice === 0 && totalAmount > 0) {
                        originalPrice = totalAmount;
                      }

                      // Calculate discounted amount
                      const discountAmount = parseFloat(selectedTicket.discount_amount || 0);
                      const calculatedDiscountAmount = discountAmount > 0 ? discountAmount : (originalPrice * (discountPct / 100));
                      const discountedTotal = originalPrice - calculatedDiscountAmount;

                      return (
                        <>
                          Original Price: <span className="text-decoration-line-through">{formatPeso(originalPrice.toFixed(2))}</span><br />
                          Discount: <span className="text-success font-weight-bold">{discountPct}% OFF (-{formatPeso(calculatedDiscountAmount.toFixed(2))})</span><br />
                          Total Amount: <strong className="text-success">{formatPeso(discountedTotal.toFixed(2))}</strong>
                        </>
                      );
                    }

                    return (
                      <>
                        Total Amount: <strong>{totalAmount > 0 ? formatPeso(totalAmount.toFixed(2)) : "To be confirmed"}</strong>
                      </>
                    );
                  })()}
                  {selectedTicket.payment_method === 'cash' &&
                    <><br />Confirm this order once the customer arrives at the branch.</>
                  }
                </p>
              </div>
            }

            {(selectedTicket && (!selectedTicket.job_type_id || selectedTicket.custom_job_type_description)) && (
              <div className="form-group mb-4">
                <label className="form-label f-s-13 font-weight-bold">
                  Update Total Price (Manual) <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <div className="input-group-prepend">
                    <span className="input-group-text">₱</span>
                  </div>
                  <input
                    type="number"
                    className={`form-control ${verifyErrors.total_amount ? 'is-invalid' : ''}`}
                    value={verifyFormData.total_amount}
                    onChange={(e) => {
                      setVerifyFormData({ ...verifyFormData, total_amount: e.target.value });
                      if (verifyErrors.total_amount) {
                        setVerifyErrors({ ...verifyErrors, total_amount: null });
                      }
                    }}
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
                {verifyErrors.total_amount &&
                  <div className="invalid-feedback d-block">
                    {verifyErrors.total_amount}
                  </div>
                }
                <p className="text-xs text-muted mt-1">
                  Since this is a custom order, you must set the final price before confirming.
                </p>
              </div>
            )}

            <div className="form-group mb-4">
              <label className="form-label f-s-13">Verification Notes (Optional)</label>
              <textarea
                className="form-control"
                rows="2"
                value={verifyFormData.notes}
                onChange={(e) => setVerifyFormData({ ...verifyFormData, notes: e.target.value })}
                placeholder="Add any notes for the cashier or designers...">
              </textarea>
            </div>

            <div className="modal-footer border-top pt-3 px-0">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={closeVerifyModal}
                disabled={isUpdating}>

                Cancel
              </button>
              <button
                type="button"
                className="btn btn-success btn-sm"
                onClick={handleVerifyPayment}
                disabled={isUpdating}>

                {isUpdating ?
                  <>
                    <i className="fa fa-spinner fa-spin mr-1"></i> Verifying...
                  </> :

                  <>
                    <i className="ti-check mr-1"></i> Confirm & Release to Cashier
                  </>
                }
              </button>
            </div>
          </div>
        </Modal>

        <section id="main-content">
          {/* Customer Search and Add Section */}
          {hasPermission('customers', 'manage') &&
            <div className="row">
              <div className="col-lg-6">
                <div className="card">
                  <div className="card-title">
                    <h4>Search Customer</h4>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm float-end"
                      onClick={() => setCustomerModalOpen(true)}>

                      <i className="ti-plus text-xs"></i> Add Customer
                    </button>
                  </div>
                  <div className="card-body">
                    <div className="basic-form">
                      <div className="form-group">
                        <p className="text-muted m-b-15 f-s-12">
                          Search customer here if
                          already registered.
                        </p>
                        <CustomerSearchBox
                          onSelect={(customer) => {
                            setSelectedCustomer(customer);
                            handleFilterChange('customer_id', customer.id);
                          }}
                          _selectedCustomer={
                            _selectedCustomer
                          } />

                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {_selectedCustomer &&
                <div className="col-lg-6">
                  <div className="card">
                    <div className="card-title">
                      <h6>Customer Details</h6>
                    </div>
                    <div className="card-body mt-3">
                      <div className="row">
                        <div className="col-lg-6">
                          <ul>
                            <li>
                              <label>
                                Name:{" "}
                                <span>
                                  <b>
                                    {
                                      _selectedCustomer.full_name
                                    }
                                  </b>
                                </span>
                              </label>
                            </li>
                            <li>
                              <label>
                                Phone:{" "}
                                <span>
                                  <b>
                                    {_selectedCustomer.phone ||
                                      "N/A"}
                                  </b>
                                </span>
                              </label>
                            </li>
                          </ul>
                        </div>
                        <div className="col-lg-6">
                          <ul>
                            <li>
                              <label>
                                Email:{" "}
                                <span>
                                  <b>
                                    {_selectedCustomer.email ||
                                      "N/A"}
                                  </b>
                                </span>
                              </label>
                            </li>
                            <li>
                              <label>
                                Address:{" "}
                                <span>
                                  <b>
                                    {_selectedCustomer.address ||
                                      "N/A"}
                                  </b>
                                </span>
                              </label>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          {/* Tickets Section */}
          <div className="row">
            <div className="col-lg-12">
              <div className="card">
                <div className="card-title">
                  <h4>Tickets</h4>
                  <div className="button-list float-end">
                    {/* <button
                         className="btn btn-outline-secondary btn-block"
                         onClick={() => {
                             setDateRange('');
                             setCustomStartDate('');
                             setCustomEndDate('');
                             setShowCustomDateInputs(false);
                             router.get(buildUrl("tickets"));
                         }}
                         style={{ height: '42px' }}
                      >
                         Reset
                      </button> */}
                    <button
                      type="button"
                      onClick={() => {
                        router.get(buildUrl("tickets"));
                      }}
                      className="btn btn-sm btn-outline-info mr-2"
                      title="Refresh">

                      <i className="ti-reload"></i>
                    </button>

                    {hasPermission('tickets', 'manage') &&

                      <button
                        type="button"
                        onClick={() =>
                          setTicketModalOpen(true)
                        }
                        disabled={!_selectedCustomer}
                        className="btn btn-sm btn-primary">

                        <i className="ti-plus text-xs"></i> Add
                        Tickets
                      </button>
                    }

                  </div>
                </div>
                <div className="card-body">
                  <div className="row mb-4">
                    <div className="col-md-2">
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search tickets..."
                          value={localSearch}
                          onChange={(e) => setLocalSearch(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleFilterChange('search', localSearch)}
                          onBlur={() => handleFilterChange('search', localSearch)} />

                        <div className="input-group-append">
                          <button
                            className="btn btn-primary"
                            type="button"
                            onClick={() => handleFilterChange('search', localSearch)}
                            style={{ height: '42px' }}>

                            <i className="ti-search"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-2">
                      <select
                        className="form-control"
                        value={filters.status || ''}
                        onChange={(e) => handleFilterChange('status', e.target.value)}>

                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="in_designer">In Designer</option>
                        <option value="in_production">In Production</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="col-md-2">
                      <select
                        className="form-control"
                        value={filters.payment_status || ''}
                        onChange={(e) => handleFilterChange('payment_status', e.target.value)}>

                        <option value="">All Payment Status</option>
                        <option value="pending">Pending</option>
                        <option value="partial">Partial</option>
                        <option value="paid">Paid</option>
                        <option value="awaiting_verification">Awaiting Verification</option>
                      </select>
                    </div>
                    {auth.user.role === 'admin' &&
                      <div className="col-md-2">
                        <select
                          className="form-control"
                          value={filters.branch_id || ''}
                          onChange={(e) => handleFilterChange('branch_id', e.target.value)}>

                          <option value="">All Branches</option>
                          {branches.map((branch) =>
                            <option key={branch.id} value={branch.id}>
                              {branch.name}
                            </option>
                          )}
                        </select>
                      </div>
                    }



                    <div className="col-md-4">
                      <DateRangeFilter
                        filters={filters}
                        route="tickets"
                        buildUrl={buildUrl} />
                    </div>
                  </div>

                  {/* Active Filters Indicator */}
                  {(filters.search || filters.status || filters.payment_status || filters.date_range) &&
                    <div className="row mb-3">
                      <div className="col-12">
                        <div className="alert alert-light border p-2">
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
                                filters.date_range === 'last_30_days' ?
                                  'Last 30 Days' :
                                  `Year: ${filters.date_range}`
                              }
                            </span>
                          }
                          {filters.branch_id &&
                            <span className="badge badge-info mr-2">
                              Branch: {branches.find((b) => b.id == filters.branch_id)?.name}
                            </span>
                          }
                        </div>
                      </div>
                    </div>
                  }
                  <div className="alert alert-info" role="alert">
                    <i className="fa fa-info-circle"></i>{" "}
                    <strong>Note:</strong> Update the status using the pencil icon.
                    Set it to <strong>In Designer</strong> once the job is ready to proceed with design review.
                  </div>


                  <DataTable
                    columns={ticketColumns}
                    data={tickets.data}
                    pagination={tickets}
                    onEdit={handleEditTicket}
                    onDelete={handleDeleteTicket}
                    currentUser={auth.user}
                    showDeleteForInProgress={true}
                    emptyMessage="No tickets found."
                    actions={(row) => (
                      <div className="btn-group">
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-primary"
                          onClick={() => handleEditTicket(row)}
                          title={`Edit ${row.status !== 'completed' ? 'Edit' : 'View'}`}>
                          <small>
                            {row.status !== 'completed' ? <i className="ti-pencil"></i> : <i className="ti-eye"></i>}
                            {row.status !== 'completed' ? ' Edit' : ' View'}
                          </small>
                        </button>

                        {
                          row.payment_status !== 'paid' && row.payment_status !== 'partial' && (
                            <button
                              type="button"
                              className="btn btn-link btn-sm text-info"
                              onClick={() => handleOpenQuotationModal(row)}
                              title="Print Quotation">
                              <small><i className="ti-printer"></i> Quote</small>
                            </button>
                          )
                        }

                        {shouldShowDeleteButtonInDataTable(row) && (
                          <button
                            type="button"
                            className="btn btn-link btn-sm text-danger"
                            onClick={() => handleDeleteTicket(row.id)}
                            title="Delete">
                            <small> <i className="ti-trash"></i> Delete</small>
                          </button>
                        )}
                      </div>
                    )}
                  />

                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quotation Modal */}
        <Modal
          title="Prepare Quotation"
          isOpen={openQuotationModal}
          onClose={() => setQuotationModalOpen(false)}
          size="4xl"
          submitButtonText={null}
        >
          <div className="modal-body p-4">
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label font-weight-bold">Customer Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={quotationForm.name}
                  onChange={(e) => setQuotationForm({ ...quotationForm, name: e.target.value })}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label font-weight-bold">Company Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={quotationForm.companyName}
                  onChange={(e) => setQuotationForm({ ...quotationForm, companyName: e.target.value })}
                />
              </div>
              <div className="col-12 mb-3">
                <label className="form-label font-weight-bold">Address</label>
                <input
                  type="text"
                  className="form-control"
                  value={quotationForm.address}
                  onChange={(e) => setQuotationForm({ ...quotationForm, address: e.target.value })}
                />
              </div>
              <div className="col-md-7 mb-3">
                <label className="form-label font-weight-bold">Valid Until</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 7 Days"
                  value={quotationForm.validUntil}
                  onChange={(e) => setQuotationForm({ ...quotationForm, validUntil: e.target.value })}
                />
              </div>
              <div className="col-md-5 mb-3">
                <label className="form-label font-weight-bold">Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={quotationForm.date}
                  onChange={(e) => setQuotationForm({ ...quotationForm, date: e.target.value })}
                />
              </div>
              <div className="col-12 mb-3">
                <label className="form-label font-weight-bold">Project Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={quotationForm.projectDescription}
                  onChange={(e) => setQuotationForm({ ...quotationForm, projectDescription: e.target.value })}
                ></textarea>
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label font-weight-bold">Value Added Tax (VAT)</label>
                <input
                  type="number"
                  className="form-control"
                  value={quotationForm.valueAddedTax}
                  onChange={(e) => setQuotationForm({ ...quotationForm, valueAddedTax: e.target.value })}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label font-weight-bold">Others / Extra Fee</label>
                <input
                  type="number"
                  className="form-control"
                  value={quotationForm.others}
                  onChange={(e) => setQuotationForm({ ...quotationForm, others: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-footer border-top px-0 pb-0 pt-3 mt-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setQuotationModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-info btn-sm"
                onClick={handlePrintQuotation}
              >
                <i className="ti-printer mr-1"></i> Print Quotation
              </button>
            </div>
          </div>
        </Modal>

        {/* Hidden Quotation Print View - Portaled to Body to avoid container overflow/height issues */}
        {createPortal(
          <div id="quotation-print-overlay" style={{ display: quotationToPrint ? 'block' : 'none' }}>
            {quotationToPrint && (
              <Quotation
                ticket={quotationToPrint.ticket}
                customData={quotationToPrint.customData}
                customerOrderQrcode={customer_order_qrcode}
              />
            )}
          </div>,
          document.body
        )}

        <style>{`
          @media print {
            @page {
              margin: 0;
              size: auto;
            }
            body.printing-quotation {
              visibility: hidden;
              overflow: visible !important;
              height: auto !important;
            }
            /* Completely hide the main application container when printing a quotation */
            #app {
              display: none !important;
            }
            
            body.printing-quotation #quotation-print-overlay,
            body.printing-quotation #quotation-print-overlay .quotation-print-container {
              visibility: visible !important;
              display: block !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: auto !important;
              background: white !important;
              z-index: 99999 !important;
            }
            body.printing-quotation #quotation-print-overlay * {
              visibility: visible !important;
            }
          }
        `}</style>
      </AdminLayout>
    </>);
}