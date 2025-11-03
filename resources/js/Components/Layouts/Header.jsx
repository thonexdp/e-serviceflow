import React from 'react';

export default function Header({
    user = {},
    notifications = [],
    messages = [],
    onToggleSidebar
}) {
    const userName = user?.name || 'Juan Dela Cruz';
    const userAvatar = user?.avatar || 'images/avatar/default.jpg';

    const handleToggleClick = (e) => {
        e.preventDefault();
        console.log('Sidebar toggle clicked');
        onToggleSidebar();
    };

    return (
        <div className="header">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="float-left">
                            <div className="hamburger sidebar-toggle" onClick={handleToggleClick}>
                                <span className="line"></span>
                                <span className="line"></span>
                                <span className="line"></span>
                            </div>
                        </div>
                        <div className="float-right">
                            <div class="dropdown dib">
                                <div class="header-icon" data-toggle="dropdown">
                                    <i class="ti-bell"></i>
                                    <div class="drop-down dropdown-menu dropdown-menu-right">
                                        <div class="dropdown-content-heading">
                                            <span class="text-left">Recent Notifications</span>
                                        </div>
                                        <div class="dropdown-content-body">
                                            <ul>
                                                <li>
                                                    <div class="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                                                        <div class="flex-shrink-0 mt-1">
                                                            <span class="ti-timer text-orange-500 text-lg"></span>
                                                        </div>
                                                        <div class="flex-1">
                                                            <p class="text-sm text-gray-700">
                                                                <span class="font-semibold">Job #4534DFD</span>{" "}
                                                                has been in production for <b>3 hours</b>.
                                                            </p>
                                                            <p class="text-xs text-gray-400">
                                                                Updated 10 mins ago
                                                            </p>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li>
                                                    <div class="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                                                        <div class="flex-shrink-0 mt-1">
                                                            <span class="ti-timer text-orange-500 text-lg"></span>
                                                        </div>
                                                        <div class="flex-1">
                                                            <p class="text-sm text-gray-700">
                                                                <span class="font-semibold">Job #4534DFD</span>{" "}
                                                                has been in production for <b>3 hours</b>.
                                                            </p>
                                                            <p class="text-xs text-gray-400">
                                                                Updated 10 mins ago
                                                            </p>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li>
                                                    <div class="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                                                        <div class="flex-shrink-0 mt-1">
                                                            <span class="ti-check-box text-green-600 text-lg"></span>
                                                        </div>
                                                        <div class="flex-1">
                                                            <p class="text-sm text-gray-700">
                                                                Mock-up approved for{" "}
                                                                <span class="font-semibold">Job #6543ERT</span>{" "}
                                                                → <b>Ready to Print</b>.
                                                            </p>
                                                            <p class="text-xs text-gray-400">1 hour ago</p>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li>
                                                    <a href="#">
                                                        <img class="pull-left m-r-10 avatar-img" src="images/avatar/3.jpg" alt="" />
                                                        <div class="notification-content">
                                                            <small class="notification-timestamp pull-right">02:34 PM</small>
                                                            <div class="notification-heading">Mr. John</div>
                                                            <div class="notification-text">5 members joined today </div>
                                                        </div>
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="#">
                                                        <img class="pull-left m-r-10 avatar-img" src="images/avatar/3.jpg" alt="" />
                                                        <div class="notification-content">
                                                            <small class="notification-timestamp pull-right">02:34 PM</small>
                                                            <div class="notification-heading">Mariam</div>
                                                            <div class="notification-text">likes a photo of you</div>
                                                        </div>
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="#">
                                                        <img class="pull-left m-r-10 avatar-img" src="images/avatar/3.jpg" alt="" />
                                                        <div class="notification-content">
                                                            <small class="notification-timestamp pull-right">02:34 PM</small>
                                                            <div class="notification-heading">Tasnim</div>
                                                            <div class="notification-text">Hi Teddy, Just wanted to let you ...</div>
                                                        </div>
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="#">
                                                        <img class="pull-left m-r-10 avatar-img" src="images/avatar/3.jpg" alt="" />
                                                        <div class="notification-content">
                                                            <small class="notification-timestamp pull-right">02:34 PM</small>
                                                            <div class="notification-heading">Mr. John</div>
                                                            <div class="notification-text">Hi Teddy, Just wanted to let you ...</div>
                                                        </div>
                                                    </a>
                                                </li>
                                                <li class="text-center">
                                                    <a href="#" class="more-link">See All</a>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="dropdown dib">
                                <div className="header-icon" data-toggle="dropdown">
                                    <span className="user-avatar">
                                        {userName} <i className="ti-angle-down f-s-10"></i>
                                    </span>
                                    <div className="drop-down dropdown-profile dropdown-menu dropdown-menu-right">
                                        <div className="dropdown-content-heading">
                                            <span className="text-left">Upgrade Now</span>
                                            <p className="trial-day">30 Days Trail</p>
                                        </div>
                                        <div className="dropdown-content-body">
                                            <ul>
                                                <li><a href="#"><i className="ti-user"></i><span>Profile</span></a></li>
                                                <li><a href="#"><i className="ti-email"></i><span>Inbox</span></a></li>
                                                <li><a href="#"><i className="ti-settings"></i><span>Setting</span></a></li>
                                                <li><a href="#"><i className="ti-lock"></i><span>Lock Screen</span></a></li>
                                                <li><a href="#"><i className="ti-power-off"></i><span>Logout</span></a></li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}