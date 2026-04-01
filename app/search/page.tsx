'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { phoneCommentApi, searchApi, userApi, chatApi } from '@/lib/api';
import { useLayoutTitle } from '@/contexts/AppLayoutContext';
import { useLanguage } from '@/contexts/LanguageContext';

type Tab = 'phone' | 'profession' | 'users';

export default function SearchPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  useLayoutTitle(t('searchTitle'));
  const [tab, setTab] = useState<Tab>('phone');
  const [phoneQuery, setPhoneQuery] = useState('');
  const [professionQuery, setProfessionQuery] = useState('');
  const [radiusKm, setRadiusKm] = useState(5);
  const [comments, setComments] = useState<any[]>([]);
  const [nearbyResults, setNearbyResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentRating, setNewCommentRating] = useState<number | null>(null);
  // ── Find Users tab ─────────────────────────────────────────────────────────
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [startingChatId, setStartingChatId] = useState<string | null>(null);

  if (!user) {
    router.push('/login');
    return null;
  }

  const handleSearchByPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneQuery.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res: any = await phoneCommentApi.getByPhone(phoneQuery.trim());
      setComments(res.comments || []);
    } catch (err: any) {
      setError(err?.message || t('searchFailed'));
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchByProfession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!professionQuery.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const position = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          reject
        );
      });
      const res: any = await searchApi.byProfession({
        profession: professionQuery.trim(),
        lat: position.lat,
        lng: position.lng,
        radius_km: radiusKm,
      });
      setNearbyResults(res.results || []);
    } catch (err: any) {
      setError(err?.message || t('searchFailed'));
      setNearbyResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneQuery.trim() || !newCommentText.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await phoneCommentApi.create({
        target_phone: phoneQuery.trim(),
        text: newCommentText.trim(),
        rating: newCommentRating ?? undefined,
      });
      setNewCommentText('');
      setNewCommentRating(null);
      const res: any = await phoneCommentApi.getByPhone(phoneQuery.trim());
      setComments(res.comments || []);
    } catch (err: any) {
      setError(err?.message || t('searchCommentFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res: any = await userApi.searchUsers(userQuery.trim());
      setUserResults(Array.isArray(res) ? res : (res?.users || []));
    } catch (err: any) {
      setError(err?.message || t('searchFailed'));
      setUserResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (targetUserId: string) => {
    setStartingChatId(targetUserId);
    try {
      const res: any = await chatApi.createChat({ type: 'direct', member_ids: [targetUserId] });
      const chatId = res?.chat?.id || res?.chat?._id || res?.id || res?._id;
      router.push(chatId ? `/chat?open=${chatId}` : '/chat');
    } catch {
      router.push('/chat');
    } finally {
      setStartingChatId(null);
    }
  };

  return (
    <>
      <main className="p-4 md:p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('searchTitle')}</h1>

        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => setTab('phone')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === 'phone' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700'
            }`}
          >
            {t('searchTabPhone')}
          </button>
          <button
            type="button"
            onClick={() => setTab('profession')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === 'profession' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700'
            }`}
          >
            {t('searchTabProfession')}
          </button>
          <button
            type="button"
            onClick={() => { setTab('users'); setUserResults([]); setUserQuery(''); setError(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === 'users' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700'
            }`}
          >
            {t('searchTabUsers')}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {tab === 'phone' && (
          <>
            <form onSubmit={handleSearchByPhone} className="flex gap-2 mb-4">
              <input
                type="tel"
                value={phoneQuery}
                onChange={(e) => setPhoneQuery(e.target.value)}
                placeholder={t('searchPhonePlaceholder')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
              <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {t('searchBtn')}
              </button>
            </form>

            {phoneQuery.trim() && (
              <form onSubmit={handleAddComment} className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('searchWriteComment')}</label>
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder={t('searchTextPlaceholder')}
                  rows={2}
                  maxLength={2000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 mb-2"
                />
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gray-600">{t('searchRating')}</span>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewCommentRating(newCommentRating === r ? null : r)}
                      className={`w-8 h-8 rounded border text-sm ${newCommentRating === r ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50">
                  {t('searchSubmit')}
                </button>
              </form>
            )}

            <div className="space-y-3">
              {comments.length === 0 && !loading && phoneQuery && <p className="text-gray-500">{t('searchNoPhoneComments')}</p>}
              {comments.map((c: any) => (
                <div key={c.id} className="p-4 bg-white border border-gray-200 rounded-lg">
                  <p className="text-gray-900">{c.text}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                    <span>{c.author_display}</span>
                    <span>{new Date(c.created_at).toLocaleString()}</span>
                    {c.rating != null && <span>★ {c.rating}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'profession' && (
          <>
            <form onSubmit={handleSearchByProfession} className="space-y-2 mb-4">
              <input
                type="text"
                value={professionQuery}
                onChange={(e) => setProfessionQuery(e.target.value)}
                placeholder={t('searchProfessionPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">{t('searchPageRadius')}</label>
                <select
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value={1}>1</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
              </div>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {t('searchNearby')}
              </button>
            </form>

            <div className="space-y-3">
              {nearbyResults.length === 0 && !loading && professionQuery && <p className="text-gray-500">{t('searchNoResults')}</p>}
              {nearbyResults.map((r: any) => (
                <div key={r.user_id} className="p-4 bg-white border border-gray-200 rounded-lg">
                  <div className="font-medium text-gray-900">{r.display_name}</div>
                  <div className="text-sm text-gray-600">{r.profession}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {r.distance_km?.toFixed(1)} km · {t('searchPageComments')} {r.comment_count} · {t('searchAvgRating')} {r.average_rating?.toFixed(1) || '-'}
                  </div>
                  {r.social_verified?.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {r.social_verified.map((s: string) => (
                        <span key={s} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'users' && (
          <>
            <form onSubmit={handleSearchUsers} className="flex gap-2 mb-4">
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder={t('searchPageUserPlaceholder')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                autoFocus
              />
              <button type="submit" disabled={loading || !userQuery.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : t('searchBtn')}
              </button>
            </form>

            <div className="space-y-3">
              {userResults.length === 0 && !loading && userQuery && (
                <p className="text-gray-500 text-center py-4">{t('searchUserNotFound')}</p>
              )}
              {userResults.map((u: any) => {
                const uid = String(u.id || u._id);
                return (
                  <div key={uid} className="p-4 bg-white border border-gray-200 rounded-lg flex items-center gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.username} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white text-lg font-semibold">
                          {u.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{u.username || u.phone_number}</p>
                      {u.profession && <p className="text-sm text-gray-500 truncate">{u.profession}</p>}
                    </div>
                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => router.push(`/profile/${uid}`)}
                        className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition"
                      >
                        {t('searchProfile')}
                      </button>
                      <button
                        onClick={() => handleStartChat(uid)}
                        disabled={startingChatId === uid}
                        className="px-3 py-1.5 text-xs font-medium bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50 transition flex items-center gap-1"
                      >
                        {startingChatId === uid ? (
                          <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : '💬'}
                        {t('searchMessage')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </>
  );
}
