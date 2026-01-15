'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageSearch from '@/components/ImageSearch';
import { useAuth } from '@/contexts/AuthContext';

export default function LandingShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

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
      {/* Top-right panel */}
      <div className="fixed top-4 right-4 z-50">
        {children}
      </div>

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

