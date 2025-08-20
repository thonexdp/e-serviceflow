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
    const [openTicketModal, setTicketModalOpen] = useState(false);
    const [forms, setForms] = useState({
        client: {
            firstname: "",
            middlename: "",
            lastname: "",
            phone: "",
            address: "",
        },
        ticket: {
            description: "",
            status: "",
        },
    });

    const handleSave = () => {
        console.log("Form submitted:", forms);
        alert("dsd");
        setOpen(false);
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
                ticket: {
                    description: "",
                    job_type: "",
                    quantity: "",
                    size: "",
                    due_date: "",
                    file_path: "",
                    downpayment: ""
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
             <Modal
                title="Add Tickets"
                isOpen={openTicketModal}
                onClose={() => setTicketModalOpen(false)}
                onSave={handleSave}
                size="3xl"
                submitButtonText="Save"
            >
                <form>
                    <div class="flex items-center my-4">
                        <div class="flex-grow border-t border-gray-300"></div>
                        <span class="px-4 text-gray-500 text-sm">
                            Job Tickets Details
                        </span>
                        <div class="flex-grow border-t border-gray-300"></div>
                    </div>
                    <div>
                            <label className="block text-sm font-medium">
                               Job Description
                            </label>
                            <input
                                type="text"
                                className="mt-1 w-full border rounded-md p-2"
                                placeholder="Description"
                                value={forms.ticket.description}
                                onChange={(e) =>
                                    setForms({
                                        ...forms,
                                        ticket: {
                                            ...forms.ticket,
                                            description: e.target.value,
                                        },
                                    })
                                }
                            />
                     </div>
                      <div>
                            <label className="block text-sm font-medium">
                               Job Type
                            </label>
                            <input
                                type="text"
                                className="mt-1 w-full border rounded-md p-2"
                                placeholder="Description"
                                value={forms.ticket.job_type}
                                onChange={(e) =>
                                    setForms({
                                        ...forms,
                                        ticket: {
                                            ...forms.ticket,
                                            job_type: e.target.value,
                                        },
                                    })
                                }
                            />
                     </div>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                        <div>
                            <label className="block text-sm font-medium">
                               Due Date
                            </label>
                            <input
                                type="text"
                                className="mt-1 w-full border rounded-md p-2"
                                placeholder="Description"
                                value={forms.ticket.due_date}
                                onChange={(e) =>
                                    setForms({
                                        ...forms,
                                        ticket: {
                                            ...forms.ticket,
                                            due_date: e.target.value,
                                        },
                                    })
                                }
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">
                                Status
                            </label>
                            <input
                                type="text"
                                className="mt-1 w-full border rounded-md p-2" // fixed small width
                                placeholder="Status"
                                value={forms.ticket.size}
                                onChange={(e) =>
                                    setForms({
                                        ...forms,
                                        ticket: {
                                            ...forms.ticket,
                                            size: e.target.value,
                                        },
                                    })
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">
                                Quantity
                            </label>
                            <input
                                type="text"
                                className="mt-1 w-full border rounded-md p-2" // fixed small width
                                placeholder="Status"
                                value={forms.ticket.quantity}
                                onChange={(e) =>
                                    setForms({
                                        ...forms,
                                        ticket: {
                                            ...forms.ticket,
                                            quantity: e.target.value,
                                        },
                                    })
                                }
                            />
                        </div>
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
                                <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                            </div>
                            <input
                            id="dropzone-file"
                            type="file"
                            className="hidden"
                            multiple
                            onChange={(e) => {
                                const files = Array.from(e.target.files);
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
                     <div class="flex items-center my-4">
                        <div class="flex-grow border-t border-gray-300"></div>
                        <span class="px-4 text-gray-500 text-sm">
                            Payments Details
                        </span>
                        <div class="flex-grow border-t border-gray-300"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                            <label className="block text-sm font-medium">
                               Price : P 12,980.00
                            </label>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">
                               Discount : 100.00
                            </label>
                        </div>
                        <div>
                            <div class="form-group has-success">
                                                <div class="row">
                                                    <label class="col-sm-4 control-label">DownPayment : </label>
                                                    <div class="col-sm-8">
                                                        <input type="text" class="form-control input-sm"
                                                         onChange={(e) =>
                                                                setForms({
                                                                    ...forms,
                                                                    ticket: {
                                                                        ...forms.ticket,
                                                                        downpayment: e.target.value,
                                                                    },
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                        </div>
                    </div>
                    

                </form>
            </Modal>

            <section id="main-content">
                <div className="row">
                    <div class="col-lg-6">
                            <div class="card">
                                <div class="card-title">
                                    <h4>Search Customer</h4>
                                    
                                </div>
                                <div class="card-body">
                                    <div class="basic-form">
                                        <form>
                                            <div class="form-group">
                                                <p class="text-muted m-b-15 f-s-12">Search customer here if already registered.</p>
                                                <div class="input-group">
                                                    <input type="text" placeholder="Search Customer" name="Search" class="form-control" />
                                                    <span class="input-group-btn"><button class="btn btn-primary btn-group-right" type="submit"><i class="ti-search"></i></button></span>
                                                </div>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                    </div>
                    <div className="col-md-3">
                         <div class="card">
                                <div class="card-body">
                                    <button type="button" class="btn btn-success btn-sm btn-flat btn-addon m-b-10 m-l-5" 
                                                        onClick={() => setCustomerModalOpen(true)}
                                    ><i class="ti-plus"></i>Add Customer</button>
                                </div>
                            </div>
                    </div>

                </div>
                <div className="row">
                    <div class="col-lg-6">
                            <div class="card">
                                <div class="card-title">
                                    <h6>Customer Details </h6>
                                </div>
                                <div class="card-body mt-3">
                                    <div className="row">
                                        <div className="col-lg-6">
                                           <ul> 
                                                <li>
                                                    <label> Name : <span><b>John Doe</b></span></label>
                                                </li>
                                                <li>
                                                    <label> Phone : <span><b>09123456789</b></span></label>
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="col-lg-6">
                                           <ul> 
                                                <li>
                                                    <label> Email : <span><b>JhnDoe@gmail.com</b></span></label>
                                                </li>
                                                <li>
                                                    <label> Address : <span><b>Sogod Southern Leyte</b></span></label>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>
                        </div>
                </div>
                <div class="content-wrap">
                    <div class="main">
                        <div class="container-fluid">
                            <div class="row">
                                <div class="col-lg-12">
                                    <div class="card">
                                        <div className="row">                                            
                                            <div className="col-lg-5">
                                                <h3><b>Job Ticket Section</b></h3>
                                                <label className="mt-2">Job Ticket for Client : <b>John Doe</b></label>
                                            </div>
                                            <div className="col-lg-7">
                                                <div class="button-list float-end">
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary btn-flat btn-sm btn-addon m-b-10 m-l-5"
                                                        onClick={() => setTicketModalOpen(true)}
                                                    >
                                                        <i class="ti-plus"></i>Add
                                                        Tickets
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="card-title">
                                            <h4>Tickets </h4>
                                        </div>
                                        <div class="card-body">
                                            <div class="table-responsive">
                                                <table class="table table-hover ">
                                                    <thead>
                                                        <tr>
                                                            <th>#</th>
                                                            <th>Ticket ID</th>
                                                            <th>
                                                                Description
                                                            </th>
                                                            <th>Quantity</th>
                                                            <th>Due Date</th>
                                                            <th>
                                                                Payment Status
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr>
                                                            <th scope="row">
                                                               1
                                                            </th>
                                                            <td>
                                                               #6453214543564
                                                            </td>
                                                            <td>50 Pcs shirt print</td>
                                                            <td>
                                                               50 Pcs
                                                            </td>
                                                            <td>
                                                                Sept. 23, 2025
                                                            </td>
                                                             <td>
                                                                 <span class="badge badge-primary">
                                                                    Pending Design Verification
                                                                </span>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <th scope="row">
                                                               2
                                                            </th>
                                                            <td>
                                                               #64534344543564
                                                            </td>
                                                            <td>Poster Printing</td>
                                                            <td>
                                                               20 Pcs
                                                            </td>
                                                            <td>
                                                                Sept. 25, 2025
                                                            </td>
                                                             <td>
                                                                 <span class="badge badge-success">
                                                                    Approved
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
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </AdminLayout>
    );
}
