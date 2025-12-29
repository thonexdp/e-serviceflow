import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Modal from "@/Components/Main/Modal";
import DataTable from "@/Components/Common/DataTable";
import SearchBox from "@/Components/Common/SearchBox";
import FlashMessage from "@/Components/Common/FlashMessage";
import FormInput from "@/Components/Common/FormInput";
import { formatDate } from "@/Utils/formatDate";
import { formatPeso } from "@/Utils/currency";
import { useRoleApi } from "@/Hooks/useRoleApi";

export default function PurchaseOrdersIndex({
  user = {},
  notifications = [],
  messages = [],
  purchaseOrders = { data: [] },
  filters = {}
}) {
  const [openReceiveModal, setReceiveModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [error, setError] = useState("");
  const [receivedItems, setReceivedItems] = useState({});
  const { flash } = usePage().props;
  const { buildUrl } = useRoleApi();
  const hasProcessedUrlParam = useRef(false);

  const handleView = (po) => {
    router.get(buildUrl(`/purchase-orders/${po.id}`));
  };

  const handleOpenReceiveModal = (po) => {
    setSelectedPO(po);
    const initialReceived = {};
    po.items?.forEach((item) => {

      const remainingQty = Math.max(
        0,
        parseFloat(item.quantity) - parseFloat(item.received_quantity || 0)
      );
      initialReceived[item.id] = remainingQty;
    });
    setReceivedItems(initialReceived);
    setReceiveModalOpen(true);
  };


  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const receivePoId = urlParams.get("receive_po_id");
    if (receivePoId && purchaseOrders.data && !hasProcessedUrlParam.current) {
      const po = purchaseOrders.data.find(
        (p) => p.id === parseInt(receivePoId)
      );
      if (po) {
        handleOpenReceiveModal(po);
        hasProcessedUrlParam.current = true;
        window.history.replaceState({}, "", buildUrl("/purchase-orders"));
      }
    }
  }, [purchaseOrders.data]);

  const handleCloseModals = () => {
    setReceiveModalOpen(false);
    setSelectedPO(null);
    setReceivedItems({});
    setError("");
  };

  const handleReceive = (e) => {
    e.preventDefault();
    setError("");
    if (!selectedPO) return;

    const receivedItemsArray = Object.entries(receivedItems).
      filter(([_, qty]) => parseFloat(qty) > 0).
      map(([id, qty]) => ({
        id: parseInt(id),
        received_quantity: parseFloat(qty)
      }));

    if (receivedItemsArray.length === 0) {
      setError("Please enter at least one item quantity to receive.");
      return;
    }

    router.post(
      buildUrl(`/purchase-orders/${selectedPO.id}/receive`),
      {
        received_items: receivedItemsArray
      },
      {
        onSuccess: () => {
          handleCloseModals();
        },
        preserveScroll: true,
      }
    );
  };

  const getStatusBadge = (status) => {
    const classes = {
      draft: "badge-secondary",
      pending: "badge-info",
      approved: "badge-primary",
      ordered: "badge-warning",
      received: "badge-success",
      cancelled: "badge-danger"
    };
    const labels = {
      draft: "Draft",
      pending: "Pending",
      approved: "Approved",
      ordered: "Ordered",
      received: "Received",
      cancelled: "Cancelled"
    };
    return (
      <div className={`badge ${classes[status] || "badge-secondary"}`}>
        {labels[status] || status}
      </div>);

  };

  const poColumns = [
    {
      label: "#",
      key: "index",
      render: (row, index) =>
        (purchaseOrders.current_page - 1) * purchaseOrders.per_page +
        index +
        1
    },
    { label: "PO Number", key: "po_number" },
    { label: "Supplier", key: "supplier" },
    {
      label: "Status",
      key: "status",
      render: (row) => getStatusBadge(row.status)
    },
    {
      label: "Total Amount",
      key: "total_amount",
      render: (row) => `${formatPeso(parseFloat(row.total_amount).toFixed(2))}`
    },
    {
      label: "Order Date",
      key: "order_date",
      render: (row) => formatDate(row.order_date)
    },
    {
      label: "Expected Delivery",
      key: "expected_delivery_date",
      render: (row) => formatDate(row.expected_delivery_date)
    },
    {
      label: "Actions",
      key: "actions",
      render: (row) =>
        <div className="btn-group">
          <button
            type="button"
            className="btn btn-link btn-sm text-orange-500"
            onClick={() => handleView(row)}>

            <i className="ti-eye"></i> View
          </button>
          {row.status === "approved" || row.status === "ordered" ?
            <button
              type="button"
              className="btn btn-link btn-sm text-success"
              onClick={() => handleOpenReceiveModal(row)}>

              <i className="ti-check"></i> Receive
            </button> :
            null}
        </div>

    }];


  return (
    <AdminLayout
      user={user}
      notifications={notifications}
      messages={messages}>

      <Head title="Purchase Orders" />

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
                Purchase <span>Orders</span>
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
                <li className="breadcrumb-item active">
                  Purchase Orders
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>


      {/* Receive Items Modal */}
      <Modal
        title={`Receive Items - ${selectedPO?.po_number}`}
        isOpen={openReceiveModal}
        onClose={handleCloseModals}
        size="5xl">

        {selectedPO &&
          <form onSubmit={handleReceive}>
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Ordered</th>
                    <th>Received</th>
                    <th>Remaining</th>
                    <th>Receive Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPO.items?.map((item) => {
                    const remainingQty = Math.max(
                      0,
                      parseFloat(item.quantity) -
                      parseFloat(
                        item.received_quantity || 0
                      )
                    );

                    return (
                      <tr key={item.id}>
                        <td>
                          <strong>
                            {item.stock_item?.name}
                          </strong>
                          <br />
                          <small>
                            {item.stock_item?.sku}
                          </small>
                        </td>
                        <td>
                          {parseFloat(
                            item.quantity
                          ).toFixed(2)}
                        </td>
                        <td>
                          {parseFloat(
                            item.received_quantity ||
                            0
                          ).toFixed(2)}
                        </td>
                        <td>
                          {remainingQty.toFixed(2)}
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control"
                            step="0.01"
                            min="0"
                            max={remainingQty}
                            value={
                              receivedItems[
                              item.id] ??
                              0
                            }
                            onChange={(e) =>
                              setReceivedItems({
                                ...receivedItems,
                                [item.id]:
                                  Math.min(
                                    remainingQty,
                                    Math.max(
                                      0,
                                      parseFloat(
                                        e.
                                          target.
                                          value
                                      ) ||
                                      0
                                    )
                                  )
                              })
                            } />

                        </td>
                      </tr>);

                  })}
                </tbody>
              </table>
              <span className="text-danger">{error}</span>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button type="submit" className="btn btn-success">
                <i className="ti-check"></i> Receive Items
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseModals}>

                Cancel
              </button>
            </div>
          </form>
        }
      </Modal>

      <section id="main-content">
        <div className="content-wrap">
          <div className="main">
            <div className="container-fluid">
              <div className="row">
                <div className="col-lg-12">
                  <div className="card">
                    <div className="card-title mt-3 d-flex justify-content-between align-items-center">
                      <h4>Purchase Orders</h4>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() =>
                          router.get(buildUrl("/purchase-orders/create"))
                        }>

                        <i className="ti-plus text-xs"></i>{" "}
                        Create PO
                      </button>
                    </div>
                    <div className="card-body">
                      <div className="row mt-4 align-items-center">
                        <div className="col-md-5">
                          <SearchBox
                            placeholder="Search by PO number or supplier..."
                            initialValue={
                              filters.search || ""
                            }
                            route="/purchase-orders" />

                        </div>
                        <div className="col-md-4">
                          <FormInput
                            label=""
                            type="select"
                            name="status"
                            value={
                              filters.status ||
                              "all"
                            }
                            onChange={(e) => {
                              router.get(buildUrl("/purchase-orders"),
                                {
                                  ...filters,
                                  status:
                                    e.target.
                                      value ===
                                      "all" ?
                                      null :
                                      e.
                                        target.
                                        value
                                },
                                {
                                  preserveState: false,
                                  preserveScroll: true
                                }
                              );
                            }}
                            options={[
                              {
                                value: "all",
                                label: "All Status"
                              },
                              {
                                value: "draft",
                                label: "Draft"
                              },
                              {
                                value: "approved",
                                label: "Approved"
                              },
                              {
                                value: "ordered",
                                label: "Ordered"
                              },
                              {
                                value: "received",
                                label: "Received"
                              },
                              {
                                value: "cancelled",
                                label: "Cancelled"
                              }]
                            } />

                        </div>
                      </div>

                      <div className="mt-4">
                        <DataTable
                          columns={poColumns}
                          data={purchaseOrders.data}
                          pagination={purchaseOrders}
                          emptyMessage="No purchase orders found." />

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