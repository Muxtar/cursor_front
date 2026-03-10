'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { chatApi, contactApi, userApi, fileApi, proposalApi, profileCommentApi, notificationsApi, type ProfileCommentTargetType } from '@/lib/api';
import BottomNav from '@/components/BottomNav';

interface SidebarProps {
  onChatSelect?: (chatId: string | null) => void;
  selectedChat?: string | null;
  /** When true, sidebar is shown as overlay on mobile */
  mobileOpen?: boolean;
  /** Callback to close sidebar (e.g. when used as mobile overlay) */
  onClose?: () => void;
}

export default function Sidebar({ onChatSelect, selectedChat, mobileOpen, onClose }: SidebarProps) {
  const { user, logout, updateUser } = useAuth();
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
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts' | 'requests'>('chats');
  const [incomingProposals, setIncomingProposals] = useState<any[]>([]);
  const [sentProposals, setSentProposals] = useState<any[]>([]);
  const [acceptingProposalId, setAcceptingProposalId] = useState<string | null>(null);
  const [proposalSubTab, setProposalSubTab] = useState<'incoming' | 'sent'>('incoming');
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProposalsDropdown, setShowProposalsDropdown] = useState(false);
  const [incomingProposalsCount, setIncomingProposalsCount] = useState(0);
  const [lastProposalsCountFetch, setLastProposalsCountFetch] = useState(0);
  const [commentNotifCount, setCommentNotifCount] = useState(0);
  // contact user_id → comment count (lazy, loaded when contacts tab opens)
  const [contactCommentCounts, setContactCommentCounts] = useState<Record<string, number>>({});
  const [showChangePhotoModal, setShowChangePhotoModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showNewProposalModal, setShowNewProposalModal] = useState(false);
  const [proposalSearchQuery, setProposalSearchQuery] = useState('');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentTargetUserId, setCommentTargetUserId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [showLeaveCommentModal, setShowLeaveCommentModal] = useState(false);
  const [leaveCommentTargetType, setLeaveCommentTargetType] = useState<ProfileCommentTargetType>('phone');
  const [leaveCommentTargetValue, setLeaveCommentTargetValue] = useState('');
  const [leaveCommentText, setLeaveCommentText] = useState('');
  const [sendingLeaveComment, setSendingLeaveComment] = useState(false);
  const [showProposalFromContactModal, setShowProposalFromContactModal] = useState(false);
  const [proposalTargetUserId, setProposalTargetUserId] = useState<string | null>(null);
  const [proposalSearchResults, setProposalSearchResults] = useState<any[]>([]);
  const [proposalTargetUser, setProposalTargetUser] = useState<any>(null);
  const [proposalContent, setProposalContent] = useState('');
  const [proposalChatAnonymous, setProposalChatAnonymous] = useState(false);
  const [sendingProposal, setSendingProposal] = useState(false);
  // Grup / sohbet özel durumları
  const [mutedChatIds, setMutedChatIds] = useState<Set<string>>(new Set());
  const [archivedChatIds, setArchivedChatIds] = useState<Set<string>>(new Set());
  const [blockedChatIds, setBlockedChatIds] = useState<Set<string>>(new Set());
  const [pinnedChatIds, setPinnedChatIds] = useState<Set<string>>(new Set());
  const [favoriteChatIds, setFavoriteChatIds] = useState<Set<string>>(new Set());
  const [contextChat, setContextChat] = useState<any | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const proposalsDropdownRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTouchRef = useRef<{ clientX: number; clientY: number; chat: any } | null>(null);
  const justDidLongPressRef = useRef(false);

  useEffect(() => {
    if (user) {
      loadContacts();
      loadChats();
      loadProposalsCount();
      loadOnlineUsers();
      // Kullanıcı bazlı mute / archive / block durumlarını yükle
      if (typeof window !== 'undefined') {
        try {
          const muted = JSON.parse(localStorage.getItem('chat_muted') || '[]');
          const archived = JSON.parse(localStorage.getItem('chat_archived') || '[]');
          const blocked = JSON.parse(localStorage.getItem('chat_blocked') || '[]');
          const pinned = JSON.parse(localStorage.getItem('chat_pinned') || '[]');
          const favorites = JSON.parse(localStorage.getItem('chat_favorites') || '[]');
          setMutedChatIds(new Set((muted || []).map((id: any) => String(id))));
          setArchivedChatIds(new Set((archived || []).map((id: any) => String(id))));
          setBlockedChatIds(new Set((blocked || []).map((id: any) => String(id))));
          setPinnedChatIds(new Set((pinned || []).map((id: any) => String(id))));
          setFavoriteChatIds(new Set((favorites || []).map((id: any) => String(id))));
        } catch {
          setMutedChatIds(new Set());
          setArchivedChatIds(new Set());
          setBlockedChatIds(new Set());
          setPinnedChatIds(new Set());
          setFavoriteChatIds(new Set());
        }
      }
      loadCommentNotifCount();
      // Refresh online status every 10 seconds; refresh comment notif count every 30s
      const interval = setInterval(() => {
        loadOnlineUsers();
      }, 10000);
      const notifInterval = setInterval(() => {
        loadCommentNotifCount();
      }, 30000);
      return () => { clearInterval(interval); clearInterval(notifInterval); };
    }
  }, [user]);

  const loadCommentNotifCount = async () => {
    try {
      const data: any = await notificationsApi.unreadCount();
      setCommentNotifCount(data?.unread_count || 0);
    } catch { /* silent */ }
  };

  const loadContactCommentCounts = async (contactList: any[]) => {
    const phonesToCheck = contactList
      .map((c: any) => c.user?.phone_number)
      .filter(Boolean);
    if (phonesToCheck.length === 0) return;
    const counts: Record<string, number> = {};
    await Promise.allSettled(
      phonesToCheck.map(async (phone: string) => {
        try {
          const data: any = await profileCommentApi.search(phone);
          const arr = Array.isArray(data) ? data : [];
          if (arr.length > 0) counts[phone] = arr.length;
        } catch { /* silent */ }
      })
    );
    setContactCommentCounts(prev => ({ ...prev, ...counts }));
  };

  const loadOnlineUsers = async () => {
    try {
      const data: any = await userApi.getOnlineUsers();
      const onlineList = data?.online_users || [];
      setOnlineUsers(new Set(onlineList));
    } catch (error) {
      console.error('Failed to load online users:', error);
    }
  };

  useEffect(() => {
    if (user && activeTab === 'requests') {
      loadIncomingProposals();
      loadSentProposals();
    }
  }, [user, activeTab]);

  const myId = user?.id || (user as any)?._id;

  // Random isim generator (anonymous teklifler için)
  const generateRandomName = (seed: string): string => {
    const adjectives = ['Cool', 'Mysterious', 'Bright', 'Swift', 'Calm', 'Bold', 'Wise', 'Gentle', 'Brave', 'Clever'];
    const nouns = ['Tiger', 'Eagle', 'Wolf', 'Phoenix', 'Dragon', 'Lion', 'Falcon', 'Bear', 'Fox', 'Hawk'];
    // Seed'den hash oluştur
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const adjIndex = Math.abs(hash) % adjectives.length;
    const nounIndex = Math.abs(hash >> 8) % nouns.length;
    return `${adjectives[adjIndex]} ${nouns[nounIndex]}`;
  };

  const loadProposalsCount = async () => {
    // Throttle to avoid spamming the API on every small interaction
    const now = Date.now();
    if (now - lastProposalsCountFetch < 5000) {
      return;
    }
    setLastProposalsCountFetch(now);
    try {
      const data: any = await proposalApi.getProposals();
      const list = Array.isArray(data) ? data : data?.proposals ?? data?.data ?? [];
      const received = list.filter(
        (p: any) =>
          String(p.receiver_id || p.receiver?._id || p.receiver) === String(myId) &&
          (p.status === 'pending' || !p.status),
      );
      setIncomingProposalsCount(received.length);
    } catch {
      setIncomingProposalsCount(0);
    }
  };

  const loadIncomingProposals = async () => {
    if (!myId) return;
    try {
      const data: any = await proposalApi.getProposals();
      const list = Array.isArray(data) ? data : data?.proposals ?? data?.data ?? [];
      const received = list.filter((p: any) => String(p.receiver_id || p.receiver?._id || p.receiver) === String(myId) && (p.status === 'pending' || !p.status));
      setIncomingProposals(received);
    } catch {
      setIncomingProposals([]);
    }
  };

  const formatChatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const loadSentProposals = async () => {
    if (!myId) return;
    try {
      const data: any = await proposalApi.getProposals();
      const list = Array.isArray(data) ? data : data?.proposals ?? data?.data ?? [];
      const sent = list.filter((p: any) => String(p.sender_id || p.sender?._id || p.sender) === String(myId));
      setSentProposals(sent);
    } catch {
      setSentProposals([]);
    }
  };

  const handleAcceptProposal = async (proposalId: string) => {
    setAcceptingProposalId(proposalId);
    try {
      const res: any = await proposalApi.acceptProposal(proposalId);
      const chatId = res?.chat_id ?? res?.data?.chat_id;
      setIncomingProposals((prev) => prev.filter((p: any) => String(p.id || p._id) !== String(proposalId)));
      loadProposalsCount();
      if (chatId && onChatSelect) {
        onChatSelect(chatId);
        router.push('/chat');
      }
    } catch (e) {
      console.error('Accept proposal failed:', e);
    } finally {
      setAcceptingProposalId(null);
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    try {
      await proposalApi.rejectProposal(proposalId);
      setIncomingProposals((prev) => prev.filter((p: any) => String(p.id || p._id) !== String(proposalId)));
      loadProposalsCount();
    } catch (e) {
      console.error('Reject proposal failed:', e);
    }
  };

  /** Proposal ID'yi her türlü formattan (id, _id, $oid) çıkarıp 24 karakterlik hex string'e normalize eder. */
  const normalizeProposalId = (raw: unknown): string => {
    if (raw == null) return '';
    let hex = '';
    if (typeof raw === 'string') {
      hex = raw.trim().replace(/[^a-fA-F0-9]/g, '').slice(0, 24).toLowerCase();
    } else if (typeof raw === 'object' && raw !== null) {
      const o = raw as Record<string, unknown>;
      const oid = (o.$oid ?? o.oid) as string | undefined;
      if (typeof oid === 'string') hex = oid.trim().replace(/[^a-fA-F0-9]/g, '').slice(0, 24).toLowerCase();
    }
    return hex || String(raw).trim();
  };

  const getProposalId = (p: any): string => {
    const raw = p?.id ?? p?._id;
    const normalized = normalizeProposalId(raw);
    if (normalized) return normalized;
    if (typeof raw === 'string') return raw.trim();
    if (raw && typeof raw === 'object' && (raw as any).$oid) return (raw as any).$oid;
    return String(raw ?? '');
  };

  const handleDeleteProposal = async (proposalId: unknown) => {
    const id = normalizeProposalId(
      typeof proposalId === 'string' ? proposalId : (proposalId as any)?.id ?? (proposalId as any)?._id ?? proposalId
    ) || getProposalId({ id: proposalId, _id: proposalId });
    if (!id || id.length < 12) {
      alert(t('deleteProposalError'));
      return;
    }
    if (!confirm(t('deleteProposalConfirm'))) return;
    try {
      await proposalApi.deleteProposal(id);
      setIncomingProposals((prev) => prev.filter((p: any) => getProposalId(p) !== id));
      setSentProposals((prev) => prev.filter((p: any) => getProposalId(p) !== id));
      loadProposalsCount();
    } catch (e: any) {
      console.error('Delete proposal failed:', e);
      const msg = e?.message || t('deleteProposalError');
      alert(msg);
    }
  };

  const persistChatPrefs = (nextMuted: Set<string>, nextArchived: Set<string>, nextBlocked: Set<string>, nextPinned?: Set<string>, nextFavorites?: Set<string>) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('chat_muted', JSON.stringify(Array.from(nextMuted)));
    localStorage.setItem('chat_archived', JSON.stringify(Array.from(nextArchived)));
    localStorage.setItem('chat_blocked', JSON.stringify(Array.from(nextBlocked)));
    if (nextPinned) localStorage.setItem('chat_pinned', JSON.stringify(Array.from(nextPinned)));
    if (nextFavorites) localStorage.setItem('chat_favorites', JSON.stringify(Array.from(nextFavorites)));
  };

  const toggleMuteChat = (chatId: string) => {
    setMutedChatIds((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) {
        next.delete(chatId);
      } else {
        next.add(chatId);
      }
      persistChatPrefs(next, archivedChatIds, blockedChatIds, pinnedChatIds, favoriteChatIds);
      return next;
    });
  };

  const toggleArchiveChat = (chatId: string) => {
    setArchivedChatIds((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) {
        next.delete(chatId);
      } else {
        next.add(chatId);
      }
      persistChatPrefs(mutedChatIds, next, blockedChatIds, pinnedChatIds, favoriteChatIds);
      return next;
    });
  };

  const toggleBlockChat = (chatId: string) => {
    setBlockedChatIds((prev) => {
      const next = new Set(prev);
      const id = String(chatId);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      // Bloklanan grupları otomatik olarak sessize al ve arşivle
      const mutedNext = new Set(mutedChatIds);
      const archivedNext = new Set(archivedChatIds);
      if (next.has(id)) {
        mutedNext.add(id);
        archivedNext.add(id);
      } else {
        mutedNext.delete(id);
        archivedNext.delete(id);
      }
      setMutedChatIds(mutedNext);
      setArchivedChatIds(archivedNext);
      persistChatPrefs(mutedNext, archivedNext, next, pinnedChatIds, favoriteChatIds);
      return next;
    });
  };

  const togglePinChat = (chatId: string) => {
    setPinnedChatIds((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) {
        next.delete(chatId);
      } else {
        next.add(chatId);
      }
      persistChatPrefs(mutedChatIds, archivedChatIds, blockedChatIds, next, favoriteChatIds);
      return next;
    });
  };

  const toggleFavoriteChat = (chatId: string) => {
    setFavoriteChatIds((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) {
        next.delete(chatId);
      } else {
        next.add(chatId);
      }
      persistChatPrefs(mutedChatIds, archivedChatIds, blockedChatIds, pinnedChatIds, next);
      return next;
    });
  };

  const handleOpenContextMenuAt = (clientX: number, clientY: number, chat: any) => {
    setContextChat(chat);
    setContextMenuPos({ x: clientX, y: clientY });
  };

  const handleOpenContextMenu = (e: React.MouseEvent, chat: any) => {
    e.preventDefault();
    handleOpenContextMenuAt(e.clientX, e.clientY, chat);
  };

  const LONG_PRESS_MS = 500;

  const handleChatRowTouchStart = (e: React.TouchEvent, chat: any) => {
    const touch = e.touches[0];
    if (!touch) return;
    longPressTouchRef.current = { clientX: touch.clientX, clientY: touch.clientY, chat };
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      const t = longPressTouchRef.current;
      longPressTouchRef.current = null;
      if (t) {
        handleOpenContextMenuAt(t.clientX, t.clientY, t.chat);
        justDidLongPressRef.current = true;
        setTimeout(() => { justDidLongPressRef.current = false; }, 300);
      }
    }, LONG_PRESS_MS);
  };

  const handleChatRowTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressTouchRef.current = null;
  };

  const handleChatRowTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressTouchRef.current = null;
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
      // Sağ tık menüsünü kapat (menü dışına sol tık yapıldığında)
      if (contextMenuPos && !target.closest('.chat-context-menu') && !target.closest('[oncontextmenu]')) {
        setContextChat(null);
        setContextMenuPos(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenuPos]);

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

  const openChatWithContact = async (userId: string) => {
    if (!user) return;
    
    const currentUserId = String(user.id || user._id);
    const targetUserId = String(userId);
    
    // Mevcut chat'leri kontrol et
    const existingChats = chats.filter((chat: any) => {
      if (chat.type !== 'direct') return false;
      if (!Array.isArray(chat.members)) return false;
      
      const memberIds = chat.members.map((m: any) => String(m.id || m._id || m));
      return memberIds.includes(currentUserId) && memberIds.includes(targetUserId) && memberIds.length === 2;
    });
    
    // Normal chat var mı kontrol et (anonymous değil)
    const normalChat = existingChats.find((chat: any) => !chat.other_party_anonymous);
    // Anonim chat var mı kontrol et
    const anonymousChat = existingChats.find((chat: any) => chat.other_party_anonymous);
    
    // Eğer normal chat varsa ve normal seçilirse, o chat'e git
    // Eğer anonim chat varsa ve anonim seçilirse, o chat'e git
    // Diğer durumlarda modal göster
    
    setPendingChatUserId(userId);
    
    // Eğer sadece normal chat varsa, direkt o chat'e git
    if (normalChat && !anonymousChat) {
      const chatId = String(normalChat.id || normalChat._id);
      if (onChatSelect) onChatSelect(chatId);
      router.push('/chat');
      return;
    }
    
    // Eğer sadece anonim chat varsa, modal göster (kullanıcı normal seçebilir)
    // Eğer her ikisi de varsa veya hiçbiri yoksa, modal göster
    setShowChatModeModal(true);
  };

  const handleCreateChatWithMode = async (isAnonymous: boolean) => {
    if (!pendingChatUserId || !user) return;
    
    const currentUserId = String(user.id || user._id);
    const targetUserId = String(pendingChatUserId);
    
    // Mevcut chat'leri tekrar kontrol et
    const existingChats = chats.filter((chat: any) => {
      if (chat.type !== 'direct') return false;
      if (!Array.isArray(chat.members)) return false;
      
      const memberIds = chat.members.map((m: any) => String(m.id || m._id || m));
      return memberIds.includes(currentUserId) && memberIds.includes(targetUserId) && memberIds.length === 2;
    });
    
    // Normal chat var mı kontrol et
    const normalChat = existingChats.find((chat: any) => !chat.other_party_anonymous);
    // Anonim chat var mı kontrol et
    const anonymousChat = existingChats.find((chat: any) => chat.other_party_anonymous);
    
    // Eğer normal chat varsa ve normal seçilirse, o chat'e git
    if (!isAnonymous && normalChat) {
      const chatId = String(normalChat.id || normalChat._id);
      setShowChatModeModal(false);
      setPendingChatUserId(null);
      if (onChatSelect) onChatSelect(chatId);
      loadChats();
      router.push('/chat');
      return;
    }
    
    // Eğer anonim chat varsa ve anonim seçilirse, o chat'e git
    if (isAnonymous && anonymousChat) {
      const chatId = String(anonymousChat.id || anonymousChat._id);
      setShowChatModeModal(false);
      setPendingChatUserId(null);
      if (onChatSelect) onChatSelect(chatId);
      loadChats();
      router.push('/chat');
      return;
    }
    
    // Yeni chat oluştur
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

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentTargetUserId || !commentText.trim()) return;
    try {
      setSendingComment(true);
      await profileCommentApi.create(commentTargetUserId, commentText.trim());
      alert(t('leaveCommentSuccess'));
      setShowCommentModal(false);
      setCommentText('');
      setCommentTargetUserId(null);
    } catch (error: any) {
      alert(t('leaveCommentError') + ': ' + (error?.message || ''));
    } finally {
      setSendingComment(false);
    }
  };

  const handleLeaveCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = leaveCommentTargetValue.trim();
    const txt = leaveCommentText.trim();
    if (!val || !txt) return;
    try {
      setSendingLeaveComment(true);
      await profileCommentApi.createWithTarget(leaveCommentTargetType, val, txt);
      alert(leaveCommentTargetType === 'phone' ? t('leaveCommentSuccess') : t('leaveCommentSuccessSearchOnly'));
      setShowLeaveCommentModal(false);
      setLeaveCommentTargetValue('');
      setLeaveCommentText('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(t('leaveCommentError') + ': ' + msg);
    } finally {
      setSendingLeaveComment(false);
    }
  };

  const handleSendProposalFromContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalTargetUserId) return;
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const title = formData.get('title') as string || 'New Proposal';
      const content = formData.get('content') as string || '';
      const chatAnonymous = formData.get('chat_anonymous') === 'true';
      
      await proposalApi.createProposal({
        receiver_id: proposalTargetUserId,
        title: title,
        content: content,
        chat_anonymous: chatAnonymous,
      });
      alert('Proposal sent successfully');
      setShowProposalFromContactModal(false);
      setProposalTargetUserId(null);
      loadProposalsCount();
    } catch (error: any) {
      alert('Failed to send proposal: ' + (error?.message || ''));
    }
  };

  const handleLogout = () => {
    if (confirm(t('logout') + '?')) {
      logout();
      router.push('/login');
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await chatApi.deleteChat(chatId);
      loadChats();
      if (selectedChat === chatId) {
        if (onChatSelect) onChatSelect(null);
      }
    } catch (error: any) {
      console.error('Failed to delete chat:', error);
      alert(t('sendFailed') + ': ' + (error?.message || ''));
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
        await updateUser({ avatar: avatarUrl });
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
      <div className={`w-full md:w-[420px] ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-r ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex flex-col shadow-sm h-dvh md:h-full min-h-0 max-h-dvh overflow-hidden`} style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Header - sabit, scroll olmaz */}
        <div className={`flex-shrink-0 ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-3 md:p-4 border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Mobile: close button when sidebar is overlay */}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="md:hidden flex-shrink-0 p-2 -ml-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <div className="flex items-center space-x-3 relative min-w-0 flex-1" ref={profileMenuRef}>
              <div className="relative">
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
                {onlineUsers.has(String(user?.id || user?._id)) && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                )}
              </div>
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
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
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
                    <button
                      onClick={() => {
                        setActiveTab('chats');
                        setShowMenuDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm ${actualTheme === 'dark' ? 'text-white hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'} transition flex items-center space-x-3 ${
                        activeTab === 'chats' ? actualTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-100' : ''
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>{t('chats')}</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('contacts');
                        setShowMenuDropdown(false);
                        loadContactCommentCounts(contacts);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm ${actualTheme === 'dark' ? 'text-white hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'} transition flex items-center space-x-3 border-t ${actualTheme === 'dark' ? 'border-gray-600' : 'border-gray-200'} ${
                        activeTab === 'contacts' ? actualTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-100' : ''
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>{t('contactsTab')}</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('requests');
                        setShowMenuDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm ${actualTheme === 'dark' ? 'text-white hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'} transition flex items-center space-x-3 border-t ${actualTheme === 'dark' ? 'border-gray-600' : 'border-gray-200'} relative ${
                        activeTab === 'requests' ? actualTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-100' : ''
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <span>{t('requestsTab')}</span>
                      {incomingProposalsCount > 0 && (
                        <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                          {incomingProposalsCount > 99 ? '99+' : incomingProposalsCount}
                        </span>
                      )}
                    </button>
                    <Link
                      href="/settings"
                      onClick={() => setShowMenuDropdown(false)}
                      className={`block px-4 py-3 text-sm ${actualTheme === 'dark' ? 'text-white hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'} transition border-t ${actualTheme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}
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
                      type="button"
                      onClick={() => { setShowMenuDropdown(false); setShowLeaveCommentModal(true); }}
                      className={`block w-full text-left px-4 py-3 text-sm ${actualTheme === 'dark' ? 'text-white hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'} transition border-t ${actualTheme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}
                    >
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>{t('leaveCommentForNumber')}</span>
                      </div>
                    </button>
                    <Link
                      href="/comments"
                      onClick={() => { setShowMenuDropdown(false); setCommentNotifCount(0); }}
                      className={`block px-4 py-3 text-sm ${actualTheme === 'dark' ? 'text-white hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'} transition border-t ${actualTheme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span>{t('commentsByPhone')}</span>
                        </div>
                        {commentNotifCount > 0 && (
                          <span className="min-w-[20px] h-5 flex items-center justify-center text-[11px] font-bold bg-red-500 text-white rounded-full px-1.5">
                            {commentNotifCount > 99 ? '99+' : commentNotifCount}
                          </span>
                        )}
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

          {/* Tabs removed - moved to menu dropdown */}
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
              className={`w-full pl-10 pr-4 py-2 text-sm md:text-base ${actualTheme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white'} rounded-lg border ${actualTheme === 'dark' ? 'border-gray-600' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Content - yalnız bu hissə scroll olur */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          {searchQuery && searchResults.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {searchResults.map((result) => {
                const resultUserId = result.id || result._id;
                const isOnline = resultUserId ? onlineUsers.has(String(resultUserId)) : false;
                return (
                <button
                  key={result.id || result._id}
                  onClick={() => openChatWithContact(result.id || result._id)}
                  className={`w-full p-3 md:p-4 text-left transition-colors active:bg-gray-200 dark:active:bg-gray-600 ${
                    actualTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <div className="relative flex-shrink-0">
                      {result.avatar ? (
                        <img
                          src={result.avatar}
                          alt={result.username || result.phone_number}
                          className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className={`w-10 h-10 md:w-12 md:h-12 ${actualTheme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} rounded-full flex items-center justify-center text-white font-semibold text-sm md:text-base`}>
                          {result.username?.[0]?.toUpperCase() || result.phone_number?.[0] || 'U'}
                        </div>
                      )}
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 md:w-3.5 md:h-3.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm md:text-base font-medium truncate ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {result.username || result.phone_number}
                      </p>
                      <p className={`text-xs truncate ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {result.phone_number}
                      </p>
                    </div>
                  </div>
                </button>
                );
              })}
            </div>
          ) : activeTab === 'requests' ? (
            <div>
              {/* Sub-tabs for Incoming/Sent */}
              <div className={`flex border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <button
                  onClick={() => setProposalSubTab('incoming')}
                  className={`flex-1 py-2 text-center text-sm font-medium transition ${
                    proposalSubTab === 'incoming'
                      ? actualTheme === 'dark' ? 'bg-gray-700 text-white border-b-2 border-green-500' : 'bg-gray-100 text-gray-800 border-b-2 border-green-500'
                      : actualTheme === 'dark' ? 'text-gray-400 hover:bg-gray-700/50' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t('incomingRequests')}
                  {incomingProposals.length > 0 && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${actualTheme === 'dark' ? 'bg-green-600 text-white' : 'bg-green-500 text-white'}`}>
                      {incomingProposals.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setProposalSubTab('sent')}
                  className={`flex-1 py-2 text-center text-sm font-medium transition ${
                    proposalSubTab === 'sent'
                      ? actualTheme === 'dark' ? 'bg-gray-700 text-white border-b-2 border-green-500' : 'bg-gray-100 text-gray-800 border-b-2 border-green-500'
                      : actualTheme === 'dark' ? 'text-gray-400 hover:bg-gray-700/50' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t('sentRequests')}
                </button>
              </div>

              {/* Incoming Proposals */}
              {proposalSubTab === 'incoming' && (
                <div className="p-2 space-y-3">
                  {incomingProposals.length === 0 ? (
                    <div className={`p-8 text-center ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p>{t('noRequestsYet')}</p>
                    </div>
                  ) : (
                    incomingProposals.map((p: any, index: number) => {
                      const pid = getProposalId(p);
                      const colors = [
                        { bg: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20', border: 'border-blue-200 dark:border-blue-800', accent: 'text-blue-600 dark:text-blue-400' },
                        { bg: 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20', border: 'border-purple-200 dark:border-purple-800', accent: 'text-purple-600 dark:text-purple-400' },
                        { bg: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20', border: 'border-green-200 dark:border-green-800', accent: 'text-green-600 dark:text-green-400' },
                        { bg: 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20', border: 'border-orange-200 dark:border-orange-800', accent: 'text-orange-600 dark:text-orange-400' },
                        { bg: 'bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20', border: 'border-cyan-200 dark:border-cyan-800', accent: 'text-cyan-600 dark:text-cyan-400' },
                      ];
                      const colorScheme = colors[index % colors.length];
                      return (
                        <div
                          key={pid}
                          className={`${colorScheme.bg} ${colorScheme.border} border-2 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-[1.02]`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`w-2 h-2 rounded-full ${colorScheme.accent.replace('text-', 'bg-')}`}></div>
                                <p className={`font-semibold text-base ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  {p.title || t('newProposal')}
                                </p>
                              </div>
                              <p className={`mt-2 text-sm ${actualTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'} leading-relaxed`}>
                                {p.content}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <p className={`text-xs ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              {new Date(p.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleAcceptProposal(pid)}
                                disabled={acceptingProposalId === pid}
                                className="px-4 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 transition flex items-center gap-1.5 text-sm font-medium shadow-sm"
                                title={t('accept')}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {t('accept')}
                              </button>
                              <button
                                onClick={() => handleRejectProposal(pid)}
                                className="px-4 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition flex items-center gap-1.5 text-sm font-medium shadow-sm"
                                title={t('reject')}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                {t('reject')}
                              </button>
                              <button
                                onClick={() => handleDeleteProposal(pid)}
                                className="p-1.5 rounded-lg bg-gray-400 text-white hover:bg-gray-500 transition"
                                title={t('deleteProposal')}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Sent Proposals */}
              {proposalSubTab === 'sent' && (
                <div className="p-2 space-y-3">
                  {sentProposals.length === 0 ? (
                    <div className={`p-8 text-center ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <p>{t('noSentRequestsYet')}</p>
                    </div>
                  ) : (
                    sentProposals.map((p: any, index: number) => {
                      const pid = getProposalId(p);
                      const colors = [
                        { bg: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20', border: 'border-blue-200 dark:border-blue-800', accent: 'text-blue-600 dark:text-blue-400' },
                        { bg: 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20', border: 'border-purple-200 dark:border-purple-800', accent: 'text-purple-600 dark:text-purple-400' },
                        { bg: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20', border: 'border-green-200 dark:border-green-800', accent: 'text-green-600 dark:text-green-400' },
                        { bg: 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20', border: 'border-orange-200 dark:border-orange-800', accent: 'text-orange-600 dark:text-orange-400' },
                        { bg: 'bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20', border: 'border-cyan-200 dark:border-cyan-800', accent: 'text-cyan-600 dark:text-cyan-400' },
                      ];
                      const colorScheme = colors[index % colors.length];
                      return (
                        <div
                          key={pid}
                          className={`${colorScheme.bg} ${colorScheme.border} border-2 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-[1.02]`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`w-2 h-2 rounded-full ${colorScheme.accent.replace('text-', 'bg-')}`}></div>
                                <p className={`font-semibold text-base ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  {p.title || t('newProposal')}
                                </p>
                              </div>
                              <p className={`mt-2 text-sm ${actualTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'} leading-relaxed`}>
                                {p.content}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                p.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                p.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                              }`}>
                                {p.status === 'accepted' ? '✓ ' + (p.status || 'pending') :
                                 p.status === 'rejected' ? '✕ ' + (p.status || 'pending') :
                                 '⏳ ' + (p.status || 'pending')}
                              </span>
                              <p className={`text-xs ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {new Date(p.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteProposal(pid)}
                              className="px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition flex items-center gap-1.5 text-sm font-medium shadow-sm"
                              title={t('deleteProposal')}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              {t('delete')}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ) : activeTab === 'chats' ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700 relative">
              {chats.length === 0 ? (
                <div className={`p-4 text-center ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('noChatsYet')}
                </div>
              ) : (
                <>
                  {(() => {
                    // Pin'lenmiş chat'leri önce göster, sonra diğerleri
                    const sortedChats = [...chats].sort((a, b) => {
                      const aId = String(a.id || a._id);
                      const bId = String(b.id || b._id);
                      const aPinned = pinnedChatIds.has(aId);
                      const bPinned = pinnedChatIds.has(bId);
                      if (aPinned && !bPinned) return -1;
                      if (!aPinned && bPinned) return 1;
                      return 0;
                    });

                    return sortedChats.map((chat) => {
                      const chatId = chat.id || chat._id;
                      const isAnonymous = chat.other_party_anonymous === true;
                      
                      // Chat ismini düzelt: Direct chat'lerde contact ismini kullan, grup'larda sadece grup adı (chats prefix'i yok)
                      let chatTitle: string;
                      let chatAvatar: string | null = null;
                      
                      if (chat.type === 'group') {
                        // Grup ismini direkt göster, "chats" prefix'i ekleme
                        chatTitle = chat.group_name || 'Group';
                        // Grup için avatar yoksa grup icon'u göster
                      } else {
                        // Direct chat: contact listesinden bul
                        // Members array'inde ObjectID'ler var, bunları string'e çevirip karşılaştır
                        const otherMemberIdObj = Array.isArray(chat.members) ? chat.members.find((m: any) => {
                          const memberId = String(m.id || m._id || m);
                          return memberId !== String(user?.id || user?._id);
                        }) : null;
                        
                        const otherMemberIdStr = otherMemberIdObj ? String(otherMemberIdObj.id || otherMemberIdObj._id || otherMemberIdObj) : null;
                        
                        if (otherMemberIdStr) {
                          // Contact listesinde ara
                          const contact = contacts.find((c: any) => {
                            const contactUserId = c.user?.id || c.user?._id || c.contact?.contact_id;
                            return contactUserId && String(contactUserId) === otherMemberIdStr;
                          });
                          
                          if (contact) {
                            chatTitle = contact.user?.username || contact.user?.display_name || contact.user?.phone_number || 'Contact';
                            chatAvatar = contact.user?.avatar || null;
                          } else {
                            // Contact listesinde yoksa
                            if (isAnonymous && chat.group_name) {
                              // Anonymous tekliften gelen chat - random isim göster
                              chatTitle = generateRandomName(String(chatId));
                            } else {
                              // GroupName varsa onu kullan (proposal'dan gelen chat)
                              chatTitle = chat.group_name || (isAnonymous ? generateRandomName(String(chatId)) : 'Unknown');
                            }
                          }
                        } else {
                          // GroupName varsa (proposal'dan gelen chat), onu kullan
                          chatTitle = chat.group_name || (isAnonymous ? t('anonymous') : 'Unknown');
                        }
                      }
                      
                      const isMuted = mutedChatIds.has(String(chatId));
                      const isArchived = archivedChatIds.has(String(chatId));
                      const isBlocked = blockedChatIds.has(String(chatId));
                      const isPinned = pinnedChatIds.has(String(chatId));
                      const isFavorite = favoriteChatIds.has(String(chatId));
                      
                      // Get other member's ID for online status (for direct chats)
                      const otherMemberId = chat.type === 'direct' && chat.members ?
                        chat.members.find((m: any) => String(m.id || m._id || m) !== String(user?.id || user?._id)) : null;
                      const isOtherMemberOnline = otherMemberId ? onlineUsers.has(String(otherMemberId)) : false;
                      
                      // Grup için online üye sayısını hesapla
                      let groupOnlineCount = 0;
                      let lastMessageSenderName = '';
                      if (chat.type === 'group' && Array.isArray(chat.members)) {
                        groupOnlineCount = chat.members.filter((m: any) => {
                          const memberId = String(m.id || m._id || m);
                          return memberId !== String(user?.id || user?._id) && onlineUsers.has(memberId);
                        }).length;
                        
                        // Son mesaj gönderenin ismini bul
                        if (chat.last_message && chat.last_message.sender_id) {
                          const senderId = String(chat.last_message.sender_id);
                          if (senderId === String(user?.id || user?._id)) {
                            lastMessageSenderName = 'You';
                          } else {
                            const senderContact = contacts.find((c: any) => {
                              const contactUserId = c.user?.id || c.user?._id || c.contact?.contact_id;
                              return contactUserId && String(contactUserId) === senderId;
                            });
                            if (senderContact) {
                              lastMessageSenderName = senderContact.user?.username || senderContact.user?.display_name || 'Someone';
                            } else if (chat.last_message.is_anonymous) {
                              // Anonymous mesaj için random isim
                              lastMessageSenderName = generateRandomName(senderId);
                            } else {
                              lastMessageSenderName = 'Someone';
                            }
                          }
                        }
                      }
                      
                      const lastMessage = chat.last_message;
                      const unreadCount = chat.unread_count || 0;
                      const lastTime =
                        lastMessage?.created_at ||
                        lastMessage?.createdAt ||
                        chat.last_message_at ||
                        chat.lastMessageAt ||
                        chat.updated_at;
                      
                      // Read receipt göster (sadece direct chat'lerde ve mesaj gönderen ben değilsem)
                      const showReadReceipt = chat.type === 'direct' && lastMessage && 
                        lastMessage.sender_id && String(lastMessage.sender_id) !== String(user?.id || user?._id) &&
                        lastMessage.status === 'read';

                      return (
                        <div
                          key={chatId}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleOpenContextMenu(e, chat);
                          }}
                          onTouchStart={(e) => handleChatRowTouchStart(e, chat)}
                          onTouchEnd={handleChatRowTouchEnd}
                          onTouchMove={handleChatRowTouchMove}
                          onTouchCancel={handleChatRowTouchEnd}
                          className={`group w-full px-3 py-2.5 flex items-center transition-colors cursor-pointer ${
                            selectedChat === chatId
                              ? actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                              : actualTheme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                          } ${isArchived ? 'opacity-70' : ''} ${isPinned ? 'border-l-3 border-green-500' : ''}`}
                        >
                          <button
                            onClick={(e) => {
                              if (justDidLongPressRef.current) {
                                e.preventDefault();
                                e.stopPropagation();
                                return;
                              }
                              if (onChatSelect) onChatSelect(chatId);
                              router.push('/chat');
                            }}
                            className="flex-1 flex items-center space-x-3 text-left min-w-0"
                          >
                            <div className="relative flex-shrink-0">
                              {chatAvatar ? (
                                <img
                                  src={chatAvatar}
                                  alt={chatTitle}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className={`w-12 h-12 ${actualTheme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} rounded-full flex items-center justify-center text-white font-semibold text-base`}>
                                  {chatTitle?.[0]?.toUpperCase() || 'C'}
                                </div>
                              )}
                              {chat.type === 'direct' && isOtherMemberOnline && !isAnonymous && (
                                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                              )}
                              {chat.type === 'group' && groupOnlineCount > 0 && (
                                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full flex items-center justify-center">
                                  <span className="text-[8px] text-white font-bold">{groupOnlineCount}</span>
                                </div>
                              )}
                              {unreadCount > 0 && !isArchived && (
                                <div className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold px-1">
                                  {unreadCount > 9 ? '9+' : unreadCount}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <p className={`text-sm font-medium truncate ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  {chatTitle}
                                </p>
                                {lastTime && (
                                  <span className={`text-xs flex-shrink-0 ml-2 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {formatChatTime(lastTime)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-1.5 min-w-0">
                                {lastMessage && (
                                  <>
                                    {showReadReceipt && (
                                      <span className="text-xs text-blue-400 flex-shrink-0">✓✓</span>
                                    )}
                                    {chat.type === 'group' && lastMessageSenderName && (
                                      <span className={`text-xs font-medium flex-shrink-0 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {lastMessageSenderName}:
                                      </span>
                                    )}
                                    <p className={`text-xs truncate flex-1 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {lastMessage.content || 'Media'}
                                    </p>
                                  </>
                                )}
                                {!lastMessage && (
                                  <p className={`text-xs italic ${actualTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                    No messages yet
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    });
                  })()}
                </>
              )}
              {/* Tüm chat'ler için sağ tık menüsü - WhatsApp benzeri */}
              {contextChat && contextMenuPos && (
                <>
                  {/* Backdrop - menüyü kapatmak için */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => {
                      setContextChat(null);
                      setContextMenuPos(null);
                    }}
                    onContextMenu={(e) => {
                      // Backdrop'a sağ tık yapıldığında menüyü kapat
                      e.preventDefault();
                      e.stopPropagation();
                      setContextChat(null);
                      setContextMenuPos(null);
                    }}
                  />
                  <div
                    className={`chat-context-menu fixed z-50 w-56 rounded-lg shadow-xl border ${
                      actualTheme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-800'
                    }`}
                    style={{
                      top: Math.max(8, Math.min(contextMenuPos.y - 20, typeof window !== 'undefined' ? window.innerHeight - 320 : contextMenuPos.y - 20)),
                      left: Math.max(8, Math.min(contextMenuPos.x - 20, typeof window !== 'undefined' ? window.innerWidth - 232 : contextMenuPos.x - 20)),
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold uppercase tracking-wide opacity-70">
                    {contextChat.type === 'group' ? (contextChat.group_name || 'Group') : (contextChat.group_name || 'Chat')}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      toggleArchiveChat(contextChat.id || contextChat._id);
                      setContextChat(null);
                      setContextMenuPos(null);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    <span>{archivedChatIds.has(String(contextChat.id || contextChat._id)) ? 'Unarchive chat' : 'Archive chat'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toggleFavoriteChat(contextChat.id || contextChat._id);
                      setContextChat(null);
                      setContextMenuPos(null);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>{favoriteChatIds.has(String(contextChat.id || contextChat._id)) ? 'Unlock chat' : 'Lock chat'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toggleMuteChat(contextChat.id || contextChat._id);
                      setContextChat(null);
                      setContextMenuPos(null);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                    <span>{mutedChatIds.has(String(contextChat.id || contextChat._id)) ? 'Unmute notifications' : 'Mute notifications'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      togglePinChat(contextChat.id || contextChat._id);
                      setContextChat(null);
                      setContextMenuPos(null);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <span>{pinnedChatIds.has(String(contextChat.id || contextChat._id)) ? 'Unpin chat' : 'Pin chat'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Mark as unread - unread count'u artır (frontend only)
                      setContextChat(null);
                      setContextMenuPos(null);
                      alert('Marked as unread');
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Mark as unread</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toggleFavoriteChat(contextChat.id || contextChat._id);
                      setContextChat(null);
                      setContextMenuPos(null);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                  >
                    <svg className="w-5 h-5" fill={favoriteChatIds.has(String(contextChat.id || contextChat._id)) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span>{favoriteChatIds.has(String(contextChat.id || contextChat._id)) ? 'Remove from favourites' : 'Add to favourites'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toggleBlockChat(contextChat.id || contextChat._id);
                      setContextChat(null);
                      setContextMenuPos(null);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <span>{blockedChatIds.has(String(contextChat.id || contextChat._id)) ? 'Unblock' : 'Block'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(t('delete') + ' ' + t('chats') + '?')) {
                        handleDeleteChat(contextChat.id || contextChat._id);
                      }
                      setContextChat(null);
                      setContextMenuPos(null);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete chat</span>
                  </button>
                  </div>
                </>
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
                  const isOnline = contactUserId ? onlineUsers.has(String(contactUserId)) : false;
                  return (
                  <div
                    key={contact.contact?.id || contact.id || contact._id}
                    className={`w-full p-3 md:p-4 flex items-center justify-between transition-colors active:bg-gray-200 dark:active:bg-gray-600 ${
                      actualTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                      <div className="relative flex-shrink-0">
                        {contact.user?.avatar ? (
                          <img
                            src={contact.user.avatar}
                            alt={displayName}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className={`w-10 h-10 md:w-12 md:h-12 ${actualTheme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} rounded-full flex items-center justify-center text-white font-semibold text-sm md:text-base`}>
                            {displayName?.[0]?.toUpperCase() || displaySub?.[0] || 'U'}
                          </div>
                        )}
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 md:w-3.5 md:h-3.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm md:text-base font-medium truncate ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {displayName}
                          </p>
                          {displaySub && contactCommentCounts[displaySub] > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); router.push(`/comments?q=${encodeURIComponent(displaySub)}`); }}
                              className="flex-shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-full transition"
                              title={`${contactCommentCounts[displaySub]} yorum var`}
                            >
                              {contactCommentCounts[displaySub] > 99 ? '99+' : contactCommentCounts[displaySub]}
                            </button>
                          )}
                        </div>
                        <p className={`text-xs truncate ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {displaySub || (contactUserId ? '' : 'Not in app')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {contactUserId && (
                        <>
                          <button
                            onClick={() => {
                              setCommentTargetUserId(contactUserId);
                              setShowCommentModal(true);
                            }}
                            className={`p-2 ${actualTheme === 'dark' ? 'text-green-400 hover:bg-gray-600' : 'text-green-600 hover:bg-green-50'} rounded transition`}
                            title="Write Comment"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setProposalTargetUserId(contactUserId);
                              setShowProposalFromContactModal(true);
                            }}
                            className={`p-2 ${actualTheme === 'dark' ? 'text-purple-400 hover:bg-gray-600' : 'text-purple-600 hover:bg-purple-50'} rounded transition`}
                            title="Send Proposal"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openChatWithContact(contactUserId)}
                            className={`p-2 ${actualTheme === 'dark' ? 'text-blue-400 hover:bg-gray-600' : 'text-blue-600 hover:bg-blue-50'} rounded transition`}
                            title="Message"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </button>
                        </>
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

        {/* Bottom Navigation - masaüstündə həmişə Sidebar-da görünsün; mobilde chat səhifəsində fixed footer yalnız chat seçilməyəndə göstərilir (chat page-də), burada mobilde gizlidir (hidden md:block) */}
        <div className="hidden md:block flex-shrink-0 mt-auto">
          <BottomNav />
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
                    {searchResults.map((result) => {
                      const resultUserId = result.id || result._id;
                      const isOnline = resultUserId ? onlineUsers.has(String(resultUserId)) : false;
                      return (
                      <button
                        key={result.id || result._id}
                        onClick={() => openChatWithContact(result.id || result._id)}
                        className={`w-full p-3 text-left rounded-lg transition flex items-center space-x-3 ${
                          actualTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="relative">
                          {result.avatar ? (
                            <img
                              src={result.avatar}
                              alt={result.username || result.phone_number}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className={`w-10 h-10 ${actualTheme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} rounded-full flex items-center justify-center text-white font-semibold`}>
                              {result.username?.[0]?.toUpperCase() || result.phone_number?.[0] || 'U'}
                            </div>
                          )}
                          {isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                          )}
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
                      );
                    })}
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
                        {searchResults.map((result) => {
                          const resultUserId = result.id || result._id;
                          const isOnline = resultUserId ? onlineUsers.has(String(resultUserId)) : false;
                          return (
                          <button
                            key={result.id || result._id}
                            onClick={() => handleAddContact(result.id || result._id)}
                            className={`w-full p-3 text-left rounded-lg transition flex items-center space-x-3 ${
                              actualTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="relative">
                              {result.avatar ? (
                                <img
                                  src={result.avatar}
                                  alt={result.username || result.phone_number}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className={`w-10 h-10 ${actualTheme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} rounded-full flex items-center justify-center text-white font-semibold`}>
                                  {result.username?.[0]?.toUpperCase() || result.phone_number?.[0] || 'U'}
                                </div>
                              )}
                              {isOnline && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                              )}
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
                          );
                        })}
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

      {/* Comment Modal (for a specific contact - phone only) */}
      {showCommentModal && commentTargetUserId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowCommentModal(false); setCommentText(''); setCommentTargetUserId(null); }}>
          <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 w-96 shadow-xl`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-lg font-semibold mb-4 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{t('leaveCommentForNumber')}</h3>
            <form onSubmit={handleSendComment} className="space-y-4">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t('leaveCommentTextPlaceholder')}
                rows={4}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  actualTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'
                }`}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowCommentModal(false); setCommentText(''); setCommentTargetUserId(null); }}
                  className={`flex-1 py-2 rounded-lg font-medium ${actualTheme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!commentText.trim() || sendingComment}
                  className="flex-1 py-2 rounded-lg font-medium bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingComment ? t('leaveCommentSending') : t('leaveCommentSubmit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave comment modal (phone / car number / person name - same as guest form) */}
      {showLeaveCommentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowLeaveCommentModal(false); setLeaveCommentTargetValue(''); setLeaveCommentText(''); }}>
          <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 w-96 shadow-xl max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-lg font-semibold mb-4 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{t('leaveCommentForNumber')}</h3>
            <form onSubmit={handleLeaveCommentSubmit} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{t('leaveCommentTargetLabel')}</label>
                <select
                  value={leaveCommentTargetType}
                  onChange={(e) => setLeaveCommentTargetType(e.target.value as ProfileCommentTargetType)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${actualTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  disabled={sendingLeaveComment}
                >
                  <option value="phone">{t('leaveCommentTargetPhone')}</option>
                  <option value="car_number">{t('leaveCommentTargetCarNumber')}</option>
                  <option value="person_name">{t('leaveCommentTargetPersonName')}</option>
                </select>
              </div>
              <input
                type={leaveCommentTargetType === 'phone' ? 'tel' : 'text'}
                value={leaveCommentTargetValue}
                onChange={(e) => setLeaveCommentTargetValue(e.target.value)}
                placeholder={
                  leaveCommentTargetType === 'phone'
                    ? t('leaveCommentNumberPlaceholder')
                    : leaveCommentTargetType === 'car_number'
                      ? t('leaveCommentCarPlaceholder')
                      : t('leaveCommentPersonPlaceholder')
                }
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${actualTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'}`}
                disabled={sendingLeaveComment}
              />
              <textarea
                value={leaveCommentText}
                onChange={(e) => setLeaveCommentText(e.target.value)}
                placeholder={t('leaveCommentTextPlaceholder')}
                rows={3}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${actualTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'}`}
                disabled={sendingLeaveComment}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowLeaveCommentModal(false); setLeaveCommentTargetValue(''); setLeaveCommentText(''); }}
                  className={`flex-1 py-2 rounded-lg font-medium ${actualTheme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!leaveCommentTargetValue.trim() || !leaveCommentText.trim() || sendingLeaveComment}
                  className="flex-1 py-2 rounded-lg font-medium bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingLeaveComment ? t('leaveCommentSending') : t('leaveCommentSubmit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proposal from Contact Modal */}
      {showProposalFromContactModal && proposalTargetUserId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowProposalFromContactModal(false); setProposalTargetUserId(null); }}>
          <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 w-96 shadow-xl`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-lg font-semibold mb-4 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Send Proposal</h3>
            <form onSubmit={handleSendProposalFromContact} className="space-y-4">
              <input
                type="text"
                name="title"
                placeholder="Proposal Title"
                defaultValue="New Proposal"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  actualTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'
                }`}
                autoFocus
              />
              <textarea
                name="content"
                placeholder="Proposal Content"
                rows={4}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  actualTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'
                }`}
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="chat_anonymous"
                  id="chat_anonymous"
                  value="true"
                  className="w-4 h-4"
                />
                <label htmlFor="chat_anonymous" className={`text-sm ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Anonymous Chat
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowProposalFromContactModal(false); setProposalTargetUserId(null); }}
                  className={`flex-1 py-2 rounded-lg font-medium ${actualTheme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg font-medium bg-purple-500 hover:bg-purple-600 text-white"
                >
                  Send Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

