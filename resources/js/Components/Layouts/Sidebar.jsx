import React from "react";
import { Link, usePage } from "@inertiajs/react";

export default function Sidebar({ isCollapsed }) {
    const { auth } = usePage().props;

    console.log("Auth side", auth);

    const sidebarClasses = [
        "sidebar",
        "sidebar-hide-to-small",
        "sidebar-shrink",
        "sidebar-gestures",
        isCollapsed ? "sidebar-hide" : "",
    ]
        .filter(Boolean)
        .join(" ");
    // Front Desk = 4
    // Graphic Artist = 3
    // Production = 2
    // Admin = 1

    const role = auth?.user?.role;
    if (!role) {
        return null;
    }
    return (
        <div className={sidebarClasses}>
            <div className="nano">
                <div className="nano-content">
                    <div className="logo flex flex-col items-center py-4">
                        <Link href="/" className="flex flex-col items-center">
                            <img
                                src="/images/logo.jpg"
                                alt="RC PrintShoppe Logo"
                                className="w-16 h-16 object-contain mb-2"
                            // className="w-16 h-16 rounded-full shadow-md bg-white p-1"
                            />
                            <span className="text-lg font-semibold">
                                RC PrintShoppe
                            </span>
                        </Link>
                    </div>

                    <ul>
                        <li className="label">Main</li>
                    </ul>
                    {role === "FrontDesk" ? (
                        <ul>
                            <li>
                                <Link href="/frontdesk/">
                                    <i className="ti-calendar"></i> Dashboard
                                </Link>
                            </li>
                            <li>
                                <Link href="/frontdesk/tickets">
                                    <i className="ti-email"></i> Tickets
                                </Link>
                            </li>
                            <li>
                                <Link href="/frontdesk/finance">
                                    <i className="ti-credit-card"></i> Payments & Finance
                                </Link>
                            </li>
                            <li>
                                <Link href="/frontdesk/customers">
                                    <i className="ti-user"></i> Customers
                                </Link>
                            </li>
                            <li>
                                <Link href="/frontdesk/inventory">
                                    <i className="ti-package"></i> Inventory
                                </Link>
                            </li>
                        </ul>
                    ) : role === "Designer" ? (
                        <ul>
                            <li>
                                <Link href="/designer/">
                                    <i className="ti-calendar"></i> Dashboard
                                </Link>
                            </li>
                            {/* <li>
                                    <Link href="/tickets">
                                        <i className="ti-email"></i> Tickets
                                    </Link>
                                </li> */}
                            <li>
                                <Link href="/designer/mock-ups">
                                    <i className="ti-user"></i> Mock-Ups
                                </Link>
                            </li>
                        </ul>
                    ) : role === "Production" ? (
                        <ul>
                            <li>
                                <Link href="/production/">
                                    <i className="ti-calendar"></i> Dashboard
                                </Link>
                            </li>
                            {/* <li>
                                    <Link href="/tickets">
                                        <i className="ti-email"></i> Tickets
                                    </Link>
                                </li> */}
                            <li>
                                <Link href="/production/queue">
                                    <i className="ti-user"></i> Production Queue
                                </Link>
                            </li>
                            <li>
                                <Link href="/production/inventory">
                                    <i className="ti-package"></i> Inventory
                                </Link>
                            </li>
                            <li>
                                <Link href="/production/purchase-orders">
                                    <i className="ti-shopping-cart"></i>{" "}
                                    Purchase Orders
                                </Link>
                            </li>
                        </ul>
                    ) : (
                        role === "admin" && (
                            <ul>
                                <li>
                                    <Link href="/admin/">
                                        <i className="ti-calendar"></i>{" "}
                                        Dashboard
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/admin/customers">
                                        <i className="ti-user"></i> Clients
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/admin/tickets">
                                        <i className="ti-ticket"></i> Job
                                        Tickets
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/admin/job-types">
                                        <i className="ti-stamp"></i> Job Types &
                                        Pricing
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/admin/inventory">
                                        <i className="ti-package"></i> Inventory
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/admin/purchase-orders">
                                        <i className="ti-shopping-cart"></i>{" "}
                                        Purchase Orders
                                    </Link>
                                </li>

                                <li>
                                    <Link href="/admin/finance">
                                        <i className="ti-credit-card"></i>{" "}
                                        Payments & Finance
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/admin/tickets">
                                        <i className="ti-user"></i> Users
                                        Management
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/admin/customers">
                                        <i className="ti-stats-up"></i> Reports
                                        & Analytics
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/admin/settings">
                                        <i className="ti-settings"></i> System
                                        Settings
                                    </Link>
                                </li>
                            </ul>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
