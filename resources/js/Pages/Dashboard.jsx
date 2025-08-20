import React, { useEffect, useRef, useState } from 'react';
import AdminLayout from '../Components/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import Footer from '@/Components/Layouts/Footer';
import Modal from '@/Components/Main/Modal';

export default function Dashboard({ user = {}, notifications = [], messages = [] }) {

        const [openPaymentModal, setPaymentModalOpen] = useState(false);

         const handleSave = () => {
            console.log('save');
            
         }
    
         console.log('openPaymentModal:',openPaymentModal);
         
    return (
        <AdminLayout user={user} notifications={notifications} messages={messages}>
            <Head title="Dashboard" />
            
            <div className="row">
                <div className="col-lg-8 p-r-0 title-margin-right">
                    <div className="page-header">
                        <div className="page-title">
                            <h1>Hello, <span>Welcome Here</span></h1>
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
                                <div className="flex items-center my-4">
                                    <div className="flex-grow border-t border-gray-300"></div>
                                    <span className="px-4 text-gray-500 text-sm">
                                        Job Tickets Details
                                    </span>
                                    <div className="flex-grow border-t border-gray-300"></div>
                                </div>
                                <div>
                                        <label className="block text-sm font-medium">
                                           Customer : 
                                        </label>
                                        <label><b>John Doe</b></label>
                                 </div>
                                  <div>
                                        <label className="block text-sm font-medium">
                                           Amount Due :
                                        </label>
                                        <label><b> P 2,000.00</b></label>
                                 </div>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div>
                                        <label className="block text-sm font-medium">
                                           Paymeny Amount :
                                        </label>
                                        <input
                                            type="text"
                                            className="mt-1 w-full border rounded-md p-2"
                                            placeholder="Amount"
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
                                        <select name="" id="">
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
                                            placeholder="Status"
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
                        <div className="col-lg-3">
                            <div className="card p-0">
                                <div className="stat-widget-three home-widget-three">
                                    <div className="stat-icon bg-facebook">
                                        <i className="ti-printer"></i>
                                    </div>
                                    <div className="stat-content">
                                        <div className="stat-digit">New Tickets</div>
                                        <div className="stat-text">12 Today | 45 weeks</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-3">
                            <div className="card p-0">
                                <div className="stat-widget-three home-widget-three">
                                    <div className="stat-icon bg-youtube">
                                        <i className="ti-check-box"></i>
                                    </div>
                                    <div className="stat-content">
                                        <div className="stat-digit">Payment Pending</div>
                                        <div className="stat-text">7 Tickets | P18,000 Due</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-3">
                            <div className="card p-0">
                                <div className="stat-widget-three home-widget-three">
                                    <div className="stat-icon bg-twitter">
                                        <i className="ti-user"></i>
                                    </div>
                                    <div className="stat-content">
                                        <div className="stat-digit"> Completed Tickets</div>
                                        <div className="stat-text">5 Ready for PickUp</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-3">
                            <div className="card p-0">
                                <div className="stat-widget-three home-widget-three">
                                    <div className="stat-icon bg-danger">
                                        <i className="ti-pin"></i>
                                    </div>
                                    <div className="stat-content">
                                        <div className="stat-digit">In Progress</div>
                                        <div className="stat-text">7 Tickets</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="row">
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
                                     <th>#3424234243</th>
                                    </tr>
                                    <tr>
                                    <th>#3424234243</th>
                                    </tr>
                                </tbody>
                                </table>
                            </div>
                            </div>

                            </div>
                        </div>
                        <div className="col-lg-3">
                            <div className="card">
                                {/* <div className="card-title">
                                    <h4>Table Basic </h4>
                                    
                                </div> */}
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
                                                    <th>#3424234243</th>
                                                </tr>
                                                <tr>
                                                    <th>#3424234243</th>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-3">
                            <div className="card">
                                {/* <div className="card-title">
                                    <h4>Table Basic </h4>
                                    
                                </div> */}
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
                                                    <th>#3424234243</th>
                                                </tr>
                                                <tr>
                                                    <th>#3424234243</th>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-3">
                            <div className="card">
                                {/* <div className="card-title">
                                    <h4>Table Basic </h4>
                                    
                                </div> */}
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
                                                    <th>#3424234243</th>
                                                </tr>
                                                <tr>
                                                    <th>#3424234243</th>
                                                </tr>
                                            </tbody>
                                        </table>
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
                                    <div className="table-responsive">
                                        <table className="table student-data-table m-t-20">
                                            <thead>
                                                <tr>
                                                    <th>Ticket ID</th>
                                                    <th>Customer</th>
                                                    <th>Description</th>
                                                    <th>Due Date</th>
                                                    <th>Status</th>
                                                    <th>Payment</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>#2901</td>
                                                    <td>
                                                        John Doe
                                                    </td>
                                                    <td>
                                                        Print 30 tshirt
                                                    </td>
                                                    <td>
                                                        Sept. 23, 2025
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-primary">Pending</span>
                                                    </td>
                                                    <td>
                                                        P 2400.00
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>#2901</td>
                                                    <td>
                                                        Jan Dela Cruz
                                                    </td>
                                                    <td>
                                                        Print Mugs
                                                    </td>
                                                    <td>
                                                        Sept. 30, 2025
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-success">Approve</span>
                                                        
                                                    </td>
                                                    <td>
                                                        P 335.00
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>#2901</td>
                                                    <td>
                                                        John Doe
                                                    </td>
                                                    <td>
                                                        Print 30 tshirt
                                                    </td>
                                                    <td>
                                                        Sept. 23, 2025
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-primary badge-outline">Pending</span>
                                                    </td>
                                                    <td>
                                                        P 2400.00
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>#2901</td>
                                                    <td>
                                                        Jan Dela Cruz
                                                    </td>
                                                    <td>
                                                        Print Mugs
                                                    </td>
                                                    <td>
                                                        Sept. 30, 2025
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-success">Approve</span>
                                                        
                                                    </td>
                                                    <td>
                                                        P 335.00
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                     <div className="row">
                        <div className="col-lg-12">
                            <div className="card">
                                <div className="card-title pr">
                                    <h4>Payments</h4>

                                </div>
                                <div className="card-body">
                                    <div className="table-responsive">
                                        <table className="table student-data-table m-t-20">
                                            <thead>
                                                <tr>
                                                    <th>Ticket ID</th>
                                                    <th>Customer</th>
                                                    <th>Amount Due</th>
                                                    <th>Due Date</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>#2901</td>
                                                    <td>
                                                        John Doe
                                                    </td>
                                                    <td>
                                                        P 4500.00
                                                    </td>
                                                    <td>
                                                        Oct. 05, 2025
                                                    </td>
                                                    <td>
                                                       <button type="button" className="btn btn-default btn-outline m-b-10" onClick={() => setPaymentModalOpen(true)}><span className="ti-dropbox"></span> Pay</button>

                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>#2901</td>
                                                    <td>
                                                        John Doe
                                                    </td>
                                                    <td>
                                                        P 4500.00
                                                    </td>
                                                    <td>
                                                        Oct. 05, 2025
                                                    </td>
                                                    <td>
                                                      PAID
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="row">
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
                                                    alt="..."/></a>
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
                                                    alt="..."/></a>
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
                                                    alt="..."/></a>
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
                                                    alt="..."/></a>
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
                                                    alt="..."/></a>
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
                                                    alt="..."/></a>
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
                    </div>
            </section>

          <Footer/>
        </AdminLayout>
    );
}