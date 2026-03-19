'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { storyApi } from '@/lib/api';
import { useLayoutTitle } from '@/contexts/AppLayoutContext';
import StoryList from '@/components/StoryList';

export default function StoriesPage() {
  useLayoutTitle('Stories');
  const router = useRouter();
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storyApi.getFeed()
      .then((res: any) => {
        // Backend returns { feed: [{ user_id, user_info: { username, avatar }, stories: [...] }] }
        const rawFeed: any[] = Array.isArray(res?.feed) ? res.feed : [];
        const flat = rawFeed.flatMap((group: any) =>
          (group.stories || []).map((s: any) => ({
            ...s,
            user_name: group.user_info?.username || 'User',
            user_avatar: group.user_info?.avatar || undefined,
            // Fallback for product stories that have no media_url
            media_url: s.media_url || s.product?.media_urls?.[0] || '',
            media_type: s.media_type || 'image',
          }))
        );
        setStories(flat);
      })
      .catch(() => setStories([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full">
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full inline-block" />
        </div>
      ) : stories.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6">
          <div className="text-5xl">📖</div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Hələ aktiv story yoxdur.</p>
          <button
            onClick={() => router.push('/story/create')}
            className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-xl transition-colors"
          >
            ➕ Story Paylaş
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <StoryList
            stories={stories}
            onCreateStory={() => router.push('/story/create')}
          />
        </div>
      )}
    </div>
  );
}
