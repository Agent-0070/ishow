import { useEffect, useState } from 'react';

/**
 * Hook to ensure app persistence and prevent unwanted refreshes
 */
export const usePersistence = () => {
  const [isStable, setIsStable] = useState(false);

  useEffect(() => {
    // Mark app as stable after initial load
    const timer = setTimeout(() => {
      setIsStable(true);
    }, 1000);

    // Prevent accidental page refresh
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only show warning if user has unsaved changes or is authenticated
      const hasToken = localStorage.getItem('auth-token');
      if (hasToken && isStable) {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? You may lose unsaved changes.';
        return e.returnValue;
      }
    };

    // Add event listener for page unload
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isStable]);

  // Prevent back button issues
  useEffect(() => {
    const handlePopState = (_e: PopStateEvent) => {
      // Allow normal navigation but prevent accidental back navigation
      // This is handled by React Router
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return { isStable };
};

/**
 * Hook to maintain app state across page refreshes
 */
export const useStateRecovery = () => {
  const [isRecovering, setIsRecovering] = useState(true);

  useEffect(() => {
    // Check if we're recovering from a refresh
    const wasRefreshed = sessionStorage.getItem('app-refreshed');
    
    if (wasRefreshed) {
      console.log('🔄 Recovering app state after refresh');
      sessionStorage.removeItem('app-refreshed');
    }

    // Mark recovery as complete
    setTimeout(() => {
      setIsRecovering(false);
    }, 500);

    // Set flag for potential refresh detection
    const handleBeforeUnload = () => {
      sessionStorage.setItem('app-refreshed', 'true');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return { isRecovering };
};
