'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
/**
 * Modern bottom navigation bar with pill active indicator and scale animations.
 * Used on mobile inside AppLayout (fixed bottom). On desktop it's shown in Sidebar.
 */
export default function BottomNav() {
  const { actualTheme } = useTheme();
  const { t } = useLanguage();
  const pathname = usePathname();
  const isDark = actualTheme === 'dark';

  const navItems = [
    {
      href: '/chat',
      label: t('chats'),
      active: pathname === '/chat',
      icon: (active: boolean) => (
        <svg className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      href: '/stories',
      label: t('stories'),
      active: pathname === '/stories' || pathname?.startsWith('/story'),
      icon: (active: boolean) => (
        <svg className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      href: '/location',
      label: t('location'),
      active: pathname === '/location',
      icon: (active: boolean) => (
        <svg className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      href: '/wallet',
      label: t('wallet'),
      active: pathname === '/wallet',
      icon: (active: boolean) => (
        <svg className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      className={`flex items-center justify-around px-1 py-1.5 border-t ${
        isDark
          ? 'border-gray-700/60 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/80'
          : 'border-gray-200/60 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80'
      }`}
      role="navigation"
      aria-label="Bottom navigation"
    >
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? 'page' : undefined}
          className={`
            relative flex flex-col items-center justify-center gap-[3px]
            px-2 py-1.5 rounded-2xl flex-1 max-w-[68px] min-h-[52px]
            transition-all duration-200 ease-out
            active:scale-[0.88] active:transition-none
            select-none
            ${item.active
              ? isDark
                ? 'text-blue-400'
                : 'text-blue-600'
              : isDark
                ? 'text-gray-500 hover:text-gray-300'
                : 'text-gray-400 hover:text-gray-600'
            }
          `}
        >
          {/* Background pill for active state */}
          <span
            className={`
              absolute inset-x-1 top-[3px] h-9 rounded-xl
              transition-all duration-200 ease-out
              ${item.active
                ? isDark
                  ? 'opacity-100 bg-blue-500/15'
                  : 'opacity-100 bg-blue-50'
                : 'opacity-0'
              }
            `}
            aria-hidden="true"
          />

          {/* Icon */}
          <span
            className={`relative z-10 transition-transform duration-200 ease-out ${
              item.active ? 'scale-110' : 'scale-100'
            }`}
          >
            {item.icon(item.active)}
          </span>

          {/* Label */}
          <span
            className={`
              relative z-10 text-[10px] leading-none font-medium truncate w-full text-center
              transition-all duration-200
              ${item.active ? 'opacity-100' : 'opacity-60'}
            `}
          >
            {item.label}
          </span>
        </Link>
      ))}
    </nav>
  );
}
