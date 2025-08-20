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

    return (
        <div className={sidebarClasses}>
            <div className="nano">
                <div className="nano-content">
                    <div className="logo">
                        <Link href="/">
                            <span>Focus</span>
                        </Link>
                    </div>
                    <ul>
                        <li className="label">Main - Fron Desk</li>
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


                     <ul>
                        <li className="label">Main | Graphic Artist</li>
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
                                <i className="ti-user"></i> Mock-Ups
                            </Link>
                        </li>
                    </ul>


                    <ul>
                        <li className="label">Main - Production</li>
                        <li>
                            <Link href="/">
                                <i className="ti-calendar"></i> Dashboard
                            </Link>
                        </li>
                        <li>
                            <Link href="/tickets">
                                <i className="ti-email"></i> Tickets (Approved / Ready to Print)
                            </Link>
                        </li>
                        <li>
                            <Link href="/customers">
                                <i className="ti-user"></i> Daily Output
                            </Link>
                        </li>
                    </ul>

                    <ul>
                        <li className="label">Main - Admin</li>
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


                </div>
            </div>
        </div>
    );
}