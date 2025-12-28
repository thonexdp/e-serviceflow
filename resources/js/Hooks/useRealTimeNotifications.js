import { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';























export default function useRealTimeNotifications() {
  const { auth } = usePage().props;
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!window.Echo || !auth?.user?.id) {
      console.warn('Echo or user not available for real-time notifications');
      return;
    }


    const channel = window.Echo.private(`user.${auth.user.id}`);


    channel.listen('.user.notification', (data) => {


      const notification = {
        id: Date.now(),
        ...data
      };

      setNotifications((prev) => [...prev, notification]);


      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      }, 5000);
    });


    channel.listen('.ticket.status.changed', (data) => {

      const notification = {
        id: Date.now(),
        title: data.notification.title,
        message: data.notification.message,
        type: data.notification.type,
        data: data
      };

      setNotifications((prev) => [...prev, notification]);


      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      }, 5000);
    });


    return () => {
      window.Echo.leave(`user.${auth.user.id}`);
    };
  }, [auth?.user?.id]);

  const clearNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return {
    notifications,
    clearNotification,
    clearAll
  };
}