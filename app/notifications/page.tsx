'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { notificationsApi, profileCommentApi } from '@/lib/api';
import { useLayoutTitle } from '@/contexts/AppLayoutContext';
import Link from 'next/link';

// ─── Notification type icon helper ───────────────────────────────────────────
function NotificationIcon({ type }: { type: string }) {
  const baseClass = 'w-5 h-5 flex-shrink-0';

  if (type === 'profile_comment' || type === 'comment') {
    return (
      <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    );
  }
  if (type === 'like') {
    return (
      <svg className={baseClass} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    );
  }
  if (type === 'follow') {
    return (
      <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    );
  }
  if (type === 'message') {
    return (
      <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    );
  }
  if (type === 'mention') {
    return (
      <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
      </svg>
    );
  }
  // Default: bell
  return (
    <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

// ─── Icon background color by type ────────────────────────────────────────────
function getIconStyle(type: string, isDark: boolean): string {
  const map: Record<string, string> = {
    like:            isDark ? 'bg-rose-500/20 text-rose-400'   : 'bg-rose-50 text-rose-500',
    follow:          isDark ? 'bg-blue-500/20 text-blue-400'   : 'bg-blue-50 text-blue-500',
    message:         isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-50 text-green-600',
    mention:         isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-50 text-purple-500',
    profile_comment: isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-500',
    comment:         isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-500',
  };
  return map[type] ?? (isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500');
}

// ─── Relative time formatter ───────────────────────────────────────────────────
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'İndicə';
  if (mins < 60) return `${mins} dəq`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} saat`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days} gün`;
  return new Date(dateStr).toLocaleDateString();
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  useLayoutTitle('Bildirişlər');
  const [list, setList] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileComments, setProfileComments] = useState<any[]>([]);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([notificationsApi.list(), notificationsApi.unreadCount()])
      .then(([res, countRes]) => {
        setList((res as any).notifications || []);
        setUnreadCount((countRes as any).unread_count ?? 0);
      })
      .catch((err) => setError(err?.message || 'Yüklənmədi'))
      .finally(() => setLoading(false));
  }, [user]);

  const loadProfileComments = async () => {
    const userId = user?.id || (user as any)?._id;
    if (!userId) return;
    try {
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
      setList((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 py-5 md:px-6">

        {/* ─── Header ─── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bildirişlər</h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-xs font-semibold rounded-full bg-blue-500 text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadProfileComments}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
            >
              Şərhlər
            </button>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Hamısını oxu
              </button>
            )}
          </div>
        </div>

        {/* ─── Error banner ─── */}
        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400 animate-slide-up">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* ─── Profile comments panel ─── */}
        {showComments && (
          <div className="mb-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden animate-slide-up shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Haqqımda şərhlər
              </h2>
              <button
                onClick={() => setShowComments(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
              {profileComments.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  Haqqınızda şərh yoxdur.
                </p>
              ) : (
                profileComments.map((comment: any) => (
                  <div
                    key={comment.id}
                    className="px-3 py-2.5 bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-100 dark:border-gray-600/50"
                  >
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {comment.text}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {relativeTime(comment.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── Loading skeleton ─── */}
        {loading && (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded-full w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2" />
                </div>
                <div className="w-10 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* ─── Empty state ─── */}
        {!loading && list.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Bildiriş yoxdur
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Yeni bildirişlər burada görünəcək
            </p>
          </div>
        )}

        {/* ─── Notification list ─── */}
        {!loading && list.length > 0 && (
          <div className="space-y-2">
            {list.map((n: any, idx: number) => {
              const isUnread = !n.read_at;
              const iconStyle = getIconStyle(n.type, false); // will use dark:class on wrapper
              return (
                <div
                  key={n.id}
                  className={`
                    group relative flex items-start gap-3 px-4 py-3.5 rounded-2xl
                    border cursor-pointer
                    transition-all duration-150 ease-out
                    active:scale-[0.99]
                    animate-slide-up
                    ${isUnread
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/40 hover:bg-blue-100/70 dark:hover:bg-blue-950/50'
                      : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-750'
                    }
                  `}
                  style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'both' }}
                  onClick={() => {
                    if (isUnread) handleMarkRead(n.id);
                    if (n.type === 'profile_comment') loadProfileComments();
                  }}
                >
                  {/* Unread left accent */}
                  {isUnread && (
                    <span className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-blue-500" aria-hidden="true" />
                  )}

                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isUnread
                      ? getIconStyle(n.type, true)   // use dark style for unread (darker bg)
                      : getIconStyle(n.type, false)
                  }`}>
                    <NotificationIcon type={n.type} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${
                      isUnread
                        ? 'font-semibold text-gray-900 dark:text-white'
                        : 'font-medium text-gray-700 dark:text-gray-200'
                    }`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {n.body}
                      </p>
                    )}
                    {n.type === 'profile_comment' && (
                      <Link
                        href="/comments"
                        className="inline-block mt-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Bütün şərhlərə bax →
                      </Link>
                    )}
                  </div>

                  {/* Time + unread dot */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                      {relativeTime(n.created_at)}
                    </span>
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" aria-label="Oxunmamış" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
