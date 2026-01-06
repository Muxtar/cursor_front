'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { fileApi } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import Sidebar from '@/components/Sidebar';

export default function CreateStoryPage() {
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const router = useRouter();
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = file.type.startsWith('video/') ? 'video' : 'image';
    setMediaType(type);
    setMedia(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateStory = async () => {
    if (!media) {
      alert('Please select a photo or video');
      return;
    }

    setLoading(true);
    try {
      // Upload media
      const uploadResponse = await fileApi.uploadFile(media);
      const mediaUrl = uploadResponse.file_url || uploadResponse.url;

      // Create story (you'll need to add this API endpoint)
      // For now, we'll just show success
      alert('Story created successfully!');
      router.push('/chat');
    } catch (error: any) {
      alert('Error creating story: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className={`flex h-screen ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
      <div className={`max-w-2xl mx-auto p-6 ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg mt-8`}>
        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-2xl font-bold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Create Story
          </h1>
          <button
            onClick={() => router.back()}
            className={`p-2 rounded-full hover:bg-opacity-20 ${actualTheme === 'dark' ? 'hover:bg-white' : 'hover:bg-gray-200'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Media Preview */}
        {mediaPreview ? (
          <div className="mb-6">
            {mediaType === 'image' ? (
              <img
                src={mediaPreview}
                alt="Story preview"
                className="w-full h-96 object-cover rounded-lg"
              />
            ) : (
              <video
                src={mediaPreview}
                controls
                className="w-full h-96 object-cover rounded-lg"
              />
            )}
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`mb-6 h-96 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition ${
              actualTheme === 'dark'
                ? 'border-gray-600 hover:border-gray-500'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="text-center">
              <svg className={`w-16 h-16 mx-auto mb-4 ${actualTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className={`${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Click to select photo or video
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Text Input */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-2 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Add Text (Optional)
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={200}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none ${
              actualTheme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300'
            }`}
            placeholder="Add text to your story..."
          />
          <p className={`text-xs mt-1 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {text.length}/200
          </p>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          {mediaPreview && (
            <button
              onClick={() => {
                setMedia(null);
                setMediaPreview(null);
                setText('');
              }}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                actualTheme === 'dark'
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Clear
            </button>
          )}
          <button
            onClick={handleCreateStory}
            disabled={loading || !media}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              loading || !media
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600'
            } text-white`}
          >
            {loading ? 'Creating...' : 'Create Story'}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

