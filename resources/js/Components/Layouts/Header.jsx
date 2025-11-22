import { router, usePage  } from "@inertiajs/react";
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

export default function Header({
    user = {},
    notifications = [],
    messages = [],
    onToggleSidebar,
}) {
    const { auth } = usePage().props;

    const userName = auth?.user?.name || "Guest";
    const userAvatar = auth?.user?.avatar || "images/avatar/default.jpg";
    const [notificationList, setNotificationList] = useState(notifications || []);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const echoInitialized = useRef(false);

    useEffect(() => {
        // Fetch initial notifications and unread count
        fetchNotifications();
        fetchUnreadCount();

        // Initialize Echo for real-time updates
        if (!auth?.user?.id) {
            console.warn('User ID not available, skipping WebSocket connection');
            return;
        }

        if (!window.Echo) {
            console.warn('Echo not initialized. Check your WebSocket configuration.');
            return;
        }

        if (echoInitialized.current) {
            return; // Already initialized
        }

        echoInitialized.current = true;
        
        console.log(`🔌 Connecting to WebSocket channel: user.${auth?.user.id}`);
        
        // Subscribe to user's private channel
        const channel = window.Echo.private(`user.${auth?.user.id}`);
        
        // Add subscription event listeners
        channel.subscribed(() => {
            console.log(`✅ Subscribed to channel: user.${auth?.user.id}`);
        });

        channel.error((error) => {
            console.error('❌ Channel subscription error:', error);
        });
        
        // Listen for ticket status changes
        // When using broadcastAs(), we listen to the broadcast name without the dot prefix
        // Laravel Echo automatically handles the App namespace
        const eventHandler = (data) => {
            console.log('📬 Notification received via WebSocket:', data);
            
            // Create notification object from broadcast data
            const newNotification = {
                id: Date.now(), // Temporary ID
                type: data.notification?.type || 'ticket_status_changed',
                title: data.notification?.title || 'New Notification',
                message: data.notification?.message || 'You have a new notification',
                read: false,
                created_at: new Date().toISOString(),
                data: data.ticket || data,
            };

            // Add to notification list
            setNotificationList((prev) => [newNotification, ...prev]);
            
            // Update unread count
            setUnreadCount((prev) => prev + 1);

            // Refresh notifications from server to get the actual notification ID
            setTimeout(() => {
                fetchNotifications();
                fetchUnreadCount();
            }, 500);

            // Show browser notification if permission granted
            if ('Notification' in window && Notification.permission === 'granted') {
                new window.Notification(newNotification.title, {
                    body: newNotification.message,
                    icon: '/favicon.ico',
                });
            }
        };

        // Try both event name formats
        channel.listen('ticket.status.changed', eventHandler);
        channel.listen('.ticket.status.changed', eventHandler);

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Cleanup on unmount
        return () => {
            console.log(`🔌 Disconnecting from channel: user.${auth?.user.id}`);
            if (channel) {
                window.Echo.leave(`user.${auth?.user.id}`);
            }
            echoInitialized.current = false;
        };
    }, [auth?.user.id]);

    const fetchNotifications = async () => {
        try {
            const response = await axios.get('/notifications', {
                params: { per_page: 10 }
            });
            if (response.data?.data) {
                setNotificationList(response.data.data);
            } else if (Array.isArray(response.data)) {
                setNotificationList(response.data);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const response = await axios.get('/notifications/unread-count');
            setUnreadCount(response.data.count || 0);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    const handleMarkAsRead = async (notificationId, e) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            await axios.patch(`/notifications/${notificationId}/read`);
            
            // Update local state
            setNotificationList((prev) =>
                prev.map((notif) =>
                    notif.id === notificationId
                        ? { ...notif, read: true, read_at: new Date().toISOString() }
                        : notif
                )
            );
            
            // Update unread count
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            await axios.patch('/notifications/read-all');
            
            // Update local state
            setNotificationList((prev) =>
                prev.map((notif) => ({
                    ...notif,
                    read: true,
                    read_at: new Date().toISOString(),
                }))
            );
            
            // Reset unread count
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleNotificationClick = (notification, e) => {
        e.preventDefault();
        
        // Mark as read if unread
        if (!notification.read) {
            handleMarkAsRead(notification.id, e);
        }

        // Navigate to ticket if available
        if (notification.data?.ticket_id || notification.notifiable_id) {
            const ticketId = notification.data?.ticket_id || notification.notifiable_id;
            router.visit(`/tickets?highlight=${ticketId}`);
        }
    };

    const handleToggleClick = (e) => {
        e.preventDefault();
        console.log("Sidebar toggle clicked");
        onToggleSidebar();
    };

    const handleLogout = (e) => {
        e.preventDefault();
        console.log("logout");
        router.post(route("logout"), {}, { preserveScroll: true });
    };

    const handleBellClick = (e) => {
        e.preventDefault();
        setIsDropdownOpen(!isDropdownOpen);
        
        // Refresh notifications when opening dropdown
        if (!isDropdownOpen) {
            fetchNotifications();
            fetchUnreadCount();
        }
    };

    return (
        <div className="header">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="float-left">
                            <div
                                className="hamburger sidebar-toggle"
                                onClick={handleToggleClick}
                            >
                                <span className="line"></span>
                                <span className="line"></span>
                                <span className="line"></span>
                            </div>
                        </div>
                        <div className="float-right">
                            <div className="dropdown dib">
                                <a href="#" onClick={handleLogout}>
                                    Logout
                                </a>
                                <div 
                                    className="header-icon" 
                                    data-toggle="dropdown"
                                    onClick={handleBellClick}
                                    style={{ position: 'relative', cursor: 'pointer' }}
                                >
                                    <i className="ti-bell"></i>
                                    {unreadCount > 0 && (
                                        <span 
                                            className="notification-badge"
                                            style={{
                                                position: 'absolute',
                                                top: '-5px',
                                                right: '-5px',
                                                backgroundColor: '#ff4444',
                                                color: 'white',
                                                borderRadius: '50%',
                                                width: '18px',
                                                height: '18px',
                                                fontSize: '11px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 'bold',
                                                border: '2px solid white',
                                            }}
                                        >
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </span>
                                    )}
                                    <div className="drop-down dropdown-menu dropdown-menu-right w-72">
                                        <div className="dropdown-content-heading">
                                            <span className="text-left">Recent Notifications</span>
                                            {unreadCount > 0 && (
                                                <button
                                                    onClick={handleMarkAllAsRead}
                                                    className="btn btn-sm btn-link"
                                                    style={{
                                                        float: 'right',
                                                        padding: '0',
                                                        fontSize: '12px',
                                                        color: '#007bff',
                                                        textDecoration: 'none',
                                                    }}
                                                >
                                                    Mark all as read
                                                </button>
                                            )}
                                        </div>
                                        <div className="dropdown-content-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                            {notificationList.length === 0 ? (
                                                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                                                    No notifications
                                                </div>
                                            ) : (
                                                <ul>
                                                    {notificationList.map((notification) => (
                                                        <li 
                                                            key={notification.id}
                                                            style={{
                                                                backgroundColor: notification.read ? 'transparent' : '#f0f8ff',
                                                            }}
                                                        >
                                                            <a 
                                                                href="#" 
                                                                onClick={(e) => handleNotificationClick(notification, e)}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'flex-start',
                                                                    padding: '10px',
                                                                    textDecoration: 'none',
                                                                    color: 'inherit',
                                                                }}
                                                            >
                                                                <img 
                                                                    className="pull-left m-r-10 avatar-img" 
                                                                    src={userAvatar} 
                                                                    alt="" 
                                                                    style={{
                                                                        width: '40px',
                                                                        height: '40px',
                                                                        borderRadius: '50%',
                                                                        marginRight: '10px',
                                                                    }}
                                                                />
                                                                <div className="notification-content" style={{ flex: 1 }}>
                                                                    <small 
                                                                        className="notification-timestamp pull-right"
                                                                        style={{
                                                                            float: 'right',
                                                                            fontSize: '11px',
                                                                            color: '#999',
                                                                        }}
                                                                    >
                                                                        {formatTime(notification.created_at)}
                                                                    </small>
                                                                    <div 
                                                                        className="notification-heading"
                                                                        style={{
                                                                            fontWeight: notification.read ? 'normal' : 'bold',
                                                                            marginBottom: '4px',
                                                                        }}
                                                                    >
                                                                        {notification.title}
                                                                    </div>
                                                                    <div 
                                                                        className="notification-text"
                                                                        style={{
                                                                            fontSize: '13px',
                                                                            color: '#666',
                                                                            lineHeight: '1.4',
                                                                        }}
                                                                    >
                                                                        {notification.message}
                                                                    </div>
                                                                    {!notification.read && (
                                                                        <button
                                                                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                                                                            className="btn btn-xs btn-link"
                                                            style={{
                                                                padding: '2px 5px',
                                                                fontSize: '11px',
                                                                marginTop: '5px',
                                                                color: '#007bff',
                                                            }}
                                                        >
                                                            Mark as read
                                                        </button>
                                                    )}
                                                </div>
                                            </a>
                                        </li>
                                    ))}
                                    <li className="text-center" style={{ padding: '10px' }}>
                                        <a 
                                            href="/tickets" 
                                            className="more-link"
                                            style={{
                                                color: '#007bff',
                                                textDecoration: 'none',
                                            }}
                                        >
                                            See All Notifications
                                        </a>
                                    </li>
                                </ul>
                            )}
                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="dropdown dib">
                                <div
                                    className="header-icon"
                                    data-toggle="dropdown"
                                >
                                    <span className="user-avatar">
                                        {userName}{" "}
                                        <i className="ti-angle-down f-s-10"></i>
                                    </span>
                                    <div className="drop-down dropdown-profile dropdown-menu dropdown-menu-right">
                                        <div className="dropdown-content-heading">
                                            <span className="text-left">
                                                Upgrade Now
                                            </span>
                                            <p className="trial-day">
                                                30 Days Trail
                                            </p>
                                        </div>
                                        <div className="dropdown-content-body">
                                            <ul>
                                                <li>
                                                    <button
                                                        type="button"
                                                        onClick={handleLogout}
                                                        className="dropdown-item"
                                                    >
                                                        <i className="ti-power-off"></i>
                                                        <span>Logout</span>
                                                    </button>
                                                </li>
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
