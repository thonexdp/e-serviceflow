import { useState, useEffect } from 'react';

export default function useSidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Check initial window size
        const checkWindowSize = () => {
            const isMobileView = window.innerWidth < 1000;
            setIsMobile(isMobileView);
            if (isMobileView && !isCollapsed) {
                setIsCollapsed(true);
            }
        };

        checkWindowSize();

        // Add resize listener
        window.addEventListener('resize', checkWindowSize);

        // Apply body classes based on state
        document.body.classList.toggle('sidebar-hide', isCollapsed);

        return () => {
            window.removeEventListener('resize', checkWindowSize);
        };
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