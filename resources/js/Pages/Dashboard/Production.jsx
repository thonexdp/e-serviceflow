import React, { useEffect, useRef, useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head } from "@inertiajs/react";
import Footer from "@/Components/Layouts/Footer";
import Modal from "@/Components/Main/Modal";

export default function Dashboard({
    user = {},
    notifications = [],
    messages = [],
}) {
    const [openPaymentModal, setPaymentModalOpen] = useState(false);

    const handleSave = () => {
        console.log("save");
    };

    console.log("openPaymentModal:", openPaymentModal);

    return (
        <AdminLayout
            user={user}
            notifications={notifications}
            messages={messages}
        >
            <Head title="Dashboard" />

            <div className="row">
                <div className="col-lg-8 p-r-0 title-margin-right">
                    <div className="page-header">
                        <div className="page-title">
                            <h1>
                                Hello, <span>Welcome Here</span>
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
                                <li className="breadcrumb-item active">Home</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                title="Payments"
                isOpen={openPaymentModal}
                onClose={() => setPaymentModalOpen(false)}
                onSave={handleSave}
                size="3xl"
                submitButtonText="Record Payment"
            >
                <form>
                    <div className="mb-4">
                        <h3 className="mb-4">
                            {" "}
                            Record Payment for Ticket #20454-12
                        </h3>
                        <hr />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">
                            Customer : <b>John Doe</b>
                        </label>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">
                            Amount Due : <b> P 2,000.00</b>
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                            <label className="block text-sm font-medium">
                                Paymeny Amount :
                            </label>
                            <input
                                type="text"
                                className="mt-1 w-full border"
                                placeholder="0.00"
                                value=""
                                // value={forms.ticket.due_date}

                                // onChange={(e) =>
                                //     setForms({
                                //         ...forms,
                                //         ticket: {
                                //             ...forms.ticket,
                                //             due_date: e.target.value,
                                //         },
                                //     })
                                // }
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">
                                Payment Method
                            </label>
                            <select class name="" id="">
                                <option value="cash">Cash</option>
                                <option value="cash">Card</option>
                                <option value="cash">Gcash</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 mt-2">
                        <div>
                            <label className="block text-sm font-medium">
                                Notes
                            </label>
                            <input
                                type="text"
                                className="mt-1 w-full border rounded-md p-2" // fixed small width
                                placeholder=""
                                value=""
                                // value={forms.ticket.quantity}
                                // onChange={(e) =>
                                //     setForms({
                                //         ...forms,
                                //         ticket: {
                                //             ...forms.ticket,
                                //             quantity: e.target.value,
                                //         },
                                //     })
                                // }
                            />
                        </div>
                    </div>
                </form>
            </Modal>

            <section id="main-content">
                <div className="row">
                    {/* Ready to Print */}
                    <div className="col-lg-3">
                        <div className="card p-0">
                            <div className="stat-widget-three home-widget-three">
                                <div className="stat-icon bg-primary">
                                    <i className="ti-printer"></i>
                                </div>
                                <div className="stat-content">
                                    <div className="stat-digit">
                                        Ready to Print
                                    </div>
                                    <div className="stat-text">
                                        <b>34</b>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* In Production */}
                    <div className="col-lg-3">
                        <div className="card p-0">
                            <div className="stat-widget-three home-widget-three">
                                <div className="stat-icon bg-warning">
                                    <i className="ti-reload"></i>
                                </div>
                                <div className="stat-content">
                                    <div className="stat-digit">
                                        In Production
                                    </div>
                                    <div className="stat-text">7</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Completed */}
                    <div className="col-lg-3">
                        <div className="card p-0">
                            <div className="stat-widget-three home-widget-three">
                                <div className="stat-icon bg-success">
                                    <i className="ti-check-box"></i>
                                </div>
                                <div className="stat-content">
                                    <div className="stat-digit">Completed</div>
                                    <div className="stat-text">5</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Total Items Produced Today */}
                    <div className="col-lg-3">
                        <div className="card p-0">
                            <div className="stat-widget-three home-widget-three">
                                <div className="stat-icon bg-info">
                                    <i className="ti-package"></i>
                                </div>
                                <div className="stat-content">
                                    <div className="stat-digit">
                                        Total Items Produced Today
                                    </div>
                                    <div className="stat-text">120</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* <div className="row">
                    <div className="col-lg-3">
                        <div className="card">
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table w-full">
                                        <thead>
                                            <tr>
                                                <th className="text-center">Pending Payment</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <th> <a
                                                    href="/"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 underline"
                                                > #3424234243</a></th>
                                            </tr>
                                            <tr>
                                                <th> 
                                                    <a
                                                    href="/"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 underline"
                                                >
                                                    #3424234243
                                                </a></th>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>
                    </div>
                    <div className="col-lg-3">
                        <div className="card">
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table w-full">
                                        <thead>
                                            <tr>
                                                <th className="text-center">In Progress</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <th><a
                                                    href="/"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 underline"
                                                >#TRE234FDF34</a></th>
                                            </tr>
                                            <tr>
                                                <th><a
                                                    href="/"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 underline"
                                                >#ERTEW235346</a></th>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-3">
                        <div className="card">
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table w-full">
                                        <thead>
                                            <tr>
                                                <th className="text-center">Ready for Pick Up</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <th><a
                                                    href="/"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 underline"
                                                >#FGDG6456DFD</a></th>
                                            </tr>
                                            <tr>
                                                <th><a
                                                    href="/"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 underline"
                                                >#SDFSDFSD35345</a></th>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-3">
                        <div className="card">
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table w-full">
                                        <thead>
                                            <tr>
                                                <th className="text-center">Completed</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <th><a
                                                    href="/"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 underline"
                                                >#345345DSFSD</a></th>
                                            </tr>
                                            <tr>
                                                <th><a
                                                    href="/"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 underline"
                                                >#DFGDFG3253</a></th>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div> */}
                <div className="row">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-title pr">
                                <h4>All Tickets</h4>
                            </div>
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table student-data-table m-t-20">
                                        <thead>
                                            <tr>
                                                <th>Ticket ID</th>
                                                <th>Customer</th>
                                                <th>Description</th>
                                                <th>Due Date</th>
                                                <th>
                                                    Quantity
                                                    <br />
                                                    Done / Total
                                                </th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>#43242</td>
                                                <td>John Doe</td>
                                                <td>Print 30 tshirt</td>
                                                <td>Sept. 23, 2025</td>
                                                <td>
                                                    {" "}
                                                    <b>0 / 50</b>{" "}
                                                </td>
                                                <td>
                                                    <span className="badge badge-primary">
                                                        Ready
                                                    </span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>#7456345</td>
                                                <td>Jan Dela Cruz</td>
                                                <td>Print Mugs</td>
                                                <td>Sept. 30, 2025</td>
                                                <td>
                                                    {" "}
                                                    <b>10 / 30</b>{" "}
                                                </td>
                                                <td>
                                                    <span className="badge badge-warning">
                                                        In Progress
                                                    </span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>#54653232</td>
                                                <td>John Doe</td>
                                                <td>Print 30 tshirt</td>
                                                <td>Sept. 23, 2025</td>
                                                <td>
                                                    {" "}
                                                    <b>20 / 20</b>{" "}
                                                </td>
                                                <td>
                                                    <span className="badge badge-success badge-outline">
                                                        Done
                                                    </span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* <div className="row">
                    <div className="col-lg-4">
                        <div className="card">
                            <div className="card-body">
                                <div className="year-calendar"></div>
                            </div>
                        </div>

                    </div>
                    <div className="col-lg-4">
                        <div className="card">
                            <div className="card-title">
                                <h4>Notice Board </h4>

                            </div>
                            <div className="recent-comment m-t-15">
                                <div className="media">
                                    <div className="media-left">
                                        <a href="#"><img className="media-object" src="images/avatar/1.jpg"
                                            alt="..." /></a>
                                    </div>
                                    <div className="media-body">
                                        <h4 className="media-heading color-primary">john doe</h4>
                                        <p>Cras sit amet nibh libero, in gravida nulla.</p>
                                        <p className="comment-date">10 min ago</p>
                                    </div>
                                </div>
                                <div className="media">
                                    <div className="media-left">
                                        <a href="#"><img className="media-object" src="images/avatar/2.jpg"
                                            alt="..." /></a>
                                    </div>
                                    <div className="media-body">
                                        <h4 className="media-heading color-success">Mr. John</h4>
                                        <p>Cras sit amet nibh libero, in gravida nulla.</p>
                                        <p className="comment-date">1 hour ago</p>
                                    </div>
                                </div>
                                <div className="media">
                                    <div className="media-left">
                                        <a href="#"><img className="media-object" src="images/avatar/3.jpg"
                                            alt="..." /></a>
                                    </div>
                                    <div className="media-body">
                                        <h4 className="media-heading color-danger">Mr. John</h4>
                                        <p>Cras sit amet nibh libero, in gravida nulla.</p>
                                        <div className="comment-date">Yesterday</div>
                                    </div>
                                </div>
                                <div className="media">
                                    <div className="media-left">
                                        <a href="#"><img className="media-object" src="images/avatar/1.jpg"
                                            alt="..." /></a>
                                    </div>
                                    <div className="media-body">
                                        <h4 className="media-heading color-primary">john doe</h4>
                                        <p>Cras sit amet nibh libero, in gravida nulla.</p>
                                        <p className="comment-date">10 min ago</p>
                                    </div>
                                </div>
                                <div className="media">
                                    <div className="media-left">
                                        <a href="#"><img className="media-object" src="images/avatar/2.jpg"
                                            alt="..." /></a>
                                    </div>
                                    <div className="media-body">
                                        <h4 className="media-heading color-success">Mr. John</h4>
                                        <p>Cras sit amet nibh libero, in gravida nulla.</p>
                                        <p className="comment-date">1 hour ago</p>
                                    </div>
                                </div>
                                <div className="media no-border">
                                    <div className="media-left">
                                        <a href="#"><img className="media-object" src="images/avatar/3.jpg"
                                            alt="..." /></a>
                                    </div>
                                    <div className="media-body">
                                        <h4 className="media-heading color-info">Mr. John</h4>
                                        <p>Cras sit amet nibh libero, in gravida nulla.</p>
                                        <div className="comment-date">Yesterday</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-4">
                        <div className="card">
                            <div className="card-title">
                                <h4>Timeline</h4>

                            </div>
                            <div className="card-body">
                                <ul className="timeline">
                                    <li>
                                        <div className="timeline-badge primary"><i className="fa fa-smile-o"></i></div>
                                        <div className="timeline-panel">
                                            <div className="timeline-heading">
                                                <h5 className="timeline-title">School promote video sharing</h5>
                                            </div>
                                            <div className="timeline-body">
                                                <p>10 minutes ago</p>
                                            </div>
                                        </div>
                                    </li>
                                    <li>
                                        <div className="timeline-badge warning"><i className="fa fa-sun-o"></i></div>
                                        <div className="timeline-panel">
                                            <div className="timeline-heading">
                                                <h5 className="timeline-title">Ready our school website and online
                                                    service</h5>
                                            </div>
                                            <div className="timeline-body">
                                                <p>20 minutes ago</p>
                                            </div>
                                        </div>
                                    </li>
                                    <li>
                                        <div className="timeline-badge danger"><i className="fa fa-times-circle-o"></i>
                                        </div>
                                        <div className="timeline-panel">
                                            <div className="timeline-heading">
                                                <h5 className="timeline-title">Routine pubish our website form
                                                    10/03/2017 </h5>
                                            </div>
                                            <div className="timeline-body">
                                                <p>30 minutes ago</p>
                                            </div>
                                        </div>
                                    </li>
                                    <li>
                                        <div className="timeline-badge success"><i className="fa fa-check-circle-o"></i>
                                        </div>
                                        <div className="timeline-panel">
                                            <div className="timeline-heading">
                                                <h5 className="timeline-title">Principle quotation publish our website
                                                </h5>
                                            </div>
                                            <div className="timeline-body">
                                                <p>15 minutes ago</p>
                                            </div>
                                        </div>
                                    </li>
                                    <li>
                                        <div className="timeline-badge warning"><i className="fa fa-sun-o"></i></div>
                                        <div className="timeline-panel">
                                            <div className="timeline-heading">
                                                <h5 className="timeline-title">Class schedule publish our website</h5>
                                            </div>
                                            <div className="timeline-body">
                                                <p>20 minutes ago</p>
                                            </div>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div> */}

                <div class="w-full bg-white rounded-2xl shadow-lg p-4 space-y-3 border border-gray-200">
                    <h2 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <span class="ti-bell text-blue-500 text-xl"></span>
                        Notifications / Alerts
                    </h2>

                    <div class="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                        <div class="flex-shrink-0 mt-1">
                            <span class="ti-timer text-orange-500 text-lg"></span>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm text-gray-700">
                                <span class="font-semibold">Job #4534DFD</span>{" "}
                                has been in production for <b>3 hours</b>.
                            </p>
                            <p class="text-xs text-gray-400">
                                Updated 10 mins ago
                            </p>
                        </div>
                    </div>

                    <div class="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                        <div class="flex-shrink-0 mt-1">
                            <span class="ti-calendar text-red-500 text-lg"></span>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm text-gray-700">
                                <span class="font-semibold">2 Jobs</span> have
                                deadlines today.
                            </p>
                            <p class="text-xs text-gray-400">Check schedule</p>
                        </div>
                    </div>

                    <div class="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                        <div class="flex-shrink-0 mt-1">
                            <span class="ti-check-box text-green-600 text-lg"></span>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm text-gray-700">
                                Mock-up approved for{" "}
                                <span class="font-semibold">Job #6543ERT</span>{" "}
                                → <b>Ready to Print</b>.
                            </p>
                            <p class="text-xs text-gray-400">1 hour ago</p>
                        </div>
                    </div>

                    <div class="text-right">
                        <button class="text-blue-500 text-sm hover:underline">
                            View All
                        </button>
                    </div>
                </div>
            </section>

            <Footer />
        </AdminLayout>
    );
}
