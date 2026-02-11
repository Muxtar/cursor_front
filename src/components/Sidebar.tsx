'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { chatApi, contactApi, userApi, fileApi, proposalApi } from '@/lib/api';

interface SidebarProps {
  onChatSelect?: (chatId: string) => void;
  selectedChat?: string | null;
}

export default function Sidebar({ onChatSelect, selectedChat }: SidebarProps) {
  const { user, logout } = useAuth();
  const { actualTheme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showRemoveContactModal, setShowRemoveContactModal] = useState(false);
  const [addContactByNumber, setAddContactByNumber] = useState(false);
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [showChatModeModal, setShowChatModeModal] = useState(false);
  const [pendingChatUserId, setPendingChatUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts'>('chats');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProposalsDropdown, setShowProposalsDropdown] = useState(false);
  const [incomingProposalsCount, setIncomingProposalsCount] = useState(0);
  const [showChangePhotoModal, setShowChangePhotoModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showNewProposalModal, setShowNewProposalModal] = useState(false);
  const [proposalSearchQuery, setProposalSearchQuery] = useState('');
  const [proposalSearchResults, setProposalSearchResults] = useState<any[]>([]);
  const [proposalTargetUser, setProposalTargetUser] = useState<any>(null);
  const [proposalContent, setProposalContent] = useState('');
  const [proposalChatAnonymous, setProposalChatAnonymous] = useState(false);
  const [sendingProposal, setSendingProposal] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const proposalsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadContacts();
      loadChats();
      loadProposalsCount();
    }
  }, [user]);

  const loadProposalsCount = async () => {
    try {
      const data: any = await proposalApi.getProposals();
      const list = Array.isArray(data) ? data : data?.proposals ?? data?.data ?? [];
      const myId = user?.id || (user as any)?._id;
      const received = list.filter((p: any) => (p.receiver_id || p.receiver?._id || p.receiver) === myId && (p.status === 'pending' || !p.status));
      setIncomingProposalsCount(received.length);
    } catch {
      setIncomingProposalsCount(0);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.menu-dropdown') && !target.closest('.menu-button')) {
        setShowMenuDropdown(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(target) && profileButtonRef.current && !profileButtonRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
      if (proposalsDropdownRef.current && !proposalsDropdownRef.current.contains(target) && !target.closest('.proposals-bell-button')) {
        setShowProposalsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadContacts = async () => {
    try {
      const data: any = await contactApi.getContacts();
      let contactsData: any[] = [];
      if (Array.isArray(data)) {
        contactsData = data;
      } else if (data && Array.isArray(data.contacts)) {
        contactsData = data.contacts;
      } else if (data && Array.isArray(data.data)) {
        contactsData = data.data;
      }
      setContacts(contactsData);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const loadChats = async () => {
    try {
      const data: any = await chatApi.getChats();
      let chatsData: any[] = [];
      if (Array.isArray(data)) {
        chatsData = data;
      } else if (data && Array.isArray(data.chats)) {
        chatsData = data.chats;
      } else if (data && Array.isArray(data.data)) {
        chatsData = data.data;
      }
      chatsData.sort((a, b) => {
        const timeA = new Date(a.updated_at || a.last_message?.created_at || 0).getTime();
        const timeB = new Date(b.updated_at || b.last_message?.created_at || 0).getTime();
        return timeB - timeA;
      });
      setChats(chatsData);
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const results: any = await userApi.searchUsers(query);
      setSearchResults(Array.isArray(results) ? results : results?.users || []);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    }
  };

  const handleCreateChat = async (userId: string) => {
    try {
      const chat: any = await chatApi.createChat({
        type: 'direct',
        member_ids: [userId],
      });
      const chatId = chat.id || chat._id || chat.chat_id;
      if (onChatSelect) {
        onChatSelect(chatId);
      }
      setShowNewChatModal(false);
      setSearchQuery('');
      loadChats();
      router.push('/chat');
    } catch (error: any) {
      console.error('Failed to create chat:', error);
      alert(t('sendFailed') + ': ' + (error?.message || ''));
    }
  };

  const handleAddContact = async (userId: string) => {
    try {
      await contactApi.addContact({ user_id: userId });
      alert(t('contactAdded'));
      setShowAddContactModal(false);
      setSearchQuery('');
      loadContacts();
    } catch (error: any) {
      alert(t('addContactFailed') + ': ' + error.message);
    }
  };

  const handleAddContactByPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactPhone.trim()) return;
    try {
      await contactApi.addContact({
        phone_number: newContactPhone.trim(),
        display_name: newContactName.trim() || newContactPhone.trim(),
      });
      alert(t('contactAdded'));
      setShowAddContactModal(false);
      setAddContactByNumber(false);
      setNewContactPhone('');
      setNewContactName('');
      loadContacts();
    } catch (error: any) {
      alert(t('addContactFailed') + ': ' + (error?.message || ''));
    }
  };

  const openChatWithContact = (userId: string) => {
    setPendingChatUserId(userId);
    setShowChatModeModal(true);
  };

  const handleCreateChatWithMode = async (isAnonymous: boolean) => {
    if (!pendingChatUserId) return;
    try {
      const chat: any = await chatApi.createChat({
        type: 'direct',
        member_ids: [pendingChatUserId],
        is_anonymous: isAnonymous,
      });
      const chatId = chat.id || chat._id || chat.chat_id;
      setShowChatModeModal(false);
      setPendingChatUserId(null);
      if (onChatSelect) onChatSelect(chatId);
      loadChats();
      router.push('/chat');
    } catch (error: any) {
      alert(t('sendFailed') + ': ' + (error?.message || ''));
    }
  };

  const handleRemoveContact = async (contactId: string) => {
    try {
      await contactApi.deleteContact(contactId);
      alert(t('contactRemoved'));
      setShowRemoveContactModal(false);
      loadContacts();
    } catch (error: any) {
      alert(t('removeContactFailed') + ': ' + (error?.message || ''));
    }
  };

  const handleLogout = () => {
    if (confirm(t('logout') + '?')) {
      logout();
      router.push('/login');
    }
  };

  const handleProposalSearch = async (query: string) => {
    setProposalSearchQuery(query);
    if (!query.trim()) {
      setProposalSearchResults([]);
      return;
    }
    try {
      const results: any = await userApi.searchUsers(query);
      const list = Array.isArray(results) ? results : results?.users || [];
      setProposalSearchResults(list.filter((u: any) => (u.id || u._id) !== (user?.id || (user as any)?._id)));
    } catch {
      setProposalSearchResults([]);
    }
  };

  const handleSendNewProposal = async () => {
    if (!proposalTargetUser || !proposalContent.trim()) return;
    setSendingProposal(true);
    try {
      await proposalApi.createProposal({
        receiver_id: proposalTargetUser.id || proposalTargetUser._id,
        title: t('newProposal'),
        content: proposalContent.trim(),
        chat_anonymous: proposalChatAnonymous,
      });
      setShowNewProposalModal(false);
      setProposalTargetUser(null);
      setProposalContent('');
      setProposalChatAnonymous(false);
      setProposalSearchQuery('');
      setProposalSearchResults([]);
      loadProposalsCount();
      alert(t('requestSent'));
    } catch (err: any) {
      alert(t('sendFailed') + ': ' + (err?.message || ''));
    } finally {
      setSendingProposal(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
        window.location.reload(); // refresh to show new avatar
      }
    } catch (err: any) {
      alert(t('photoUpdateFailed') + ': ' + (err?.message || ''));
    } finally {
      setUploadingPhoto(false);
      setShowChangePhotoModal(false);
      setShowProfileMenu(false);
      e.target.value = '';
    }
  };

  if (!user) return null;

  return (
    <>
      <div className={`w-[420px] ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-r ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex flex-col shadow-sm h-screen`}>
        {/* Header */}
        <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-4 border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3 relative" ref={profileMenuRef}>
              <button
                ref={profileButtonRef}
                onClick={() => { setShowProfileMenu(!showProfileMenu); setShowMenuDropdown(false); setShowProposalsDropdown(false); }}
                className="rounded-full overflow-hidden w-10 h-10 flex items-center justify-center hover:opacity-90 transition ring-2 ring-transparent focus:ring-blue-400 flex-shrink-0"
                title={t('viewProfile')}
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className={`w-full h-full flex items-center justify-center text-lg font-semibold ${actualTheme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}>
                    {user.username?.[0]?.toUpperCase() || user.phone_number?.[0] || 'U'}
                  </span>
                )}
              </button>
              <div className="relative flex-shrink-0" ref={proposalsDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowProposalsDropdown(!showProposalsDropdown)}
                  onMouseEnter={() => setShowProposalsDropdown(true)}
                  className={`proposals-bell-button relative p-2 rounded-full transition ${actualTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  title={t('newProposalsCount')}
                  aria-label={t('newProposalsCount')}
                >
                  <svg className={`w-5 h-5 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {incomingProposalsCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                      {incomingProposalsCount > 99 ? '99+' : incomingProposalsCount}
                    </span>
                  )}
                </button>
                {showProposalsDropdown && (
                  <div
                    className={`absolute left-0 top-full mt-1 w-56 rounded-xl shadow-xl border z-50 py-1.5 ${actualTheme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
                    onMouseLeave={() => setShowProposalsDropdown(false)}
                  >
                    <div className={`px-3 py-2 border-b ${actualTheme === 'dark' ? 'border-gray-600' : 'border-gray-100'}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('newProposalsCount')}</span>
                    </div>
                    <Link
                      href={`/profile/${user.id || user._id}#proposals-received`}
                      onClick={() => { setShowProposalsDropdown(false); loadProposalsCount(); }}
                      className={`flex items-center gap-3 px-4 py-3 text-sm ${actualTheme === 'dark' ? 'text-white hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'} transition`}
                    >
                      <span className="flex-1">{t('proposalsReceived')}</span>
                      {incomingProposalsCount > 0 && <span className="rounded-full bg-red-500 text-white text-xs font-medium px-2 py-0.5">{incomingProposalsCount}</span>}
                    </Link>
                    <Link
                      href={`/profile/${user.id || user._id}#proposals-sent`}
                      onClick={() => setShowProposalsDropdown(false)}
                      className={`flex items-center gap-3 px-4 py-3 text-sm ${actualTheme === 'dark' ? 'text-white hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'} transition`}
                    >
                      <span>{t('proposalsSent')}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => { setShowNewProposalModal(true); setShowProposalsDropdown(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left ${actualTheme === 'dark' ? 'text-white hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'} transition`}
                    >
                      <span className="font-medium">{t('newProposal')}</span>
                    </button>
                  </div>
                )}
              </div>
              {showProfileMenu && (
                <div className={`profile-menu absolute left-0 top-12 w-56 rounded-xl shadow-lg border z-50 ${actualTheme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                  <Link
                    href={`/profile/${user.id || user._id}`}
                    onClick={() => setShowProfileMenu(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm ${actualTheme === 'dark' ? 'text-white hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'} rounded-t-xl transition`}
                  >
                    <span>{t('viewProfile')}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setShowChangePhotoModal(true); setShowProfileMenu(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left ${actualTheme === 'dark' ? 'text-white hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'} transition`}
                  >
                    {t('changeProfilePhoto')}
                  </button>
                </div>
              )}
              <div className="min-w-0">
                <h1 className={`text-lg font-semibold truncate ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {user.username || user.phone_number || 'User'}
                </h1>
                <p className={`text-xs truncate ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {user.phone_number}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowNewChatModal(true)}
                className={`p-2 ${actualTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded-full transition`}
                title={t('newChat')}
              >
                <svg className={`w-5 h-5 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={() => setShowAddContactModal(true)}
                className={`p-2 ${actualTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded-full transition`}
                title={t('addContact')}
              >
                <svg className={`w-5 h-5 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                  className="menu-button p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                  title={t('menu')}
                >
                  <svg className={`w-5 h-5 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                {showMenuDropdown && (
                  <div className={`menu-dropdown absolute right-0 mt-2 w-56 ${actualTheme === 'dark' ? 'bg-gray-700' : 'bg-white'} rounded-lg shadow-lg border ${actualTheme === 'dark' ? 'border-gray-600' : 'border-gray-200'} z-50`}>
                    <Link
                      href="/settings"
                      onClick={() => setShowMenuDropdown(false)}
                      className={`block px-4 py-3 text-sm ${actualTheme === 'dark' ? 'text-white hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'} transition`}
                    >
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{t('settings')}</span>
                      </div>
                    </Link>
                    <button
                      onClick={() => {
                        setShowMenuDropdown(false);
                        handleLogout();
                      }}
                      className={`block w-full text-left px-4 py-3 text-sm ${actualTheme === 'dark' ? 'text-red-400 hover:bg-gray-600' : 'text-red-600 hover:bg-gray-100'} transition border-t ${actualTheme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}
                    >
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>{t('logout')}</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('chats')}
              className={`flex-1 py-2 text-center font-medium rounded-t-lg transition ${
                activeTab === 'chats'
                  ? actualTheme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'
                  : actualTheme === 'dark' ? 'text-gray-400 hover:bg-gray-700/50' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t('chats')}
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex-1 py-2 text-center font-medium rounded-t-lg transition ${
                activeTab === 'contacts'
                  ? actualTheme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'
                  : actualTheme === 'dark' ? 'text-gray-400 hover:bg-gray-700/50' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t('contacts')}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className={`p-2 ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="relative">
            <input
              type="text"
              placeholder={t('searchOrStartChat')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearchUsers(e.target.value);
              }}
              className={`w-full pl-10 pr-4 py-2 ${actualTheme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white'} rounded-lg border ${actualTheme === 'dark' ? 'border-gray-600' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {searchQuery && searchResults.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {searchResults.map((result) => (
                <button
                  key={result.id || result._id}
                  onClick={() => openChatWithContact(result.id || result._id)}
                  className={`w-full p-4 text-left transition-colors ${
                    actualTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 ${actualTheme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} rounded-full flex items-center justify-center text-white font-semibold`}>
                      {result.username?.[0]?.toUpperCase() || result.phone_number?.[0] || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {result.username || result.phone_number}
                      </p>
                      <p className={`text-xs truncate ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {result.phone_number}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : activeTab === 'chats' ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {chats.length === 0 ? (
                <div className={`p-4 text-center ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('noChatsYet')}
                </div>
              ) : (
                chats.map((chat) => {
                  const chatId = chat.id || chat._id;
                  const isAnonymous = chat.other_party_anonymous === true;
                  const chatTitle = isAnonymous ? 'Anonymous' : (chat.group_name || chat.members?.[0]?.username || 'Chat');
                  return (
                  <button
                    key={chatId}
                    onClick={() => {
                      if (onChatSelect) onChatSelect(chatId);
                      router.push('/chat');
                    }}
                    className={`w-full p-4 text-left transition-colors ${
                      selectedChat === chatId
                        ? actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                        : actualTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 ${actualTheme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} rounded-full flex items-center justify-center text-white font-semibold`}>
                        {chatTitle?.[0]?.toUpperCase() || 'C'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {chatTitle}
                        </p>
                        {chat.last_message && (
                          <p className={`text-xs truncate ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {chat.last_message.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                  );
                })
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {contacts.length === 0 ? (
                <div className={`p-4 text-center ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('noContactsYet')}
                </div>
              ) : (
                contacts.map((contact: any) => {
                  const contactUserId = contact.user?.id ?? contact.user?._id ?? contact.contact?.contact_id;
                  const displayName = contact.user?.username || contact.user?.display_name || contact.user?.phone_number || 'Contact';
                  const displaySub = contact.user?.phone_number || '';
                  return (
                  <div
                    key={contact.contact?.id || contact.id || contact._id}
                    className={`w-full p-4 flex items-center justify-between transition-colors ${
                      actualTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`w-12 h-12 ${actualTheme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} rounded-full flex items-center justify-center text-white font-semibold`}>
                        {displayName?.[0]?.toUpperCase() || displaySub?.[0] || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {displayName}
                        </p>
                        <p className={`text-xs truncate ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {displaySub || (contactUserId ? '' : 'Not in app')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {contactUserId && (
                        <button
                          onClick={() => openChatWithContact(contactUserId)}
                          className={`p-2 ${actualTheme === 'dark' ? 'text-blue-400 hover:bg-gray-600' : 'text-blue-600 hover:bg-blue-50'} rounded transition`}
                          title="Message"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveContact(contact.contact?.id || contact.id || contact._id)}
                        className={`p-2 ${actualTheme === 'dark' ? 'text-red-400 hover:bg-gray-600' : 'text-red-600 hover:bg-red-50'} rounded transition`}
                        title="Remove Contact"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Bottom Navigation - Always Visible */}
        <div className={`p-3 border-t ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-around">
            <Link
              href="/story/create"
              className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition ${
                pathname === '/story/create'
                  ? actualTheme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                  : actualTheme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs">{t('stories')}</span>
            </Link>
            <Link
              href="/explore"
              className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition ${
                pathname === '/explore'
                  ? actualTheme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                  : actualTheme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-xs">{t('explore')}</span>
            </Link>
            <Link
              href="/location"
              className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition ${
                pathname === '/location'
                  ? actualTheme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                  : actualTheme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs">{t('location')}</span>
            </Link>
            <Link
              href={`/profile/${user?.id || user?._id}`}
              className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition ${
                pathname?.startsWith('/profile')
                  ? actualTheme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                  : actualTheme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs">{t('profile')}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewChatModal(false)}>
          <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg w-96 max-h-[80vh] overflow-hidden`} onClick={(e) => e.stopPropagation()}>
            <div className={`p-4 border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
              <h2 className={`text-lg font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{t('newChat')}</h2>
              <button
                onClick={() => setShowNewChatModal(false)}
                className={`${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} hover:opacity-80`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <input
                type="text"
                placeholder={t('searchUserPlaceholder')}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearchUsers(e.target.value);
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  actualTheme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300'
                }`}
                autoFocus
              />
              <div className="mt-4 max-h-96 overflow-y-auto">
                {searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((result) => (
                      <button
                        key={result.id || result._id}
                        onClick={() => openChatWithContact(result.id || result._id)}
                        className={`w-full p-3 text-left rounded-lg transition flex items-center space-x-3 ${
                          actualTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-10 h-10 ${actualTheme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} rounded-full flex items-center justify-center text-white font-semibold`}>
                          {result.username?.[0]?.toUpperCase() || result.phone_number?.[0] || 'U'}
                        </div>
                        <div>
                          <p className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {result.username || result.phone_number}
                          </p>
                          <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {result.phone_number}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <p className={`text-center py-4 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('noUsersFound')}</p>
                ) : (
                  <p className={`text-center py-4 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('startTypingToSearch')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowAddContactModal(false); setAddContactByNumber(false); setNewContactPhone(''); setNewContactName(''); }}>
          <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg w-96 max-h-[80vh] overflow-hidden`} onClick={(e) => e.stopPropagation()}>
            <div className={`p-4 border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
              <h2 className={`text-lg font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{t('addContact')}</h2>
              <button
                onClick={() => { setShowAddContactModal(false); setAddContactByNumber(false); }}
                className={`${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} hover:opacity-80`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setAddContactByNumber(false)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${!addContactByNumber ? (actualTheme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : actualTheme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}
                >
                  {t('searchUser')}
                </button>
                <button
                  type="button"
                  onClick={() => setAddContactByNumber(true)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${addContactByNumber ? (actualTheme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : actualTheme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}
                >
                  {t('numberAndName')}
                </button>
              </div>
              {addContactByNumber ? (
                <form onSubmit={handleAddContactByPhone} className="space-y-3">
                  <input
                    type="tel"
                    placeholder={t('phoneNumberExample')}
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      actualTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                  <input
                    type="text"
                    placeholder={t('contactName')}
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      actualTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={!newContactPhone.trim()}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
                  >
                    {t('addContact')}
                  </button>
                </form>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder={t('searchUserPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      handleSearchUsers(e.target.value);
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      actualTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    autoFocus
                  />
                  <div className="mt-4 max-h-96 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      <div className="space-y-2">
                        {searchResults.map((result) => (
                          <button
                            key={result.id || result._id}
                            onClick={() => handleAddContact(result.id || result._id)}
                            className={`w-full p-3 text-left rounded-lg transition flex items-center space-x-3 ${
                              actualTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className={`w-10 h-10 ${actualTheme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} rounded-full flex items-center justify-center text-white font-semibold`}>
                              {result.username?.[0]?.toUpperCase() || result.phone_number?.[0] || 'U'}
                            </div>
                            <div>
                              <p className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {result.username || result.phone_number}
                              </p>
                              <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {result.phone_number}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : searchQuery ? (
                      <p className={`text-center py-4 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('noUsersFound')}</p>
                    ) : (
                      <p className={`text-center py-4 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('startTypingToSearch')}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat mode: Normal vs Anonymous */}
      {showChatModeModal && pendingChatUserId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowChatModeModal(false); setPendingChatUserId(null); }}>
          <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 w-80 shadow-xl`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-lg font-semibold mb-2 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{t('startChatAs')}</h3>
            <p className={`text-sm mb-4 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('startChatDescription')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleCreateChatWithMode(false)}
                className={`flex-1 py-3 rounded-xl font-medium ${actualTheme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
              >
                {t('normal')}
              </button>
              <button
                onClick={() => handleCreateChatWithMode(true)}
                className="flex-1 py-3 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white"
              >
                {t('anonymous')}
              </button>
            </div>
            <button
              onClick={() => { setShowChatModeModal(false); setPendingChatUserId(null); }}
              className={`mt-3 w-full py-2 text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Change profile photo modal */}
      {showChangePhotoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowChangePhotoModal(false)}>
          <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 w-80 shadow-xl`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-lg font-semibold mb-4 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{t('changeProfilePhoto')}</h3>
            <label className={`block w-full py-3 px-4 rounded-xl border-2 border-dashed cursor-pointer text-center text-sm ${actualTheme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
                disabled={uploadingPhoto}
              />
              {uploadingPhoto ? t('uploading') : t('chooseImage')}
            </label>
            <button
              type="button"
              onClick={() => setShowChangePhotoModal(false)}
              className={`mt-3 w-full py-2 text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* New proposal modal */}
      {showNewProposalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowNewProposalModal(false); setProposalTargetUser(null); setProposalContent(''); setProposalSearchQuery(''); setProposalSearchResults([]); }}>
          <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-xl w-96 max-h-[90vh] overflow-hidden flex flex-col`} onClick={(e) => e.stopPropagation()}>
            <div className={`p-4 border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
              <h3 className={`text-lg font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{t('proposalModalTitle')}</h3>
              <button
                type="button"
                onClick={() => { setShowNewProposalModal(false); setProposalTargetUser(null); setProposalContent(''); }}
                className={`${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} hover:opacity-80`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {!proposalTargetUser ? (
                <>
                  <p className={`text-sm mb-2 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{t('sendToWhom')}</p>
                  <input
                    type="text"
                    placeholder={t('searchUserPlaceholder')}
                    value={proposalSearchQuery}
                    onChange={(e) => handleProposalSearch(e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg text-sm ${actualTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'}`}
                  />
                  <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                    {proposalSearchResults.map((u: any) => (
                      <button
                        key={u.id || u._id}
                        type="button"
                        onClick={() => setProposalTargetUser(u)}
                        className={`w-full p-3 text-left rounded-lg flex items-center gap-3 ${actualTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                      >
                        <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${actualTheme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
                          {u.username?.[0]?.toUpperCase() || u.phone_number?.[0] || '?'}
                        </span>
                        <div>
                          <p className={`font-medium text-sm ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{u.username || u.phone_number}</p>
                          {u.phone_number && <p className={`text-xs ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{u.phone_number}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className={`flex items-center gap-3 p-2 rounded-lg mb-4 ${actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${actualTheme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
                      {proposalTargetUser.username?.[0]?.toUpperCase() || proposalTargetUser.phone_number?.[0] || '?'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{proposalTargetUser.username || proposalTargetUser.phone_number}</p>
                    </div>
                    <button type="button" onClick={() => setProposalTargetUser(null)} className={`text-xs ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('changeRecipient')}</button>
                  </div>
                  <label className={`block text-sm font-medium mb-2 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{t('yourMessage')}</label>
                  <textarea
                    value={proposalContent}
                    onChange={(e) => setProposalContent(e.target.value)}
                    placeholder={t('exampleProposalMessage')}
                    rows={4}
                    className={`w-full px-4 py-2 border rounded-lg text-sm resize-none ${actualTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'}`}
                  />
                  <label className={`flex items-center gap-2 mt-3 cursor-pointer ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <input type="checkbox" checked={proposalChatAnonymous} onChange={(e) => setProposalChatAnonymous(e.target.checked)} className="rounded" />
                    <span className="text-sm">{t('anonymousChatIfAccepted')}</span>
                  </label>
                </>
              )}
            </div>
            {proposalTargetUser && (
              <div className={`p-4 border-t ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <button
                  type="button"
                  onClick={handleSendNewProposal}
                  disabled={sendingProposal || !proposalContent.trim()}
                  className="w-full py-3 rounded-xl font-medium bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingProposal ? t('sendingProposal') : t('sendProposal')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

