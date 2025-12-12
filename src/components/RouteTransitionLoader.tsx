import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader } from './Loader';

export function RouteTransitionLoader() {
  const location = useLocation();
  const [showLoader, setShowLoader] = useState(false);
  const prevPathRef = useRef<string>(location.pathname);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const currentPath = location.pathname;
    const prevPath = prevPathRef.current;

    // Check if transitioning between admin and main site
    const isAdminRoute = currentPath.startsWith('/admin');
    const wasAdminRoute = prevPath.startsWith('/admin');

    // Only show loader when switching between admin and main
    if (isAdminRoute !== wasAdminRoute) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Show loader
      setShowLoader(true);
      
      // Hide loader after 1.5 seconds
      timeoutRef.current = setTimeout(() => {
        setShowLoader(false);
        timeoutRef.current = null;
      }, 1500);
    }

    // Update previous path
    prevPathRef.current = currentPath;

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [location.pathname]);

  if (!showLoader) return null;

  return <Loader />;
}
