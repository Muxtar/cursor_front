'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import Sidebar from '@/components/Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  /** Optional title for mobile header */
  title?: string;
  /** Sidebar props (e.g. for chat page) */
  onChatSelect?: (chatId: string | null) => void;
  selectedChat?: string | null;
}

/**
 * Responsive layout: on mobile shows main content full screen with hamburger to open sidebar as overlay.
 * On desktop shows sidebar + main content side by side.
 */
export default function AppLayout({ children, title = '', onChatSelect, selectedChat }: AppLayoutProps) {
  const { actualTheme } = useTheme();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile sidebar when route changes (user clicked a link)
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className={`flex h-dvh max-h-dvh overflow-hidden ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Mobile: Hamburger + main content. Desktop: Sidebar visible */}
      {/* Sidebar - on mobile hidden by default, shown as overlay when mobileMenuOpen */}
      <div
        className={`
          md:relative md:flex-shrink-0
          fixed inset-y-0 left-0 z-40 h-dvh w-full md:w-[420px] md:max-w-[420px] md:h-full
          transform transition-transform duration-200 ease-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <Sidebar
          onChatSelect={onChatSelect}
          selectedChat={selectedChat}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Mobile overlay backdrop when sidebar is open */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content - always visible on mobile (full width), flex-1 on desktop */}
      <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Mobile header with menu button - only on small screens, sabit üstdə */}
        <header
          className={`
            flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b
            md:hidden
            ${actualTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
          `}
        >
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`p-2 rounded-lg ${actualTheme === 'dark' ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {title ? (
            <h1 className={`text-lg font-semibold truncate flex-1 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h1>
          ) : (
            <span className="flex-1" />
          )}
        </header>

        {/* Page content - yalnız bu hissə scroll olur */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          {children}
        </main>
      </div>
    </div>
  );
}
