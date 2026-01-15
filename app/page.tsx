'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ImageSearch from '@/components/ImageSearch';
import LoginWidget from '@/components/LoginWidget';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/chat');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If already logged in, we redirect above.
  if (user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative">
      {/* Top-right login panel */}
      <div className="fixed top-4 right-4 z-50">
        <LoginWidget />
      </div>

      {/* Center websearch like Google */}
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-4xl">
          <ImageSearch variant="google" />
        </div>
      </main>
    </div>
  );
}





