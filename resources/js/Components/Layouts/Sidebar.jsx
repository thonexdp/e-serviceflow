import React from 'react';
import { Link } from '@inertiajs/react';

export default function Sidebar() {
    return (
        <div className="sidebar sidebar-hide-to-small sidebar-shrink sidebar-gestures">
            <div className="nano">
                <div className="nano-content">
                    <div className="logo">
                        <Link href="/">
                            <span>Focus</span>
                        </Link>
                    </div>
                    <ul>
                        <li className="label">Main</li>
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
                            <Link href="/reports">
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