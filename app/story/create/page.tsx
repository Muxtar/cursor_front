'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { fileApi, storyApi, productApi } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useLayoutTitle } from '@/contexts/AppLayoutContext';

export default function CreateStoryPage() {
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const router = useRouter();
  useLayoutTitle('Create Story');
  const dark = actualTheme === 'dark';

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [storyTab, setStoryTab] = useState<'media' | 'product'>('media');

  // ── Media tab state ────────────────────────────────────────────────────────
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Product tab state ──────────────────────────────────────────────────────
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [sharingProduct, setSharingProduct] = useState(false);

  useEffect(() => {
    if (storyTab === 'product' && user && userProducts.length === 0) {
      loadUserProducts();
    }
  }, [storyTab, user]);

  const loadUserProducts = async () => {
    if (!user) return;
    setLoadingProducts(true);
    try {
      const userId = String((user as any).id || (user as any)._id);
      const res: any = await productApi.getUserProducts(userId);
      setUserProducts(Array.isArray(res) ? res : (res?.products || []));
    } catch {
      setUserProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    setMediaType(type);
    setMedia(file);
    const reader = new FileReader();
    reader.onloadend = () => setMediaPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreateMediaStory = async () => {
    if (!media) return;
    setLoading(true);
    try {
      const uploadResponse: any = await fileApi.uploadFile(media);
      const mediaUrl = uploadResponse.file_url || uploadResponse.url;
      await storyApi.createStory({ type: 'media', media_url: mediaUrl, media_type: mediaType, text: text.trim() || undefined });
      router.push('/chat');
    } catch (error: any) {
      alert('Error creating story: ' + (error?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleShareProductStory = async () => {
    if (!selectedProduct) return;
    setSharingProduct(true);
    try {
      const productId = String(selectedProduct.id || selectedProduct._id);
      await storyApi.createStory({ type: 'product', product_id: productId });
      router.push('/chat');
    } catch (error: any) {
      alert('Error sharing product: ' + (error?.message || ''));
    } finally {
      setSharingProduct(false);
    }
  };

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className={`max-w-2xl mx-auto p-4 md:p-6 ${dark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg mt-4 md:mt-8`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-800'}`}>
              Create Story
            </h1>
            <button
              onClick={() => router.back()}
              className={`p-2 rounded-full hover:bg-opacity-20 ${dark ? 'hover:bg-white' : 'hover:bg-gray-200'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tab switcher */}
          <div className={`flex gap-1 p-1 rounded-xl mb-6 ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <button
              onClick={() => setStoryTab('media')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                storyTab === 'media'
                  ? 'bg-green-500 text-white shadow-sm'
                  : dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              📷 Photo / Video
            </button>
            <button
              onClick={() => setStoryTab('product')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                storyTab === 'product'
                  ? 'bg-green-500 text-white shadow-sm'
                  : dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              🛍 Share Product
            </button>
          </div>

          {/* ── MEDIA TAB ─────────────────────────────────────────────────── */}
          {storyTab === 'media' && (
            <>
              {/* Media Preview */}
              {mediaPreview ? (
                <div className="mb-6">
                  {mediaType === 'image' ? (
                    <img src={mediaPreview} alt="Story preview" className="w-full h-96 object-cover rounded-lg" />
                  ) : (
                    <video src={mediaPreview} controls className="w-full h-96 object-cover rounded-lg" />
                  )}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`mb-6 h-96 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition ${
                    dark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-center">
                    <svg className={`w-16 h-16 mx-auto mb-4 ${dark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className={`${dark ? 'text-gray-400' : 'text-gray-500'}`}>Click to select photo or video</p>
                  </div>
                </div>
              )}

              <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />

              {/* Text Input */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Add Text (Optional)
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  maxLength={200}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none ${
                    dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  placeholder="Add text to your story..."
                />
                <p className={`text-xs mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{text.length}/200</p>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                {mediaPreview && (
                  <button
                    onClick={() => { setMedia(null); setMediaPreview(null); setText(''); }}
                    className={`flex-1 py-3 rounded-lg font-semibold transition ${
                      dark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={handleCreateMediaStory}
                  disabled={loading || !media}
                  className={`flex-1 py-3 rounded-lg font-semibold transition ${
                    loading || !media ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'
                  } text-white`}
                >
                  {loading ? 'Creating...' : 'Create Story'}
                </button>
              </div>
            </>
          )}

          {/* ── PRODUCT TAB ───────────────────────────────────────────────── */}
          {storyTab === 'product' && (
            <>
              <p className={`text-sm mb-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                Pick one of your products to share as a 24-hour story.
              </p>

              {loadingProducts ? (
                <div className="flex justify-center py-12">
                  <span className="animate-spin inline-block w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
                </div>
              ) : userProducts.length === 0 ? (
                <div className={`text-center py-12 rounded-xl ${dark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <p className={`mb-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>You have no products yet.</p>
                  <button
                    onClick={() => router.push('/explore/create')}
                    className="px-5 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm font-medium"
                  >
                    Add a Product
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {userProducts.map((product: any) => {
                      const pid = String(product.id || product._id);
                      const isSelected = selectedProduct && String(selectedProduct.id || selectedProduct._id) === pid;
                      const thumb = product.media_urls?.[0] || product.image_url;
                      return (
                        <button
                          key={pid}
                          onClick={() => setSelectedProduct(isSelected ? null : product)}
                          className={`relative rounded-xl overflow-hidden border-2 transition ${
                            isSelected
                              ? 'border-green-500 shadow-lg shadow-green-500/20'
                              : dark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {/* Thumbnail */}
                          <div className={`w-full h-32 ${dark ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`}>
                            {thumb ? (
                              <img src={thumb} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <svg className={`w-10 h-10 ${dark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                          {/* Info */}
                          <div className={`p-2 text-left ${dark ? 'bg-gray-800' : 'bg-white'}`}>
                            <p className={`text-sm font-medium truncate ${dark ? 'text-white' : 'text-gray-900'}`}>{product.name}</p>
                            {product.price && (
                              <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>${product.price}</p>
                            )}
                          </div>
                          {/* Selected checkmark */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow">
                              ✓
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleShareProductStory}
                    disabled={!selectedProduct || sharingProduct}
                    className={`w-full py-3 rounded-lg font-semibold transition ${
                      !selectedProduct || sharingProduct ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'
                    } text-white`}
                  >
                    {sharingProduct ? 'Sharing...' : selectedProduct ? `Share "${selectedProduct.name}"` : 'Select a product first'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
