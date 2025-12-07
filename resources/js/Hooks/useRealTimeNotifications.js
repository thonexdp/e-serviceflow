import { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';

/**
 * Real-Time Notification Hook
 * 
 * Usage in any component:
 * 
 * import useRealTimeNotifications from '@/Hooks/useRealTimeNotifications';
 * 
 * function MyComponent() {
 *     const { notifications, clearNotification } = useRealTimeNotifications();
 * 
 *     return (
 *         <div>
 *             {notifications.map(notification => (
 *                 <div key={notification.id}>
 *                     {notification.title}: {notification.message}
 *                     <button onClick={() => clearNotification(notification.id)}>Close</button>
 *                 </div>
 *             ))}
 *         </div>
 *     );
 * }
 */
export default function useRealTimeNotifications() {
    const { auth } = usePage().props;
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        if (!window.Echo || !auth?.user?.id) {
            console.warn('Echo or user not available for real-time notifications');
            return;
        }

        // Subscribe to user's private channel
        const channel = window.Echo.private(`user.${auth.user.id}`);

        // Listen for generic user notifications
        channel.listen('.user.notification', (data) => {
            console.log('📬 Notification received:', data);

            // Add notification with unique ID
            const notification = {
                id: Date.now(),
                ...data,
            };

            setNotifications(prev => [...prev, notification]);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== notification.id));
            }, 5000);
        });

        // Listen for ticket status changes
        channel.listen('.ticket.status.changed', (data) => {
            console.log('🎫 Ticket status changed:', data);

            const notification = {
                id: Date.now(),
                title: data.notification.title,
                message: data.notification.message,
                type: data.notification.type,
                data: data,
            };

            setNotifications(prev => [...prev, notification]);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== notification.id));
            }, 5000);
        });

        // Cleanup on unmount
        return () => {
            console.log('Leaving user channel');
            window.Echo.leave(`user.${auth.user.id}`);
        };
    }, [auth?.user?.id]);

    const clearNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    return {
        notifications,
        clearNotification,
        clearAll,
    };
}
