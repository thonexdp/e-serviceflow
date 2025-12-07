import React from 'react';
import useRealTimeNotifications from '@/Hooks/useRealTimeNotifications';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Toast Notification Component
 * 
 * Displays real-time notifications as toast messages
 * Add this to your main layout (e.g., AppLayout.jsx)
 */
export default function NotificationToast() {
    const { notifications, clearNotification } = useRealTimeNotifications();

    const getNotificationStyles = (type) => {
        switch (type) {
            case 'success':
                return {
                    bg: 'bg-green-500',
                    icon: '✅',
                    border: 'border-green-600',
                };
            case 'error':
                return {
                    bg: 'bg-red-500',
                    icon: '❌',
                    border: 'border-red-600',
                };
            case 'warning':
                return {
                    bg: 'bg-yellow-500',
                    icon: '⚠️',
                    border: 'border-yellow-600',
                };
            default: // info
                return {
                    bg: 'bg-blue-500',
                    icon: 'ℹ️',
                    border: 'border-blue-600',
                };
        }
    };

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
            <AnimatePresence>
                {notifications.map((notification) => {
                    const styles = getNotificationStyles(notification.type);

                    return (
                        <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: 100, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 100, scale: 0.8 }}
                            transition={{ duration: 0.3 }}
                            className={`${styles.bg} ${styles.border} border-l-4 text-white p-4 rounded-lg shadow-lg`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3">
                                    <span className="text-2xl">{styles.icon}</span>
                                    <div>
                                        <h4 className="font-bold text-sm">
                                            {notification.title}
                                        </h4>
                                        <p className="text-sm mt-1">
                                            {notification.message}
                                        </p>
                                        {notification.data?.ticket && (
                                            <p className="text-xs mt-1 opacity-80">
                                                Ticket: {notification.data.ticket.ticket_number}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => clearNotification(notification.id)}
                                    className="ml-4 text-white hover:text-gray-200 transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
