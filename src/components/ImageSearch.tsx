'use client';

import { useState, useRef, KeyboardEvent } from 'react';

interface OSINTResult {
  platform: string;
  link: string;
  confidenceScore: number;
  description: string;
  matchReason: string;
  activeStatus?: string;
  source: string; // Serper / PDL / Clearbit
  notes?: string;
  warnings?: string[];
}

interface OSINTResponse {
  query: string;
  inputType: 'name' | 'username' | 'image' | 'unknown';
  results: OSINTResult[];
  analysis: {
    matchReason: string;
    possibleFalseMatches: string[];
    dataReliability: string;
    missingInfo?: string[];
  };
  warnings: string[];
  images?: ImageResult[];
}

interface ImageResult {
  url: string;
  title?: string;
  width?: number;
  height?: number;
  source?: string;
  license?: string;
  context?: string;
}

interface ImageSearchProps {
  onImageSelect?: (imageUrl: string) => void;
  variant?: 'panel' | 'google';
}

export default function ImageSearch({ onImageSelect, variant = 'panel' }: ImageSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [osintData, setOsintData] = useState<OSINTResponse | null>(null);
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

    // Otherwise do OSINT search
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');
    setOsintData(null);

    try {
      const res = await fetch(`/api/websearch?q=${encodeURIComponent(searchQuery)}`);
      const data: OSINTResponse = await res.json();
      
      if (!res.ok) {
        throw new Error(data?.warnings?.[0] || 'Search failed');
      }

      setOsintData(data);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err?.message || 'Search failed. Please try again.');
      setOsintData(null);
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
    setOsintData(null);

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
      
      // Convert reverse image results to OSINT format
      if (Array.isArray(data?.images) && data.images.length > 0) {
        setOsintData({
          query: 'Reverse Image Search',
          inputType: 'image',
          results: [],
          analysis: {
            matchReason: 'Reverse image search results',
            possibleFalseMatches: [],
            dataReliability: 'Medium - Reverse image search results',
          },
          warnings: ['Showing reverse image search results'],
          images: data.images,
        });
      }
    } catch (err: any) {
      console.error('Reverse search error:', err);
      setError(err?.message || 'Reverse image search failed');
      setOsintData(null);
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
    setError('');
    setOsintData(null);
  };

  // Handle image click
  const handleImageClick = (imageUrl: string) => {
    if (onImageSelect) {
      onImageSelect(imageUrl);
    }
  };

  // Get confidence color
  const getConfidenceColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Get confidence badge color
  const getConfidenceBadgeColor = (score: number): string => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
  };

  return (
    <div className={isGoogle ? 'w-full' : 'h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-lg'}>
      {isGoogle ? (
        <div className="flex flex-col items-center">
          {/* Logo/Title */}
          <div className="text-5xl font-semibold tracking-tight text-gray-900 mb-8 select-none">
            OSINT WebSearch
          </div>

          {/* Input Box */}
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
                placeholder={uploadPreview ? "Search with image..." : "Person name, username, or image keyword..."}
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

            {/* Show Google link if available */}
            {uploadPreview && googleByImageUrl && !osintData?.images?.length && (
              <div className="mt-3 text-xs text-center text-gray-500">
                <a
                  href={googleByImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Try Google "search by image"
                </a>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">🔍 OSINT WebSearch</h3>
          
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
              placeholder={uploadPreview ? "Search with image..." : "Person name, username, or image keyword..."}
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

      {/* Show Google link if no results */}
      {uploadPreview && googleByImageUrl && !osintData?.images?.length && !isGoogle && !loading && !uploading && (
        <div className="p-2 mx-4 mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
          <a
            href={googleByImageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Try Google "search by image"
          </a>
        </div>
      )}

      {/* Results Section */}
      <div className={isGoogle ? "mt-8 w-full max-w-5xl px-2" : "flex-1 overflow-y-auto p-4"}>
        {loading || uploading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : osintData ? (
          <>
            {/* Input Type Indicator */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                Input Type: {
                  osintData.inputType === 'name' ? '👤 Person Name' :
                  osintData.inputType === 'username' ? '🔖 Username' :
                  osintData.inputType === 'image' ? '🖼️ Image' :
                  '❓ Unknown'
                }
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300">
                {osintData.query}
              </div>
            </div>

            {/* OSINT Results */}
            {osintData.results.length > 0 && (
              <div className="mb-8">
                <div className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  🔍 Found Results
                </div>
                <div className="space-y-4">
                  {osintData.results.map((result, idx) => (
                    <div
                      key={`${result.link}-${idx}`}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {result.platform}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getConfidenceBadgeColor(result.confidenceScore)}`}>
                              Confidence: {result.confidenceScore}%
                            </span>
                          </div>
                          <a
                            href={result.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 dark:text-blue-400 hover:underline text-sm break-all"
                          >
                            {result.link}
                          </a>
                        </div>
                      </div>
                      
                      {result.description && (
                        <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 mb-2">
                          {result.description}
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-1">
                        <div><strong>Match Reason:</strong> {result.matchReason}</div>
                        <div><strong>Source:</strong> {result.source}</div>
                        {result.notes && (
                          <div><strong>Notes:</strong> {result.notes}</div>
                        )}
                        {result.activeStatus && (
                          <div><strong>Status:</strong> {result.activeStatus}</div>
                        )}
                      </div>
                      
                      {result.warnings && result.warnings.length > 0 && (
                        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-200">
                          ⚠️ {result.warnings.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analysis Section */}
            {osintData.analysis && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  🧠 Analysis
                </div>
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <div>
                    <strong>Match Reason:</strong> {osintData.analysis.matchReason}
                  </div>
                  {osintData.analysis.possibleFalseMatches.length > 0 && (
                    <div>
                      <strong>Possible False Matches:</strong>
                      <ul className="list-disc list-inside ml-2 mt-1">
                        {osintData.analysis.possibleFalseMatches.map((match, idx) => (
                          <li key={idx} className="text-xs">{match}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <strong>Data Reliability:</strong> {osintData.analysis.dataReliability}
                  </div>
                  {osintData.analysis.missingInfo && osintData.analysis.missingInfo.length > 0 && (
                    <div className="mt-2">
                      <strong>Missing Information:</strong>
                      <ul className="list-disc list-inside ml-2 mt-1">
                        {osintData.analysis.missingInfo.map((info, idx) => (
                          <li key={idx} className="text-xs">{info}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Warnings Section */}
            {osintData.warnings && osintData.warnings.length > 0 && (
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                  ⚠️ Warnings
                </div>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
                  {osintData.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Image Results */}
            {osintData.images && osintData.images.length > 0 && (
              <div className="mb-6">
                <div className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  🖼️ Image Results
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {osintData.images.map((image, index) => (
                    <div
                      key={`${image.url}-${index}`}
                      onClick={() => handleImageClick(image.url)}
                      className="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all bg-white dark:bg-gray-800"
                    >
                      <img
                        src={image.url}
                        alt={image.title || 'Image'}
                        className="w-full h-32 object-cover bg-gray-100 dark:bg-gray-700"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 text-xs">Click to select</span>
                      </div>
                      <div className="absolute left-2 bottom-2 right-2">
                        {image.source && (
                          <div className="text-[10px] bg-white/90 dark:bg-gray-800/90 rounded px-2 py-0.5 text-gray-700 dark:text-gray-300 mb-1">
                            {image.source}
                          </div>
                        )}
                        {image.license && (
                          <div className="text-[10px] bg-white/90 dark:bg-gray-800/90 rounded px-2 py-0.5 text-gray-600 dark:text-gray-400">
                            {image.license}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {osintData.results.length === 0 && (!osintData.images || osintData.images.length === 0) && (
              <div className="flex items-center justify-center h-40 text-gray-500 dark:text-gray-400 text-sm">
                No results found. Try a different query.
              </div>
            )}
          </>
        ) : !searchQuery && !uploadPreview ? (
          <div className={isGoogle ? "mt-10 flex items-center justify-center text-gray-500 text-sm" : "flex items-center justify-center h-40 text-gray-500 dark:text-gray-400 text-sm"}>
            Enter a person name, username, or image keyword in the field above to search.
          </div>
        ) : null}
      </div>

      {!isGoogle && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 text-center">
          OSINT + Web Search (Automatic input type detection)
        </div>
      )}
    </div>
  );
}
