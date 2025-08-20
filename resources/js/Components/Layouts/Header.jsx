import React from 'react';

export default function Header({ 
    user = {}, 
    notifications = [], 
    messages = [], 
    onToggleSidebar 
}) {
    const userName = user?.name || 'Guest';
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
                            {/* Rest of your header content */}
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