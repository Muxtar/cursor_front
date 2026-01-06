'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { likeApi } from '@/lib/api';
import Image from 'next/image';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    description: string;
    category: string;
    media_urls: string[];
    price?: number;
    like_count: number;
    comment_count: number;
    view_count: number;
    owner: {
      id: string;
      username: string;
      avatar: string;
    };
    is_liked: boolean;
    created_at: string;
  };
  onLike?: () => void;
}

export default function ProductCard({ product, onLike }: ProductCardProps) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(product.is_liked);
  const [likeCount, setLikeCount] = useState(product.like_count);
  const [loading, setLoading] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      if (isLiked) {
        await likeApi.unlikeProduct(product.id);
        setIsLiked(false);
        setLikeCount((prev) => prev - 1);
      } else {
        await likeApi.likeProduct(product.id);
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
      }
      onLike?.();
    } catch (error) {
      console.error('Failed to toggle like:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    router.push(`/explore/${product.id}`);
  };

  const mainImage = product.media_urls?.[0] || '/placeholder-image.png';

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
    >
      {/* Image */}
      <div className="relative w-full h-64 bg-gray-200">
        {mainImage && (
          <img
            src={mainImage}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder-image.png';
            }}
          />
        )}
        {product.media_urls?.length > 1 && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
            +{product.media_urls.length - 1}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Owner Info */}
        <div className="flex items-center space-x-2 mb-2">
          <img
            src={product.owner.avatar || '/default-avatar.png'}
            alt={product.owner.username}
            className="w-8 h-8 rounded-full"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/default-avatar.png';
            }}
          />
          <span className="text-sm font-medium text-gray-800">
            {product.owner.username}
          </span>
        </div>

        {/* Product Info */}
        <h3 className="font-semibold text-lg text-gray-900 mb-1 line-clamp-1">
          {product.name}
        </h3>
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
          {product.description}
        </p>

        {/* Category & Price */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {product.category}
          </span>
          {product.price && (
            <span className="text-sm font-semibold text-gray-900">
              ${product.price.toLocaleString()}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLike}
              disabled={loading}
              className={`flex items-center space-x-1 ${
                isLiked ? 'text-red-500' : 'text-gray-500'
              } hover:text-red-500 transition-colors`}
            >
              <svg
                className="w-5 h-5"
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
              <span className="text-sm">{likeCount}</span>
            </button>
            <div className="flex items-center space-x-1 text-gray-500">
              <svg
                className="w-5 h-5"
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
              <span className="text-sm">{product.comment_count}</span>
            </div>
            <div className="flex items-center space-x-1 text-gray-500">
              <svg
                className="w-5 h-5"
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
              <span className="text-sm">{product.view_count}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



