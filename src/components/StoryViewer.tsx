'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { storyApi, chatApi, getFileBaseUrl } from '@/lib/api';

interface StoryProduct {
  id: string;
  name: string;
  description?: string;
  price?: number;
  media_urls?: string[];
}

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
  product?: StoryProduct;
}

interface StoryComment {
  id: string;
  user_name: string;
  user_avatar?: string;
  text: string;
  created_at: string;
}

interface StoryViewerProps {
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
}

export default function StoryViewer({ stories, initialIndex = 0, onClose }: StoryViewerProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [paused, setPaused] = useState(false);

  // Reactions
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);

  // Comments
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  // Chat
  const [startingChat, setStartingChat] = useState(false);

  const currentStory = stories[currentStoryIndex];

  // Sync reaction state when story changes
  useEffect(() => {
    if (!currentStory) return;
    setLiked(currentStory.is_liked ?? false);
    setDisliked(currentStory.is_disliked ?? false);
    setLikeCount(currentStory.like_count ?? 0);
    setDislikeCount(currentStory.dislike_count ?? 0);
    setCommentCount(currentStory.comment_count ?? 0);
    setShowComments(false);
    setComments([]);
    setCommentText('');
  }, [currentStoryIndex, currentStory?.id]);

  // Progress bar
  useEffect(() => {
    if (paused || showComments || !currentStory) return;

    setProgress(0);
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [currentStoryIndex, paused, showComments, currentStory]);

  const handleNext = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    }
  };

  const handleLike = async () => {
    if (!currentStory) return;
    try {
      if (liked) {
        await storyApi.unlikeStory(currentStory.id);
        setLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
      } else {
        await storyApi.likeStory(currentStory.id);
        setLiked(true);
        setLikeCount((c) => c + 1);
        if (disliked) {
          setDisliked(false);
          setDislikeCount((c) => Math.max(0, c - 1));
        }
      }
    } catch (e) {
      // ignore
    }
  };

  const handleDislike = async () => {
    if (!currentStory) return;
    try {
      if (disliked) {
        await storyApi.undislikeStory(currentStory.id);
        setDisliked(false);
        setDislikeCount((c) => Math.max(0, c - 1));
      } else {
        await storyApi.dislikeStory(currentStory.id);
        setDisliked(true);
        setDislikeCount((c) => c + 1);
        if (liked) {
          setLiked(false);
          setLikeCount((c) => Math.max(0, c - 1));
        }
      }
    } catch (e) {
      // ignore
    }
  };

  const handleOpenComments = async () => {
    if (!currentStory) return;
    setShowComments(true);
    setPaused(true);
    if (comments.length === 0) {
      setLoadingComments(true);
      try {
        const res: any = await storyApi.getStoryComments(currentStory.id);
        setComments(Array.isArray(res?.comments) ? res.comments : []);
      } catch {
        setComments([]);
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const handleCloseComments = () => {
    setShowComments(false);
    setPaused(false);
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !currentStory || sendingComment) return;
    setSendingComment(true);
    try {
      const res: any = await storyApi.addStoryComment(currentStory.id, commentText.trim());
      if (res?.comment) {
        setComments((prev) => [...prev, res.comment]);
        setCommentCount((c) => c + 1);
      }
      setCommentText('');
    } catch {
      // ignore
    } finally {
      setSendingComment(false);
    }
  };

  const handleMessageSeller = async () => {
    if (!currentStory || startingChat) return;
    setStartingChat(true);
    try {
      const res: any = await chatApi.createChat({
        type: 'direct',
        member_ids: [currentStory.user_id],
      });
      router.push('/chat');
    } catch {
      router.push('/chat');
    } finally {
      setStartingChat(false);
    }
  };

  if (!currentStory) return null;

  const isProductStory = currentStory.type === 'product';
  const rawContentUrl = isProductStory
    ? (currentStory.product?.media_urls?.[0] || '')
    : (currentStory.media_url || '');

  const resolveFileUrl = (raw: string | undefined | null): string => {
    if (!raw) return '';
    const url = raw.trim();
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    const base = getFileBaseUrl();
    if (url.startsWith('/uploads/')) return `${base}/api/v1/files/${url.replace(/^\/uploads\//, '')}`;
    if (url.startsWith('/api/')) return `${base}${url}`;
    if (!url.startsWith('/')) return `${base}/api/v1/files/${url}`;
    return `${base}${url}`;
  };

  const contentImageUrl = resolveFileUrl(rawContentUrl);
  const isOwnStory = currentStory.user_id === (user?.id || (user as any)?._id);

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* ── Progress Bars ── */}
      <div className="absolute top-3 left-0 right-0 px-3 z-20">
        <div className="flex space-x-1">
          {stories.map((_, index) => (
            <div key={index} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width:
                    index < currentStoryIndex ? '100%'
                    : index === currentStoryIndex ? `${progress}%`
                    : '0%',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Header ── */}
      <div className="absolute top-7 left-0 right-0 px-4 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/60 flex-shrink-0">
              {currentStory.user_avatar ? (
                <img
                  src={resolveFileUrl(currentStory.user_avatar)}
                  alt={currentStory.user_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                  {currentStory.user_name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">{currentStory.user_name}</p>
              <p className="text-white/60 text-xs">
                {new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPaused(!paused)}
              className="text-white/80 hover:text-white"
            >
              {paused ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              )}
            </button>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Story Content ── */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        onMouseDown={() => { if (!showComments) setPaused(true); }}
        onMouseUp={() => { if (!showComments) setPaused(false); }}
        onTouchStart={() => { if (!showComments) setPaused(true); }}
        onTouchEnd={() => { if (!showComments) setPaused(false); }}
      >
        {/* Background image / video */}
        {contentImageUrl ? (
          currentStory.media_type === 'video' && !isProductStory ? (
            <video
              src={contentImageUrl}
              autoPlay
              loop={false}
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={contentImageUrl}
              alt="Story"
              className="w-full h-full object-cover"
            />
          )
        ) : (
          /* Placeholder for product stories without image */
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-6xl opacity-40">🛍</div>
          </div>
        )}

        {/* Dark gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

        {/* Text overlay (media stories) */}
        {!isProductStory && currentStory.text && (
          <div className="absolute bottom-32 left-0 right-0 px-5">
            <p className="text-white text-lg font-semibold text-center drop-shadow-lg">
              {currentStory.text}
            </p>
          </div>
        )}
      </div>

      {/* ── Product Card (for product stories) ── */}
      {isProductStory && currentStory.product && (
        <div className="absolute bottom-24 left-4 right-4 z-20">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-base leading-tight truncate">
                  {currentStory.product.name}
                </p>
                {currentStory.product.description && (
                  <p className="text-white/70 text-xs mt-0.5 line-clamp-2">
                    {currentStory.product.description}
                  </p>
                )}
              </div>
              {currentStory.product.price != null && (
                <div className="flex-shrink-0 bg-white/20 rounded-xl px-3 py-1.5">
                  <span className="text-white font-bold text-sm">
                    ${currentStory.product.price.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            {currentStory.text && (
              <p className="text-white/80 text-sm mb-3">{currentStory.text}</p>
            )}
            {!isOwnStory && (
              <button
                onClick={handleMessageSeller}
                disabled={startingChat}
                className="w-full py-2.5 bg-white text-gray-900 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {startingChat ? t('loading') : t('storyMessageSeller')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Navigation (tap left/right) ── */}
      <div className="absolute inset-0 flex z-10 pointer-events-none">
        <button
          className="flex-1 pointer-events-auto"
          onClick={handlePrevious}
          disabled={currentStoryIndex === 0}
        />
        <button
          className="flex-1 pointer-events-auto"
          onClick={handleNext}
        />
      </div>

      {/* ── Bottom Action Bar ── */}
      <div className="absolute bottom-5 left-0 right-0 px-5 z-20">
        <div className="flex items-center justify-between">
          {/* Like button */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition-all active:scale-90 ${
              liked ? 'bg-green-500/30 text-green-400' : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            <svg className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            <span className="text-sm font-medium">{likeCount}</span>
          </button>

          {/* Dislike button */}
          <button
            onClick={handleDislike}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition-all active:scale-90 ${
              disliked ? 'bg-red-500/30 text-red-400' : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            <svg className="w-5 h-5" fill={disliked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
            </svg>
            <span className="text-sm font-medium">{dislikeCount}</span>
          </button>

          {/* Comment button */}
          <button
            onClick={handleOpenComments}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition-all active:scale-90"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm font-medium">{commentCount}</span>
          </button>
        </div>
      </div>

      {/* ── Comment Panel (slides up) ── */}
      {showComments && (
        <div className="absolute inset-x-0 bottom-0 z-30 bg-gray-900/95 backdrop-blur-md rounded-t-3xl flex flex-col"
          style={{ maxHeight: '65vh' }}>
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-white/20 rounded-full" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 border-b border-white/10">
            <h3 className="text-white font-semibold">{t('storyComments')}</h3>
            <button onClick={handleCloseComments} className="text-white/60 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Comment list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" style={{ minHeight: 0 }}>
            {loadingComments ? (
              <div className="flex justify-center py-6">
                <span className="animate-spin w-6 h-6 border-2 border-white/30 border-t-white rounded-full inline-block" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-6">{t('storyNoComments')}</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                    {comment.user_avatar ? (
                      <img src={resolveFileUrl(comment.user_avatar)} alt={comment.user_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                        {comment.user_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-white font-semibold text-sm">{comment.user_name}</span>
                      <span className="text-white/40 text-xs">
                        {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-white/80 text-sm mt-0.5">{comment.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment input */}
          <div className="px-4 py-3 border-t border-white/10 flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendComment(); }}
              placeholder={t('storyWriteComment')}
              className="flex-1 bg-white/10 text-white placeholder-white/40 rounded-full px-4 py-2 text-sm outline-none border border-white/10 focus:border-white/30"
            />
            <button
              onClick={handleSendComment}
              disabled={!commentText.trim() || sendingComment}
              className="w-9 h-9 rounded-full bg-white text-gray-900 flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all flex-shrink-0"
            >
              {sendingComment ? (
                <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
