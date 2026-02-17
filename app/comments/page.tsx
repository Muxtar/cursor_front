'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { profileCommentApi, userApi } from '@/lib/api';

export default function CommentsByPhonePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { actualTheme } = useTheme();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [comments, setComments] = useState<Array<{ id: string; text: string; created_at: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTargetUser(null);
    setComments([]);

    const phone = phoneNumber.trim();
    if (!phone) return;

    setLoading(true);
    try {
      // 1) Resolve user by phone (so we can open profile)
      const u: any = await userApi.getUserByPhoneNumber(phone);
      setTargetUser(u);

      // 2) Load profile comments by phone
      const list: any = await profileCommentApi.listByPhoneNumber(phone);
      setComments(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex h-screen ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Sidebar />

      <div className="flex-1 overflow-y-auto">
        <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} sticky top-0 z-10`}>
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className={`text-lg font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Phone number → profile comments
            </h1>
            {targetUser?.id && (
              <button
                onClick={() => router.push(`/profile/${targetUser.id || targetUser._id}`)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
              >
                Open profile
              </button>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+90 5xx xxx xx xx"
              className={`flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-500 ${
                actualTheme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
            <button
              type="submit"
              disabled={loading || !phoneNumber.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {error && (
            <div className={`mt-4 p-3 rounded-lg ${actualTheme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'}`}>
              {error}
            </div>
          )}

          {targetUser && (
            <div className={`mt-6 p-4 rounded-lg border ${actualTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-semibold">
                  {(targetUser.username || targetUser.phone_number || 'U')[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className={`font-semibold truncate ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {targetUser.username || 'User'}
                  </p>
                  <p className={`text-sm truncate ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {targetUser.phone_number || '(phone hidden)'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6">
            <h2 className={`text-base font-semibold mb-3 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Comments
            </h2>
            <div className={`rounded-lg overflow-hidden border ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              {comments.length === 0 ? (
                <div className={`${actualTheme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'} p-6 text-center`}>
                  No comments found.
                </div>
              ) : (
                <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} divide-y ${actualTheme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {comments.map((c) => (
                    <div key={c.id} className="p-4">
                      <p className={`${actualTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>{c.text}</p>
                      <p className={`text-xs mt-2 ${actualTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        {new Date(c.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

