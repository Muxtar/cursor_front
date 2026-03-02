'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

interface AppLayoutProps {
  children: React.ReactNode;
  /** Optional title for mobile header */
  title?: string;
  /** Sidebar props (e.g. for chat page) */
  onChatSelect?: (chatId: string | null) => void;
  selectedChat?: string | null;
}

const showFooterOnMobile = (pathname: string, selectedChat: string | null | undefined) =>
  pathname !== '/chat' || !selectedChat;

/** Mobilde geri butonu göstermek için: chat listesi değilsek (profile, explore, location, wallet, story) */
const showBackOnMobile = (pathname: string) =>
  pathname?.startsWith('/profile') ||
  pathname === '/explore' ||
  pathname === '/location' ||
  pathname === '/wallet' ||
  pathname === '/story/create';

/**
 * Responsive layout: on mobile shows main content full screen with hamburger to open sidebar as overlay.
 * On desktop shows sidebar + main content side by side.
 * Footer (BottomNav) is rendered at root level on mobile so it stays visible on every page except chat view.
 */
export default function AppLayout({ children, title = '', onChatSelect, selectedChat }: AppLayoutProps) {
  const { actualTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const showFooter = showFooterOnMobile(pathname ?? '', selectedChat ?? null);
  const showBack = showBackOnMobile(pathname ?? '');

  // Close mobile sidebar when route changes (user clicked a link)
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className={`flex h-dvh max-h-dvh overflow-hidden ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Sidebar - on mobile hidden by default, shown as overlay when mobileMenuOpen */}
      <div
        className={`
          md:relative md:flex-shrink-0
          fixed inset-y-0 left-0 z-40 w-full md:w-[420px] md:max-w-[420px] md:h-full
          transform transition-transform duration-200 ease-out
          ${showFooter ? 'h-[calc(100dvh-4.5rem)] md:h-full' : 'h-dvh md:h-full'}
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

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Mobile header: geri butonu (profile/explore/location/wallet/story sayfalarında) + menü + başlık */}
        <header
          className={`
            flex-shrink-0 flex items-center gap-2 px-3 py-3 border-b
            md:hidden
            ${actualTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
          `}
        >
          {showBack ? (
            <button
              type="button"
              onClick={() => router.back()}
              className={`p-2 rounded-lg ${actualTheme === 'dark' ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
              aria-label="Back"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : null}
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
            <h1 className={`text-lg font-semibold truncate flex-1 min-w-0 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h1>
          ) : (
            <span className="flex-1" />
          )}
        </header>

        {/* Page content - mobilde footer yüksekliği kadar altta padding */}
        <main
          className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain ${
            showFooter ? 'pb-20 md:pb-0' : ''
          }`}
        >
          {children}
        </main>
      </div>

      {/* Mobil: footer root seviyede, böylece hiçbir sayfa overflow ile gizlemez. Sadece chat ekranında gizli. */}
      {showFooter ? (
        <div
          className="fixed bottom-0 left-0 right-0 z-[35] md:hidden"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <BottomNav />
        </div>
      ) : null}
    </div>
  );
}
