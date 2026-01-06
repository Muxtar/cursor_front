'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { productApi } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'house', label: 'House' },
  { value: 'design', label: 'Design' },
  { value: 'collection', label: 'Collection' },
  { value: 'nft', label: 'NFT' },
  { value: 'other', label: 'Other' },
];

export default function ExplorePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { actualTheme } = useTheme();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (user) {
      loadProducts();
    } else {
      router.push('/login');
    }
  }, [user, selectedCategory, page]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response: any = await productApi.getProducts({
        page,
        limit: 20,
        category: selectedCategory || undefined,
      });
      
      if (page === 1) {
        setProducts(response.products || []);
      } else {
        setProducts((prev) => [...prev, ...(response.products || [])]);
      }
      
      setHasMore((response.products || []).length === 20);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setPage(1);
    setProducts([]);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className={`flex h-screen ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} sticky top-0 z-10`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className={`text-2xl font-bold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Explore Products</h1>
            <div className="flex items-center space-x-4">
              <Link
                href="/chat"
                className={`text-sm ${actualTheme === 'dark' ? 'text-green-400' : 'text-blue-500'} hover:opacity-80`}
              >
                {t('chat') || 'Chat'}
              </Link>
              <Link
                href="/settings"
                className={`text-sm ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'} hover:opacity-80`}
              >
                {t('settings') || 'Settings'}
              </Link>
              <button
                onClick={() => router.push('/explore/create')}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                + Add Product
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {CATEGORIES.map((category) => (
              <button
                key={category.value}
                onClick={() => handleCategoryChange(category.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.value
                    ? 'bg-green-500 text-white'
                    : actualTheme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading && products.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className={`text-lg ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No products found</p>
            <button
              onClick={() => router.push('/explore/create')}
              className="mt-4 bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
            >
              Create First Product
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onLike={() => {
                    // Refresh products to update like counts
                    loadProducts();
                  }}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className={`px-6 py-2 rounded-lg disabled:opacity-50 ${
                    actualTheme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
}



