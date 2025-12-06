import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import useSidebar from '@/Hooks/useSidebar';
import Footer from './Footer';

export default function AdminLayout({ children, user = {}, notifications = [], messages = [] }) {
    const { isCollapsed, toggleSidebar, hideSidebar, isMobile } = useSidebar();

    useEffect(() => {
        // Initialize other jQuery plugins (excluding sidebar)
        const initializeOtherLibraries = () => {
            if (window.jQuery) {
                const $ = window.jQuery;

                try {
                    // Initialize nano scroller
                    if ($.fn.nanoScroller) {
                        $('.nano').nanoScroller({ preventPageScrolling: true });
                    }

                    // Initialize Bootstrap dropdowns
                    if ($.fn.dropdown) {
                        $('[data-toggle="dropdown"]').dropdown();
                    }

                    // Initialize other plugins but NOT the sidebar
                    console.log('jQuery plugins initialized (excluding sidebar)');
                } catch (error) {
                    console.warn('jQuery initialization error:', error);
                }
            }
        };

        const timer = setTimeout(initializeOtherLibraries, 100);
        return () => clearTimeout(timer);
    }, []);

    // Handle content click - only hide sidebar on mobile when sidebar is visible
    const handleContentClick = (e) => {
        // Only hide sidebar on mobile and when sidebar is visible
        if (isMobile && !isCollapsed) {
            // Check if click is not on sidebar or its children
            const sidebar = document.querySelector('.sidebar');
            if (sidebar && !sidebar.contains(e.target)) {
                hideSidebar();
            }
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Sidebar isCollapsed={isCollapsed} user={user} />
            <Header
                user={user}
                notifications={notifications}
                messages={messages}
                onToggleSidebar={toggleSidebar}
            />
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
        </div>
    );
}