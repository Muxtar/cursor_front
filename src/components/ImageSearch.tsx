'use client';

import { useState } from 'react';

interface ImageResult {
  url: string;
  title: string;
  width: number;
  height: number;
}

interface ImageSearchProps {
  onImageSelect?: (imageUrl: string) => void;
  variant?: 'panel' | 'google';
}

export default function ImageSearch({ onImageSelect, variant = 'panel' }: ImageSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [images, setImages] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchImages = async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setError('');

    try {
      // Apify Google Image Search API
      // Note: You'll need to add your Apify API token to environment variables
      const apifyToken = process.env.NEXT_PUBLIC_APIFY_TOKEN || '';
      
      if (!apifyToken) {
        // Fallback to Unsplash API (free, no token needed for basic usage)
        const unsplashKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
        
        if (unsplashKey && unsplashKey !== 'YOUR_UNSPLASH_KEY') {
          try {
            const unsplashResponse = await fetch(
              `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&client_id=${unsplashKey}`
            );
            
            if (unsplashResponse.ok) {
              const data = await unsplashResponse.json();
              const results: ImageResult[] = data.results.map((img: any) => ({
                url: img.urls.regular,
                title: img.description || img.alt_description || query,
                width: img.width,
                height: img.height,
              }));
              setImages(results);
              return;
            }
          } catch (err) {
            console.error('Unsplash API error:', err);
          }
        }
        
        // If no API keys, show demo images or error
        setImages([]);
        setError('Please configure Apify or Unsplash API key in environment variables.');
        return;
      }

      // Apify Google Image Search
      const response = await fetch('https://api.apify.com/v2/acts/apify~google-image-scraper/run-sync-get-dataset-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apifyToken}`,
        },
        body: JSON.stringify({
          query: query,
          maxResults: 20,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const results: ImageResult[] = data.map((item: any) => ({
          url: item.url,
          title: item.title || query,
          width: item.width || 0,
          height: item.height || 0,
        }));
        setImages(results);
      } else {
        throw new Error('Failed to search images');
      }
    } catch (err: any) {
      console.error('Image search error:', err);
      setError('Failed to search images. Please try again.');
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchImages(searchQuery);
  };

  const handleImageClick = (imageUrl: string) => {
    if (onImageSelect) {
      onImageSelect(imageUrl);
    }
  };

  const isGoogle = variant === 'google';

  return (
    <div className={isGoogle ? 'w-full' : 'h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-lg'}>
      {isGoogle ? (
        <div className="flex flex-col items-center">
          <div className="text-5xl font-semibold tracking-tight text-gray-900 mb-8 select-none">
            WebSearch
          </div>
          <form onSubmit={handleSearch} className="w-full flex items-center justify-center">
            <div className="w-full max-w-2xl relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Google Images…"
                className="w-full px-5 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base shadow-sm text-gray-900 placeholder:text-gray-400 bg-white"
              />
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {loading ? '…' : 'Search'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
            🔍 Image Search
          </h3>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search images..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
            />
            <button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {loading ? '...' : 'Search'}
            </button>
          </form>
        </div>
      )}

      {error && (
        <div className={isGoogle ? "mt-4 w-full max-w-2xl bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm" : "p-3 mx-4 mt-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded text-sm"}>
          {error}
        </div>
      )}

      <div className={isGoogle ? "mt-8 w-full max-w-4xl px-2" : "flex-1 overflow-y-auto p-4"}>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((image, index) => (
              <div
                key={index}
                onClick={() => handleImageClick(image.url)}
                className="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-all"
              >
                <img
                  src={image.url}
                  alt={image.title}
                  className="w-full h-32 object-cover bg-gray-100"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-image.png';
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                  <span className="text-white opacity-0 group-hover:opacity-100 text-xs">Click to select</span>
                </div>
              </div>
            ))}
          </div>
        ) : searchQuery && !loading ? (
          <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
            No images found. Try a different search term.
          </div>
        ) : (
          <div className={isGoogle ? "mt-10 flex items-center justify-center text-gray-500 text-sm" : "flex items-center justify-center h-64 text-gray-500 dark:text-gray-400 text-sm"}>
            Search for images to get started
          </div>
        )}
      </div>

      {!isGoogle && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 text-center">
          Powered by Google Images via Apify
        </div>
      )}
    </div>
  );
}
