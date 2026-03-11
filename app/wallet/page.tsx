'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { useLayoutTitle } from '@/contexts/AppLayoutContext';
import Link from 'next/link';

export default function WalletPage() {
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  useLayoutTitle(t('wallet'));

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} sticky top-0 z-10`}>
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link
                href="/chat"
                className={`flex items-center space-x-2 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'} hover:opacity-80`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>{t('backToChat')}</span>
              </Link>
              <h1 className={`text-xl font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                {t('wallet')}
              </h1>
              <div className="w-12"></div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} p-8 text-center`}>
            <svg className={`w-24 h-24 mx-auto mb-4 ${actualTheme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h2 className={`text-2xl font-semibold mb-2 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              {t('wallet')}
            </h2>
            <p className={`${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Coming soon: Bank account, money transfer, and payment features
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
