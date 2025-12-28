import { useState, useEffect } from 'react';

export default function useSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {

    const checkWindowSize = () => {
      const isMobileView = window.innerWidth < 1000;
      setIsMobile(isMobileView);

    };

    checkWindowSize();

    if (window.innerWidth < 1000) {
      setIsCollapsed(true);
    }


    window.addEventListener('resize', checkWindowSize);

    return () => {
      window.removeEventListener('resize', checkWindowSize);
    };
  }, []);


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