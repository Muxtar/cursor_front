'use client';

import { useState } from 'react';

interface ImageResult {
  url: string;
  title: string;
  width: number;
  height: number;
  source?: string;
}

interface WebResult {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
}

interface ImageSearchProps {
  onImageSelect?: (imageUrl: string) => void;
  variant?: 'panel' | 'google';
}

export default function ImageSearch({ onImageSelect, variant = 'panel' }: ImageSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [images, setImages] = useState<ImageResult[]>([]);
  const [web, setWeb] = useState<WebResult[]>([]);
  const [tab, setTab] = useState<'all' | 'web' | 'images'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runSearch = async (query: string, searchType: 'all' | 'web' | 'images') => {
    if (!query.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(
        `/api/websearch?q=${encodeURIComponent(query)}&type=${encodeURIComponent(searchType)}`,
        { method: 'GET' }
      );
      const data: any = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Search failed');
      }

      if (Array.isArray(data?.web)) setWeb(data.web);
      if (Array.isArray(data?.images)) setImages(data.images);
    } catch (err: any) {
      console.error('Image search error:', err);
      setError(err?.message || 'Search failed. Please try again.');
      setImages([]);
      setWeb([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(searchQuery, tab);
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
                placeholder="Search the web…"
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

          {/* Tabs */}
          <div className="mt-5 flex gap-2">
            {(['all', 'web', 'images'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                  tab === t
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t === 'all' ? 'All' : t === 'web' ? 'Web' : 'Images'}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">🔎 Web Search</h3>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search…"
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
          <div className="mt-3 flex gap-2">
            {(['all', 'web', 'images'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  tab === t
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
                }`}
              >
                {t === 'all' ? 'All' : t === 'web' ? 'Web' : 'Images'}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className={isGoogle ? "mt-4 w-full max-w-2xl bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm" : "p-3 mx-4 mt-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded text-sm"}>
          {error}
        </div>
      )}

      <div className={isGoogle ? "mt-8 w-full max-w-5xl px-2" : "flex-1 overflow-y-auto p-4"}>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Web results */}
            {(tab === 'all' || tab === 'web') && web.length > 0 && (
              <div className="mb-8">
                <div className="text-sm font-semibold text-gray-900 mb-3">Web results</div>
                <div className="space-y-3">
                  {web.map((item, idx) => (
                    <div key={`${item.url}-${idx}`} className="rounded-lg border border-gray-200 bg-white p-4">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 hover:underline font-medium"
                      >
                        {item.title}
                      </a>
                      <div className="text-xs text-gray-500 mt-1">{item.source}</div>
                      {item.snippet && <div className="text-sm text-gray-700 mt-2">{item.snippet}</div>}
                      <div className="text-xs text-gray-500 mt-2 break-all">{item.url}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Image results */}
            {(tab === 'all' || tab === 'images') && images.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-gray-900 mb-3">Images</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {images.map((image, index) => (
                    <div
                      key={`${image.url}-${index}`}
                      onClick={() => handleImageClick(image.url)}
                      className="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 transition-all bg-white"
                    >
                      <img
                        src={image.url}
                        alt={image.title}
                        className="w-full h-32 object-cover bg-gray-100"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 text-xs">Click to select</span>
                      </div>
                      {image.source && (
                        <div className="absolute left-2 bottom-2 text-[10px] bg-white/90 rounded px-2 py-0.5 text-gray-700">
                          {image.source}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {searchQuery && !loading && web.length === 0 && images.length === 0 && (
              <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
                No results found. Try a different query.
              </div>
            )}

            {!searchQuery && (
              <div className={isGoogle ? "mt-10 flex items-center justify-center text-gray-500 text-sm" : "flex items-center justify-center h-40 text-gray-500 dark:text-gray-400 text-sm"}>
                Search to get started
              </div>
            )}
          </>
        )}
      </div>

      {!isGoogle && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 text-center">
          Web + Images search (server-side)
        </div>
      )}
    </div>
  );
}
