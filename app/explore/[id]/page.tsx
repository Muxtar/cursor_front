'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { productApi, commentApi, likeApi, chatApi } from '@/lib/api';
import CommentSection from '@/components/CommentSection';
import Link from 'next/link';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const productId = params.id as string;

  const [product, setProduct] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [liking, setLiking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && productId) {
      // Reset state when switching products
      setCurrentImageIndex(0);
      setProduct(null);
      setComments([]);
      setIsLiked(false);
      setLikeCount(0);
      loadProduct();
      loadComments();
    } else if (!user) {
      router.push('/login');
    }
  }, [user, productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data: any = await productApi.getProduct(productId);
      setProduct(data.product);
      setIsLiked(data.is_liked);
      setLikeCount(data.product.like_count);
    } catch (err: any) {
      setError(err?.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const data: any = await commentApi.getComments(productId);
      setComments(data as any[]);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    try {
      if (isLiked) {
        await likeApi.unlikeProduct(productId);
        setIsLiked(false);
        setLikeCount((prev) => prev - 1);
      } else {
        await likeApi.likeProduct(productId);
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    } finally {
      setLiking(false);
    }
  };

  const handleMessageSeller = async () => {
    if (!user || !product) return;
    const ownerId = product.owner_id || product.owner?.id || product.owner?._id;
    if (!ownerId) return;
    try {
      const res: any = await chatApi.createChat({ type: 'direct', member_ids: [String(ownerId)] });
      const chatId = res?.chat?.id || res?.chat?._id || res?.id || res?._id;
      router.push(chatId ? `/chat?open=${chatId}` : '/chat');
    } catch {
      router.push('/chat');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-500 text-lg mb-4">{t('exploreNoProducts')}</p>
        <Link
          href="/explore"
          className="text-blue-500 hover:text-blue-700"
        >
          {t('exploreTitle')}
        </Link>
      </div>
    );
  }

  const images = product.media_urls || [];
  const currentImage = images[currentImageIndex] || '/placeholder-image.png';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-800"
            >
              ← {t('searchProfile') || 'Back'}
            </button>
            <div className="flex items-center space-x-4">
              <Link
                href="/explore"
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                {t('exploreTitle')}
              </Link>
              <Link
                href="/chat"
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                {t('chats')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="relative w-full h-96 bg-gray-200">
              <img
                src={currentImage}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-image.png';
                }}
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setCurrentImageIndex(
                        currentImageIndex > 0 ? currentImageIndex - 1 : images.length - 1
                      )
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() =>
                      setCurrentImageIndex(
                        currentImageIndex < images.length - 1 ? currentImageIndex + 1 : 0
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="p-4 flex space-x-2 overflow-x-auto">
                {images.map((img: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded overflow-hidden border-2 ${
                      currentImageIndex === index
                        ? 'border-blue-500'
                        : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Owner Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center space-x-4 mb-4">
                <img
                  src={product.owner?.avatar || '/default-avatar.png'}
                  alt={product.owner?.username}
                  className="w-16 h-16 rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/default-avatar.png';
                  }}
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{product.owner?.username}</h3>
                  <Link
                    href={`/profile/${product.owner?.id}`}
                    className="text-blue-500 hover:text-blue-700 text-sm"
                  >
                    View Profile →
                  </Link>
                </div>
                {/* Message Seller — hidden for own products */}
                {user && String(product.owner_id || product.owner?.id) !== String(user.id || (user as any)._id) && (
                  <button
                    onClick={handleMessageSeller}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Message Seller
                  </button>
                )}
              </div>
            </div>

            {/* Product Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
                  <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
                    {product.category}
                  </span>
                </div>
                {product.price && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      ${product.price.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              <p className="text-gray-700 mb-6 whitespace-pre-wrap">{product.description}</p>

              {/* Stats */}
              <div className="flex items-center space-x-6 py-4 border-t border-gray-200">
                <button
                  onClick={handleLike}
                  className={`flex items-center space-x-2 ${
                    isLiked ? 'text-red-500' : 'text-gray-500'
                  } hover:text-red-500 transition-colors`}
                >
                  <svg
                    className="w-6 h-6"
                    fill={isLiked ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  <span className="font-semibold">{likeCount}</span>
                </button>
                <div className="flex items-center space-x-2 text-gray-500">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <span className="font-semibold">{product.comment_count}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-500">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  <span className="font-semibold">{product.view_count}</span>
                </div>
              </div>

              {product.product_id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">Product ID:</p>
                  <p className="font-mono text-sm">{product.product_id}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-8">
          <CommentSection
            productId={productId}
            comments={comments}
            onCommentAdded={loadComments}
          />
        </div>
      </div>
    </div>
  );
}



