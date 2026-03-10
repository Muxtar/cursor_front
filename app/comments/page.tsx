'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { profileCommentApi, notificationsApi } from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────────
type TargetType = 'phone' | 'car_number' | 'person_name' | 'company' | 'other';

interface Comment {
  id: string;
  target_type: string;
  target_value: string;
  text: string;
  created_at: string;
}

interface MyComment {
  id: string;
  text: string;
  created_at: string;
}

const TARGET_LABELS: Record<TargetType, string> = {
  phone: '📞 Telefon numarası',
  car_number: '🚗 Araç plakası',
  person_name: '👤 Kişi adı',
  company: '🏢 Şirket adı',
  other: '🔖 Diğer',
};

const TARGET_PLACEHOLDERS: Record<TargetType, string> = {
  phone: '+994 50 123 45 67',
  car_number: '10-AA-123',
  person_name: 'Ad Soyad veya takma ad',
  company: 'Şirket adı',
  other: 'Herhangi bir metin',
};

const TYPE_COLORS: Record<string, string> = {
  phone: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  car_number: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  person_name: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  company: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

const TYPE_ICON: Record<string, string> = {
  phone: '📞',
  car_number: '🚗',
  person_name: '👤',
  company: '🏢',
  other: '🔖',
};

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function CommentsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent" />
      </div>
    }>
      <CommentsPageInner />
    </Suspense>
  );
}

function CommentsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const dark = actualTheme === 'dark';

  // Tabs: write | search | mine
  const [tab, setTab] = useState<'write' | 'search' | 'mine'>('search');

  // ── Write form state ────────────────────────────────────────────────────────
  const [writeType, setWriteType] = useState<TargetType>('phone');
  const [writeTarget, setWriteTarget] = useState('');
  const [writeText, setWriteText] = useState('');
  const [writeSaving, setWriteSaving] = useState(false);
  const [writeSuccess, setWriteSuccess] = useState('');
  const [writeError, setWriteError] = useState('');

  // ── Search state ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Comment[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // ── My notifications / comments on my number ──────────────────────────────
  const [myComments, setMyComments] = useState<MyComment[]>([]);
  const [myCommentCount, setMyCommentCount] = useState(0);
  const [loadingMine, setLoadingMine] = useState(false);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    // Load comment count on my number for badge
    loadMyCount();
    // Pre-fill search from URL param
    const q = searchParams.get('q');
    if (q) {
      setSearchQuery(q);
      setTab('search');
      handleSearchWith(q);
    }
  }, [user]);

  const loadMyCount = async () => {
    try {
      const data: any = await notificationsApi.list(100);
      const notifs: any[] = data?.notifications || [];
      const commentNotifs = notifs.filter((n: any) => n.type === 'profile_comment' && !n.read_at);
      setMyCommentCount(commentNotifs.length);
    } catch { /* silent */ }
  };

  const loadMyComments = async () => {
    if (!user) return;
    setLoadingMine(true);
    try {
      const userId = (user as any).id || (user as any)._id;
      const data: any = await profileCommentApi.list(userId);
      setMyComments(Array.isArray(data) ? data : []);
      // Mark notifications as read
      await notificationsApi.markRead([]);
      setMyCommentCount(0);
    } catch { /* silent */ }
    finally { setLoadingMine(false); }
  };

  const handleTabChange = (t: 'write' | 'search' | 'mine') => {
    setTab(t);
    if (t === 'mine') loadMyComments();
  };

  // ── Write ───────────────────────────────────────────────────────────────────
  const handleWrite = async (e: React.FormEvent) => {
    e.preventDefault();
    setWriteError('');
    setWriteSuccess('');
    if (!writeTarget.trim()) { setWriteError('Hedef değeri giriniz.'); return; }
    if (!writeText.trim()) { setWriteError('Yorum metni giriniz.'); return; }
    setWriteSaving(true);
    try {
      // Map company/other to 'person_name' (backend only supports phone/car_number/person_name)
      const backendType = writeType === 'company' || writeType === 'other' ? 'person_name' : writeType;
      await profileCommentApi.createWithTarget(backendType as any, writeTarget.trim(), writeText.trim());
      setWriteSuccess(
        writeType === 'phone'
          ? 'Yorum gönderildi! Numara sahibi bildirim alacak.'
          : 'Yorum kaydedildi. Arama sonuçlarında görünecek.'
      );
      setWriteTarget('');
      setWriteText('');
    } catch (err: any) {
      setWriteError(err?.message || 'Yorum gönderilemedi.');
    } finally { setWriteSaving(false); }
  };

  // ── Search ──────────────────────────────────────────────────────────────────
  const handleSearchWith = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setSearching(true);
    setSearchError('');
    setHasSearched(true);
    try {
      const data: any = await profileCommentApi.search(q.trim());
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setSearchError(err?.message || 'Arama başarısız.');
      setSearchResults([]);
    } finally { setSearching(false); }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchWith(searchQuery);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <AppLayout title="Yorumlar">
      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        {/* Header */}
        <div className={`${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-10`}>
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className={`p-1.5 rounded-lg ${dark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Yorumlar</h1>
          </div>

          {/* Tabs */}
          <div className={`max-w-3xl mx-auto px-4 flex gap-1 pb-0`}>
            {(['search', 'write', 'mine'] as const).map(t => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className={`relative px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                  tab === t
                    ? (dark ? 'border-green-400 text-green-400' : 'border-green-600 text-green-700')
                    : (dark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700')
                }`}
              >
                {t === 'search' && '🔍 Ara'}
                {t === 'write' && '✍️ Yorum Yaz'}
                {t === 'mine' && (
                  <>
                    🔔 Bana Gelenler
                    {myCommentCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1">
                        {myCommentCount > 99 ? '99+' : myCommentCount}
                      </span>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6">

          {/* ── SEARCH TAB ──────────────────────────────────────────────────── */}
          {tab === 'search' && (
            <div className="space-y-5">
              <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                Telefon numarası, araç plakası, şirket adı veya kişi adı yazarak arama yapın.
              </p>

              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Arama yap… (örn. +994501234567, 10-AA-123, Acme Ltd)"
                  className={`flex-1 px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    dark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <button
                  type="submit"
                  disabled={searching || !searchQuery.trim()}
                  className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50 flex items-center gap-2"
                >
                  {searching ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                  Ara
                </button>
              </form>

              {searchError && (
                <p className="text-red-500 text-sm">{searchError}</p>
              )}

              {hasSearched && (
                <div>
                  <p className={`text-sm font-medium mb-3 ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {searchResults.length === 0
                      ? 'Sonuç bulunamadı.'
                      : `${searchResults.length} yorum bulundu`}
                  </p>
                  <div className="space-y-3">
                    {searchResults.map(c => (
                      <CommentCard key={c.id} comment={c} dark={dark} showTarget />
                    ))}
                  </div>
                </div>
              )}

              {!hasSearched && (
                <div className={`${dark ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl p-6 text-center`}>
                  <svg className={`w-12 h-12 mx-auto mb-3 ${dark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Arama yapmak için yukarıya bir değer girin
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── WRITE TAB ───────────────────────────────────────────────────── */}
          {tab === 'write' && (
            <div className={`${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-5 space-y-4`}>
              <h2 className={`text-base font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Yeni Yorum Yaz</h2>
              <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                Herhangi bir numara, plaka, kişi veya şirket hakkında anonim yorum yazabilirsiniz.
              </p>

              <form onSubmit={handleWrite} className="space-y-4">
                {/* Type selector */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Neyle ilgili?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(TARGET_LABELS) as TargetType[]).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => { setWriteType(type); setWriteTarget(''); setWriteError(''); }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                          writeType === type
                            ? 'bg-green-500 text-white border-green-500'
                            : (dark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50')
                        }`}
                      >
                        {TARGET_LABELS[type]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target input */}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {TARGET_LABELS[writeType]} <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={writeTarget}
                    onChange={e => { setWriteTarget(e.target.value); setWriteError(''); }}
                    placeholder={TARGET_PLACEHOLDERS[writeType]}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      dark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                  {writeType === 'phone' && (
                    <p className={`text-xs mt-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Telefon numarası sahibi bildirim alacak.
                    </p>
                  )}
                </div>

                {/* Comment text */}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Yorum <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={writeText}
                    onChange={e => { setWriteText(e.target.value); setWriteError(''); }}
                    rows={4}
                    placeholder="Yorumunuzu yazın..."
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm resize-none outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      dark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                {writeError && <p className="text-red-500 text-sm">{writeError}</p>}
                {writeSuccess && (
                  <div className={`px-4 py-3 rounded-lg text-sm ${dark ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700'}`}>
                    ✓ {writeSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={writeSaving}
                  className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {writeSaving ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                  {writeSaving ? 'Gönderiliyor...' : 'Yorum Gönder'}
                </button>
              </form>
            </div>
          )}

          {/* ── MINE TAB ────────────────────────────────────────────────────── */}
          {tab === 'mine' && (
            <div className="space-y-4">
              <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                Telefon numaranıza yazılan yorumlar aşağıda görünür.
              </p>

              {loadingMine ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent" />
                </div>
              ) : myComments.length === 0 ? (
                <div className={`${dark ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl p-8 text-center`}>
                  <svg className={`w-12 h-12 mx-auto mb-3 ${dark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Henüz numaranıza yorum yapılmadı.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myComments.map(c => (
                    <div key={c.id} className={`${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-4`}>
                      <p className={`text-sm leading-relaxed ${dark ? 'text-gray-200' : 'text-gray-800'}`}>{c.text}</p>
                      <p className={`text-xs mt-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {new Date(c.created_at).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}

// ─── Comment Card ───────────────────────────────────────────────────────────────
function CommentCard({ comment, dark, showTarget }: { comment: Comment; dark: boolean; showTarget?: boolean }) {
  const typeColor = TYPE_COLORS[comment.target_type] || TYPE_COLORS.other;
  const typeIcon = TYPE_ICON[comment.target_type] || '🔖';

  return (
    <div className={`${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-4 space-y-2`}>
      {showTarget && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${typeColor}`}>
            {typeIcon} {comment.target_type === 'car_number' ? 'Araç' : comment.target_type === 'phone' ? 'Telefon' : comment.target_type === 'person_name' ? 'Kişi' : comment.target_type}
          </span>
          <span className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
            {comment.target_value}
          </span>
        </div>
      )}
      <p className={`text-sm leading-relaxed ${dark ? 'text-gray-200' : 'text-gray-800'}`}>{comment.text}</p>
      <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
        {new Date(comment.created_at).toLocaleString('tr-TR')}
      </p>
    </div>
  );
}
