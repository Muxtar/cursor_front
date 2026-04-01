'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { storyApi, userApi, getFileBaseUrl } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLayoutTitle } from '@/contexts/AppLayoutContext';
import StoryViewer from '@/components/StoryViewer';

interface Story {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  type?: 'media' | 'product';
  media_url?: string;
  media_type?: 'image' | 'video';
  text?: string;
  created_at: string;
  expires_at: string;
  like_count?: number;
  dislike_count?: number;
  comment_count?: number;
  is_liked?: boolean;
  is_disliked?: boolean;
  product?: {
    id: string;
    name: string;
    description?: string;
    price?: number;
    media_urls?: string[];
  };
}

interface StoryGroup {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  stories: Story[];
}

interface StoryComment {
  id: string;
  user_name: string;
  user_avatar?: string;
  text: string;
  created_at: string;
}

export default function StoriesPage() {
  const { t } = useLanguage();
  useLayoutTitle(t('stories'));
  const router = useRouter();
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const dark = actualTheme === 'dark';

  const [allStories, setAllStories] = useState<Story[]>([]);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerStories, setViewerStories] = useState<Story[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Comment panel state
  const [commentStoryId, setCommentStoryId] = useState<string | null>(null);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const currentUserId = (user as any)?.id || (user as any)?._id;

  // Debounced user search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res: any = await userApi.searchByUsername(searchQuery.trim());
        const users = Array.isArray(res) ? res : (res?.users ? res.users : (res?.id || res?._id ? [res] : []));
        setSearchResults(users);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /** Build an absolute URL for a media file so <img>/<video> can load it. */
  const resolveFileUrl = (raw: string | undefined | null): string => {
    if (!raw) return '';
    const url = raw.trim();
    if (!url) return '';
    // Already absolute
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    const base = getFileBaseUrl(); // e.g. http://localhost:8080
    // /uploads/filename  →  /api/v1/files/filename
    if (url.startsWith('/uploads/')) return `${base}/api/v1/files/${url.replace(/^\/uploads\//, '')}`;
    // /api/v1/files/filename  →  base + url
    if (url.startsWith('/api/')) return `${base}${url}`;
    // bare filename (e.g. "abc-123.png")  →  base + /api/v1/files/filename
    if (!url.startsWith('/')) return `${base}/api/v1/files/${url}`;
    return `${base}${url}`;
  };

  /** Pick the best image/video source from a story object. */
  const getStoryMediaUrl = (story: Story): string => {
    const raw =
      story.media_url
      || (story.type === 'product' ? story.product?.media_urls?.[0] : undefined)
      || '';
    return resolveFileUrl(raw);
  };

  const loadStories = useCallback(async () => {
    try {
      const res: any = await storyApi.getFeed();
      const rawFeed: any[] = Array.isArray(res?.feed) ? res.feed : [];

      const groups: StoryGroup[] = [];
      const flatStories: Story[] = [];

      for (const group of rawFeed) {
        const stories = (group.stories || []).map((s: any) => ({
          ...s,
          user_name: group.user_info?.username || 'User',
          user_avatar: group.user_info?.avatar || undefined,
          // Prefer explicit media_url, fall back to product thumbnail; keep empty string for no-media
          media_url: s.media_url ?? s.product?.media_urls?.[0] ?? '',
          media_type: s.media_type || 'image',
        }));
        if (stories.length > 0) {
          groups.push({
            user_id: group.user_id,
            user_name: group.user_info?.username || 'User',
            user_avatar: group.user_info?.avatar || undefined,
            stories,
          });
          flatStories.push(...stories);
        }
      }

      groups.sort((a, b) => {
        if (a.user_id === currentUserId) return -1;
        if (b.user_id === currentUserId) return 1;
        return 0;
      });

      setStoryGroups(groups);
      setAllStories(flatStories);
    } catch {
      setStoryGroups([]);
      setAllStories([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const openStoryViewer = (stories: Story[], index = 0) => {
    setViewerStories(stories);
    setViewerIndex(index);
    setShowViewer(true);
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      await storyApi.deleteStory(storyId);
      loadStories();
    } catch { /* ignore */ }
  };

  const handleLikeStory = async (story: Story) => {
    try {
      if (story.is_liked) {
        await storyApi.unlikeStory(story.id);
      } else {
        await storyApi.likeStory(story.id);
      }
      loadStories();
    } catch { /* ignore */ }
  };

  const handleDislikeStory = async (story: Story) => {
    try {
      if (story.is_disliked) {
        await storyApi.undislikeStory(story.id);
      } else {
        await storyApi.dislikeStory(story.id);
      }
      loadStories();
    } catch { /* ignore */ }
  };

  const openComments = async (storyId: string) => {
    setCommentStoryId(storyId);
    setComments([]);
    setCommentText('');
    setLoadingComments(true);
    try {
      const res: any = await storyApi.getStoryComments(storyId);
      const raw = Array.isArray(res?.comments) ? res.comments : [];
      // Normalise: backend may return user_info or flat user_name
      setComments(raw.map((c: any) => ({
        ...c,
        user_name: c.user_name || c.user_info?.username || 'User',
        user_avatar: c.user_avatar ?? c.user_info?.avatar ?? undefined,
      })));
    } catch {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !commentStoryId || sendingComment) return;
    setSendingComment(true);
    try {
      const res: any = await storyApi.addStoryComment(commentStoryId, commentText.trim());
      if (res) {
        const c = res.comment || res;
        setComments((prev) => [...prev, {
          ...c,
          user_name: c.user_name || c.user_info?.username || 'User',
          user_avatar: c.user_avatar ?? c.user_info?.avatar ?? undefined,
        }]);
      }
      setCommentText('');
      loadStories();
    } catch { /* ignore */ }
    finally { setSendingComment(false); }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('storyJustNow');
    if (mins < 60) return `${mins}${t('storyMinAgo')}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}${t('storyHrAgo')}`;
    return `${Math.floor(hrs / 24)}${t('storyDayAgo')}`;
  };

  const myStories = allStories.filter((s) => s.user_id === currentUserId);

  return (
    <div className="flex flex-col h-full">
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <span className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full inline-block" />
            <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{t('loading')}</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* ── SEARCH BAR ── */}
          <div className={`px-4 pt-4 pb-2 ${dark ? 'border-gray-800' : 'border-gray-100'} border-b relative`}>
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <svg className={`w-4 h-4 flex-shrink-0 ${dark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                placeholder={t('storySearchUsers') || 'Search users by name...'}
                className={`flex-1 bg-transparent outline-none text-sm ${dark ? 'text-white placeholder:text-gray-500' : 'text-gray-900 placeholder:text-gray-400'}`}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className={`${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Search results dropdown */}
            {searchFocused && searchQuery.trim() && (
              <div className={`absolute left-4 right-4 top-full mt-1 rounded-xl shadow-lg border z-30 max-h-64 overflow-y-auto ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                {searching ? (
                  <div className="flex justify-center py-4">
                    <span className="animate-spin w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full inline-block" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className={`text-sm text-center py-4 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {t('storyNoUsersFound') || 'No users found'}
                  </p>
                ) : (
                  searchResults.map((u: any) => {
                    const uid = u.id || u._id;
                    return (
                      <button
                        key={uid}
                        onMouseDown={() => {
                          setSearchQuery('');
                          setSearchResults([]);
                          router.push(`/profile/${uid}`);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${dark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                      >
                        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                          {u.avatar ? (
                            <img src={resolveFileUrl(u.avatar)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
                              {(u.username || u.first_name || 'U')[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${dark ? 'text-white' : 'text-gray-900'}`}>{u.username || u.first_name || 'User'}</p>
                          {u.bio && <p className={`text-xs truncate ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{u.bio}</p>}
                        </div>
                        <svg className={`w-4 h-4 flex-shrink-0 ${dark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* ── NEW STORY SECTION (Top) ── */}
          <div className={`px-4 pt-4 pb-3 ${dark ? 'border-gray-800' : 'border-gray-100'} border-b`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-5 bg-gradient-to-b from-pink-500 to-orange-400 rounded-full" />
              <h2 className={`text-base font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
                {t('storyAddNew')}
              </h2>
            </div>

            <button
              onClick={() => router.push('/story/create')}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98] ${
                dark
                  ? 'bg-gradient-to-r from-gray-800 to-gray-800/80 hover:from-gray-750 hover:to-gray-800 border border-gray-700'
                  : 'bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-white border border-gray-200 shadow-sm'
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-orange-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-pink-500/25">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="text-left flex-1">
                <p className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
                  {t('storyShareMoment')}
                </p>
                <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('storyPhotoVideo')}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <svg className={`w-5 h-5 ${dark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </button>

            {/* ── Story Circles Row ── */}
            {storyGroups.length > 0 && (
              <div className="mt-4">
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                  {storyGroups.map((group) => {
                    const isOwn = group.user_id === currentUserId;
                    const first = group.stories[0];
                    const thumbUrl = resolveFileUrl(first?.user_avatar) || getStoryMediaUrl(first);

                    return (
                      <button
                        key={group.user_id}
                        onClick={() => openStoryViewer(group.stories)}
                        className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
                      >
                        <div className={`relative p-[2.5px] rounded-full group-active:scale-95 transition-transform ${
                          isOwn
                            ? 'bg-gradient-to-tr from-green-400 to-emerald-500'
                            : 'bg-gradient-to-tr from-pink-500 via-red-500 to-orange-400'
                        }`}>
                          <div className={`w-[60px] h-[60px] rounded-full p-[2px] ${dark ? 'bg-gray-900' : 'bg-white'}`}>
                            <div className="w-full h-full rounded-full overflow-hidden">
                              {thumbUrl ? (
                                <img src={thumbUrl} alt={group.user_name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                                  {group.user_name?.[0]?.toUpperCase() || 'U'}
                                </div>
                              )}
                            </div>
                          </div>
                          {group.stories.length > 1 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white dark:border-gray-900">
                              {group.stories.length}
                            </div>
                          )}
                        </div>
                        <p className={`text-[11px] max-w-[68px] truncate leading-none ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {isOwn ? t('storyYours') : group.user_name}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── STORIES FEED (Instagram-style posts) ── */}
          {allStories.length > 0 ? (
            <div className="pb-24">
              {/* Section header */}
              <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
                <h2 className={`text-base font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
                  {t('storyRecent')}
                </h2>
              </div>

              <div className="space-y-4 px-4 max-w-md mx-auto">
                {allStories.map((story, idx) => {
                  const imgUrl = getStoryMediaUrl(story);
                  const isOwn = story.user_id === currentUserId;

                  return (
                    <div
                      key={story.id}
                      className={`rounded-2xl overflow-hidden ${
                        dark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200 shadow-sm'
                      }`}
                    >
                      {/* Post Header */}
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-pink-500/30">
                            {story.user_avatar ? (
                              <img src={resolveFileUrl(story.user_avatar)} alt={story.user_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
                                {story.user_name?.[0]?.toUpperCase() || 'U'}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>
                              {story.user_name}
                            </p>
                            <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {timeAgo(story.created_at)}
                            </p>
                          </div>
                        </div>
                        {isOwn && (
                          <button
                            onClick={() => handleDeleteStory(story.id)}
                            className={`p-2 rounded-full ${dark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                          >
                            <svg className={`w-5 h-5 ${dark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Post Image */}
                      <button
                        onClick={() => openStoryViewer([story], 0)}
                        className="w-full aspect-[4/3] relative overflow-hidden"
                      >
                        {imgUrl ? (
                          story.media_type === 'video' ? (
                            <video src={imgUrl} className="w-full h-full object-cover" muted />
                          ) : (
                            <img
                              src={imgUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement!.classList.add('bg-gradient-to-br', 'from-gray-700', 'to-gray-800');
                              }}
                            />
                          )
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            <svg className={`w-16 h-16 ${dark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        {/* Product badge */}
                        {story.type === 'product' && story.product && (
                          <div className="absolute bottom-3 left-3 right-3 bg-black/50 backdrop-blur-sm rounded-xl px-3 py-2">
                            <p className="text-white font-semibold text-sm truncate">{story.product.name}</p>
                            {story.product.price != null && (
                              <p className="text-green-400 text-xs font-medium">${story.product.price}</p>
                            )}
                          </div>
                        )}
                      </button>

                      {/* Action Buttons */}
                      <div className="px-4 py-3">
                        <div className="flex items-center gap-4">
                          {/* Like */}
                          <button
                            onClick={() => handleLikeStory(story)}
                            className="flex items-center gap-1.5 group"
                          >
                            <svg
                              className={`w-6 h-6 transition-colors ${story.is_liked ? 'text-red-500' : dark ? 'text-gray-300 group-hover:text-red-400' : 'text-gray-700 group-hover:text-red-400'}`}
                              fill={story.is_liked ? 'currentColor' : 'none'}
                              stroke="currentColor"
                              strokeWidth={2}
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span className={`text-sm font-medium ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                              {story.like_count || 0}
                            </span>
                          </button>

                          {/* Dislike */}
                          <button
                            onClick={() => handleDislikeStory(story)}
                            className="flex items-center gap-1.5 group"
                          >
                            <svg
                              className={`w-6 h-6 transition-colors ${story.is_disliked ? 'text-blue-500' : dark ? 'text-gray-300 group-hover:text-blue-400' : 'text-gray-700 group-hover:text-blue-400'}`}
                              fill={story.is_disliked ? 'currentColor' : 'none'}
                              stroke="currentColor"
                              strokeWidth={2}
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                            </svg>
                            <span className={`text-sm font-medium ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                              {story.dislike_count || 0}
                            </span>
                          </button>

                          {/* Comment */}
                          <button
                            onClick={() => openComments(story.id)}
                            className="flex items-center gap-1.5 group"
                          >
                            <svg
                              className={`w-6 h-6 transition-colors ${dark ? 'text-gray-300 group-hover:text-white' : 'text-gray-700 group-hover:text-gray-900'}`}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span className={`text-sm font-medium ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                              {story.comment_count || 0}
                            </span>
                          </button>
                        </div>

                        {/* Text caption */}
                        {story.text && (
                          <p className={`mt-2 text-sm ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
                            <span className="font-semibold">{story.user_name}</span>{' '}
                            {story.text}
                          </p>
                        )}

                        {/* View comments link */}
                        {(story.comment_count ?? 0) > 0 && commentStoryId !== story.id && (
                          <button
                            onClick={() => openComments(story.id)}
                            className={`mt-1 text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}
                          >
                            {t('storyViewComments') || `View all ${story.comment_count} comments`}
                          </button>
                        )}
                      </div>

                      {/* Inline Comments Section */}
                      {commentStoryId === story.id && (
                        <div className={`border-t ${dark ? 'border-gray-700' : 'border-gray-100'}`}>
                          <div className="px-4 py-3 max-h-60 overflow-y-auto space-y-3">
                            {loadingComments ? (
                              <div className="flex justify-center py-4">
                                <span className="animate-spin w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full inline-block" />
                              </div>
                            ) : comments.length === 0 ? (
                              <p className={`text-sm text-center py-3 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {t('storyNoComments')}
                              </p>
                            ) : (
                              comments.map((comment) => (
                                <div key={comment.id} className="flex gap-2.5">
                                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                                    {comment.user_avatar ? (
                                      <img src={resolveFileUrl(comment.user_avatar)} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold">
                                        {comment.user_name?.[0]?.toUpperCase() || 'U'}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
                                      <span className="font-semibold">{comment.user_name}</span>{' '}
                                      {comment.text}
                                    </p>
                                    <p className={`text-xs mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                                      {timeAgo(comment.created_at)}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Comment input */}
                          <div className={`px-4 py-3 flex items-center gap-2 border-t ${dark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <input
                              type="text"
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSendComment(); }}
                              placeholder={t('storyWriteComment')}
                              className={`flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400 ${dark ? 'text-white' : 'text-gray-900'}`}
                            />
                            <button
                              onClick={handleSendComment}
                              disabled={!commentText.trim() || sendingComment}
                              className="text-sm font-semibold text-blue-500 disabled:text-blue-500/40"
                            >
                              {sendingComment ? '...' : (t('storySend') || 'Post')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Empty state ── */
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-5 ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <svg className={`w-12 h-12 ${dark ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className={`text-lg font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('storyNoStories')}
              </p>
              <p className={`text-sm text-center mb-5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('storyBeFirst')}
              </p>
              <button
                onClick={() => router.push('/story/create')}
                className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white font-semibold rounded-full text-sm shadow-lg shadow-pink-500/25"
              >
                {t('storyCreate')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Story Viewer Modal ── */}
      {showViewer && viewerStories.length > 0 && (
        <StoryViewer
          stories={viewerStories}
          initialIndex={viewerIndex}
          onClose={() => {
            setShowViewer(false);
            setViewerStories([]);
            loadStories();
          }}
        />
      )}
    </div>
  );
}
