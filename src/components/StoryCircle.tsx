'use client';

import { useLanguage } from '@/contexts/LanguageContext';

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

interface StoryCircleProps {
  stories: Story[];
  isOwn?: boolean;
  onClick?: () => void;
}

export default function StoryCircle({ stories, isOwn = false, onClick }: StoryCircleProps) {
  const { t } = useLanguage();
  // Thumbnail: user avatar > product image > null
  const first = stories[0];
  const thumbnailUrl = first?.user_avatar
    || (first?.type === 'product' ? first?.product?.media_urls?.[0] : undefined)
    || undefined;

  const handleClick = () => {
    if (onClick) onClick();
  };

  return (
    <button
      onClick={handleClick}
      className="relative flex flex-col items-center gap-1.5 cursor-pointer group flex-shrink-0"
    >
      {/* Ring + avatar */}
      <div className={`
        relative p-[2.5px] rounded-full
        ${isOwn
          ? 'bg-gradient-to-tr from-green-400 to-emerald-500'
          : 'bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-400'}
        group-active:scale-95 transition-transform duration-150
      `}>
        <div className="w-[62px] h-[62px] rounded-full bg-white dark:bg-gray-900 p-[2px]">
          <div className="w-full h-full rounded-full overflow-hidden">
            {isOwn ? (
              /* Own circle: "+" icon overlay */
              <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt="Your story"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </div>
            ) : thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={first?.user_name || 'Story'}
                className="w-full h-full object-cover"
              />
            ) : (
              /* Fallback: colored initial */
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
                {first?.user_name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
        </div>

        {/* "+" badge for own story */}
        {isOwn && (
          <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        )}
      </div>

      {/* Label */}
      <p className="text-[11px] text-gray-600 dark:text-gray-300 max-w-[70px] truncate leading-none">
        {isOwn ? t('storyYours') : (first?.user_name || 'User')}
      </p>
    </button>
  );
}
