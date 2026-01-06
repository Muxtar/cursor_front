'use client';

import { useState } from 'react';
import StoryViewer from './StoryViewer';

interface Story {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  media_url: string;
  media_type: 'image' | 'video';
  text?: string;
  created_at: string;
  views?: number;
  expires_at: string;
}

interface StoryCircleProps {
  stories: Story[];
  isOwn?: boolean;
  onClick?: () => void;
}

export default function StoryCircle({ stories, isOwn = false, onClick }: StoryCircleProps) {
  const [showViewer, setShowViewer] = useState(false);
  const hasUnviewed = stories.some(s => !s.views || s.views === 0);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (stories.length > 0) {
      setShowViewer(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="relative flex flex-col items-center space-y-2 cursor-pointer group"
      >
        <div className={`relative w-16 h-16 rounded-full p-0.5 ${
          hasUnviewed ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-pink-500' : 'bg-gray-300'
        } ${isOwn ? 'ring-2 ring-green-500' : ''}`}>
          <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden">
            {isOwn ? (
              <div className="relative w-full h-full">
                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
            ) : (
              <div className="w-full h-full bg-green-500 flex items-center justify-center text-white font-semibold text-lg">
                {stories[0]?.user_name[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-300 max-w-[70px] truncate">
          {isOwn ? 'Your story' : stories[0]?.user_name || 'User'}
        </p>
      </button>

      {showViewer && stories.length > 0 && (
        <StoryViewer
          stories={stories}
          initialIndex={0}
          onClose={() => setShowViewer(false)}
        />
      )}
    </>
  );
}











