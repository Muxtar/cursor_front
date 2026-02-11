'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { userApi, productApi, proposalApi, profileCommentApi, chatApi, fileApi } from '@/lib/api';
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
  const [comments, setComments] = useState<{ id: string; text: string; created_at: string }[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [proposals, setProposals] = useState<any[]>([]);
  const [proposalChatAnonymous, setProposalChatAnonymous] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (currentUser && userId) {
      const isOwn = currentUser.id === userId || (currentUser as any)._id === userId;
      setIsOwnProfile(isOwn);
      loadProfile();
      loadProducts();
      loadComments();
      if (isOwn) loadProposals();
    } else if (!currentUser) {
      router.push('/login');
    }
  }, [currentUser, userId]);

  const loadProfile = async () => {
    try {
      const isOwn = currentUser?.id === userId || (currentUser as any)?._id === userId;
      const data = isOwn ? await userApi.getMe() : await userApi.getUserById(userId);
      setProfileUser(data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const data: any = await profileCommentApi.list(userId);
      setComments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load comments:', error);
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

  const loadProposals = async () => {
    try {
      const data: any = await proposalApi.getProposals();
      setProposals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load proposals:', error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setSendingComment(true);
    try {
      await profileCommentApi.create(userId, newCommentText.trim());
      setNewCommentText('');
      loadComments();
    } catch (error: any) {
      alert('Failed to add comment: ' + (error?.message || 'Unknown error'));
    } finally {
      setSendingComment(false);
    }
  };

  const handleReplyToComment = async (commentId: string) => {
    try {
      const res: any = await profileCommentApi.reply(commentId);
      const chatId = res?.chat_id;
      if (chatId) {
        router.push(`/chat?open=${chatId}`);
      } else {
        router.push('/chat');
      }
    } catch (error: any) {
      alert('Failed to start conversation: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleSendProposal = async () => {
    if (!proposalContent.trim()) {
      alert('Please write your proposal');
      return;
    }

    setSendingProposal(true);
    try {
      await proposalApi.createProposal({
        receiver_id: userId,
        title: proposalTitle.trim() || 'Proposal',
        content: proposalContent.trim(),
        chat_anonymous: proposalChatAnonymous,
      });
      alert('Proposal sent! If they accept, a chat will open.');
      setShowProposalModal(false);
      setProposalTitle('');
      setProposalContent('');
      setProposalChatAnonymous(false);
      loadProposals();
    } catch (error: any) {
      alert('Failed to send proposal: ' + error.message);
    } finally {
      setSendingProposal(false);
    }
  };

  const handleAcceptProposal = async (proposalId: string) => {
    setAcceptingId(proposalId);
    try {
      const res: any = await proposalApi.acceptProposal(proposalId);
      const chatId = res?.chat_id;
      if (chatId) {
        router.push(`/chat?open=${chatId}`);
      } else {
        loadProposals();
      }
    } catch (error: any) {
      alert('Failed to accept: ' + (error?.message || 'Unknown error'));
    } finally {
      setAcceptingId(null);
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    try {
      await proposalApi.rejectProposal(proposalId);
      loadProposals();
    } catch (error: any) {
      alert('Failed to reject: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOwnProfile) return;
    setUploadingPhoto(true);
    try {
      const res: any = await fileApi.uploadFile(file);
      const fileUrl = res?.file_url || res?.url;
      if (fileUrl) {
        const base = (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL)
          ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '')
          : 'http://localhost:8080';
        const avatarUrl = fileUrl.startsWith('http') ? fileUrl : `${base}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
        await userApi.updateMe({ avatar: avatarUrl });
        loadProfile();
      }
    } catch (err: any) {
      alert('Failed to update photo: ' + (err?.message || 'Unknown error'));
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
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
              <label className={`block w-24 h-24 rounded-full overflow-hidden cursor-pointer ${isOwnProfile ? 'hover:opacity-90' : ''}`} title={isOwnProfile ? 'Change profile photo' : ''}>
                {profileUser.avatar ? (
                  <img src={profileUser.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full ${actualTheme === 'dark' ? 'bg-green-600' : 'bg-green-500'} flex items-center justify-center text-white text-3xl font-semibold`}>
                    {profileUser.username?.[0]?.toUpperCase() || profileUser.phone_number?.[0] || 'U'}
                  </div>
                )}
                {isOwnProfile && (
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfilePhotoChange}
                    disabled={uploadingPhoto}
                  />
                )}
              </label>
              {isOwnProfile && uploadingPhoto && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center text-white text-sm">
                  Uploading...
                </div>
              )}
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

        {/* Proposals (only on own profile) */}
        {isOwnProfile && (
          <div className="mt-8 space-y-8" id="proposals-received">
            <div>
              <h2 className={`text-2xl font-bold mb-4 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Proposals received
              </h2>
              <p className={`text-sm mb-4 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                When you accept, a chat opens with the sender. They can choose to chat anonymously (you won&apos;t see their number).
              </p>
              <div className={`rounded-lg ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-md divide-y ${actualTheme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {proposals.filter((p: any) => String(p.receiver_id) === String(currentUser?.id || (currentUser as any)?._id) && p.status === 'pending').length === 0 ? (
                  <p className={`p-6 text-center ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No pending proposals</p>
                ) : (
                  proposals
                    .filter((p: any) => String(p.receiver_id) === String(currentUser?.id || (currentUser as any)?._id) && p.status === 'pending')
                    .map((p: any) => (
                      <div key={p.id || p._id} className={`p-4 ${actualTheme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                        <p className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{p.title}</p>
                        <p className={`mt-1 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{p.content}</p>
                        <p className={`text-xs mt-2 ${actualTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                          {new Date(p.created_at).toLocaleDateString()}
                        </p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleAcceptProposal(p.id || p._id)}
                            disabled={acceptingId === (p.id || p._id)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm"
                          >
                            {acceptingId === (p.id || p._id) ? 'Opening...' : 'Accept (open chat)'}
                          </button>
                          <button
                            onClick={() => handleRejectProposal(p.id || p._id)}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 text-sm"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
            <div id="proposals-sent">
              <h2 className={`text-2xl font-bold mb-4 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Proposals you sent
              </h2>
              <div className={`rounded-lg ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-md divide-y ${actualTheme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {proposals.filter((p: any) => String(p.sender_id) === String(currentUser?.id || (currentUser as any)?._id)).length === 0 ? (
                  <p className={`p-6 text-center ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No proposals sent</p>
                ) : (
                  proposals
                    .filter((p: any) => String(p.sender_id) === String(currentUser?.id || (currentUser as any)?._id))
                    .map((p: any) => (
                      <div key={p.id || p._id} className={`p-4 ${actualTheme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                        <p className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{p.title}</p>
                        <p className={`mt-1 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{p.content}</p>
                        <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs ${p.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : p.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                          {p.status}
                        </span>
                        <p className={`text-xs mt-1 ${actualTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                          {new Date(p.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Comments (anonymous; profile owner can reply to commenter) */}
        <div className="mt-8">
          <h2 className={`text-2xl font-bold mb-4 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Comments
          </h2>
          <p className={`text-sm mb-4 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {isOwnProfile
              ? 'Comments about you. Authors are anonymous. You can reply to start a conversation.'
              : 'Comments are anonymous. Only the profile owner can see who wrote and can reply.'}
          </p>
          {!isOwnProfile && (
            <form onSubmit={handleAddComment} className="mb-6">
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Write an anonymous comment..."
                rows={3}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 resize-none ${
                  actualTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              />
              <button
                type="submit"
                disabled={sendingComment || !newCommentText.trim()}
                className="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {sendingComment ? 'Sending...' : 'Post comment (anonymous)'}
              </button>
            </form>
          )}
          <div className={`rounded-lg ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-md divide-y ${actualTheme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {comments.length === 0 ? (
              <p className={`p-6 text-center ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                No comments yet.
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className={`p-4 ${actualTheme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                  <p className={`${actualTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>{comment.text}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs ${actualTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                    {isOwnProfile && (
                      <button
                        onClick={() => handleReplyToComment(comment.id)}
                        className="text-sm text-green-500 hover:text-green-600 font-medium"
                      >
                        Reply / Contact writer
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
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
                  Your message
                </label>
                <textarea
                  value={proposalContent}
                  onChange={(e) => setProposalContent(e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none ${
                    actualTheme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300'
                  }`}
                  placeholder="e.g. I'd like to get to know you"
                />
              </div>
              <label className={`flex items-center gap-2 cursor-pointer ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <input
                  type="checkbox"
                  checked={proposalChatAnonymous}
                  onChange={(e) => setProposalChatAnonymous(e.target.checked)}
                  className="rounded border-gray-400"
                />
                <span className="text-sm">When accepted, open chat as anonymous (they won&apos;t see my number)</span>
              </label>
              <button
                onClick={handleSendProposal}
                disabled={sendingProposal || !proposalContent.trim()}
                className={`w-full py-3 rounded-lg font-semibold transition ${
                  sendingProposal || !proposalContent.trim()
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
