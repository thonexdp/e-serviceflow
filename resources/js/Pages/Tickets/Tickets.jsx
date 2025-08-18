import React, { useEffect, useRef } from 'react';
import AdminLayout from '@/Components/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import Footer from '@/Components/Layouts/Footer';

export default function Dashboard({ user = {}, notifications = [], messages = [] }) {

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

            <section id="main-content">
                 <div class="row">
            <div class="col-lg-3">
              <div class="card">
                <div class="stat-widget-one">
                  <div class="stat-icon dib">
                    <i class="ti-money color-success border-success"></i>
                  </div>
                  <div class="stat-content dib">
                    <div class="stat-text">New Tickets</div>
                    <div class="stat-digit">1,012</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-lg-3">
              <div class="card">
                <div class="stat-widget-one">
                  <div class="stat-icon dib">
                    <i class="ti-user color-primary border-primary"></i>
                  </div>
                  <div class="stat-content dib">
                    <div class="stat-text">Payments Pending</div>
                    <div class="stat-digit">961</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-lg-3">
              <div class="card">
                <div class="stat-widget-one">
                  <div class="stat-icon dib">
                    <i class="ti-layout-grid2 color-pink border-pink"></i>
                  </div>
                  <div class="stat-content dib">
                    <div class="stat-text">Completed Tickets</div>
                    <div class="stat-digit">770</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-lg-3">
              <div class="card">
                <div class="stat-widget-one">
                  <div class="stat-icon dib">
                    <i class="ti-link color-danger border-danger"></i>
                  </div>
                  <div class="stat-content dib">
                    <div class="stat-text">Others</div>
                    <div class="stat-digit">2,781</div>
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
                               <div class="button-list">
                                 <button type="button" class="btn btn-primary btn-flat btn-addon m-b-10 m-l-5"><i class="ti-plus"></i>Add Tickets</button>
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
                                                    <th>Customer Name</th>
                                                    <th>Status</th>
                                                    <th>Payment Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <th scope="row">1</th>
                                                    <td>Kolor Tea Shirt For Man</td>
                                                    <td>January 22</td>
                                                    <td><span class="badge badge-primary">Sale</span></td>
                                                    <td class="color-primary">$21.56</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">2</th>
                                                    <td>Kolor Tea Shirt For Women</td>
                                                    <td>January 30</td>
                                                    <td><span class="badge badge-success">Tax</span></td>
                                                    <td class="color-success">$55.32</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">3</th>
                                                    <td>Blue Backpack For Baby</td>
                                                    <td>January 25</td>
                                                    <td><span class="badge badge-danger">Extended</span></td>
                                                    <td class="color-danger">$14.85</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">1</th>
                                                    <td>Kolor Tea Shirt For Man</td>
                                                    <td>January 22</td>
                                                    <td><span class="badge badge-primary">Sale</span></td>
                                                    <td class="color-primary">$21.56</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">2</th>
                                                    <td>Kolor Tea Shirt For Women</td>
                                                    <td>January 30</td>
                                                    <td><span class="badge badge-success">Tax</span></td>
                                                    <td class="color-success">$55.32</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">3</th>
                                                    <td>Blue Backpack For Baby</td>
                                                    <td>January 25</td>
                                                    <td><span class="badge badge-danger">Extended</span></td>
                                                    <td class="color-danger">$14.85</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">1</th>
                                                    <td>Kolor Tea Shirt For Man</td>
                                                    <td>January 22</td>
                                                    <td><span class="badge badge-primary">Sale</span></td>
                                                    <td class="color-primary">$21.56</td>
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

          <Footer/>
        </AdminLayout>
    );
}