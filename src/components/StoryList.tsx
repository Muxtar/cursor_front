'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import StoryCircle from './StoryCircle';
import StoryViewer from './StoryViewer';

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

interface StoryListProps {
  stories: Story[];
  onCreateStory?: () => void;
}

export default function StoryList({ stories, onCreateStory }: StoryListProps) {
  const { user } = useAuth();
  const [selectedUserStories, setSelectedUserStories] = useState<Story[]>([]);
  const [showViewer, setShowViewer] = useState(false);

  // Group stories by user_id (preserve insertion order)
  const grouped: Record<string, Story[]> = {};
  const order: string[] = [];
  for (const story of stories) {
    if (!grouped[story.user_id]) {
      grouped[story.user_id] = [];
      order.push(story.user_id);
    }
    grouped[story.user_id].push(story);
  }

  const currentUserId = (user as any)?.id || (user as any)?._id;
  const ownStories = stories.filter((s) => s.user_id === currentUserId);

  const handleStoryClick = (userStories: Story[]) => {
    setSelectedUserStories(userStories);
    setShowViewer(true);
  };

  return (
    <div className="w-full">
      {/* Horizontal scroll strip */}
      <div className="flex gap-3 overflow-x-auto pb-3 px-4 scrollbar-hide items-start">
        {/* Own story circle — always first */}
        <StoryCircle
          stories={ownStories}
          isOwn={true}
          onClick={ownStories.length > 0 ? () => handleStoryClick(ownStories) : onCreateStory}
        />

        {/* Other users' stories */}
        {order.map((uid) => {
          if (uid === currentUserId) return null;
          const userStories = grouped[uid];
          return (
            <StoryCircle
              key={uid}
              stories={userStories}
              onClick={() => handleStoryClick(userStories)}
            />
          );
        })}
      </div>

      {/* StoryViewer overlay */}
      {showViewer && selectedUserStories.length > 0 && (
        <StoryViewer
          stories={selectedUserStories}
          initialIndex={0}
          onClose={() => {
            setShowViewer(false);
            setSelectedUserStories([]);
          }}
        />
      )}
    </div>
  );
}
