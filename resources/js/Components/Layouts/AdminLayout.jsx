import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import useSidebar from '@/Hooks/useSidebar';
import Footer from './Footer';
import { Toaster, toast } from 'react-hot-toast';
import { usePage } from '@inertiajs/react';

export default function AdminLayout({ children, user = {}, notifications = [], messages = [] }) {
  const { isCollapsed, toggleSidebar, hideSidebar, isMobile } = useSidebar();
  const { flash } = usePage().props;

  useEffect(() => {
    if (flash?.success) {
      toast.success(flash.success);
    }
    if (flash?.error) {
      toast.error(flash.error);
    }
    if (flash?.info) {
      toast.info(flash.info);
    }
    if (flash?.warning) {
      toast.error(flash.warning); // toast doesn't have warning by default in basic hot-toast
    }
  }, [flash]);

  useEffect(() => {

    const initializeOtherLibraries = () => {
      if (window.jQuery) {
        const $ = window.jQuery;

        try {

          if ($.fn.nanoScroller) {
            $('.nano').nanoScroller({ preventPageScrolling: true });
          }


          if ($.fn.dropdown) {
            $('[data-toggle="dropdown"]').dropdown();
          }

        } catch (error) {
          console.warn('jQuery initialization error:', error);
        }
      }
    };

    const timer = setTimeout(initializeOtherLibraries, 100);
    return () => clearTimeout(timer);
  }, []);


  const handleContentClick = (e) => {

    if (isMobile && !isCollapsed) {

      const sidebar = document.querySelector('.sidebar');
      if (sidebar && !sidebar.contains(e.target)) {
        hideSidebar();
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster position="top-right" reverseOrder={false} />
      <Sidebar isCollapsed={isCollapsed} user={user} />
      <Header
        user={user}
        notifications={notifications}
        messages={messages}
        onToggleSidebar={toggleSidebar} />

      <div className="content-wrap flex-grow flex flex-col" onClick={handleContentClick}>
        <div className="main flex-grow">
          <div className="container-fluid">
            {children}
          </div>
        </div>
        <div className="container-fluid">
          <Footer />
        </div>
      </div>
    </div>);

}