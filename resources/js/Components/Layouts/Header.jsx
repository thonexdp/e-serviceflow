import { router, usePage } from "@inertiajs/react";
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useRoleApi } from "@/Hooks/useRoleApi";
import Modal from "@/Components/Main/Modal";
import InputLabel from "@/Components/InputLabel";
import TextInput from "@/Components/TextInput";
import InputError from "@/Components/InputError";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";

export default function Header({
    user = {},
    notifications = [],
    messages = [],
    onToggleSidebar,
}) {
    const { auth } = usePage().props;

    const userName = auth?.user?.name || "Guest";
    const role = auth?.user?.role;
    const userAvatar = auth?.user?.avatar || "images/icons/chat.png";
    const [notificationList, setNotificationList] = useState(notifications || []);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
    const [passwordData, setPasswordData] = useState({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const [passwordErrors, setPasswordErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const echoInitialized = useRef(false);
    const notificationDropdownRef = useRef(null);
    const profileDropdownRef = useRef(null);
    const { buildUrl } = useRoleApi();

    // Handle clicks outside dropdowns to close them
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
                setIsProfileDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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


        // Subscribe to user's private channel
        const channel = window.Echo.private(`user.${auth?.user.id}`);

        // Add subscription event listeners
        channel.subscribed(() => {
            console.log(`✅ SC`);
        });

        channel.error((error) => {
            console.error('❌ Channel subscription error:', error);
        });

        // Listen for ticket status changes
        // When using broadcastAs(), we listen to the broadcast name without the dot prefix
        // Laravel Echo automatically handles the App namespace
        const eventHandler = (data) => {

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

        console.log("notification:", notification);

        // Mark as read if unread
        if (!notification.read) {
            handleMarkAsRead(notification.id, e);
        }

        // Navigate to ticket if available
        if (notification.data?.ticket_id || notification.notifiable_id) {
            // const ticketId = notification.data?.ticket_id || notification.notifiable_id;
            const route_path = role !== "Designer" ? `/tickets` : `/mock-ups`;
            router.visit(buildUrl(route_path));
        }
    };

    const handleToggleClick = (e) => {
        e.preventDefault();
        onToggleSidebar();
    };

    const handleLogout = (e) => {
        e.preventDefault();
        router.post(route("logout"), {}, { preserveScroll: true });
    };

    const handleBellClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDropdownOpen(!isDropdownOpen);

        // Refresh notifications when opening dropdown
        if (!isDropdownOpen) {
            fetchNotifications();
            fetchUnreadCount();
        }
    };

    const handleProfileClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsProfileDropdownOpen(!isProfileDropdownOpen);
    };

    const handleResetPasswordClick = (e) => {
        e.preventDefault();
        setIsProfileDropdownOpen(false);
        setIsResetPasswordModalOpen(true);
        setPasswordData({
            current_password: "",
            new_password: "",
            new_password_confirmation: "",
        });
        setPasswordErrors({});
    };

    const handleCloseResetPasswordModal = () => {
        setIsResetPasswordModalOpen(false);
        setPasswordData({
            current_password: "",
            new_password: "",
            new_password_confirmation: "",
        });
        setPasswordErrors({});
        setShowPasswords({
            current: false,
            new: false,
            confirm: false,
        });
    };

    const handlePasswordChange = (field, value) => {
        setPasswordData((prev) => ({
            ...prev,
            [field]: value,
        }));
        // Clear error for this field when user starts typing
        if (passwordErrors[field]) {
            setPasswordErrors((prev) => ({
                ...prev,
                [field]: null,
            }));
        }
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords((prev) => ({
            ...prev,
            [field]: !prev[field],
        }));
    };

    const handleResetPasswordSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setPasswordErrors({});

        try {
            await axios.put('/user/password', passwordData);
            // Success
            handleCloseResetPasswordModal();
            // Optionally show a success message
            alert('Password updated successfully');
        } catch (error) {
            if (error.response?.data?.errors) {
                setPasswordErrors(error.response.data.errors);
            } else {
                setPasswordErrors({
                    general: error.response?.data?.message || 'Failed to update password',
                });
            }
        } finally {
            setIsSubmitting(false);
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
                            <div className="dropdown dib" ref={notificationDropdownRef} style={{ position: 'relative' }}>
                                <div
                                    className="header-icon"
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
                                                padding: "10px",
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
                                </div>
                                {isDropdownOpen && (
                                    <div
                                        className="drop-down dropdown-menu dropdown-menu-right w-72"
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            display: 'block',
                                            position: 'absolute',
                                            top: '100%',
                                            right: 0,
                                            zIndex: 1000,
                                        }}
                                    >
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
                                                        color: '#fb8c00',
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
                                                                backgroundColor: notification.read ? 'transparent' : '#fff7ed',
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
                                                                <div style={{ display: 'flex', alignItems: 'center', marginRight: '15px' }}>
                                                                    <i
                                                                        className="ti-email"
                                                                        style={{
                                                                            fontSize: '24px',
                                                                            color: notification.read ? '#999' : '#fb8c00'
                                                                        }}
                                                                    ></i>
                                                                </div>
                                                                {/* <img
                                                                    className="pull-left m-r-10"
                                                                    src={userAvatar}
                                                                    alt=""
                                                                    style={{
                                                                        width: '30px',
                                                                        height: '30px',
                                                                        // borderRadius: '10%',
                                                                        marginRight: '10px',
                                                                    }}
                                                                /> */}
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
                                                                                color: '#fb8c00',
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
                                                            href={buildUrl(notificationList?.[0]?.type === 'ticket_in_designer' ? 'mock-ups' : 'tickets')} className="more-link"
                                                            style={{
                                                                color: '#fb8c00',
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
                                )}
                            </div>
                            <div className="dropdown dib" ref={profileDropdownRef} style={{ position: 'relative' }}>
                                <div
                                    className="header-icon"
                                    onClick={handleProfileClick}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <span className="user-avatar">
                                        {userName}{" "}
                                        <i className="ti-angle-down f-s-10"></i>
                                    </span>
                                </div>
                                {isProfileDropdownOpen && (
                                    <div
                                        className="drop-down dropdown-profile dropdown-menu dropdown-menu-right"
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            display: 'block',
                                            position: 'absolute',
                                            top: '100%',
                                            right: 0,
                                            marginTop: '40px',
                                            zIndex: 1000,
                                        }}
                                    >
                                        {/* <div className="dropdown-content-heading">
                                            <span className="text-left">
                                                Upgrade Now
                                            </span>
                                            <p className="trial-day">
                                                30 Days Trail
                                            </p>
                                        </div> */}
                                        <div className="dropdown-content-body">
                                            <ul>
                                                <li>
                                                    <button
                                                        type="button"
                                                        onClick={handleResetPasswordClick}
                                                        className="dropdown-item"
                                                    >
                                                        <i className="ti-lock"></i>
                                                        <span>Reset Password</span>
                                                    </button>
                                                </li>
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
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reset Password Modal */}
            <Modal
                isOpen={isResetPasswordModalOpen}
                onClose={handleCloseResetPasswordModal}
                title="Reset Password"
                size="md"
            >
                <form onSubmit={handleResetPasswordSubmit} className="p-6">
                    <div className="space-y-4">
                        {passwordErrors.general && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                {passwordErrors.general}
                            </div>
                        )}

                        {/* Current Password */}
                        <div>
                            <InputLabel htmlFor="current_password" value="Current Password" />
                            <div className="relative">
                                <TextInput
                                    id="current_password"
                                    type={showPasswords.current ? "text" : "password"}
                                    className="mt-1 block w-full pr-10"
                                    value={passwordData.current_password}
                                    onChange={(e) =>
                                        handlePasswordChange("current_password", e.target.value)
                                    }
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility("current")}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    style={{ top: '4px' }}
                                >
                                    <i className={showPasswords.current ? "ti-eye-off" : "ti-eye"}></i>
                                </button>
                            </div>
                            <InputError
                                message={passwordErrors.current_password?.[0]}
                                className="mt-2"
                            />
                        </div>

                        {/* New Password */}
                        <div>
                            <InputLabel htmlFor="new_password" value="New Password" />
                            <div className="relative">
                                <TextInput
                                    id="new_password"
                                    type={showPasswords.new ? "text" : "password"}
                                    className="mt-1 block w-full pr-10"
                                    value={passwordData.new_password}
                                    onChange={(e) =>
                                        handlePasswordChange("new_password", e.target.value)
                                    }
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility("new")}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    style={{ top: '4px' }}
                                >
                                    <i className={showPasswords.new ? "ti-eye-off" : "ti-eye"}></i>
                                </button>
                            </div>
                            <InputError
                                message={passwordErrors.new_password?.[0]}
                                className="mt-2"
                            />
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <InputLabel htmlFor="new_password_confirmation" value="Confirm New Password" />
                            <div className="relative">
                                <TextInput
                                    id="new_password_confirmation"
                                    type={showPasswords.confirm ? "text" : "password"}
                                    className="mt-1 block w-full pr-10"
                                    value={passwordData.new_password_confirmation}
                                    onChange={(e) =>
                                        handlePasswordChange("new_password_confirmation", e.target.value)
                                    }
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility("confirm")}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    style={{ top: '4px' }}
                                >
                                    <i className={showPasswords.confirm ? "ti-eye-off" : "ti-eye"}></i>
                                </button>
                            </div>
                            <InputError
                                message={passwordErrors.new_password_confirmation?.[0]}
                                className="mt-2"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton type="button" onClick={handleCloseResetPasswordModal}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Updating..." : "Update Password"}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
