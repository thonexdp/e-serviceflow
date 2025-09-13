// resources/js/Hooks/useJQueryIntegration.js
import { useEffect } from 'react';

export default function useJQueryIntegration() {
    useEffect(() => {
        // Initialize your existing jQuery plugins
        if (window.jQuery) {
            // Sidebar toggle
            window.jQuery('.sidebar-toggle').on('click', function() {
                console.log('side bar');
                
            });

            // Initialize charts, calendars, etc.
            // Your existing initialization code from dashboard2.js
        }
    }, []);
}