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

    const role = 4;
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
                                        <i className="ti-email"></i> Tickets
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/customers">
                                        <i className="ti-user"></i> Customers
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/customers">
                                        <i className="ti-user"></i> Payments
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/customers">
                                        <i className="ti-user"></i> Reports
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/settings">
                                        <i className="ti-layout-grid2-alt"></i> Settings
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