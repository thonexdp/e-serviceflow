import { useState, useEffect } from 'react';

export default function useSidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Check initial window size
        const checkWindowSize = () => {
            const isMobileView = window.innerWidth < 1000;
            setIsMobile(isMobileView);
            // Only collapse on initial load if mobile
        };

        checkWindowSize();
        
        if (window.innerWidth < 1000) {
            setIsCollapsed(true);
        }

        // Add resize listener
        window.addEventListener('resize', checkWindowSize);

        return () => {
            window.removeEventListener('resize', checkWindowSize);
        };
    }, []);

    // Apply body classes based on state
    useEffect(() => {
        document.body.classList.toggle('sidebar-hide', isCollapsed);
    }, [isCollapsed]);

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    const showSidebar = () => {
        setIsCollapsed(false);
    };

    const hideSidebar = () => {
        setIsCollapsed(true);
    };

    return {
        isCollapsed,
        isMobile,
        toggleSidebar,
        showSidebar,
        hideSidebar
    };
}