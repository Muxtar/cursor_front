'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Alt menü (Stories, Explore, Location, Wallet, Profile).
 * Mobilde AppLayout içinde fixed bottom olarak kullanılır; masaüstünde Sidebar içinde gösterilir.
 */
export default function BottomNav() {
  const { actualTheme } = useTheme();
  const { t } = useLanguage();
  const pathname = usePathname();
  const { user } = useAuth();
  const profileHref = `/profile/${user?.id || (user as any)?._id}`;

  const linkClass = (active: boolean) =>
    `flex flex-col items-center space-y-1 p-2 rounded-lg transition ${
      active
        ? actualTheme === 'dark'
          ? 'bg-blue-600 text-white'
          : 'bg-blue-100 text-blue-600'
        : actualTheme === 'dark'
          ? 'hover:bg-gray-700 text-gray-300'
          : 'hover:bg-gray-100 text-gray-600'
    }`;

  return (
    <div
      className={`flex items-center justify-around p-3 border-t ${
        actualTheme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
      }`}
    >
      <Link href="/story/create" className={linkClass(pathname === '/story/create')}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-xs">{t('stories')}</span>
      </Link>
      <Link href="/explore" className={linkClass(pathname === '/explore')}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-xs">{t('explore')}</span>
      </Link>
      <Link href="/location" className={linkClass(pathname === '/location')}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-xs">{t('location')}</span>
      </Link>
      <Link href="/wallet" className={linkClass(pathname === '/wallet')}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span className="text-xs">{t('wallet')}</span>
      </Link>
      <Link href={profileHref} className={linkClass(pathname?.startsWith('/profile') ?? false)}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="text-xs">{t('profile')}</span>
      </Link>
    </div>
  );
}
