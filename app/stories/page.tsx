'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { storyApi } from '@/lib/api';
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

  const currentUserId = (user as any)?.id || (user as any)?._id;

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
          media_url: s.media_url || s.product?.media_urls?.[0] || '',
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

      // Put own stories group first
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
    } catch {
      // ignore
    }
  };

  const myStories = allStories.filter((s) => s.user_id === currentUserId);
  const otherGroups = storyGroups.filter((g) => g.user_id !== currentUserId);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('storyJustNow');
    if (mins < 60) return `${mins}${t('storyMinAgo')}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}${t('storyHrAgo')}`;
    return `${Math.floor(hrs / 24)}${t('storyDayAgo')}`;
  };

  return (
    <div className="flex flex-col h-full">
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <span className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full inline-block" />
            <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{t('loading')}</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* ── Add Story Card ── */}
          <div className="px-4 pt-4 pb-2">
            <button
              onClick={() => router.push('/story/create')}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed transition-all active:scale-[0.98] ${
                dark
                  ? 'border-gray-600 hover:border-green-500/50 bg-gray-800/50 hover:bg-gray-800'
                  : 'border-gray-200 hover:border-green-500/50 bg-gray-50 hover:bg-green-50/50'
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/20">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="text-left">
                <p className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
                  {t('storyAddNew')}
                </p>
                <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('storyShareMoment')}
                </p>
              </div>
            </button>
          </div>

          {/* ── Story Circles Row ── */}
          {storyGroups.length > 0 && (
            <div className="px-4 py-3">
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {storyGroups.map((group) => {
                  const isOwn = group.user_id === currentUserId;
                  const first = group.stories[0];
                  const thumbUrl = first?.user_avatar || (first?.type === 'product' ? first?.product?.media_urls?.[0] : first?.media_url) || undefined;

                  return (
                    <button
                      key={group.user_id}
                      onClick={() => openStoryViewer(group.stories)}
                      className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
                    >
                      <div className={`relative p-[2.5px] rounded-full group-active:scale-95 transition-transform ${
                        isOwn
                          ? 'bg-gradient-to-tr from-green-400 to-emerald-500'
                          : 'bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-400'
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
                        {/* Story count badge */}
                        {group.stories.length > 1 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white dark:border-gray-900">
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

          {/* ── Divider ── */}
          {(myStories.length > 0 || allStories.length > 0) && (
            <div className={`mx-4 border-t ${dark ? 'border-gray-700' : 'border-gray-100'}`} />
          )}

          {/* ── My Stories Section ── */}
          {myStories.length > 0 && (
            <div className="px-4 pt-4 pb-2">
              <h3 className={`text-sm font-semibold mb-3 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('storyMyStories')}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {myStories.map((story, idx) => {
                  const imgUrl = story.type === 'product'
                    ? (story.product?.media_urls?.[0] || '')
                    : (story.media_url || '');

                  return (
                    <div key={story.id} className="relative group">
                      <button
                        onClick={() => openStoryViewer(myStories, idx)}
                        className={`w-full aspect-[3/4] rounded-xl overflow-hidden ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}
                      >
                        {imgUrl ? (
                          <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        {/* Gradient overlay */}
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
                        {/* Story text */}
                        {story.text && (
                          <p className="absolute bottom-2 left-2 right-2 text-white text-[10px] leading-tight line-clamp-2 drop-shadow">
                            {story.text}
                          </p>
                        )}
                        {/* Time ago */}
                        <span className="absolute top-2 left-2 text-white/80 text-[9px] bg-black/30 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                          {timeAgo(story.created_at)}
                        </span>
                      </button>
                      {/* Delete button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteStory(story.id); }}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      {/* Stats row */}
                      <div className="absolute bottom-2 right-2 flex gap-1.5">
                        {(story.like_count ?? 0) > 0 && (
                          <span className="flex items-center gap-0.5 text-white text-[9px] bg-black/30 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/></svg>
                            {story.like_count}
                          </span>
                        )}
                        {(story.comment_count ?? 0) > 0 && (
                          <span className="flex items-center gap-0.5 text-white text-[9px] bg-black/30 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                            {story.comment_count}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Other Users' Stories Feed ── */}
          {otherGroups.length > 0 && (
            <div className="px-4 pt-4 pb-24">
              <h3 className={`text-sm font-semibold mb-3 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('storyRecent')}
              </h3>
              <div className="space-y-3">
                {otherGroups.map((group) => (
                  <button
                    key={group.user_id}
                    onClick={() => openStoryViewer(group.stories)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.98] ${
                      dark ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50 shadow-sm'
                    }`}
                  >
                    {/* User avatar with ring */}
                    <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-400 flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full p-[2px] ${dark ? 'bg-gray-800' : 'bg-white'}`}>
                        <div className="w-full h-full rounded-full overflow-hidden">
                          {group.user_avatar ? (
                            <img src={group.user_avatar} alt={group.user_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                              {group.user_name?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-left min-w-0">
                      <p className={`font-semibold text-sm truncate ${dark ? 'text-white' : 'text-gray-900'}`}>
                        {group.user_name}
                      </p>
                      <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {group.stories.length} {group.stories.length === 1 ? t('storyCount') : t('storyCountPlural')} · {timeAgo(group.stories[0].created_at)}
                      </p>
                    </div>

                    {/* Preview thumbnails */}
                    <div className="flex -space-x-2">
                      {group.stories.slice(0, 3).map((story) => {
                        const thumb = story.type === 'product'
                          ? (story.product?.media_urls?.[0] || '')
                          : (story.media_url || '');
                        return (
                          <div key={story.id} className={`w-10 h-10 rounded-lg overflow-hidden border-2 ${dark ? 'border-gray-800' : 'border-white'}`}>
                            {thumb ? (
                              <img src={thumb} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Arrow */}
                    <svg className={`w-5 h-5 flex-shrink-0 ${dark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Empty state ── */}
          {allStories.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <svg className={`w-10 h-10 ${dark ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className={`text-base font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('storyNoStories')}
              </p>
              <p className={`text-sm text-center mb-4 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('storyBeFirst')}
              </p>
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
            loadStories(); // refresh after viewing (in case of likes etc)
          }}
        />
      )}
    </div>
  );
}
