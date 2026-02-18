'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { notificationsApi, profileCommentApi } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [list, setList] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileComments, setProfileComments] = useState<any[]>([]);
  const [showComments, setShowComments] = useState(false);

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

  const loadProfileComments = async () => {
    if (!user?.id && !user?._id) return;
    try {
      const userId = user.id || user._id;
      if (!userId) return;
      const comments = await profileCommentApi.list(userId);
      setProfileComments(Array.isArray(comments) ? comments : []);
      setShowComments(true);
    } catch (err) {
      console.error('Failed to load profile comments:', err);
    }
  };

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

  const handleMarkRead = async (notificationId: string) => {
    try {
      await notificationsApi.markRead([notificationId]);
      setList((prev) => prev.map((n) => 
        n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
      ));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  return (
    <AppLayout title="Bildirişlər">
      <main className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bildirişlər</h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadProfileComments}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Mənim haqqımda şərhlər
            </button>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Hamısını oxunmuş qeyd et
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {showComments && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Mənim haqqımda yazılmış şərhlər
              </h2>
              <button
                onClick={() => setShowComments(false)}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            {profileComments.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">Haqqınızda şərh yoxdur.</p>
            ) : (
              <div className="space-y-3">
                {profileComments.map((comment: any) => (
                  <div
                    key={comment.id}
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="text-sm text-gray-700 dark:text-gray-300">{comment.text}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(comment.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {loading && <p className="text-gray-500 dark:text-gray-400">Yüklənir...</p>}

        {!loading && list.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">Bildiriş yoxdur.</p>
        )}

        <div className="space-y-3">
          {list.map((n: any) => (
            <div
              key={n.id}
              className={`p-4 rounded-lg border cursor-pointer transition ${
                n.read_at 
                  ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' 
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              }`}
              onClick={() => {
                if (!n.read_at) {
                  handleMarkRead(n.id);
                }
                if (n.type === 'profile_comment') {
                  loadProfileComments();
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">{n.title}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{n.body}</div>
                  {n.type === 'profile_comment' && (
                    <div className="mt-2">
                      <Link
                        href="/comments"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Bütün şərhləri gör →
                      </Link>
                    </div>
                  )}
                </div>
                {!n.read_at && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0"></div>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </main>
    </AppLayout>
  );
}
