import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AdminLayout({ children, user = {}, notifications = [], messages = [] }) {
    useEffect(() => {
        // Enhanced initialization with error handling
        const initializeLibraries = () => {
            try {
                if (window.jQuery) {
                    // Initialize sidebar with error handling
                    window.jQuery(document).ready(function($) {
                        // Sidebar toggle
                        $('.sidebar-toggle').off('click').on('click', function() {
                            $('body').toggleClass('sidebar-collapse');
                        });

                        // Initialize nano scroller if available
                        if ($.fn.nanoScroller) {
                            $('.nano').nanoScroller();
                        }

                        // Initialize Bootstrap dropdowns
                        if ($.fn.dropdown) {
                            $('[data-toggle="dropdown"]').dropdown();
                        }
                    });
                }
            } catch (error) {
                console.warn('Library initialization error:', error);
            }
        };

        // Wait for libraries to be available
        const checkLibraries = setInterval(() => {
            if (window.jQuery) {
                clearInterval(checkLibraries);
                initializeLibraries();
            }
        }, 100);

        return () => clearInterval(checkLibraries);
    }, []);

    return (
        <div>
            <Sidebar />
            <Header user={user} notifications={notifications} messages={messages} />
            <div className="content-wrap">
                <div className="main">
                    <div className="container-fluid">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}