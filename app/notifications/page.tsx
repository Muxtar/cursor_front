'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { notificationsApi } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [list, setList] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      notificationsApi.list(),
      notificationsApi.unreadCount(),
    ])
      .then(([res, countRes]) => {
        setList((res as any).notifications || []);
        setUnreadCount((countRes as any).unread_count ?? 0);
      })
      .catch((err) => setError(err?.message || 'Yüklənmədi'))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    router.push('/login');
    return null;
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markRead();
      setList((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setUnreadCount(0);
    } catch (e) {
      setError((e as Error)?.message || 'Xəta');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Bildirişlər</h1>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-sm text-blue-600 hover:underline"
            >
              Hamısını oxunmuş qeyd et
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && <p className="text-gray-500">Yüklənir...</p>}

        {!loading && list.length === 0 && (
          <p className="text-gray-500">Bildiriş yoxdur.</p>
        )}

        <div className="space-y-3">
          {list.map((n: any) => (
            <div
              key={n.id}
              className={`p-4 rounded-lg border ${
                n.read_at ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="font-medium text-gray-900">{n.title}</div>
              <div className="text-sm text-gray-700 mt-1">{n.body}</div>
              <div className="text-xs text-gray-500 mt-2">
                {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
