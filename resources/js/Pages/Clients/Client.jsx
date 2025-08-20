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
        }
    });

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
                }
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
                title="Add Customer"
                isOpen={openCustomerModal}
                onClose={() => setCustomerModalOpen(false)}
                onSave={handleSave}
                size="3xl"
                submitButtonText="Save"
            >
                <form>
                    <div class="flex items-center my-4">
                        <div class="flex-grow border-t border-gray-300"></div>
                        <span class="px-4 text-gray-500 text-sm">
                            Client Details
                        </span>
                        <div class="flex-grow border-t border-gray-300"></div>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
                        <div>
                            <label className="block text-sm font-medium">
                                FirstName
                            </label>
                            <input
                                type="text"
                                className="mt-1 w-full border rounded-md p-2"
                                placeholder="FirstName"
                                value={forms.client.firstname}
                                onChange={(e) =>
                                    setForms({
                                        ...forms,
                                        client: {
                                            ...forms.client,
                                            firstname: e.target.value,
                                        },
                                    })
                                }
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">
                                MiddleName
                            </label>
                            <input
                                type="text"
                                className="mt-1 w-32 border rounded-md p-2" // fixed small width
                                placeholder="(Optional))"
                                value={forms.client.middlename}
                                onChange={(e) =>
                                    setForms({
                                        ...forms,
                                        client: {
                                            ...forms.client,
                                            middlename: e.target.value,
                                        },
                                    })
                                }
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">
                                LastName
                            </label>
                            <input
                                type="text"
                                className="mt-1 w-full border rounded-md p-2"
                                placeholder="LastName"
                                value={forms.client.lastname}
                                onChange={(e) =>
                                    setForms({
                                        ...forms,
                                        client: {
                                            ...forms.client,
                                            lastname: e.target.value,
                                        },
                                    })
                                }
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                            <label className="block text-sm font-medium">
                                Phone
                            </label>
                            <input
                                type="text"
                                className="mt-1 w-full border rounded-md p-2"
                                placeholder="Phone"
                                value={forms.client.phone}
                                onChange={(e) =>
                                    setForms({
                                        ...forms,
                                        client: {
                                            ...forms.client,
                                            phone: e.target.value,
                                        },
                                    })
                                }
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">
                                Email
                            </label>
                            <input
                                type="text"
                                className="mt-1 w-full border rounded-md p-2"
                                placeholder="Email"
                                value={forms.client.email}
                                onChange={(e) =>
                                    setForms({
                                        ...forms,
                                        client: {
                                            ...forms.client,
                                            email: e.target.value,
                                        },
                                    })
                                }
                            />
                        </div>
                        </div>
                        <div className="mt-2">
                          <div>
                            <label className="block text-sm font-medium">
                                Address
                            </label>
                            <input
                                type="text"
                                className="mt-1 w-full border rounded-md p-2"
                                placeholder="Address"
                                value={forms.client.address}
                                onChange={(e) =>
                                    setForms({
                                        ...forms,
                                        client: {
                                            ...forms.client,
                                            address: e.target.value,
                                        },
                                    })
                                }
                            />
                        </div>
                    </div>
                </form>
            </Modal>

            <section id="main-content">
                <div class="content-wrap">
                    <div class="main">
                        <div class="container-fluid">
                            <div class="row">
                                <div class="col-lg-12">
                                    <div class="card">
                                         <div class="button-list float-start">
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary btn-flat btn-sm btn-addon m-b-10 m-l-5"
                                                        onClick={() => setCustomerModalOpen(true)}
                                                    >
                                                        <i class="ti-plus"></i>Add
                                                        Customer
                                                    </button>
                                                </div>
                                        <div class="card-title mt-3">
                                            <h4>Customer Lists </h4>
                                        </div>
                                        <div class="card-body">
                                            <div class="table-responsive">
                                                <table class="table table-hover ">
                                                    <thead>
                                                        <tr>
                                                            <th>#</th>
                                                            <th>Name</th>
                                                            <th>
                                                                Phone
                                                            </th>
                                                            <th>Email</th>
                                                            <th>Address</th>
                                                            <th>
                                                                Action
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr>
                                                            <th scope="row">
                                                                1
                                                            </th>
                                                            <td>
                                                                Juan dela Cruz
                                                            </td>
                                                            <td>092323232</td>
                                                            <td>
                                                               test@gmail.com
                                                            </td>
                                                            <td>
                                                                Bontoc, Sogod Souther Leyte
                                                            </td>
                                                             <td>
                                                                <div class="btn-group">
                                                                    <button type="button" class="btn btn-link btn-outline btn-sm text-blue-500"><span className="ti-pencil-alt"></span> Edit</button>
                                                                    <button type="button" class="btn btn-link btn-outline btn-sm text-red-500"><span className="ti-trash"></span> Delete</button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                       <tr>
                                                            <th scope="row">
                                                                2
                                                            </th>
                                                            <td>
                                                                Pedo  Cruz
                                                            </td>
                                                            <td>09232ddsd3232</td>
                                                            <td>
                                                               test@gmail.com
                                                            </td>
                                                            <td>
                                                                Sogod, Sogod Souther Leyte
                                                            </td>
                                                             <td>
                                                                <div class="btn-group">
                                                                    <button type="button" class="btn btn-link btn-outline btn-sm text-blue-500"><span className="ti-pencil-alt"></span> Edit</button>
                                                                    <button type="button" class="btn btn-link btn-outline btn-sm text-red-500"><span className="ti-trash"></span> Delete</button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <th scope="row">
                                                                1
                                                            </th>
                                                            <td>
                                                                Anna dela Cruz
                                                            </td>
                                                            <td>092323232</td>
                                                            <td>
                                                               test@gmail.com
                                                            </td>
                                                            <td>
                                                                Bontoc, Sogod Souther Leyte
                                                            </td>
                                                             <td>
                                                                <div class="btn-group">
                                                                    <button type="button" class="btn btn-link btn-outline btn-sm text-blue-500"><span className="ti-pencil-alt"></span> Edit</button>
                                                                    <button type="button" class="btn btn-link btn-outline btn-sm text-red-500"><span className="ti-trash"></span> Delete</button>
                                                                </div>
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
