'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

interface AppLayoutProps {
  children: React.ReactNode;
  /**
   * Mobile header title. Typically set via useLayoutTitle() from
   * AppLayoutContext — this prop lets AuthenticatedLayout pass it through.
   */
  title?: string;
}

/**
 * Pages where the mobile header shows a back-chevron instead of (or in
 * addition to) the hamburger.
 */
const BACK_BUTTON_PATHS = [
  '/profile',
  '/location',
  '/wallet',
  '/story',
  '/settings',
  '/notifications',
  '/search',
  '/comments',
];

const showBackOnMobile = (pathname: string) =>
  BACK_BUTTON_PATHS.some((p) => pathname.startsWith(p));

/**
 * Persistent authenticated app shell:
 * - Desktop: sidebar (left) + main content (right) side by side
 * - Mobile: full-screen main content, sidebar as overlay, glassmorphism header,
 *   and BottomNav fixed at the bottom
 *
 * NOTE: This component is mounted ONCE in AuthenticatedLayout (at root-layout
 * level), so the Sidebar and all its data survive every page navigation.
 */
export default function AppLayout({ children, title = '' }: AppLayoutProps) {
  const { actualTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDark = actualTheme === 'dark';
  const showBack = showBackOnMobile(pathname ?? '');

  // Close mobile sidebar when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when sidebar overlay is open on mobile
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <div className={`flex h-dvh max-h-dvh overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>

      {/* ─── Sidebar (persistent across navigations) ─── */}
      <div
        className={`
          md:relative md:flex-shrink-0
          fixed inset-y-0 left-0 z-40 w-full md:w-[420px] md:max-w-[420px] md:h-full
          transform transition-transform duration-300 ease-out
          h-[calc(100dvh-4.5rem)] md:h-full
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* ─── Mobile overlay backdrop ─── */}
      <div
        className={`
          fixed inset-0 z-30 md:hidden bg-black/50
          transition-opacity duration-300 ease-out
          ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* ─── Main content area ─── */}
      <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">

        {/* Mobile glassmorphism header */}
        <header
          className={`
            flex-shrink-0 flex items-center gap-1.5 px-3 py-2 border-b md:hidden
            ${isDark
              ? 'bg-gray-900/90 border-gray-700/50 backdrop-blur-md'
              : 'bg-white/90 border-gray-200/50 backdrop-blur-md'
            }
          `}
          style={{ WebkitBackdropFilter: 'blur(12px)' }}
        >
          {/* Back chevron */}
          {showBack && (
            <button
              type="button"
              onClick={() => router.back()}
              className={`
                p-2 rounded-xl transition-all duration-150 active:scale-90
                ${isDark ? 'hover:bg-gray-800/80 text-gray-100' : 'hover:bg-gray-100 text-gray-700'}
              `}
              aria-label="Back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Hamburger ↔ X toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className={`
              p-2 rounded-xl transition-all duration-150 active:scale-90
              ${isDark ? 'hover:bg-gray-800/80 text-gray-100' : 'hover:bg-gray-100 text-gray-700'}
            `}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            <span className="relative flex w-5 h-5 items-center justify-center">
              <svg
                className={`absolute w-5 h-5 transition-all duration-200 ${
                  mobileMenuOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
                }`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                className={`absolute w-5 h-5 transition-all duration-200 ${
                  mobileMenuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
                }`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          </button>

          {/* Page title */}
          {title ? (
            <h1 className={`text-[15px] font-semibold tracking-tight truncate flex-1 min-w-0 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {title}
            </h1>
          ) : (
            <span className="flex-1" />
          )}
        </header>

        {/* Page content — always has bottom padding for BottomNav */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* ─── Mobile bottom navigation (fixed, always visible) ─── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[35] md:hidden"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <BottomNav />
      </div>
    </div>
  );
}
