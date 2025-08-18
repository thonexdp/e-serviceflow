import React from 'react';

export default function Header({ user = {}, notifications = [], messages = [] }) {
    // Provide default values
    const userName = user?.name || 'Guest';
    const userAvatar = user?.avatar || 'images/avatar/default.jpg';

    return (
        <div className="header">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="float-left">
                            <div className="hamburger sidebar-toggle">
                                <span className="line"></span>
                                <span className="line"></span>
                                <span className="line"></span>
                            </div>
                        </div>
                        <div className="float-right">
                            {/* Notifications Dropdown */}
                            <div className="dropdown dib">
                                <div className="header-icon" data-toggle="dropdown">
                                    <i className="ti-bell"></i>
                                    <div className="drop-down dropdown-menu dropdown-menu-right">
                                        <div className="dropdown-content-heading">
                                            <span className="text-left">Recent Notifications</span>
                                        </div>
                                        <div className="dropdown-content-body">
                                            <ul>
                                                {notifications.length > 0 ? notifications.map((notification) => (
                                                    <li key={notification.id}>
                                                        <a href="#">
                                                            <img 
                                                                className="pull-left m-r-10 avatar-img" 
                                                                src={notification.avatar || 'images/avatar/default.jpg'} 
                                                                alt="" 
                                                                onError={(e) => {
                                                                    e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" fill="%23ddd"/><text x="20" y="20" text-anchor="middle" dy="0.3em" fill="%23999">?</text></svg>';
                                                                }}
                                                            />
                                                            <div className="notification-content">
                                                                <small className="notification-timestamp pull-right">
                                                                    {notification.time}
                                                                </small>
                                                                <div className="notification-heading">
                                                                    {notification.user}
                                                                </div>
                                                                <div className="notification-text">
                                                                    {notification.message}
                                                                </div>
                                                            </div>
                                                        </a>
                                                    </li>
                                                )) : (
                                                    <li className="text-center">
                                                        <span>No notifications</span>
                                                    </li>
                                                )}
                                                <li className="text-center">
                                                    <a href="#" className="more-link">See All</a>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Messages Dropdown */}
                            <div className="dropdown dib">
                                <div className="header-icon" data-toggle="dropdown">
                                    <i className="ti-email"></i>
                                    <div className="drop-down dropdown-menu dropdown-menu-right">
                                        <div className="dropdown-content-heading">
                                            <span className="text-left">
                                                {messages.filter(m => m.unread).length} New Messages
                                            </span>
                                            <a href="/email">
                                                <i className="ti-pencil-alt pull-right"></i>
                                            </a>
                                        </div>
                                        <div className="dropdown-content-body">
                                            <ul>
                                                {messages.length > 0 ? messages.map((message) => (
                                                    <li 
                                                        key={message.id} 
                                                        className={message.unread ? 'notification-unread' : ''}
                                                    >
                                                        <a href="#">
                                                            <img 
                                                                className="pull-left m-r-10 avatar-img" 
                                                                src={message.avatar || 'images/avatar/default.jpg'} 
                                                                alt="" 
                                                                onError={(e) => {
                                                                    e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" fill="%23ddd"/><text x="20" y="20" text-anchor="middle" dy="0.3em" fill="%23999">?</text></svg>';
                                                                }}
                                                            />
                                                            <div className="notification-content">
                                                                <small className="notification-timestamp pull-right">
                                                                    {message.time}
                                                                </small>
                                                                <div className="notification-heading">
                                                                    {message.user}
                                                                </div>
                                                                <div className="notification-text">
                                                                    {message.message}
                                                                </div>
                                                            </div>
                                                        </a>
                                                    </li>
                                                )) : (
                                                    <li className="text-center">
                                                        <span>No messages</span>
                                                    </li>
                                                )}
                                                <li className="text-center">
                                                    <a href="#" className="more-link">See All</a>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* User Dropdown */}
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