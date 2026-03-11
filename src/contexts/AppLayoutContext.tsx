'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

interface AppLayoutContextValue {
  /** Current mobile header title, set by each page */
  title: string;
  setTitle: (t: string) => void;
}

const AppLayoutContext = createContext<AppLayoutContextValue>({
  title: '',
  setTitle: () => {},
});

export function AppLayoutProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitleState] = useState('');

  const setTitle = useCallback((t: string) => {
    setTitleState(t);
  }, []);

  return (
    <AppLayoutContext.Provider value={{ title, setTitle }}>
      {children}
    </AppLayoutContext.Provider>
  );
}

export function useAppLayoutContext() {
  return useContext(AppLayoutContext);
}

/**
 * Call this at the top of any page component to set the mobile header title.
 * Clears automatically when the page unmounts.
 *
 * Usage:
 *   useLayoutTitle(t('settings'));
 */
export function useLayoutTitle(title: string) {
  const { setTitle } = useAppLayoutContext();
  // Use a ref to avoid re-running effect when setTitle identity changes
  const titleRef = useRef(title);
  titleRef.current = title;

  useEffect(() => {
    setTitle(titleRef.current);
    return () => {
      // Only clear if this page's title is still the active one
      setTitle('');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);
}
