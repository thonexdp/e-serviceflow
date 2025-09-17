import React from 'react';
import { Link } from '@inertiajs/react';

export default function Sidebar({ isCollapsed }) {
    const sidebarClasses = [
        'sidebar',
        'sidebar-hide-to-small',
        'sidebar-shrink',
        'sidebar-gestures',
        isCollapsed ? 'sidebar-hide' : ''
    ].filter(Boolean).join(' ');
    // Front Desk = 4
    // Graphic Artist = 3
    // Production = 2
    // Admin = 1

    const role = 1;
    return (
        <div className={sidebarClasses}>
            <div className="nano">
                <div className="nano-content">
                    <div className="logo">
                        <Link href="/">
                            <span>E-System</span>
                        </Link>
                    </div>
                    <ul>
                        <li className="label">Main</li>
                    </ul>
                    {role === 4 ? (
                        <ul>
                            <li>
                                <Link href="/">
                                    <i className="ti-calendar"></i> Dashboard
                                </Link>
                            </li>
                            <li>
                            <Link href="/tickets">
                                    <i className="ti-email"></i> Tickets
                                </Link>
                            </li>
                            <li>
                                <Link href="/customers">
                                    <i className="ti-user"></i> Customers
                                </Link>
                            </li>
                        </ul>
                    )

                        : role === 3 ? (
                            < ul >
                                <li>
                                    <Link href="/">
                                        <i className="ti-calendar"></i> Dashboard
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/tickets">
                                        <i className="ti-email"></i> Tickets
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/mock-ups">
                                        <i className="ti-user"></i> Mock-Ups
                                    </Link>
                                </li>
                            </ul>

                        ) : role === 2 ? (
                            <ul>

                                <li>
                                    <Link href="/">
                                        <i className="ti-calendar"></i> Dashboard
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/tickets">
                                        <i className="ti-email"></i> Tickets
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/production">
                                        <i className="ti-user"></i> Production Queue
                                    </Link>
                                </li>
                            </ul>
                        ) : role === 1 && (
                            <ul>
                                <li>
                                    <Link href="/">
                                        <i className="ti-calendar"></i> Dashboard
                                    </Link>
                                </li>
                                 <li>
                                    <Link href="/tickets">
                                        <i className="ti-user"></i> Users Management
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/tickets">
                                        <i className="ti-ticket"></i> Job Tickets
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/customers">
                                        <i className="ti-stamp"></i> Job Types & Pricing
                                    </Link>
                                </li>
                                  <li>
                                    <Link href="/customers">
                                        <i className="ti-user"></i> Clients
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/customers">
                                        <i className="ti-credit-card"></i> Payments & Finance
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/customers">
                                        <i className="ti-stats-up"></i> Reports & Analytics
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/settings">
                                        <i className="ti-settings"></i> System Settings
                                    </Link>
                                </li>
                            </ul>

                        )
                    }

                </div>
            </div>
        </div >
    );
}