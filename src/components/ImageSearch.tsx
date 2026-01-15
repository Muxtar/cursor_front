'use client';

import { useState, useRef, KeyboardEvent } from 'react';

interface ImageResult {
  url: string;
  title: string;
  width?: number;
  height?: number;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [googleByImageUrl, setGoogleByImageUrl] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGoogle = variant === 'google';

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSearchQuery(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  // Handle Enter key (submit) or Shift+Enter (new line)
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  // Text search
  const handleSearch = async () => {
    if (!searchQuery.trim() && !uploadPreview) return;

    // If there's an uploaded image, do reverse search
    if (uploadPreview) {
      await handleReverseSearch();
      return;
    }

    // Otherwise do text search
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');
    setImages([]);
    setWeb([]);

    try {
      const res = await fetch(`/api/websearch?q=${encodeURIComponent(searchQuery)}&type=all`);
      const data: any = await res.json();
      
      if (!res.ok) {
        throw new Error(data?.error || 'Search failed');
      }

      if (Array.isArray(data?.web)) setWeb(data.web);
      if (Array.isArray(data?.images)) setImages(data.images);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err?.message || 'Search failed. Please try again.');
      setImages([]);
      setWeb([]);
    } finally {
      setLoading(false);
    }
  };

  // Image upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setUploadPreview(event.target.result as string);
        // Auto-trigger reverse search
        handleReverseSearchWithFile(file);
      }
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Reverse image search with file
  const handleReverseSearchWithFile = async (file: File) => {
    setUploading(true);
    setError('');
    setUploadedImageUrl(null);
    setGoogleByImageUrl(null);
    setImages([]);
    setWeb([]);

    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/websearch/reverse-image', { method: 'POST', body: fd });
      const data: any = await res.json();
      
      if (!res.ok) {
        throw new Error(data?.error || 'Reverse image search failed');
      }

      if (typeof data?.uploadedImageUrl === 'string') setUploadedImageUrl(data.uploadedImageUrl);
      if (typeof data?.googleByImageUrl === 'string') setGoogleByImageUrl(data.googleByImageUrl);
      if (Array.isArray(data?.images)) setImages(data.images);
    } catch (err: any) {
      console.error('Reverse search error:', err);
      setError(err?.message || 'Reverse image search failed');
      setImages([]);
    } finally {
      setUploading(false);
    }
  };

  // Reverse search with existing preview
  const handleReverseSearch = async () => {
    if (!uploadPreview) return;
    
    // Convert base64 to blob
    const response = await fetch(uploadPreview);
    const blob = await response.blob();
    const file = new File([blob], 'image.jpg', { type: blob.type });
    await handleReverseSearchWithFile(file);
  };

  // Remove uploaded image
  const removeImage = () => {
    setUploadPreview(null);
    setUploadedImageUrl(null);
    setGoogleByImageUrl(null);
    setImages([]);
    setWeb([]);
  };

  // Handle image click
  const handleImageClick = (imageUrl: string) => {
    if (onImageSelect) {
      onImageSelect(imageUrl);
    }
  };

  return (
    <div className={isGoogle ? 'w-full' : 'h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-lg'}>
      {isGoogle ? (
        <div className="flex flex-col items-center">
          {/* Logo/Title */}
          <div className="text-5xl font-semibold tracking-tight text-gray-900 mb-8 select-none">
            WebSearch
          </div>

          {/* Input Box - Similar to websearch/ChatInput.tsx */}
          <div className="w-full max-w-2xl">
            {/* Image Preview */}
            {uploadPreview && (
              <div className="mb-3 flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <img 
                  src={uploadPreview} 
                  alt="Preview" 
                  className="w-16 h-16 object-cover rounded border border-gray-300"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-600">Image selected</div>
                  {uploadedImageUrl && (
                    <div className="text-xs text-blue-600 truncate">
                      <a href={uploadedImageUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        View uploaded
                      </a>
                    </div>
                  )}
                </div>
                <button
                  onClick={removeImage}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Remove image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Input Container */}
            <div className="relative bg-white rounded-full shadow-lg border border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
              <textarea
                ref={textareaRef}
                value={searchQuery}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={uploadPreview ? "Search with image..." : "Search the web..."}
                disabled={loading || uploading}
                className="w-full bg-transparent text-gray-900 px-5 py-3 pr-24 resize-none outline-none placeholder-gray-400 disabled:opacity-50 rounded-full"
                rows={1}
                style={{ maxHeight: '200px', minHeight: '48px' }}
              />
              
              {/* Buttons */}
              <div className="absolute right-2 bottom-2 flex items-center space-x-2">
                {/* Image Upload Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={loading || uploading}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || uploading}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Upload image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>

                {/* Search/Submit Button */}
                <button
                  onClick={handleSearch}
                  disabled={loading || uploading || (!searchQuery.trim() && !uploadPreview)}
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Search"
                >
                  {loading || uploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Info text */}
            {uploadPreview && (uploadedImageUrl || googleByImageUrl) && (
              <div className="mt-3 text-xs text-gray-500 text-center">
                {googleByImageUrl && (
                  <a
                    href={googleByImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Open Google "search by image"
                  </a>
                )}
                {!process.env.NEXT_PUBLIC_SERP_API_KEY && (
                  <div className="mt-1">
                    Better results: Set <b>SERP_API_KEY</b> in Railway Variables
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">🔎 Web Search</h3>
          
          {/* Image Preview */}
          {uploadPreview && (
            <div className="mb-3 flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <img 
                src={uploadPreview} 
                alt="Preview" 
                className="w-16 h-16 object-cover rounded border border-gray-300 dark:border-gray-600"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-600 dark:text-gray-400">Image selected</div>
                {uploadedImageUrl && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 truncate">
                    <a href={uploadedImageUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      View uploaded
                    </a>
                  </div>
                )}
              </div>
              <button
                onClick={removeImage}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Remove image"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Input Container */}
          <div className="relative bg-gray-50 dark:bg-gray-700 rounded-lg shadow-lg border border-gray-300 dark:border-gray-600">
            <textarea
              ref={textareaRef}
              value={searchQuery}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={uploadPreview ? "Search with image..." : "Search..."}
              disabled={loading || uploading}
              className="w-full bg-transparent text-gray-900 dark:text-white px-4 py-3 pr-24 resize-none outline-none placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 rounded-lg"
              rows={1}
              style={{ maxHeight: '200px', minHeight: '48px' }}
            />
            
            {/* Buttons */}
            <div className="absolute right-2 bottom-2 flex items-center space-x-2">
              {/* Image Upload Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={loading || uploading}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || uploading}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Upload image"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Search Button */}
              <button
                onClick={handleSearch}
                disabled={loading || uploading || (!searchQuery.trim() && !uploadPreview)}
                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Search"
              >
                {loading || uploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className={isGoogle ? "mt-4 w-full max-w-2xl bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm" : "p-3 mx-4 mt-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded text-sm"}>
          {error}
        </div>
      )}

      {/* Results Section - Below input */}
      <div className={isGoogle ? "mt-8 w-full max-w-5xl px-2" : "flex-1 overflow-y-auto p-4"}>
        {loading || uploading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Web Results */}
            {web.length > 0 && (
              <div className="mb-8">
                <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Web Results</div>
                <div className="space-y-3">
                  {web.map((item, idx) => (
                    <div key={`${item.url}-${idx}`} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:shadow-md transition-shadow">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 dark:text-blue-400 hover:underline font-medium block"
                      >
                        {item.title}
                      </a>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.source}</div>
                      {item.snippet && (
                        <div className="text-sm text-gray-700 dark:text-gray-300 mt-2">{item.snippet}</div>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 break-all">{item.url}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Image Results */}
            {images.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Images</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {images.map((image, index) => (
                    <div
                      key={`${image.url}-${index}`}
                      onClick={() => handleImageClick(image.url)}
                      className="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all bg-white dark:bg-gray-800"
                    >
                      <img
                        src={image.url}
                        alt={image.title}
                        className="w-full h-32 object-cover bg-gray-100 dark:bg-gray-700"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 text-xs">Click to select</span>
                      </div>
                      {image.source && (
                        <div className="absolute left-2 bottom-2 text-[10px] bg-white/90 dark:bg-gray-800/90 rounded px-2 py-0.5 text-gray-700 dark:text-gray-300">
                          {image.source}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !uploading && searchQuery && web.length === 0 && images.length === 0 && (
              <div className="flex items-center justify-center h-40 text-gray-500 dark:text-gray-400 text-sm">
                No results found. Try a different query.
              </div>
            )}

            {!searchQuery && !uploadPreview && (
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
