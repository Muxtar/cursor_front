'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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

interface StoryViewerProps {
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
}

export default function StoryViewer({ stories, initialIndex = 0, onClose }: StoryViewerProps) {
  const { user } = useAuth();
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [paused, setPaused] = useState(false);

  const currentStory = stories[currentStoryIndex];
  const duration = 5000; // 5 seconds

  useEffect(() => {
    if (paused || !currentStory) return;

    setProgress(0);
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + 2; // Update every 100ms (2% per 100ms = 5s total)
      });
    }, 100);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentStoryIndex, paused, currentStory]);

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

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Progress Bars */}
      <div className="absolute top-4 left-0 right-0 px-4 z-10">
        <div className="flex space-x-1">
          {stories.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className={`h-full bg-white transition-all duration-100 ${
                  index < currentStoryIndex ? 'w-full' : index === currentStoryIndex ? 'w-full' : 'w-0'
                }`}
                style={{
                  width: index === currentStoryIndex ? `${progress}%` : index < currentStoryIndex ? '100%' : '0%',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Story Header */}
      <div className="absolute top-12 left-0 right-0 px-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
              {currentStory.user_name[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-white font-semibold">{currentStory.user_name}</p>
              <p className="text-white/70 text-xs">
                {new Date(currentStory.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Story Content */}
      <div
        className="flex-1 w-full h-full flex items-center justify-center"
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        {currentStory.media_type === 'image' ? (
          <img
            src={currentStory.media_url}
            alt="Story"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <video
            src={currentStory.media_url}
            autoPlay
            loop={false}
            className="max-w-full max-h-full object-contain"
          />
        )}
        {currentStory.text && (
          <div className="absolute bottom-20 left-0 right-0 px-4">
            <p className="text-white text-lg font-semibold text-center drop-shadow-lg">
              {currentStory.text}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="absolute inset-0 flex">
        <button
          onClick={handlePrevious}
          className="flex-1"
          disabled={currentStoryIndex === 0}
        />
        <button
          onClick={handleNext}
          className="flex-1"
          disabled={currentStoryIndex === stories.length - 1}
        />
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-0 right-0 px-4 z-10">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={() => setPaused(!paused)}
            className="text-white hover:text-gray-300"
          >
            {paused ? (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}





