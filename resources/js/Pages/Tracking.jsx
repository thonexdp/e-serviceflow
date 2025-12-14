import React, { useEffect, useRef, useState } from "react";
import AdminLayout from "@/Components/Layouts/AdminLayout";
import { Head } from "@inertiajs/react";
import Modal from "@/Components/Main/Modal";

export default function Dashboard({
    user = {},
    notifications = [],
    messages = [],
}) {
    const [openCustomerModal, setCustomerModalOpen] = useState(false);
    const [forms, setForms] = useState({
        client: {
            firstname: "",
            middlename: "",
            lastname: "",
            phone: "",
            address: "",
        },
    });

    const [openReviewModal, setReviewModalOpen] = useState(false);
    const [openUploadModal, setUploadModalOpen] = useState(false);

    const handleSave = () => {
        setCustomerModalOpen(false);
        setForms([
            {
                client: {
                    firstname: "",
                    middlename: "",
                    lastname: "",
                    phone: "",
                    email: "",
                    address: "",
                },
            },
        ]);
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

            <Modal
                title="Upload"
                isOpen={openUploadModal}
                onClose={() => setUploadModalOpen(false)}
                onSave={handleSave}
                size="3xl"
                submitButtonText="Upload & Send for Approval"
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
                            <h6>Customers Files : </h6>
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
                        <hr className="my-3" />
                        <div>
                            <h6>Mock Files Here : </h6>
                            <button
                                type="button"
                                class="btn btn-link btn-outline btn-sm text-green-800"
                            >
                                <span className="ti-eye"></span>{" "}
                                Preview
                            </button>
                            <div className="mt-4">
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
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M7 16V4m10 0v12M4 8h16M4 12h16M4 16h16"
                                                />
                                            </svg>
                                            <p className="mb-2 text-sm text-gray-500">
                                                <span className="font-semibold">
                                                    Click to upload Design
                                                </span>{" "}
                                                or drag and drop
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                PNG, JPG, PDF up to 10MB
                                            </p>
                                        </div>
                                        <input
                                            id="dropzone-file"
                                            type="file"
                                            className="hidden"
                                            multiple
                                            onChange={(e) => {
                                                const files = Array.from(
                                                    e.target.files
                                                );
                                                console.log(files);
                                                setForm({
                                                    ...form,
                                                    attachments: files,
                                                });
                                            }}
                                        />
                                    </label>
                                </div>

                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">
                            Notes to Customer :
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
                <div class="content-wrap">
                    <div class="main">
                        <div class="container-fluid">
                            <div class="row">
                                <div class="col-lg-12">
                                    <div class="card">
                                        {/* <div class="button-list float-start">
                                            <button
                                                type="button"
                                                className="btn btn-primary btn-flat btn-sm btn-addon m-b-10 m-l-5"
                                                onClick={() =>
                                                    setCustomerModalOpen(true)
                                                }
                                            >
                                                <i class="ti-plus"></i>Add
                                                Upload Mock-Up
                                            </button>
                                        </div> */}
                                        <div class="card-title mt-3">
                                            <h4>Mock-Ups Lists </h4>
                                        </div>
                                        <div class="card-body">
                                            <div className="row mt-4">
                                                <div className="col-lg-3">
                                                    <div class="form-group">
                                                        <input
                                                            type="text"
                                                            class="form-control input-sm input-focus"
                                                            placeholder="Search"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-lg-3">
                                                    <div class="form-group">
                                                        <select class="form-control input-sm">
                                                            <option>All</option>
                                                            <option>
                                                                Pending
                                                            </option>
                                                            <option>
                                                                Revision
                                                                Requested
                                                            </option>
                                                            <option>
                                                                {" "}
                                                                Mock-up
                                                                Uploaded|Approved{" "}
                                                            </option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="table-responsive">
                                                <table class="table table-hover ">
                                                    <thead>
                                                        <tr>
                                                            <th>#</th>
                                                            <th>Ticket ID</th>
                                                            <th>Customer</th>
                                                            <th>
                                                                Descripition
                                                            </th>
                                                            <th>Status</th>
                                                            <th>Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr>
                                                            <th scope="row">
                                                                1
                                                            </th>
                                                            <td>092323232</td>
                                                            <td>
                                                                Juan dela Cruz
                                                            </td>
                                                            <td>
                                                                50 Pcs T-shirts
                                                            </td>
                                                            <td>
                                                                Pending Review
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
                                                            <th scope="row">
                                                                2
                                                            </th>
                                                            <td>
                                                                09232ddsd3232
                                                            </td>

                                                            <td>Pedo Cruz</td>
                                                            <td>
                                                                Poster Design
                                                            </td>
                                                            <td>
                                                                Revision Request
                                                            </td>
                                                            <td>
                                                                <button
                                                                    type="button"
                                                                    class="btn btn-link btn-outline btn-sm text-blue-500"
                                                                    onClick={() =>
                                                                        setUploadModalOpen(
                                                                            true
                                                                        )
                                                                    }
                                                                >
                                                                    <span className="ti-eye"></span>{" "}
                                                                    Upload
                                                                </button>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <th scope="row">
                                                                3
                                                            </th>
                                                            <td>092323232</td>

                                                            <td>
                                                                Anna dela Cruz
                                                            </td>
                                                            <td>Poster</td>
                                                            <td>
                                                                Mock-up Sent
                                                            </td>
                                                            <td>
                                                                <span className="ti-check"></span>
                                                                Approved
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
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
