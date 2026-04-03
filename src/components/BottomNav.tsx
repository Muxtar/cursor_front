'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BottomNav() {
  const { actualTheme } = useTheme();
  const { t } = useLanguage();
  const pathname = usePathname();
  const isDark = actualTheme === 'dark';

  const items = [
    {
      href: '/chat', label: t('chats'),
      active: pathname === '/chat',
      icon: (a: boolean) => (
        <svg className="w-[21px] h-[21px]" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      href: '/stories', label: t('stories'),
      active: pathname === '/stories' || pathname?.startsWith('/story'),
      icon: (a: boolean) => (
        <svg className="w-[21px] h-[21px]" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      href: '/ai', label: 'AI', center: true,
      active: pathname === '/ai',
      icon: () => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
      ),
    },
    {
      href: '/location', label: t('location'),
      active: pathname === '/location',
      icon: (a: boolean) => (
        <svg className="w-[21px] h-[21px]" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      href: '/wallet', label: t('wallet'),
      active: pathname === '/wallet',
      icon: (a: boolean) => (
        <svg className="w-[21px] h-[21px]" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      className={`
        flex items-center justify-around
        mx-3 mb-1 px-2 py-2
        rounded-2xl
        ${isDark
          ? 'bg-gray-900/90 border border-gray-700/40 shadow-lg shadow-black/20'
          : 'bg-white/90 border border-gray-200/60 shadow-lg shadow-black/5'
        }
        backdrop-blur-xl
      `}
      style={{ WebkitBackdropFilter: 'blur(24px)' }}
      role="navigation"
      aria-label="Bottom navigation"
    >
      {items.map((item) => {
        if ((item as any).center) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                btn-icon relative flex items-center justify-center
                w-12 h-12 -mt-5 rounded-2xl
                transition-all duration-300 ease-out
                active:scale-90
                ${isDark
                  ? 'bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/30'
                  : 'bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25'
                }
                text-white
              `}
              aria-label="AI Assistant"
            >
              {item.icon(item.active)}
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              btn-icon relative flex flex-col items-center justify-center gap-[2px]
              px-3 py-1.5 rounded-xl flex-1 max-w-[64px]
              transition-all duration-200 ease-out
              active:scale-90
              ${item.active
                ? isDark ? 'text-blue-400' : 'text-blue-600'
                : isDark ? 'text-gray-500' : 'text-gray-400'
              }
            `}
          >
            {/* Active indicator dot */}
            {item.active && (
              <span className={`absolute -top-0.5 w-1 h-1 rounded-full ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`} />
            )}
            <span className={`transition-transform duration-200 ${item.active ? 'scale-110' : ''}`}>
              {item.icon(item.active)}
            </span>
            <span className={`text-[9px] leading-none font-semibold tracking-wide ${item.active ? 'opacity-100' : 'opacity-50'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
