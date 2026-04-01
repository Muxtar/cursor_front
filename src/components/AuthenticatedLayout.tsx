'use client';

/**
 * AuthenticatedLayout — persistent shell that wraps all authenticated pages.
 *
 * Placed in app/layout.tsx so it lives in the React tree across ALL
 * navigations. AppLayout (and therefore Sidebar) is mounted ONCE and never
 * unmounted between page transitions — contacts, chats, and online-status
 * data survive every navigation without a re-fetch.
 *
 * Pages that opt out of AppLayout (login, register, /chat, and any public
 * pages) are listed in NO_LAYOUT_PATHS. They receive `children` directly
 * without any sidebar wrapper.
 */

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAppLayoutContext } from '@/contexts/AppLayoutContext';
import AppLayout from '@/components/AppLayout';

/**
 * Routes that should NOT be wrapped in AppLayout.
 * - Root landing page   → no sidebar
 * - Auth pages          → no sidebar at all
 * - /chat               → has its own full-screen layout with Sidebar embedded
 */
const NO_LAYOUT_PATHS = ['/', '/login', '/register'];

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';
  const { user } = useAuth();
  const { title } = useAppLayoutContext();

  // ── Public / auth routes: render bare children ──────────────────────────
  const isNoLayout = NO_LAYOUT_PATHS.some((p) =>
    // Exact match for '/', prefix match for others (e.g. '/login' matches '/login/...')
    p === '/' ? pathname === '/' : pathname.startsWith(p)
  );
  if (isNoLayout || !user) {
    return <>{children}</>;
  }

  // ── All authenticated pages (including /chat): persistent AppLayout ──────
  return (
    <AppLayout title={pathname === '/chat' ? '' : title}>
      {children}
    </AppLayout>
  );
}
