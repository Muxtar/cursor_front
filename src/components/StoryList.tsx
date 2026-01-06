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
  media_url: string;
  media_type: 'image' | 'video';
  text?: string;
  created_at: string;
  views?: number;
  expires_at: string;
}

interface StoryListProps {
  stories: Story[];
  onCreateStory?: () => void;
}

export default function StoryList({ stories, onCreateStory }: StoryListProps) {
  const { user } = useAuth();
  const [selectedUserStories, setSelectedUserStories] = useState<Story[]>([]);
  const [showViewer, setShowViewer] = useState(false);

  // Group stories by user
  const storiesByUser = stories.reduce((acc, story) => {
    if (!acc[story.user_id]) {
      acc[story.user_id] = [];
    }
    acc[story.user_id].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  const userStoriesList = Object.values(storiesByUser);
  const ownStories = stories.filter(s => s.user_id === user?.id);

  const handleStoryClick = (userStories: Story[]) => {
    setSelectedUserStories(userStories);
    setShowViewer(true);
  };

  return (
    <div className="w-full">
      <div className="flex space-x-4 overflow-x-auto pb-4 px-4 scrollbar-hide">
        {/* Own Story */}
        <StoryCircle
          stories={ownStories}
          isOwn={true}
          onClick={onCreateStory}
        />

        {/* Other Users' Stories */}
        {userStoriesList.map((userStories, index) => {
          if (userStories[0]?.user_id === user?.id) return null;
          return (
            <StoryCircle
              key={userStories[0]?.user_id || index}
              stories={userStories}
              onClick={() => handleStoryClick(userStories)}
            />
          );
        })}
      </div>

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











