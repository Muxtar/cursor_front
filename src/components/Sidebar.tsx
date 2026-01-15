'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { chatApi, contactApi, userApi } from '@/lib/api';

interface SidebarProps {
  onChatSelect?: (chatId: string) => void;
  selectedChat?: string | null;
}

export default function Sidebar({ onChatSelect, selectedChat }: SidebarProps) {
  const { user, logout } = useAuth();
  const { actualTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showRemoveContactModal, setShowRemoveContactModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts'>('chats');

  useEffect(() => {
    if (user) {
      loadContacts();
      loadChats();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.menu-dropdown') && !target.closest('.menu-button')) {
        setShowMenuDropdown(false);
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
    } catch (error) {
      console.error('Failed to create chat:', error);
      alert('Failed to create chat');
    }
  };

  const handleAddContact = async (userId: string) => {
    try {
      await contactApi.addContact(userId);
      alert('Contact added successfully');
      setShowAddContactModal(false);
      setSearchQuery('');
      loadContacts();
    } catch (error: any) {
      alert('Failed to add contact: ' + error.message);
    }
  };

  const handleRemoveContact = async (contactId: string) => {
    try {
      await contactApi.deleteContact(contactId);
      alert('Contact removed successfully');
      setShowRemoveContactModal(false);
      loadContacts();
    } catch (error: any) {
      alert('Failed to remove contact: ' + error.message);
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
      router.push('/login');
    }
  };

  if (!user) return null;

  return (
    <>
      <div className={`w-[420px] ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-r ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex flex-col shadow-sm h-screen`}>
        {/* Header */}
        <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-4 border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push(`/profile/${user.id || user._id}`)}
                className={`w-10 h-10 ${actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-full flex items-center justify-center hover:opacity-80 transition`}
              >
                <span className={`text-lg font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {user.username?.[0]?.toUpperCase() || user.phone_number?.[0] || 'U'}
                </span>
              </button>
              <div>
                <h1 className={`text-lg font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {user.username || 'User'}
                </h1>
                <p className={`text-xs ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {user.phone_number}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowNewChatModal(true)}
                className={`p-2 ${actualTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded-full transition`}
                title="New Chat"
              >
                <svg className={`w-5 h-5 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={() => setShowAddContactModal(true)}
                className={`p-2 ${actualTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded-full transition`}
                title="Add Contact"
              >
                <svg className={`w-5 h-5 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                  className="menu-button p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                  title="Menu"
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
                        <span>Settings</span>
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
                        <span>Logout</span>
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
              Chats
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex-1 py-2 text-center font-medium rounded-t-lg transition ${
                activeTab === 'contacts'
                  ? actualTheme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'
                  : actualTheme === 'dark' ? 'text-gray-400 hover:bg-gray-700/50' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Contacts
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className={`p-2 ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="relative">
            <input
              type="text"
              placeholder="Search or start new chat"
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
                  onClick={() => handleCreateChat(result.id || result._id)}
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
                  No chats yet
                </div>
              ) : (
                chats.map((chat) => (
                  <button
                    key={chat.id || chat._id}
                    onClick={() => {
                      if (onChatSelect) {
                        onChatSelect(chat.id || chat._id);
                      }
                      router.push('/chat');
                    }}
                    className={`w-full p-4 text-left transition-colors ${
                      selectedChat === (chat.id || chat._id)
                        ? actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                        : actualTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 ${actualTheme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} rounded-full flex items-center justify-center text-white font-semibold`}>
                        {chat.group_name?.[0]?.toUpperCase() || chat.members?.[0]?.username?.[0]?.toUpperCase() || 'C'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {chat.group_name || chat.members?.[0]?.username || 'Chat'}
                        </p>
                        {chat.last_message && (
                          <p className={`text-xs truncate ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {chat.last_message.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {contacts.length === 0 ? (
                <div className={`p-4 text-center ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  No contacts yet
                </div>
              ) : (
                contacts.map((contact: any) => (
                  <div
                    key={contact.id || contact._id}
                    className={`w-full p-4 flex items-center justify-between transition-colors ${
                      actualTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`w-12 h-12 ${actualTheme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} rounded-full flex items-center justify-center text-white font-semibold`}>
                        {contact.user?.username?.[0]?.toUpperCase() || contact.user?.phone_number?.[0] || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {contact.user?.username || contact.user?.phone_number || 'Contact'}
                        </p>
                        <p className={`text-xs truncate ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {contact.user?.phone_number}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveContact(contact.id || contact._id)}
                      className={`p-2 ${actualTheme === 'dark' ? 'text-red-400 hover:bg-gray-600' : 'text-red-600 hover:bg-red-50'} rounded transition`}
                      title="Remove Contact"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
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
              <span className="text-xs">Stories</span>
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
              <span className="text-xs">Explore</span>
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
              <span className="text-xs">Location</span>
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
              <span className="text-xs">Profile</span>
            </Link>
          </div>
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewChatModal(false)}>
          <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg w-96 max-h-[80vh] overflow-hidden`} onClick={(e) => e.stopPropagation()}>
            <div className={`p-4 border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
              <h2 className={`text-lg font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>New Chat</h2>
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
                placeholder="Search users..."
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
                        onClick={() => handleCreateChat(result.id || result._id)}
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
                  <p className={`text-center py-4 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No users found</p>
                ) : (
                  <p className={`text-center py-4 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Start typing to search users</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddContactModal(false)}>
          <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg w-96 max-h-[80vh] overflow-hidden`} onClick={(e) => e.stopPropagation()}>
            <div className={`p-4 border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
              <h2 className={`text-lg font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Add Contact</h2>
              <button
                onClick={() => setShowAddContactModal(false)}
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
                placeholder="Search users..."
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
                  <p className={`text-center py-4 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No users found</p>
                ) : (
                  <p className={`text-center py-4 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Start typing to search users</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

