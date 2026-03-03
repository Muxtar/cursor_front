'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageSearch from '@/components/ImageSearch';
import GuestCommentForm from '@/components/GuestCommentForm';
import { useAuth } from '@/contexts/AuthContext';
import LanguageSelector from '@/components/LanguageSelector';

export default function LandingShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/chat');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Giriş yapmış kullanıcı ana sayfaya gelirse login ekranı hiç gösterilmez; sadece chat'e yönlendirilir.
  if (user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent rounded-full" />
          <p className="text-gray-500 text-sm">Yönlendiriliyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-white relative">
      {/* Language Selector - Top Right, safe area */}
      <div className="fixed top-4 right-4 z-50 md:top-4 md:right-4 safe-area-inset-right" style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}>
        <LanguageSelector />
      </div>

      {/* Desktop: Login widget top-right */}
      <div className="hidden md:block fixed top-4 right-4 z-40" style={{ marginTop: '60px' }}>
        {children}
      </div>

      {/* Mobile: Hamburger - open login panel */}
      <div className="md:hidden fixed top-4 right-4 z-40" style={{ marginTop: 'max(50px, env(safe-area-inset-top))' }}>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2.5 bg-white rounded-xl shadow-lg border border-gray-200 hover:bg-gray-50 active:scale-95 transition-transform"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            {mobileMenuOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/25 z-30" onClick={() => setMobileMenuOpen(false)} aria-hidden />
      )}

      {/* Mobile: Login panel - full width with safe padding, no overflow */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed left-0 right-0 z-40 top-[72px] bottom-0 overflow-y-auto"
          style={{
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          }}
        >
          <div className="w-full max-w-[min(380px,100%)] mx-auto pb-8">
            {children}
          </div>
        </div>
      )}

      {/* Center: Search + Comment form */}
      <main
        className="min-h-screen flex flex-col items-center justify-center px-3 sm:px-4 py-6 sm:py-8"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="w-full max-w-5xl flex flex-col items-center gap-6 sm:gap-8 min-w-0">
          <ImageSearch variant="google" />
          <GuestCommentForm />
        </div>
      </main>
    </div>
  );
}

