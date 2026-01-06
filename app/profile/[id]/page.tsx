'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { userApi, productApi, proposalApi } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { actualTheme } = useTheme();
  const userId = params.id as string;

  const [profileUser, setProfileUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalContent, setProposalContent] = useState('');
  const [sendingProposal, setSendingProposal] = useState(false);

  useEffect(() => {
    if (currentUser && userId) {
      const isOwn = currentUser.id === userId || (currentUser as any)._id === userId;
      setIsOwnProfile(isOwn);
      loadProfile();
      loadProducts();
    } else if (!currentUser) {
      router.push('/login');
    }
  }, [currentUser, userId]);

  const loadProfile = async () => {
    try {
      const data = await userApi.getMe();
      setProfileUser(data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data: any = await productApi.getUserProducts(userId);
      setProducts(Array.isArray(data) ? data : data?.products || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const handleSendProposal = async () => {
    if (!proposalTitle.trim() || !proposalContent.trim()) {
      alert('Please fill in both title and content');
      return;
    }

    setSendingProposal(true);
    try {
      await proposalApi.createProposal({
        receiver_id: userId,
        title: proposalTitle,
        content: proposalContent,
      });
      alert('Proposal sent successfully!');
      setShowProposalModal(false);
      setProposalTitle('');
      setProposalContent('');
    } catch (error: any) {
      alert('Failed to send proposal: ' + error.message);
    } finally {
      setSendingProposal(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center min-h-screen ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <p className={`text-lg mb-4 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>User not found</p>
        <Link href="/explore" className="text-green-500 hover:text-green-700">
          Back to Explore
        </Link>
      </div>
    );
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
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className={`flex items-center space-x-2 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-600'} hover:opacity-80`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
            <div className="flex items-center space-x-4">
              <Link
                href="/chat"
                className={`text-sm ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'} hover:opacity-80`}
              >
                Chat
              </Link>
              {isOwnProfile && (
                <Link
                  href="/settings"
                  className={`text-sm ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'} hover:opacity-80`}
                >
                  Settings
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 mb-6`}>
          <div className="flex items-start space-x-6">
            <div className="relative">
              <div className={`w-24 h-24 ${actualTheme === 'dark' ? 'bg-green-600' : 'bg-green-500'} rounded-full flex items-center justify-center text-white text-3xl font-semibold`}>
                {profileUser.username?.[0]?.toUpperCase() || profileUser.phone_number?.[0] || 'U'}
              </div>
              {isOwnProfile && profileUser.qr_code && (
                <button
                  onClick={() => setShowQRCode(true)}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition"
                  title="Show QR Code"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex-1">
              <h1 className={`text-3xl font-bold mb-2 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {profileUser.username || profileUser.first_name || 'User'}
              </h1>
              {profileUser.bio && (
                <p className={`mb-4 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{profileUser.bio}</p>
              )}
              <div className={`flex items-center space-x-6 text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                <div>
                  <span className={`font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{products.length}</span>
                  <span className="ml-1">Products</span>
                </div>
                {profileUser.phone_number && !profileUser.hide_phone_number && (
                  <div>
                    <span className={`font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {profileUser.phone_number}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              {isOwnProfile ? (
                <Link
                  href="/explore/create"
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors text-center"
                >
                  + Add Product
                </Link>
              ) : (
                <button
                  onClick={() => setShowProposalModal(true)}
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Send Proposal
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-2xl font-bold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {isOwnProfile ? 'My Products' : 'Products'}
            </h2>
            {products.length > 0 && (
              <span className={actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>{products.length} items</span>
            )}
          </div>

          {products.length === 0 ? (
            <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-12 text-center`}>
              <p className={`text-lg mb-4 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {isOwnProfile
                  ? "You haven't created any products yet"
                  : 'This user has no products yet'}
              </p>
              {isOwnProfile && (
                <Link
                  href="/explore/create"
                  className="inline-block bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
                >
                  Create Your First Product
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{
                    ...product,
                    owner: {
                      id: profileUser.id,
                      username: profileUser.username,
                      avatar: profileUser.avatar,
                    },
                    is_liked: false,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRCode && profileUser.qr_code && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowQRCode(false)}>
          <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-sm`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>QR Code</h3>
              <button
                onClick={() => setShowQRCode(false)}
                className={`${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} hover:opacity-80`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex justify-center mb-4">
              <img
                src={`data:image/png;base64,${profileUser.qr_code}`}
                alt="QR Code"
                className="w-64 h-64 border-2 border-gray-300 rounded"
              />
            </div>
            <p className={`text-sm text-center ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Share this QR code to let others add you as a contact
            </p>
          </div>
        </div>
      )}

      {/* Proposal Modal */}
      {showProposalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowProposalModal(false)}>
          <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-96 max-w-[90vw]`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Send Proposal</h3>
              <button
                onClick={() => setShowProposalModal(false)}
                className={`${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} hover:opacity-80`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Title
                </label>
                <input
                  type="text"
                  value={proposalTitle}
                  onChange={(e) => setProposalTitle(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    actualTheme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300'
                  }`}
                  placeholder="Proposal title"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Content
                </label>
                <textarea
                  value={proposalContent}
                  onChange={(e) => setProposalContent(e.target.value)}
                  rows={5}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none ${
                    actualTheme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300'
                  }`}
                  placeholder="Describe your proposal..."
                />
              </div>
              <button
                onClick={handleSendProposal}
                disabled={sendingProposal || !proposalTitle.trim() || !proposalContent.trim()}
                className={`w-full py-3 rounded-lg font-semibold transition ${
                  sendingProposal || !proposalTitle.trim() || !proposalContent.trim()
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600'
                } text-white`}
              >
                {sendingProposal ? 'Sending...' : 'Send Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
