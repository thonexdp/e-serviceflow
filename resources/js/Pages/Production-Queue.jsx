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
        console.log("Form submitted:", forms);
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
                submitButtonText="Start Production"
            >
                <form>
                    <div className="mb-4">
                        <h3>
                            {" "}
                            Record Payment for Ticket: <b>#20454-12</b>{" "}
                        </h3>
                        <div className="my-1">
                            <h5>
                                {" "}
                                Description :{" "}
                                <b> 50pcs T-shirts (front & back)</b>
                            </h5>
                        </div>
                        <div className="my-1">
                            <h5>
                                {" "}
                                Status : <b> Ready for Production</b>
                            </h5>
                        </div>
                        <hr className="my-3" />
                        <h5>Costumer Info : </h5>
                        <div className="my-1">
                            <h5>
                                {" "}
                                Name : <b> John Doe</b>
                            </h5>
                        </div>
                        <div className="my-1">
                            <h5>
                                {" "}
                                Contact : <b> 0912121212</b> |{" "}
                                <b> test@gmail.com</b>
                            </h5>
                        </div>
                        <hr className="my-3" />
                        <div>
                            <h6>Design Files : </h6>
                            <ul>
                                <li>
                                    <span className="mr-2">
                                        Final Design1.png
                                    </span>{" "}
                                    |
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
                        <h5>
                            Quantity : <b>0 / 50</b>
                        </h5>
                    </div>
                </form>
            </Modal>

            <Modal
                title="Update Production"
                isOpen={openUploadModal}
                onClose={() => setUploadModalOpen(false)}
                onSave={handleSave}
                size="3xl"
                submitButtonText="Save Progress"
                submitSecond="Mark Completed"
            >
                <form>
                    <div className="mb-4">
                        <h2>
                            Update Progress - Ticket <b>#GH43456</b>{" "}
                        </h2>
                        <hr className="my-3" />
                        <div className="my-1">
                            <h5>
                                {" "}
                                Description :{" "}
                                <b> 50pcs T-shirts (front & back)</b>
                            </h5>
                        </div>
                        <div className="my-1">
                            <h5>
                                {" "}
                                Status : <b> In Production</b>
                            </h5>
                        </div>
                        <hr className="my-3" />
                    </div>
                    <div className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-12">
                            <h2 className="text-lg font-semibold">
                                Produced so far : <b className="text-red-700">30 / </b> 100
                            </h2>
                        </div>

                          <div className="col-span-5">
                            <h5 className="text-sm font-medium mb-1">
                                Custom :
                            </h5>
                            <input
                                type="text"
                                className="w-[100px] border-0 border-b-2 border-black-800 focus:border-blue-500 focus:ring-0 text-sm"
                                placeholder="0"
                            />
                        </div>

                        <div className="col-span-4">
                            <div className="flex divide-x divide-gray-300 rounded overflow-hidden">
                                <button
                                    type="button"
                                    className="px-2 text-blue-500 text-sm hover:underline"
                                >
                                    <span className="ti-plus text-xs"></span> 1
                                </button>
                                <button
                                    type="button"
                                    className="px-2 text-blue-500 text-sm hover:underline"
                                >
                                    <span className="ti-plus text-xs"></span> 2
                                </button>
                                <button
                                    type="button"
                                    className="px-2 text-blue-500 text-sm hover:underline"
                                >
                                    <span className="ti-plus text-xs"></span> 5
                                </button>
                                <button
                                    type="button"
                                    className="px-2 text-blue-500 text-sm hover:underline"
                                >
                                    <span className="ti-plus text-xs"></span> 10
                                </button>
                            </div>
                        </div>

                      
                    </div>
                    <hr className="my-3" />
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
                                                                Ready for
                                                                Production
                                                            </option>
                                                            <option>
                                                                In Progress
                                                            </option>
                                                            <option>
                                                                Completed
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
                                                            <th>
                                                                Qty
                                                                <br />
                                                                (Produced/Total)
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
                                                            <td> 0 / 30 </td>
                                                            <td>
                                                                Ready to Print
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
                                                                    View
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
                                                            <td> 10 / 40 </td>
                                                            <td>In Progress</td>
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
                                                                    Update
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
                                                            <td> 10 / 10 </td>
                                                            <td>Completed</td>
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

            <Footer />
        </AdminLayout>
    );
}
