import React, { useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Modal from "@/Components/Main/Modal";
import JobTypeForm from "@/Components/JobTypes/JobTypeForm";
import JobCategoryForm from "@/Components/JobCategories/JobCategoryForm";
import DataTable from "@/Components/Common/DataTable";
import SearchBox from "@/Components/Common/SearchBox";
import FlashMessage from "@/Components/Common/FlashMessage";
import DeleteConfirmation from "@/Components/Common/DeleteConfirmation";
import FormInput from "@/Components/Common/FormInput";
import { formatPeso } from "@/Utils/currency";
import { useRoleApi } from "@/Hooks/useRoleApi";

export default function JobTypes({
  user = {},
  notifications = [],
  messages = [],
  jobTypes = { data: [] },
  categories = [],
  allcategories = [],
  filters = {}
}) {
  const { flash } = usePage().props;
  const [activeTab, setActiveTab] = useState("job_type");
  const { buildUrl } = useRoleApi();


  const [openJobTypeModal, setJobTypeModalOpen] = useState(false);
  const [openCategoryModal, setCategoryModalOpen] = useState(false);
  const [openDeleteModal, setDeleteModalOpen] = useState(false);


  const [editingJobType, setEditingJobType] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);


  const [deleteConfig, setDeleteConfig] = useState({ id: null, type: null });
  const [loading, setLoading] = useState(false);

  const tabs = [
    { key: "job_type", label: "Job Types" },
    { key: "category", label: "Category" }];



  const handleOpenJobTypeModal = (jobType = null) => {
    setEditingJobType(jobType);
    setJobTypeModalOpen(true);
  };

  const handleOpenCategoryModal = (category = null) => {
    setEditingCategory(category);
    setCategoryModalOpen(true);
  };

  const handleCloseModals = () => {
    setDeleteModalOpen(false);
    setJobTypeModalOpen(false);
    setCategoryModalOpen(false);
    setEditingJobType(null);
    setEditingCategory(null);
    setDeleteConfig({ id: null, type: null });
  };


  const handleJobTypeSubmit = (data) => {
    const url = editingJobType ?
      buildUrl(`/job-types/${editingJobType.id}`) :
      buildUrl("/job-types");

    // Check if there's a file to upload
    const hasFile = data.image && data.image instanceof File;

    // Prepare the data - Inertia.js will automatically use FormData when it detects File objects
    const submitData = { ...data };

    // Remove null/undefined values to avoid issues
    Object.keys(submitData).forEach(key => {
      if (submitData[key] === null || submitData[key] === undefined) {
        delete submitData[key];
      }
    });

    // If there's a file, use POST with _method for PUT (required for file uploads in Laravel)
    if (hasFile && editingJobType) {
      submitData._method = 'PUT';
      router.post(url, submitData, {
        onSuccess: handleCloseModals,
        preserveState: false,
        preserveScroll: true
      });
    } else if (hasFile && !editingJobType) {
      // New job type with file
      router.post(url, submitData, {
        onSuccess: handleCloseModals,
        preserveState: false,
        preserveScroll: true
      });
    } else {
      // No file, use regular PUT/POST
      const method = editingJobType ? "put" : "post";
      router[method](url, submitData, {
        onSuccess: handleCloseModals,
        preserveState: false,
        preserveScroll: true
      });
    }
  };

  const handleCategorySubmit = (data) => {
    const url = editingCategory ?
      buildUrl(`/job-categories/${editingCategory.id}`) :
      buildUrl("/job-categories");
    const method = editingCategory ? "put" : "post";

    router[method](url, data, {
      onSuccess: handleCloseModals,
      preserveState: false,
      preserveScroll: true
    });
  };


  const handleOpenDeleteModal = (id, type) => {
    setDeleteConfig({ id, type });
    setDeleteModalOpen(true);
  };

  const handleDelete = () => {
    if (!deleteConfig.id) return;

    const url = deleteConfig.type === "category" ?
      buildUrl(`/job-categories/${deleteConfig.id}`) :
      buildUrl(`/job-types/${deleteConfig.id}`);

    router.delete(url, {
      preserveScroll: true,
      preserveState: false,
      onBefore: () => setLoading(true),
      onSuccess: handleCloseModals,
      onError: () => setLoading(false),
      onFinish: () => setLoading(false)
    });
  };


  const handleCategoryFilter = (e) => {
    const categoryId = e.target.value;
    router.get(
      buildUrl("/job-types"),
      { ...filters, category_id: categoryId || null },
      { preserveState: false, preserveScroll: true }
    );
  };


  const jobTypeColumns = [
    {
      label: "#",
      key: "index",
      render: (row, index) => {
        const { current_page = 1, per_page = 10 } = jobTypes;
        return (current_page - 1) * per_page + index + 1;
      }
    },
    {
      label: "Image",
      key: "image",
      render: (row) => {

        const fallbackSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect width='48' height='48' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='12' fill='%239ca3af'%3E${encodeURIComponent(row.name.substring(0, 2).toUpperCase())}%3C/text%3E%3C/svg%3E`;

        return (
          <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden border">
            <img
              src={row.image_path || fallbackSvg}
              alt={row.name}
              className="w-full h-full object-cover"
              onError={(e) => {

                e.target.onerror = null;
                e.target.src = fallbackSvg;
              }} />

          </div>);

      }
    },
    {
      label: "Category",
      key: "category",
      render: (row) => row.category?.name || "N/A"
    },
    {
      label: "Name",
      key: "name",
      render: (row) => row.name
    },
    {
      label: "Pricing",
      key: "price",
      render: (row) => {
        const badges = [];

        if (row.promo_rules?.length > 0) {
          badges.push(
            <div key="promo" className="badge badge-success mr-1">
              <i className="ti-gift"></i> Has Promos
            </div>
          );
        }

        if (row.price_tiers?.length > 0) {
          badges.push(
            <div key="tiered" className="badge badge-info mr-1">Tiered by Qty</div>
          );
        }

        if (row.size_rates?.length > 0) {
          badges.push(
            <div key="size" className="badge badge-primary mr-1">
              Size-Based
            </div>
          );
        }

        return (
          <div className="d-flex flex-column gap-1">
            {/* Price */}
            {row.price > 0 &&
              <div className="font-weight-bold">
                {formatPeso(parseFloat(row.price).toFixed(2))} / {row.price_by}
              </div>
            }

            {/* Incentive Prices per Workflow - Dropdown */}
            {row.workflow_steps && Object.entries(row.workflow_steps).some(([_, data]) => data?.incentive_price > 0) &&
              <div className="mt-1">
                <div className="dropdown">
                  <button
                    className="btn btn-sm btn-outline-success dropdown-toggle"
                    type="button"
                    data-toggle="dropdown"
                    style={{ fontSize: '0.75rem', padding: '2px 8px' }}>

                    <i className="ti-gift"></i> Workflow Incentives
                  </button>
                  <div className="dropdown-menu">
                    {Object.entries(row.workflow_steps).
                      filter(([_, data]) => data?.incentive_price > 0).
                      map(([step, data]) =>
                        <div key={step} className="dropdown-item-text px-2 py-1">
                          <span className="text-capitalize font-weight-bold">{step.replace(/_/g, ' ')}:</span>
                          <span className="text-success ml-2">{formatPeso(parseFloat(data.incentive_price).toFixed(2))}/pcs</span>
                        </div>
                      )
                    }
                  </div>
                </div>
              </div>
            }

            {/* Legacy Incentive Price (if any) */}
            {(!row.workflow_steps || !Object.entries(row.workflow_steps).some(([_, data]) => data?.incentive_price > 0)) && row.incentive_price > 0 &&
              <div className="text-success small">
                Incentive: {formatPeso(parseFloat(row.incentive_price).toFixed(2))}/pcs
              </div>
            }

            {/* Badges */}
            {badges.length > 0 &&
              <div className="d-flex flex-wrap gap-1">
                {badges}
              </div>
            }
          </div>);

      }
    },
    {
      label: "Assets/Colors",
      key: "assets",
      render: (row) => (
        <div className="d-flex flex-column gap-2">
          {row.brochure_link && (
            <a
              href={row.brochure_link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-outline-primary"
              title="View Brochure"
            >
              <i className="ti-link"></i> Brochure
            </a>
          )}
          {row.has_colors && row.available_colors?.length > 0 && (
            <div className="d-flex flex-wrap gap-1">
              {row.available_colors.slice(0, 5).map((color, idx) => {
                const hex = typeof color === 'string' ? color : color.hex;
                const code = typeof color === 'string' ? '' : color.code;
                return (
                  <div
                    key={idx}
                    className="rounded-circle border"
                    style={{ width: '12px', height: '12px', backgroundColor: hex }}
                    title={code ? `${code} (${hex})` : hex}
                  ></div>
                );
              })}
              {row.available_colors.length > 5 && (
                <span className="text-xs">+{row.available_colors.length - 5}</span>
              )}
            </div>
          )}
          {!row.brochure_link && !row.has_colors && <span className="text-muted text-xs">N/A</span>}
        </div>
      )
    },
    {
      label: "Discount",
      key: "discount",
      render: (row) => row.discount ? `${row.discount}%` : "N/A"
    },
    {
      label: "Status",
      key: "is_active",
      render: (row) =>
        <div className="d-flex flex-column">
          <span className={row.is_active ? "text-success" : "text-danger"}>
            {row.is_active ? "Active" : "Inactive"}
          </span>
          <span className={`text-xs ${row.show_in_customer_view ? "text-info" : "text-muted"}`}>
            {row.show_in_customer_view ? "Visible to Customers" : "Hidden from Customers"}
          </span>
        </div>

    }];


  const categoryColumns = [
    {
      label: "#",
      key: "index",
      render: (row, index) => {
        const { current_page = 1, per_page = 10 } = categories;
        return (current_page - 1) * per_page + index + 1;
      }
    },
    {
      label: "Name",
      key: "name",
      render: (row) => row.name
    },
    {
      label: "Created At",
      key: "created_at",
      render: (row) => row.created_at ?
        new Date(row.created_at).toLocaleDateString() :
        "N/A"
    }];



  const renderJobTypesTab = () =>
    <div className="card">
      <div className="card-title">
        <div className="row mt-4 align-items-center">
          <div className="col-md-3">
            <SearchBox
              placeholder="Search job types..."
              initialValue={filters.search || ""}
              route="/job-types" />

          </div>
          <div className="col-md-3">
            <FormInput
              label=""
              type="select"
              name="category_filter"
              value={filters.category_id || ""}
              onChange={handleCategoryFilter}
              options={[
                { value: "", label: "All Categories" },
                ...allcategories.map((cat) => ({
                  value: cat.id.toString(),
                  label: cat.name
                }))]
              } />

          </div>
          <div className="col-md-6 d-flex justify-content-end">
            <button
              type="button"
              onClick={() => router.replace(buildUrl("/job-types"))}
              className="btn btn-sm btn-outline-info mr-2"
              title="Refresh">

              <i className="ti-reload"></i>
            </button>
            <button
              type="button"
              onClick={() => handleOpenJobTypeModal()}
              className="btn btn-sm btn-primary">

              <i className="ti-plus text-xs"></i> Add Job Type
            </button>
          </div>
        </div>
      </div>
      <div className="card-body">
        <DataTable
          columns={jobTypeColumns}
          data={jobTypes.data}
          pagination={jobTypes}
          onEdit={handleOpenJobTypeModal}
          onDelete={(id) => handleOpenDeleteModal(id, "job_type")}
          emptyMessage="No job types found." />

      </div>
    </div>;


  const renderCategoriesTab = () =>
    <div className="card">
      <div className="card-title">
        <div className="row mt-4 align-items-center">
          <div className="col-md-5">
            <SearchBox
              placeholder="Search categories..."
              initialValue={filters.search || ""}
              route="/job-categories" />

          </div>
          <div className="col-md-7 d-flex justify-content-end">
            <button
              type="button"
              onClick={() => router.replace(buildUrl("/job-types"))}
              className="btn btn-sm btn-outline-info mr-2"
              title="Refresh">

              <i className="ti-reload"></i>
            </button>
            <button
              type="button"
              onClick={() => handleOpenCategoryModal()}
              className="btn btn-sm btn-primary">

              <i className="ti-plus"></i> Add Category
            </button>
          </div>
        </div>
      </div>
      <div className="card-body">
        <DataTable
          columns={categoryColumns}
          data={categories.data}
          pagination={categories}
          onEdit={handleOpenCategoryModal}
          onDelete={(id) => handleOpenDeleteModal(id, "category")}
          emptyMessage="No categories found." />

      </div>
    </div>;


  const renderTabContent = () => {
    switch (activeTab) {
      case "job_type":
        return renderJobTypesTab();
      case "category":
        return renderCategoriesTab();
      default:
        return null;
    }
  };

  return (
    <AdminLayout user={user} notifications={notifications} messages={messages}>
      <Head title="Job Types & Pricing" />

      {/* Flash Messages */}
      {flash?.success && <FlashMessage type="success" message={flash.success} />}
      {flash?.error && <FlashMessage type="error" message={flash.error} />}

      {/* Page Header */}
      <div className="row">
        <div className="col-lg-8 p-r-0 title-margin-right">
          <div className="page-header">
            <div className="page-title">
              <h1>Job Types & Pricing <span>Management</span></h1>
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
                <li className="breadcrumb-item active">Job Types & Pricing</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        title={`Delete ${deleteConfig.type === "category" ? "Category" : "Job Type"}`}
        isOpen={openDeleteModal}
        onClose={handleCloseModals}
        size="md"
        submitButtonText={null}>

        <DeleteConfirmation
          label={deleteConfig.type === "category" ? "category" : "job type"}
          loading={loading}
          onSubmit={handleDelete}
          onCancel={handleCloseModals} />

      </Modal>

      {/* Job Type Modal */}
      <Modal
        title={editingJobType ? "Edit Job Type" : "Add Job Type"}
        isOpen={openJobTypeModal}
        onClose={handleCloseModals}
        size="4xl"
        submitButtonText={null}>

        <JobTypeForm
          jobType={editingJobType}
          allcategories={allcategories}
          onSubmit={handleJobTypeSubmit}
          onCancel={handleCloseModals} />

      </Modal>

      {/* Category Modal */}
      <Modal
        title={editingCategory ? "Edit Category" : "Add Category"}
        isOpen={openCategoryModal}
        onClose={handleCloseModals}
        size="md"
        submitButtonText={null}>

        <JobCategoryForm
          category={editingCategory}
          onSubmit={handleCategorySubmit}
          onCancel={handleCloseModals} />

      </Modal>

      {/* Main Content */}
      <section id="main-content">
        <div className="content-wrap">
          <div className="main">
            <div className="container-fluid">
              <div className="row">
                <div className="col-lg-12">
                  {/* Tab Controls */}
                  <div className="card">
                    <div className="card-body">
                      <div className="tabs">
                        <div className="tab-control">
                          {tabs.map((tab) =>
                            <button
                              key={tab.key}
                              className={`btn btn-sm m-r-3 ${activeTab === tab.key ?
                                "btn-primary" :
                                "btn-light"}`
                              }
                              onClick={() => setActiveTab(tab.key)}>

                              {tab.label}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="m-t-10">{renderTabContent()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </AdminLayout>);

}