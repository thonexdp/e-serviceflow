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
    const [openReviewModal, setReviewModalOpen] = useState(false);
    const [openUploadModal, setUploadModalOpen] = useState(false);

    const handleSave = () => {
        console.log("save");
    };

    return (
        <AdminLayout
            user={user}
            notifications={notifications}
            messages={messages}
        >
            <Head title="Dashboard" />

            <Modal
                title="Review"
                isOpen={openReviewModal}
                onClose={() => setReviewModalOpen(false)}
                onSave={handleSave}
                size="3xl"
                submitButtonText="Submit"
            >
                <form>
                    <div className="mb-4">
                        <h3>
                            {" "}
                            Record Payment for Ticket: <b>#20454-12</b>{" "}
                        </h3>
                        <div>
                            <h5>
                                {" "}
                                Customer : <b> John Doe</b>
                            </h5>
                        </div>
                        <div>
                            <h5>
                                {" "}
                                Description :{" "}
                                <b> 50pcs T-shirts (front & back)</b>
                            </h5>
                        </div>
                        <hr className="my-3" />
                        <div>
                            <h6> Files : </h6>
                            <ul>
                                <li>
                                    <span className="mr-2">Design1.png</span> |
                                    <div class="btn-group ml-3">
                                        <button
                                            type="button"
                                            class="btn btn-link btn-outline btn-sm text-blue-500"
                                        >
                                            <span className="ti-download"></span>{" "}
                                            Download
                                        </button>
                                        <button
                                            type="button"
                                            class="btn btn-link btn-outline btn-sm text-green-800"
                                        >
                                            <span className="ti-eye"></span>{" "}
                                            Preview
                                        </button>
                                    </div>
                                </li>
                            </ul>
                        </div>
                        <hr className="my-3" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">
                            <input
                                type="checkbox"
                                name="status"
                                class="mail-checkbox"
                            />{" "}
                            <b>Approved</b>
                        </label>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">
                            <input
                                type="checkbox"
                                name="status"
                                class="mail-checkbox"
                            />{" "}
                            <b>Request Revisions</b>
                        </label>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">
                            Notes :
                        </label>
                        <input
                            type="text"
                            className="mt-1 w-full border p-2" // fixed small width
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
                </form>
            </Modal>

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

            <section id="main-content">
                <div className="row">
                    {/* Tickets Pending Review */}
                    <div className="col-lg-3">
                        <div className="card p-0">
                            <div className="stat-widget-three home-widget-three">
                                <div className="stat-icon bg-secondary">
                                    <i className="ti-clipboard"></i>
                                </div>
                                <div className="stat-content">
                                    <div className="stat-digit">
                                        Tickets Pending Review
                                    </div>
                                    <div className="stat-text">12</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Revision Requested */}
                    <div className="col-lg-3">
                        <div className="card p-0">
                            <div className="stat-widget-three home-widget-three">
                                <div className="stat-icon bg-danger">
                                    <i className="ti-reload"></i>
                                </div>
                                <div className="stat-content">
                                    <div className="stat-digit">
                                        Revision Requested
                                    </div>
                                    <div className="stat-text">4</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mock-Ups Uploaded Today */}
                    <div className="col-lg-3">
                        <div className="card p-0">
                            <div className="stat-widget-three home-widget-three">
                                <div className="stat-icon bg-info">
                                    <i className="ti-upload"></i>
                                </div>
                                <div className="stat-content">
                                    <div className="stat-digit">
                                        Mock-Ups Uploaded Today
                                    </div>
                                    <div className="stat-text">9</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Approved Design */}
                    <div className="col-lg-3">
                        <div className="card p-0">
                            <div className="stat-widget-three home-widget-three">
                                <div className="stat-icon bg-success">
                                    <i className="ti-thumb-up"></i>
                                </div>
                                <div className="stat-content">
                                    <div className="stat-digit">
                                        Approved Design
                                    </div>
                                    <div className="stat-text">15</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-title pr">
                                <h4>All Tickets</h4>
                            </div>
                            <div className="card-body">
                                <div className="row mt-4">
                                    <div className="col-lg-3">
                                        <div class="form-group">
                                            <label>Search Name</label>
                                            <input
                                                type="text"
                                                class="form-control input-focus input-sm"
                                                placeholder=""
                                            />
                                        </div>
                                    </div>
                                    <div className="col-lg-3">
                                        <div class="form-group">
                                            <label>Status Type</label>
                                            <select class="form-control input-sm">
                                                <option>Pending Review</option>
                                                <option>
                                                    Revision Requested
                                                </option>
                                                <option>
                                                    Mock-up Uploaded
                                                </option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="col-lg-2">
                                        <div class="form-group">
                                            <label>From</label>
                                            <input
                                                type="date"
                                                class="form-control input-sm"
                                                placeholder="Input Focus"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-lg-2">
                                        <div class="form-group">
                                            <label>To</label>
                                            <input
                                                type="date"
                                                class="form-control input-sm"
                                                placeholder="Input Focus"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-lg-2"></div>
                                </div>
                                <div className="table-responsive">
                                    <table className="table student-data-table m-t-20">
                                        <thead>
                                            <tr>
                                                <th>Ticket ID</th>
                                                <th>Customer</th>
                                                <th>Description</th>
                                                <th>Due Date</th>
                                                <th>Status</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>#43242</td>
                                                <td>John Doe</td>
                                                <td>Print 30 tshirt</td>
                                                <td>Sept. 23, 2025</td>
                                                <td>
                                                    <span className="badge badge-primary">
                                                        Pending Review
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        class="btn btn-link btn-outline btn-sm text-blue-500"
                                                        onClick={() =>
                                                            setReviewModalOpen(
                                                                true
                                                            )
                                                        }
                                                    >
                                                        <span className="ti-eye"></span>{" "}
                                                        Review
                                                    </button>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>#7456345</td>
                                                <td>Jan Dela Cruz</td>
                                                <td>Print Mugs</td>
                                                <td>Sept. 30, 2025</td>
                                                <td>
                                                    <span className="badge badge-warning">
                                                        Revision Requested
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        class="btn btn-link btn-outline btn-sm text-blue-500"
                                                    >
                                                        <span className="ti-ruler-pencil"></span>{" "}
                                                        Revise
                                                    </button>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>#54653232</td>
                                                <td>John Doe</td>
                                                <td>Print 30 tshirt</td>
                                                <td>Sept. 23, 2025</td>
                                                <td>
                                                    <span className="badge badge-primary badge-success">
                                                        Mock-Up Uploaded
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        class="btn btn-flat btn-sm text-blue-500"
                                                    >
                                                        <span className="ti-check-box"></span>{" "}
                                                        Approved
                                                    </button>
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
            </section>

            <Footer />
        </AdminLayout>
    );
}
