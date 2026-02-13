'use client';

import { useState, useEffect, useRef } from 'react';
import { chatApi, fileApi, messageApi, typingApi, contactApi } from '@/lib/api';
import { WebSocketClient } from '@/lib/websocket';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

// Get base API URL for file serving (remove /api/v1 suffix)
const getBaseUrl = () => {
  // API URL'ini api.ts'den al (aynı mantık)
  let apiUrl: string;
  if (typeof window !== 'undefined') {
    // Browser'da: build-time env variable veya fallback
    apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://cursurback-production.up.railway.app/api/v1';
  } else {
    // SSR: build-time env variable
    apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://cursurback-production.up.railway.app/api/v1';
  }
  // Remove /api/v1 suffix to get base URL
  return apiUrl.replace('/api/v1', '');
};

interface Message {
  id: string;
  sender_id: string | null;
  content: string;
  message_type: string;
  file_url?: string;
  thumbnail_url?: string;
  file_name?: string;
  file_size?: number;
  duration?: number;
  is_anonymous: boolean;
  is_edited?: boolean;
  edited_at?: string;
  is_deleted?: boolean;
  status?: string;
  reactions?: Array<{ user_id: string; emoji: string }>;
  reply_to_id?: string;
  reply_to?: Message;
  created_at: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  contact?: {
    name: string;
    phone_number: string;
    user_id?: string;
  };
  sender?: {
    username?: string;
    phone_number?: string;
  };
}

interface ChatWindowProps {
  chatId: string;
  ws: WebSocketClient | null;
  onBack?: () => void;
}

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function ChatWindow({ chatId, ws, onBack }: ChatWindowProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadChatInfo();
    loadMessages();
    loadContacts();
    if (ws) {
      ws.joinChat(chatId);
      ws.on('message', handleNewMessage);
      ws.on('typing', handleTyping);
    }

    return () => {
      if (ws) {
        ws.leaveChat(chatId);
        ws.off('message', handleNewMessage);
        ws.off('typing', handleTyping);
      }
    };
  }, [chatId, ws]);

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

  useEffect(() => {
    // Scroll to bottom when messages change
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  const loadChatInfo = async () => {
    try {
      const data = await chatApi.getChat(chatId);
      setChatInfo(data);
    } catch (error) {
      console.error('Failed to load chat info:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const data: any = await chatApi.getMessages(chatId);
      let messagesData: Message[] = [];
      
      if (Array.isArray(data)) {
        messagesData = data;
      } else if (data && Array.isArray(data.messages)) {
        messagesData = data.messages;
      } else if (data && Array.isArray(data.data)) {
        messagesData = data.data;
      }
      
      // Sort messages by created_at timestamp (oldest first)
      messagesData.sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return timeA - timeB;
      });
      
      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleNewMessage = (data: any) => {
    if (data.chat_id === chatId) {
      loadMessages().then(() => {
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      });
    }
  };

  const handleTyping = (data: any) => {
    if (data.chat_id === chatId && data.user_id !== user?.id) {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 3000);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !replyingTo) return;

    const messageContent = newMessage.trim();
    if (!messageContent) return;

    setLoading(true);
    try {
      await chatApi.sendMessage(chatId, {
        content: messageContent,
        message_type: 'text',
        is_anonymous: false,
        reply_to_id: replyingTo?.id,
      });

      setNewMessage('');
      setReplyingTo(null);
      
      // Reload messages and scroll to bottom
      await loadMessages();
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setLoading(true);
      const response = await fileApi.uploadFile(file);
      
      let messageType = 'file';
      if (file.type.startsWith('image/')) {
        messageType = 'image';
      } else if (file.type.startsWith('audio/')) {
        messageType = 'audio';
      } else if (file.type.startsWith('video/')) {
        messageType = 'video';
      }
      
      await chatApi.sendMessage(chatId, {
        content: file.name,
        message_type: messageType,
        file_url: response.file_url || response.url,
        file_name: file.name,
        file_size: file.size,
        is_anonymous: false,
        reply_to_id: replyingTo?.id,
      });
      
      setReplyingTo(null);
      await loadMessages();
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert(t('sendFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleTypingIndicator = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingApi.setTyping(chatId, 'typing');
    
    typingTimeoutRef.current = setTimeout(() => {
      // Stop typing indicator
    }, 3000);
  };

  const handleDeleteMessage = async (messageId: string, deleteForEveryone: boolean = false) => {
    if (!confirm(deleteForEveryone ? t('deleteForEveryone') + '?' : t('deleteForMe') + '?')) return;
    
    try {
      await messageApi.deleteMessage(messageId, deleteForEveryone);
      loadMessages();
      setSelectedMessage(null);
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert(t('sendFailed'));
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!newContent || !newContent.trim()) return;
    try {
      await messageApi.editMessage(messageId, newContent.trim());
      loadMessages();
      setSelectedMessage(null);
    } catch (error) {
      console.error('Failed to edit message:', error);
      alert(t('sendFailed'));
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      await messageApi.addReaction(messageId, emoji);
      loadMessages();
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleForwardMessage = async (messageId: string) => {
    // This would open a modal to select chats
    alert(t('forward') + ' - ' + t('selectChat'));
  };

  const handleShareContact = async (contactId: string) => {
    try {
      // Get contact details
      const contacts: any = await contactApi.getContacts();
      const contact = Array.isArray(contacts) 
        ? contacts.find((c: any) => (c.contact?.id || c.id || c._id) === contactId)
        : contacts?.contacts?.find((c: any) => (c.contact?.id || c.id || c._id) === contactId);
      
      if (!contact) {
        alert(t('noContactsYet'));
        return;
      }

      const contactUser = contact.user || contact.contact;
      await chatApi.sendMessage(chatId, {
        content: contactUser?.username || contactUser?.phone_number || '',
        message_type: 'contact',
        contact: {
          name: contactUser?.username || contactUser?.display_name || contactUser?.phone_number || '',
          phone_number: contactUser?.phone_number || '',
          user_id: contactUser?.id || contactUser?._id || null,
        },
        is_anonymous: false,
      });
      
      await loadMessages();
      setTimeout(() => {
        scrollToBottom();
      }, 100);
      alert(t('contactShared'));
    } catch (error) {
      console.error('Failed to share contact:', error);
      alert(t('failedToShareContact'));
    }
  };

  const handleShareLocation = async () => {
    if (!navigator.geolocation) {
      alert(t('geolocationNotSupported'));
      return;
    }

    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Note: Address lookup can be added later using a geocoding service
          // For now, we'll just send coordinates
          const coordinates = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

          await chatApi.sendMessage(chatId, {
            content: coordinates,
            message_type: 'location',
            location: {
              latitude,
              longitude,
              is_live: false,
            },
            is_anonymous: false,
          });
          
          await loadMessages();
          setTimeout(() => {
            scrollToBottom();
          }, 100);
          alert(t('locationShared'));
        },
        (error) => {
          console.error('Error getting location:', error);
          alert(t('locationAccessDenied'));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } catch (error) {
      console.error('Failed to share location:', error);
      alert(t('failedToShareLocation'));
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const isMyMessage = (message: Message) => {
    return message.sender_id != null && (message.sender_id === user?.id || message.sender_id === user?._id);
  };

  const getDisplayName = (message: Message) => {
    if (message.is_anonymous) return t('anonymous');
    return message.sender?.username || message.sender?.phone_number || t('profile');
  };

  return (
    <div className={`flex flex-col h-full ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Chat Header - WhatsApp Style */}
      <div className="bg-green-500 p-3 md:p-4 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-2 md:space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 md:p-2 hover:bg-white/20 rounded-full transition active:bg-white/30 md:hidden"
              aria-label="Back to chats"
            >
              <svg className="w-6 h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {/* Desktop back button */}
          {onBack && (
            <button
              onClick={onBack}
              className="hidden md:block p-2 hover:bg-white/20 rounded-full transition"
              aria-label="Back to chats"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="w-9 h-9 md:w-10 md:h-10 bg-white/20 rounded-full flex items-center justify-center font-semibold text-sm md:text-base flex-shrink-0">
            {(chatInfo?.other_party_anonymous ? 'A' : chatInfo?.group_name?.[0]) || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base md:text-lg font-semibold truncate">
              {chatInfo?.other_party_anonymous ? t('anonymous') : (chatInfo?.group_name || t('chats'))}
            </h2>
            {isTyping && (
              <p className="text-xs text-green-100">{t('typing')}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 hover:bg-white/20 rounded-full transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
          <button className="p-2 hover:bg-white/20 rounded-full transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button className="p-2 hover:bg-white/20 rounded-full transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Reply Bar */}
      {replyingTo && (
        <div className="bg-green-100 p-3 border-l-4 border-green-500 flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-green-700 font-semibold">{t('reply')} {getDisplayName(replyingTo)}</p>
            <p className="text-sm text-gray-700 truncate">{replyingTo.content || t('image')}</p>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-green-700 hover:text-green-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-2 md:p-4 ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="flex flex-col">
        {messages.map((message, index) => {
          const isMine = isMyMessage(message);
          const senderKey = message.sender_id ?? (message.is_anonymous ? 'anonymous' : '');
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const prevSenderKey = prevMessage ? (prevMessage.sender_id ?? (prevMessage.is_anonymous ? 'anonymous' : '')) : '';
          const showAvatar = !isMine && (index === 0 || prevSenderKey !== senderKey || 
                          (prevMessage && new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 300000));
          const showTime = index === messages.length - 1 || 
                          (messages[index + 1] && new Date(messages[index + 1].created_at).getTime() - new Date(message.created_at).getTime() > 300000);
          const isConsecutive = prevMessage && prevSenderKey === senderKey && 
                               new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() < 300000;
          
          if (message.is_deleted) {
            return (
              <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
                <div className="px-4 py-2 bg-gray-200 rounded-lg text-gray-500 italic text-sm">
                  {t('messageDeleted')}
                </div>
              </div>
            );
          }

          return (
            <div
              key={message.id}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-0.5 group w-full`}
            >
              <div className={`flex items-end space-x-2 max-w-[85%] md:max-w-[70%] ${isMine ? 'flex-row-reverse space-x-reverse' : ''} w-full`}>
                {!isMine && showAvatar && (
                  <div className="w-7 h-7 md:w-8 md:h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mb-0.5">
                    {getDisplayName(message)[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                {!isMine && !showAvatar && (
                  <div className="w-7 md:w-8 flex-shrink-0"></div>
                )}
                <div className="relative">
                  <div
                    className={`px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg shadow-sm text-sm md:text-base ${
                      isMine
                        ? 'bg-green-500 text-white rounded-br-sm'
                        : actualTheme === 'dark' ? 'bg-gray-800 text-white rounded-bl-sm' : 'bg-white text-gray-800 rounded-bl-sm'
                    } ${isConsecutive && !isMine ? 'rounded-tl-sm' : ''} ${isConsecutive && isMine ? 'rounded-tr-sm' : ''} break-words`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setSelectedMessage(message);
                    }}
                  >
                    {/* Reply Preview */}
                    {message.reply_to && (
                      <div className={`mb-2 pl-3 border-l-4 ${
                        isMine ? 'border-white/50' : 'border-green-500'
                      }`}>
                        <p className="text-xs font-semibold opacity-75">
                          {getDisplayName(message.reply_to)}
                        </p>
                        <p className="text-xs opacity-75 truncate">
                          {message.reply_to.content || 'Media'}
                        </p>
                      </div>
                    )}

                    {/* Message Content */}
                    {message.message_type === 'image' && message.file_url && (
                      <div className="mb-2">
                        <img
                          src={`${getBaseUrl()}${message.file_url}`}
                          alt="Shared image"
                          className="max-w-full max-h-96 rounded-lg cursor-pointer"
                          onClick={() => window.open(`${getBaseUrl()}${message.file_url}`, '_blank')}
                        />
                      </div>
                    )}
                    {message.message_type === 'video' && message.file_url && (
                      <div className="mb-2">
                        <video controls src={`${getBaseUrl()}${message.file_url}`} className="max-w-full max-h-96 rounded-lg" />
                      </div>
                    )}
                    {message.message_type === 'audio' && message.file_url && (
                      <div className="mb-2">
                        <audio controls src={`${getBaseUrl()}${message.file_url}`} className="w-full" />
                      </div>
                    )}
                    {message.message_type === 'location' && message.location && (
                      <div className="mb-2 p-3 bg-gray-200 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{t('location')}</p>
                            {message.location.address && (
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{message.location.address}</p>
                            )}
                            <a
                              href={`https://www.google.com/maps?q=${message.location.latitude},${message.location.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline mt-1 inline-block"
                            >
                              {message.location.latitude.toFixed(6)}, {message.location.longitude.toFixed(6)}
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                    {message.message_type === 'contact' && message.contact && (
                      <div className="mb-2 p-3 bg-gray-200 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {message.contact.name?.[0]?.toUpperCase() || 'C'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{message.contact.name}</p>
                            {message.contact.phone_number && (
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{message.contact.phone_number}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {message.message_type === 'file' && message.file_url && (
                      <div className="mb-2 p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center space-x-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{message.file_name || message.content}</p>
                          {message.file_size && (
                            <p className="text-xs text-gray-500">
                              {(message.file_size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          )}
                        </div>
                        <a
                          href={`${getBaseUrl()}${message.file_url}`}
                          download
                          className="p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                      </div>
                    )}
                    {message.content && message.message_type !== 'file' && (
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                    
                    {/* Message Footer */}
                    <div className={`flex items-center justify-end space-x-1 mt-1 ${
                      isMine ? 'text-white/70' : 'text-gray-500'
                    }`}>
                      {message.is_edited && (
                        <span className="text-xs italic">{t('edit').toLowerCase()}</span>
                      )}
                      <span className="text-xs">{formatTime(message.created_at)}</span>
                      {isMine && (
                        <span className="text-xs">
                          {message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>

                    {/* Reactions */}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className="absolute -bottom-2 right-0 flex space-x-1 bg-white rounded-full px-2 py-1 shadow border">
                        {message.reactions.map((reaction, idx) => (
                          <span key={idx} className="text-xs">{reaction.emoji}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Message Options Menu */}
                  {selectedMessage?.id === message.id && (
                    <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 z-10 min-w-[200px]">
                      <button
                        onClick={() => {
                          setReplyingTo(message);
                          setSelectedMessage(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <span>💬</span>
                        <span>{t('reply')}</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowEmojiPicker(true);
                          setSelectedMessage(message);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <span>😊</span>
                        <span>{t('react')}</span>
                      </button>
                      <button
                        onClick={() => handleForwardMessage(message.id)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <span>↪️</span>
                        <span>{t('forward')}</span>
                      </button>
                      {isMine && (
                        <>
                          <button
                            onClick={() => {
                              const newContent = prompt(t('edit') + ' ' + t('typeMessage').toLowerCase() + ':', message.content);
                              if (newContent && newContent.trim()) handleEditMessage(message.id, newContent);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <span>✏️</span>
                            <span>{t('edit')}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(message.id, false)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <span>🗑️</span>
                            <span>{t('deleteForMe')}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(message.id, true)}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <span>🗑️</span>
                            <span>{t('deleteForEveryone')}</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSelectedMessage(null)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        </div>
        <div ref={messagesEndRef} style={{ height: '1px' }} />
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && selectedMessage && (
        <div className="absolute bottom-20 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-20">
          <div className="flex space-x-2">
            {EMOJI_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleAddReaction(selectedMessage.id, emoji)}
                className="text-2xl hover:scale-125 transition"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input - WhatsApp Style */}
      <div className={`p-2 md:p-3 ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-t ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <form onSubmit={handleSendMessage} className="flex items-end space-x-1 md:space-x-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 md:p-2 text-gray-500 hover:text-gray-700 transition active:bg-gray-100 rounded-full"
              title={t('image')}
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            {showContactPicker && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto z-50">
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-semibold">{t('selectContact')}</p>
                </div>
                <div className="p-2">
                  {contacts.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">{t('noContactsYet')}</p>
                  ) : (
                    contacts.map((contact: any) => {
                      const contactUser = contact.user || contact.contact;
                      const contactId = contact.contact?.id || contact.id || contact._id;
                      return (
                        <button
                          key={contactId}
                          type="button"
                          onClick={() => {
                            handleShareContact(contactId);
                            setShowContactPicker(false);
                          }}
                          className="w-full p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center space-x-2"
                        >
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                            {(contactUser?.username || contactUser?.phone_number || 'C')[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{contactUser?.username || contactUser?.display_name || contactUser?.phone_number}</p>
                            {contactUser?.phone_number && (
                              <p className="text-xs text-gray-500 truncate">{contactUser.phone_number}</p>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowContactPicker(!showContactPicker)}
            className="p-2 md:p-2 text-gray-500 hover:text-gray-700 transition active:bg-gray-100 rounded-full"
            title={t('shareContact')}
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleShareLocation}
            className="p-2 md:p-2 text-gray-500 hover:text-gray-700 transition active:bg-gray-100 rounded-full"
            title={t('shareLocation')}
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
            multiple
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) {
                Array.from(files).forEach((file) => {
                  handleFileUpload(file);
                });
              }
              // Reset input so same file can be selected again
              e.target.value = '';
            }}
          />
          <div className={`flex-1 ${actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} rounded-full px-3 md:px-4 py-2 flex items-center min-w-0`}>
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTypingIndicator();
              }}
              placeholder={t('typeMessage')}
              className={`flex-1 bg-transparent outline-none text-sm md:text-base min-w-0 ${actualTheme === 'dark' ? 'text-white placeholder-gray-400' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 text-gray-500 hover:text-gray-700 active:bg-gray-200 rounded-full flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          <button
            type="submit"
            disabled={loading || !newMessage.trim()}
            className="p-2 md:p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed active:bg-green-600 flex-shrink-0"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>

      {/* Click outside to close menus */}
      {(selectedMessage || showEmojiPicker || showContactPicker) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setSelectedMessage(null);
            setShowEmojiPicker(false);
            setShowContactPicker(false);
          }}
        />
      )}
    </div>
  );
}
