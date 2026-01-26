'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageSearch from '@/components/ImageSearch';
import { useAuth } from '@/contexts/AuthContext';
import LanguageSelector from '@/components/LanguageSelector';

export default function LandingShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push('/chat');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative">
      {/* Language Selector - Top Right Corner */}
      <div className="fixed top-4 right-4 z-50 md:top-4 md:right-4">
        <LanguageSelector />
      </div>

      {/* Desktop: Top-right panel - Adjusted to not overlap with language selector */}
      <div className="hidden md:block fixed top-4 right-4 z-40" style={{ marginTop: '60px' }}>
        {children}
      </div>

      {/* Mobile: Hamburger menu button */}
      <div className="md:hidden fixed top-4 right-4 z-40" style={{ marginTop: '50px' }}>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6 text-gray-700"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {mobileMenuOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile: Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile: Menu panel */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-16 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm animate-in slide-in-from-top-2">
          {children}
        </div>
      )}

      {/* Center websearch like Google (hide immediately if user becomes available) */}
      {!user && (
        <main className="min-h-screen flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-5xl">
            <ImageSearch variant="google" />
          </div>
        </main>
      )}
    </div>
  );
}

