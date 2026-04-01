'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { userApi, productApi, proposalApi, profileCommentApi, fileApi, companyApi, storyApi, COMPANY_CATEGORY_LABELS } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import StoryViewer from '@/components/StoryViewer';
import { useLayoutTitle } from '@/contexts/AppLayoutContext';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Company {
  id: string;
  user_id: string;
  name: string;
  category: string;
  description?: string;
  website?: string;
  created_at: string;
}

const CATEGORIES = Object.keys(COMPANY_CATEGORY_LABELS);

// ─── Company Modal ─────────────────────────────────────────────────────────────

interface CompanyModalProps {
  onClose: () => void;
  onSaved: () => void;
  editing?: Company | null;
  theme: string;
  t: (key: any) => string;
}

function CompanyModal({ onClose, onSaved, editing, theme, t }: CompanyModalProps) {
  const dark = theme === 'dark';
  const [name, setName] = useState(editing?.name || '');
  const [category, setCategory] = useState(editing?.category || '');
  const [description, setDescription] = useState(editing?.description || '');
  const [website, setWebsite] = useState(editing?.website || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError(t('profileCompanyErrorName')); return; }
    if (!category) { setError(t('profileCompanyCategoryRequired')); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category,
        description: description.trim(),
        website: website.trim(),
      };
      if (editing) {
        await companyApi.updateCompany(editing.id, payload);
      } else {
        await companyApi.createCompany(payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || t('profileCompanyErrorSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`${dark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
            {editing ? t('profileCompanyEditTitle') : t('profileCompanyAddTitle')}
          </h3>
          <button onClick={onClose} className={`${dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* Name */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('profileCompanyNameLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('profileCompanyNamePlaceholder')}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none ${
                dark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          {/* Category */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('profileCompanyCategoryLabel')} <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none ${
                dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">{t('profileCompanyCategorySelect')}</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{COMPANY_CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('profileCompanyDescLabel')} <span className={`text-xs font-normal ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{t('profileCompanyOptional')}</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder={t('profileCompanyDescLabel')}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none ${
                dark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          {/* Website */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
              Website <span className={`text-xs font-normal ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{t('profileCompanyOptional')}</span>
            </label>
            <input
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://example.com"
              type="url"
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none ${
                dark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                dark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-green-500 hover:bg-green-600 text-white transition disabled:opacity-50"
            >
              {saving ? t('saving') : (editing ? t('profileCompanyUpdate') : t('profileCompanyAddBtn'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Company Card ──────────────────────────────────────────────────────────────

interface CompanyCardProps {
  company: Company;
  isOwn: boolean;
  theme: string;
  onEdit: (c: Company) => void;
  onDelete: (id: string) => void;
  t: (key: any) => string;
}

function CompanyCard({ company, isOwn, theme, onEdit, onDelete, t }: CompanyCardProps) {
  const dark = theme === 'dark';
  const categoryLabel = COMPANY_CATEGORY_LABELS[company.category] || company.category;

  return (
    <div className={`${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-4 flex flex-col gap-2`}>
      {/* Name + category */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-base truncate ${dark ? 'text-white' : 'text-gray-900'}`}>
            {company.name}
          </p>
          <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            dark ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700'
          }`}>
            {categoryLabel}
          </span>
        </div>
        {isOwn && (
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={() => onEdit(company)}
              className={`p-1.5 rounded-lg transition ${dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
              title={t('profileCompanyEdit')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(company.id)}
              className={`p-1.5 rounded-lg transition ${dark ? 'hover:bg-red-900/40 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-500 hover:text-red-500'}`}
              title={t('profileCompanyDelete')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Description */}
      {company.description && (
        <p className={`text-sm leading-relaxed ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
          {company.description}
        </p>
      )}

      {/* Website */}
      {company.website && (
        <a
          href={company.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-green-500 hover:text-green-600 truncate"
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span className="truncate">{company.website}</span>
        </a>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { actualTheme } = useTheme();
  const { t, language } = useLanguage();
  const userId = params.id as string;
  useLayoutTitle(t('profile'));

  const [profileUser, setProfileUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // Proposal state
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalContent, setProposalContent] = useState('');
  const [sendingProposal, setSendingProposal] = useState(false);
  const [proposals, setProposals] = useState<any[]>([]);
  const [proposalChatAnonymous, setProposalChatAnonymous] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [deletingProposalId, setDeletingProposalId] = useState<string | null>(null);

  // Profile photo
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  // Comments
  const [comments, setComments] = useState<{ id: string; text: string; like_count: number; dislike_count: number; created_at: string }[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // Company modal state (edit only)
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingCompanyId, setDeletingCompanyId] = useState<string | null>(null);

  // Inline add-company form state
  const [inlineName, setInlineName] = useState('');
  const [inlineCategory, setInlineCategory] = useState('');
  const [inlineSaving, setInlineSaving] = useState(false);
  const [inlineError, setInlineError] = useState('');

  // ── Tab navigation ───────────────────────────────────────────────────────────
  // Default: other users see "products" tab first; own profile defaults to "about"
  const [activeTab, setActiveTab] = useState<'about' | 'products' | 'companies' | 'stories'>('about');

  // ── Stories tab ──────────────────────────────────────────────────────────────
  const [profileStories, setProfileStories] = useState<any[]>([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [storyViewerIndex, setStoryViewerIndex] = useState(0);

  // ── Profile comment reactions (local state) ──────────────────────────────────
  const [commentReactions, setCommentReactions] = useState<Record<string, { liked: boolean; disliked: boolean }>>({});

  // ── Social accounts ──────────────────────────────────────────────────────────
  const [socialAccounts, setSocialAccounts] = useState<{ platform: string; url: string; username?: string }[]>([]);
  const [showSocialForm, setShowSocialForm] = useState(false);
  const [newSocialPlatform, setNewSocialPlatform] = useState('instagram');
  const [newSocialUrl, setNewSocialUrl] = useState('');
  const [savingSocial, setSavingSocial] = useState(false);
  const [deletingSocialIdx, setDeletingSocialIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUser) { router.push('/login'); return; }
    if (!userId) return;
    const isOwn = currentUser.id === userId || (currentUser as any)._id === userId;
    setIsOwnProfile(isOwn);
    // Other users land on "products" tab by default
    setActiveTab(isOwn ? 'about' : 'products');
    loadProfile();
    loadProducts();
    loadComments();
    loadCompanies();
    if (isOwn) loadProposals();
  }, [currentUser, userId]);

  // Fetch stories when stories tab is activated
  useEffect(() => {
    if (activeTab === 'stories' && userId) {
      setLoadingStories(true);
      storyApi.getUserStories(userId)
        .then((res: any) => {
          // Backend returns { stories: [...storyEnriched] }
          const raw: any[] = Array.isArray(res?.stories) ? res.stories : (Array.isArray(res) ? res : []);
          const enriched = raw.map((s: any) => ({
            ...s,
            user_name: profileUser?.username || 'User',
            user_avatar: profileUser?.avatar || undefined,
            // Fallback media_url for product stories
            media_url: s.media_url || s.product?.media_urls?.[0] || '',
            media_type: s.media_type || 'image',
          }));
          setProfileStories(enriched);
        })
        .catch(() => setProfileStories([]))
        .finally(() => setLoadingStories(false));
    }
  }, [activeTab, userId, profileUser]);

  const loadProfile = async () => {
    if (!userId) return;
    try {
      const isOwn = currentUser?.id === userId || (currentUser as any)?._id === userId;
      const data: any = isOwn ? await userApi.getMe() : await userApi.getUserById(userId);
      setProfileUser(data);
      // Load social accounts from profile
      setSocialAccounts(Array.isArray(data?.social_accounts) ? data.social_accounts : []);
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
    } catch (error) { console.error('Failed to load products:', error); }
  };

  const loadCompanies = async () => {
    try {
      const data: any = await companyApi.getUserCompanies(userId);
      setCompanies(Array.isArray(data) ? data : []);
    } catch (error) { console.error('Failed to load companies:', error); }
  };

  const loadComments = async () => {
    try {
      const data: any = await profileCommentApi.list(userId);
      setComments(Array.isArray(data) ? data : []);
    } catch (error) { console.error('Failed to load comments:', error); }
  };

  const loadProposals = async () => {
    try {
      const data: any = await proposalApi.getProposals();
      setProposals(Array.isArray(data) ? data : []);
    } catch (error) { console.error('Failed to load proposals:', error); }
  };

  // ── Company actions ──────────────────────────────────────────────────────────

  const handleInlineAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError('');
    if (!inlineName.trim()) { setInlineError(t('profileCompanyErrorName')); return; }
    if (!inlineCategory) { setInlineError(t('profileCompanyCategoryRequired')); return; }
    setInlineSaving(true);
    try {
      await companyApi.createCompany({ name: inlineName.trim(), category: inlineCategory });
      setInlineName('');
      setInlineCategory('');
      await loadCompanies();
    } catch (err: any) {
      setInlineError(err?.message || t('profileCompanyErrorSave'));
    } finally {
      setInlineSaving(false);
    }
  };

  const handleOpenEditCompany = (company: Company) => {
    setEditingCompany(company);
    setShowCompanyModal(true);
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm(t('profileCompanyConfirmDelete'))) return;
    setDeletingCompanyId(companyId);
    try {
      await companyApi.deleteCompany(companyId);
      setCompanies(prev => prev.filter(c => c.id !== companyId));
    } catch (err: any) {
      alert(t('profileCompanyErrorDelete') + (err?.message || ''));
    } finally {
      setDeletingCompanyId(null);
    }
  };

  // ── Social account actions ───────────────────────────────────────────────────

  const SOCIAL_PLATFORMS = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'twitter', label: 'Twitter / X' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'telegram', label: 'Telegram' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'github', label: 'GitHub' },
    { value: 'website', label: 'Website' },
    { value: 'other', label: 'Other' },
  ];

  const SOCIAL_COLORS: Record<string, string> = {
    instagram: 'bg-pink-500',
    facebook: 'bg-blue-600',
    tiktok: 'bg-gray-900',
    linkedin: 'bg-blue-700',
    twitter: 'bg-sky-500',
    youtube: 'bg-red-600',
    telegram: 'bg-sky-500',
    whatsapp: 'bg-green-500',
    github: 'bg-gray-800',
    website: 'bg-indigo-500',
    other: 'bg-gray-500',
  };

  const handleAddSocialAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSocialUrl.trim()) return;
    setSavingSocial(true);
    try {
      const newAccount = { platform: newSocialPlatform, url: newSocialUrl.trim() };
      const updated = [...socialAccounts, newAccount];
      await userApi.updateMe({ social_accounts: updated });
      setSocialAccounts(updated);
      setNewSocialUrl('');
      setShowSocialForm(false);
    } catch (err: any) {
      alert('Could not save: ' + (err?.message || ''));
    } finally {
      setSavingSocial(false);
    }
  };

  const handleRemoveSocialAccount = async (idx: number) => {
    setDeletingSocialIdx(idx);
    try {
      const updated = socialAccounts.filter((_, i) => i !== idx);
      await userApi.updateMe({ social_accounts: updated });
      setSocialAccounts(updated);
    } catch (err: any) {
      alert('Could not remove: ' + (err?.message || ''));
    } finally {
      setDeletingSocialIdx(null);
    }
  };

  // ── Proposal actions ─────────────────────────────────────────────────────────

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
    } finally { setSendingComment(false); }
  };

  const handleReplyToComment = async (commentId: string) => {
    try {
      const res: any = await profileCommentApi.reply(commentId);
      router.push(res?.chat_id ? `/chat?open=${res.chat_id}` : '/chat');
    } catch (error: any) {
      alert('Failed to start conversation: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleLikeProfileComment = async (commentId: string) => {
    const current = commentReactions[commentId] || { liked: false, disliked: false };
    try {
      if (current.liked) {
        await profileCommentApi.unlikeComment(commentId);
        setCommentReactions(prev => ({ ...prev, [commentId]: { liked: false, disliked: false } }));
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, like_count: Math.max(0, (c.like_count || 0) - 1) } : c));
      } else {
        await profileCommentApi.likeComment(commentId);
        // Remove dislike if existed
        if (current.disliked) {
          setComments(prev => prev.map(c => c.id === commentId ? { ...c, dislike_count: Math.max(0, (c.dislike_count || 0) - 1) } : c));
        }
        setCommentReactions(prev => ({ ...prev, [commentId]: { liked: true, disliked: false } }));
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, like_count: (c.like_count || 0) + 1 } : c));
      }
    } catch (error) { console.error('Failed to toggle profile comment like:', error); }
  };

  const handleDislikeProfileComment = async (commentId: string) => {
    const current = commentReactions[commentId] || { liked: false, disliked: false };
    try {
      if (current.disliked) {
        await profileCommentApi.undislikeComment(commentId);
        setCommentReactions(prev => ({ ...prev, [commentId]: { liked: false, disliked: false } }));
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, dislike_count: Math.max(0, (c.dislike_count || 0) - 1) } : c));
      } else {
        await profileCommentApi.dislikeComment(commentId);
        // Remove like if existed
        if (current.liked) {
          setComments(prev => prev.map(c => c.id === commentId ? { ...c, like_count: Math.max(0, (c.like_count || 0) - 1) } : c));
        }
        setCommentReactions(prev => ({ ...prev, [commentId]: { liked: false, disliked: true } }));
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, dislike_count: (c.dislike_count || 0) + 1 } : c));
      }
    } catch (error) { console.error('Failed to toggle profile comment dislike:', error); }
  };

  const handleSendProposal = async () => {
    if (!proposalContent.trim()) { alert('Please write your proposal'); return; }
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
      setProposalTitle(''); setProposalContent(''); setProposalChatAnonymous(false);
      loadProposals();
    } catch (error: any) {
      alert('Failed to send proposal: ' + error.message);
    } finally { setSendingProposal(false); }
  };

  const handleAcceptProposal = async (proposalId: string) => {
    setAcceptingId(proposalId);
    try {
      const res: any = await proposalApi.acceptProposal(proposalId);
      if (res?.chat_id) router.push(`/chat?open=${res.chat_id}`); else loadProposals();
    } catch (error: any) {
      alert('Failed to accept: ' + (error?.message || 'Unknown error'));
    } finally { setAcceptingId(null); }
  };

  const handleRejectProposal = async (proposalId: string) => {
    try { await proposalApi.rejectProposal(proposalId); loadProposals(); }
    catch (error: any) { alert('Failed to reject: ' + (error?.message || 'Unknown error')); }
  };

  const handleDeleteProposal = async (proposalId: string) => {
    const id = typeof proposalId === 'string' ? proposalId : String((proposalId as any)?.$oid ?? proposalId);
    if (!id || id.length < 20) { alert('Invalid proposal ID'); return; }
    setDeletingProposalId(id);
    try { await proposalApi.deleteProposal(id); loadProposals(); }
    catch (error: any) { alert('Failed to delete: ' + (error?.message || 'Unknown error')); }
    finally { setDeletingProposalId(null); }
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
          ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '') : 'http://localhost:8080';
        const avatarUrl = fileUrl.startsWith('http') ? fileUrl : `${base}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
        await userApi.updateMe({ avatar: avatarUrl });
        loadProfile();
      }
    } catch (err: any) {
      alert('Failed to update photo: ' + (err?.message || 'Unknown error'));
    } finally { setUploadingPhoto(false); e.target.value = ''; }
  };

  // ── Loading / not found ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <div className="flex-1 flex flex-col min-w-0">
          <div className={`flex-shrink-0 border-b ${actualTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} px-3 py-3 sm:py-4`}>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
          <div className={`flex-1 flex justify-center items-center p-8 ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-green-500 border-t-transparent" />
          </div>
        </div>
      </>
    );
  }

  if (!profileUser) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <p className={`text-lg mb-4 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>User not found</p>
        <Link href="/explore" className="text-green-500 hover:text-green-700">Back to Explore</Link>
      </div>
    );
  }

  const dark = actualTheme === 'dark';
  const dateLocale = language === 'tr' ? 'tr-TR' : language === 'ru' ? 'ru-RU' : language === 'az' ? 'az-AZ' : 'en-US';

  return (
    <>
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className={`${dark ? 'bg-gray-800' : 'bg-white'} border-b ${dark ? 'border-gray-700' : 'border-gray-200'} sticky top-0 z-10`}>
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between min-w-0 gap-2">
              <button
                onClick={() => router.back()}
                className={`flex items-center space-x-2 flex-shrink-0 ${dark ? 'text-white' : 'text-gray-600'} hover:opacity-80`}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm sm:text-base">{t('back')}</span>
              </button>
              <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0">
                <Link href="/chat" className={`text-sm ${dark ? 'text-gray-300' : 'text-gray-600'} hover:opacity-80`}>{t('chat')}</Link>
                {isOwnProfile && (
                  <Link href="/settings" className={`text-sm ${dark ? 'text-gray-300' : 'text-gray-600'} hover:opacity-80`}>{t('settings')}</Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 space-y-6">

          {/* ── Profile header card ─────────────────────────────────── */}
          <div className={`${dark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-4 sm:p-6`}>
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
              {/* Avatar */}
              <div className="relative flex-shrink-0 mx-auto sm:mx-0">
                <label className={`block w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden cursor-pointer ${isOwnProfile ? 'hover:opacity-90' : ''}`}
                  title={isOwnProfile ? 'Change profile photo' : ''}>
                  {profileUser.avatar ? (
                    <img src={profileUser.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full ${dark ? 'bg-green-600' : 'bg-green-500'} flex items-center justify-center text-white text-2xl sm:text-3xl font-semibold`}>
                      {profileUser.username?.[0]?.toUpperCase() || profileUser.phone_number?.[0] || 'U'}
                    </div>
                  )}
                  {isOwnProfile && <input type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoChange} disabled={uploadingPhoto} />}
                </label>
                {isOwnProfile && uploadingPhoto && (
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center text-white text-sm">Uploading...</div>
                )}
                {isOwnProfile && profileUser.qr_code && (
                  <button onClick={() => setShowQRCode(true)}
                    className="absolute bottom-0 right-0 w-7 h-7 sm:w-8 sm:h-8 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition"
                    title="Show QR Code">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 w-full">
                <h1 className={`text-2xl sm:text-3xl font-bold mb-2 truncate ${dark ? 'text-white' : 'text-gray-900'}`}>
                  {profileUser.username || profileUser.first_name || 'User'}
                </h1>
                {profileUser.bio && (
                  <p className={`mb-3 break-words text-sm ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{profileUser.bio}</p>
                )}
                <div className={`flex flex-wrap items-center gap-x-6 gap-y-1 text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div>
                    <span className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{products.length}</span>
                    <span className="ml-1">{t('profileProductStat')}</span>
                  </div>
                  <div>
                    <span className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{companies.length}</span>
                    <span className="ml-1">{t('profileCompanyStat')}</span>
                  </div>
                  {profileUser.phone_number && !profileUser.hide_phone_number && (
                    <div className="min-w-0 truncate">
                      <span className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{profileUser.phone_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col space-y-2 w-full sm:w-auto">
                {isOwnProfile ? (
                  <Link href="/explore/create"
                    className="bg-green-500 text-white px-6 py-2.5 rounded-lg hover:bg-green-600 transition-colors text-center w-full sm:w-auto text-sm font-medium">
                    {t('profileProductAdd')}
                  </Link>
                ) : (
                  <button onClick={() => setShowProposalModal(true)}
                    className="bg-green-500 text-white px-6 py-2.5 rounded-lg hover:bg-green-600 transition-colors w-full sm:w-auto text-sm font-medium">
                    {t('sendProposal')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Tab navigation ──────────────────────────────────────── */}
          <div className={`flex gap-1 p-1 rounded-xl ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            {(['about', 'products', 'companies', 'stories'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-green-500 text-white shadow-sm'
                    : dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab === 'about' && '👤 About'}
                {tab === 'products' && `🛍 Products${products.length > 0 ? ` (${products.length})` : ''}`}
                {tab === 'companies' && `🏢 Companies${companies.length > 0 ? ` (${companies.length})` : ''}`}
                {tab === 'stories' && `📖 Stories${profileStories.length > 0 ? ` (${profileStories.length})` : ''}`}
              </button>
            ))}
          </div>

          {/* ── ABOUT TAB ───────────────────────────────────────────── */}
          {activeTab === 'about' && (
            <>
              {/* Social accounts section */}
              <div className={`${dark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-4 sm:p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-lg font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
                    🔗 Social Accounts
                  </h2>
                  {isOwnProfile && !showSocialForm && (
                    <button
                      onClick={() => setShowSocialForm(true)}
                      className="flex items-center gap-1 text-sm text-green-500 hover:text-green-600 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add
                    </button>
                  )}
                </div>

                {/* Add form (own profile only) */}
                {isOwnProfile && showSocialForm && (
                  <form onSubmit={handleAddSocialAccount} className="mb-4 flex flex-col sm:flex-row gap-2">
                    <select
                      value={newSocialPlatform}
                      onChange={e => setNewSocialPlatform(e.target.value)}
                      className={`px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-green-500 ${
                        dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      {SOCIAL_PLATFORMS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <input
                      type="url"
                      value={newSocialUrl}
                      onChange={e => setNewSocialUrl(e.target.value)}
                      placeholder="https://instagram.com/username"
                      required
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-green-500 ${
                        dark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                    <div className="flex gap-2">
                      <button type="submit" disabled={savingSocial}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                        {savingSocial ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" onClick={() => { setShowSocialForm(false); setNewSocialUrl(''); }}
                        className={`px-4 py-2 rounded-lg text-sm ${dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {socialAccounts.length === 0 ? (
                  <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {isOwnProfile ? 'No social accounts added yet. Click Add to link your profiles.' : 'No social accounts shared.'}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {socialAccounts.map((acc, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <a
                          href={acc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium hover:opacity-90 transition ${SOCIAL_COLORS[acc.platform] || 'bg-gray-500'}`}
                        >
                          <span className="capitalize">{acc.platform}</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        {isOwnProfile && (
                          <button
                            onClick={() => handleRemoveSocialAccount(idx)}
                            disabled={deletingSocialIdx === idx}
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition ${dark ? 'bg-gray-700 text-gray-400 hover:bg-red-900/40 hover:text-red-400' : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'} disabled:opacity-40`}
                            title="Remove"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── ABOUT TAB: Proposals + Comments ──────────────────────────── */}
          {activeTab === 'about' && (
            <>
              {/* Proposals (own profile only) */}
              {isOwnProfile && (
                <div className="space-y-6" id="proposals-received">
                  {/* Received */}
                  <div>
                    <h2 className={`text-xl sm:text-2xl font-bold mb-3 ${dark ? 'text-white' : 'text-gray-900'}`}>{t('profileProposalsReceivedTitle')}</h2>
                    <p className={`text-sm mb-3 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {t('profileProposalsReceivedDesc')}
                    </p>
                    <div className={`rounded-xl ${dark ? 'bg-gray-800' : 'bg-white'} shadow-sm divide-y ${dark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      {proposals.filter((p: any) => String(p.receiver_id) === String(currentUser?.id || (currentUser as any)?._id) && p.status === 'pending').length === 0 ? (
                        <p className={`p-6 text-center ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{t('profileProposalNoPending')}</p>
                      ) : (
                        proposals.filter((p: any) => String(p.receiver_id) === String(currentUser?.id || (currentUser as any)?._id) && p.status === 'pending')
                          .map((p: any) => (
                            <div key={p.id || p._id} className={`p-4 ${dark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                              <p className={`font-medium break-words ${dark ? 'text-white' : 'text-gray-900'}`}>{p.title}</p>
                              <p className={`mt-1 break-words ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{p.content}</p>
                              <p className={`text-xs mt-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{new Date(p.created_at).toLocaleDateString(dateLocale)}</p>
                              <div className="flex flex-wrap gap-2 mt-3">
                                <button onClick={() => handleAcceptProposal(p.id || p._id)} disabled={acceptingId === (p.id || p._id)}
                                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm">
                                  {acceptingId === (p.id || p._id) ? t('profileProposalAccepting') : t('accept')}
                                </button>
                                <button onClick={() => handleRejectProposal(p.id || p._id)}
                                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 text-sm">
                                  {t('reject')}
                                </button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  {/* Sent */}
                  <div id="proposals-sent">
                    <h2 className={`text-xl sm:text-2xl font-bold mb-3 ${dark ? 'text-white' : 'text-gray-900'}`}>{t('profileProposalsSentTitle')}</h2>
                    <div className={`rounded-xl ${dark ? 'bg-gray-800' : 'bg-white'} shadow-sm divide-y ${dark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      {proposals.filter((p: any) => String(p.sender_id) === String(currentUser?.id || (currentUser as any)?._id)).length === 0 ? (
                        <p className={`p-6 text-center ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{t('profileProposalNoSent')}</p>
                      ) : (
                        proposals.filter((p: any) => String(p.sender_id) === String(currentUser?.id || (currentUser as any)?._id))
                          .map((p: any) => {
                            const pid = typeof p.id === 'string' ? p.id : (p._id && typeof p._id === 'string' ? p._id : String(p.id ?? p._id ?? ''));
                            return (
                              <div key={pid} className={`p-4 ${dark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                                <p className={`font-medium break-words ${dark ? 'text-white' : 'text-gray-900'}`}>{p.title}</p>
                                <p className={`mt-1 break-words ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{p.content}</p>
                                <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs ${p.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : p.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                  {p.status}
                                </span>
                                <p className={`text-xs mt-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{new Date(p.created_at).toLocaleDateString(dateLocale)}</p>
                                {p.status === 'pending' && (
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    <button type="button" onClick={() => handleDeleteProposal(pid)} disabled={deletingProposalId === pid}
                                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 text-sm">
                                      {deletingProposalId === pid ? t('profileCompanyDeleting') : t('delete')}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <h2 className={`text-xl sm:text-2xl font-bold mb-3 ${dark ? 'text-white' : 'text-gray-900'}`}>{t('profileCommentsTitle')}</h2>
                <p className={`text-sm mb-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {isOwnProfile ? t('profileCommentsDescOwn') : t('profileCommentsDescOther')}
                </p>
                {!isOwnProfile && (
                  <form onSubmit={handleAddComment} className="mb-6">
                    <textarea value={newCommentText} onChange={e => setNewCommentText(e.target.value)}
                      placeholder={t('profileCommentsWritePlaceholder')} rows={3}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 resize-none ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    />
                    <button type="submit" disabled={sendingComment || !newCommentText.trim()}
                      className="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50">
                      {sendingComment ? t('profileCommentsSending') : t('profileCommentsSendBtn')}
                    </button>
                  </form>
                )}
                <div className={`rounded-xl ${dark ? 'bg-gray-800' : 'bg-white'} shadow-sm divide-y ${dark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {comments.length === 0 ? (
                    <p className={`p-6 text-center ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{t('profileCommentsNone')}</p>
                  ) : (
                    comments.map(comment => {
                      const reaction = commentReactions[comment.id] || { liked: false, disliked: false };
                      return (
                        <div key={comment.id} className={`p-4 ${dark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                          <p className={`break-words ${dark ? 'text-gray-200' : 'text-gray-800'}`}>{comment.text}</p>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-2">
                            <div className="flex items-center gap-3">
                              <span className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{new Date(comment.created_at).toLocaleDateString(dateLocale)}</span>
                              {/* Like button */}
                              <button
                                onClick={() => handleLikeProfileComment(comment.id)}
                                className={`flex items-center gap-1 text-xs transition-colors ${reaction.liked ? 'text-green-500' : dark ? 'text-gray-400 hover:text-green-400' : 'text-gray-500 hover:text-green-500'}`}
                              >
                                <svg className="w-3.5 h-3.5" fill={reaction.liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                </svg>
                                <span>{comment.like_count || 0}</span>
                              </button>
                              {/* Dislike button */}
                              <button
                                onClick={() => handleDislikeProfileComment(comment.id)}
                                className={`flex items-center gap-1 text-xs transition-colors ${reaction.disliked ? 'text-red-500' : dark ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}
                              >
                                <svg className="w-3.5 h-3.5" fill={reaction.disliked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                                </svg>
                                <span>{comment.dislike_count || 0}</span>
                              </button>
                            </div>
                            {isOwnProfile && (
                              <button onClick={() => handleReplyToComment(comment.id)} className="text-sm text-green-500 hover:text-green-600 font-medium">
                                {t('profileCommentsReply')}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── PRODUCTS TAB ─────────────────────────────────────────────── */}
          {activeTab === 'products' && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
                <h2 className={`text-xl sm:text-2xl font-bold truncate ${dark ? 'text-white' : 'text-gray-900'}`}>
                  {isOwnProfile ? t('profileProductsTitle') : t('profileProductsOther')}
                </h2>
                {products.length > 0 && (
                  <span className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{products.length} {t('profileProductsCount')}</span>
                )}
              </div>
              {products.length === 0 ? (
                <div className={`${dark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-sm p-6 sm:p-12 text-center`}>
                  <p className={`text-lg mb-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {isOwnProfile ? t('profileProductsEmptyOwn') : t('profileProductsEmptyOther')}
                  </p>
                  {isOwnProfile && (
                    <Link href="/explore/create" className="inline-block bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600">
                      {t('profileProductAddFirst')}
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {products.map(product => (
                    <ProductCard
                      key={product.id}
                      product={{ ...product, owner: { id: profileUser.id, username: profileUser.username, avatar: profileUser.avatar }, is_liked: false }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── COMPANIES TAB ────────────────────────────────────────────── */}
          {activeTab === 'companies' && (
            <div>
              {/* Section title */}
              <div className="flex items-center gap-2 mb-4">
                <svg className={`w-5 h-5 flex-shrink-0 ${dark ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h2 className={`text-xl sm:text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
                  {isOwnProfile ? t('profileCompaniesTitle') : t('profileCompaniesOther')}
                </h2>
                {companies.length > 0 && (
                  <span className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>({companies.length})</span>
                )}
              </div>

              {/* Inline add form — only for own profile */}
              {isOwnProfile && (
                <div className={`${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-sm p-4 mb-4`}>
                  <p className={`text-sm font-medium mb-3 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{t('profileCompanyAdd')}</p>
                  <form onSubmit={handleInlineAddCompany}>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        value={inlineName}
                        onChange={e => { setInlineName(e.target.value); setInlineError(''); }}
                        placeholder={t('profileCompanyNamePlaceholder')}
                        className={`flex-1 px-4 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                          dark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                      <select
                        value={inlineCategory}
                        onChange={e => { setInlineCategory(e.target.value); setInlineError(''); }}
                        className={`sm:w-52 px-4 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                          dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="">{t('profileCompanyCategorySelect')}</option>
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{COMPANY_CATEGORY_LABELS[cat]}</option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        disabled={inlineSaving}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 flex-shrink-0"
                      >
                        {inlineSaving ? (
                          <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                        {inlineSaving ? t('profileCompanyAdding') : t('profileCompanyAddBtn')}
                      </button>
                    </div>
                    {inlineError && (
                      <p className="mt-2 text-sm text-red-500">{inlineError}</p>
                    )}
                  </form>
                </div>
              )}

              {/* Companies list */}
              {companies.length === 0 ? (
                <div className={`${dark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-sm p-6 text-center`}>
                  <svg className={`w-12 h-12 mx-auto mb-3 ${dark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {isOwnProfile ? t('profileCompanyEmptyOwn') : t('profileCompanyEmptyOther')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {companies.map(company => (
                    <CompanyCard
                      key={company.id}
                      company={company}
                      isOwn={isOwnProfile}
                      theme={actualTheme}
                      onEdit={handleOpenEditCompany}
                      onDelete={handleDeleteCompany}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STORIES TAB ───────────────────────────────────────────── */}
          {activeTab === 'stories' && (
            <div className="space-y-4">
              {/* Create story button for own profile */}
              {isOwnProfile && (
                <button
                  onClick={() => router.push('/story/create')}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t('storyAddNew')}
                </button>
              )}

              {loadingStories ? (
                <div className="flex justify-center py-12">
                  <span className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full inline-block" />
                </div>
              ) : profileStories.length === 0 ? (
                <div className={`${dark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-sm p-10 text-center`}>
                  <div className="text-4xl mb-3">📖</div>
                  <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {isOwnProfile ? t('storyNoStoriesOwn') : t('storyNoStoriesOther')}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {profileStories.map((story: any, idx: number) => {
                      const thumbUrl = story.media_url || story.product?.media_urls?.[0] || story.thumbnail_url;
                      return (
                        <div
                          key={story.id || story._id || idx}
                          onClick={() => { setStoryViewerIndex(idx); setShowStoryViewer(true); }}
                          className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                        >
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt="story"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center text-2xl ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                              🛍
                            </div>
                          )}
                          {/* Type indicator */}
                          {story.type === 'product' && (
                            <div className="absolute top-1 right-1 bg-black/60 rounded-full p-1">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                              </svg>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Story Viewer */}
                  {showStoryViewer && profileStories.length > 0 && (
                    <StoryViewer
                      stories={profileStories.map((s: any) => ({
                        id: s.id || s._id || '',
                        user_id: s.user_id || '',
                        user_name: s.user_name || profileUser?.username || '',
                        user_avatar: s.user_avatar || profileUser?.avatar,
                        media_url: s.media_url || s.product?.media_urls?.[0] || '',
                        media_type: s.media_type || 'image',
                        text: s.text,
                        created_at: s.created_at,
                        expires_at: s.expires_at,
                      }))}
                      initialIndex={storyViewerIndex}
                      onClose={() => setShowStoryViewer(false)}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── QR Code Modal ───────────────────────────────────────────── */}
        {showQRCode && profileUser.qr_code && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowQRCode(false)}>
            <div className={`${dark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 sm:p-6 max-w-sm w-full`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-gray-800'}`}>{t('profileQRCodeTitle')}</h3>
                <button onClick={() => setShowQRCode(false)} className={`${dark ? 'text-gray-400' : 'text-gray-500'} hover:opacity-80`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex justify-center mb-4">
                <img src={`data:image/png;base64,${profileUser.qr_code}`} alt="QR Code" className="w-64 h-64 border-2 border-gray-300 rounded" />
              </div>
              <p className={`text-sm text-center ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{t('profileQRCodeDesc')}</p>
            </div>
          </div>
        )}

        {/* ── Proposal Modal ──────────────────────────────────────────── */}
        {showProposalModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowProposalModal(false)}>
            <div className={`${dark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-gray-800'}`}>{t('profileProposalSendTitle')}</h3>
                <button onClick={() => setShowProposalModal(false)} className={`${dark ? 'text-gray-400' : 'text-gray-500'} hover:opacity-80`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{t('profileProposalMessageLabel')}</label>
                  <textarea value={proposalContent} onChange={e => setProposalContent(e.target.value)} rows={4}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    placeholder={t('profileProposalPlaceholder')} />
                </div>
                <label className={`flex items-center gap-2 cursor-pointer ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <input type="checkbox" checked={proposalChatAnonymous} onChange={e => setProposalChatAnonymous(e.target.checked)} className="rounded border-gray-400" />
                  <span className="text-sm">{t('profileProposalAnonymousChat')}</span>
                </label>
                <button onClick={handleSendProposal} disabled={sendingProposal || !proposalContent.trim()}
                  className={`w-full py-3 rounded-lg font-semibold transition ${sendingProposal || !proposalContent.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'} text-white`}>
                  {sendingProposal ? t('profileProposalSending') : t('profileProposalSendTitle')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Company Modal ───────────────────────────────────────────── */}
        {showCompanyModal && (
          <CompanyModal
            theme={actualTheme}
            editing={editingCompany}
            onClose={() => { setShowCompanyModal(false); setEditingCompany(null); }}
            onSaved={loadCompanies}
            t={t}
          />
        )}
      </div>
    </>
  );
}
