'use client';

import { useState, useEffect, useRef } from 'react';
import { chatApi, fileApi, messageApi, typingApi } from '@/lib/api';
import { WebSocketClient } from '@/lib/websocket';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

// Get base API URL for file serving (remove /api/v1 suffix)
const getBaseUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
  // Remove /api/v1 suffix to get base URL
  return apiUrl.replace('/api/v1', '');
};

interface Message {
  id: string;
  sender_id: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadChatInfo();
    loadMessages();
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

  useEffect(() => {
    scrollToBottom();
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
      
      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleNewMessage = (data: any) => {
    if (data.chat_id === chatId) {
      loadMessages();
    }
  };

  const handleTyping = (data: any) => {
    if (data.chat_id === chatId && data.user_id !== user?.id) {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 3000);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !replyingTo) return;

    setLoading(true);
    try {
      await chatApi.sendMessage(chatId, {
        content: newMessage,
        message_type: 'text',
        is_anonymous: false,
        reply_to_id: replyingTo?.id,
      });

      setNewMessage('');
      setReplyingTo(null);
      loadMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      const response = await fileApi.uploadFile(file);
      const messageType = file.type.startsWith('image/') ? 'image' : 
                         file.type.startsWith('audio/') || file.type.startsWith('video/') ? 'audio' : 'file';
      
      await chatApi.sendMessage(chatId, {
        content: file.name,
        message_type: messageType,
        file_url: response.file_url || response.url,
        file_name: file.name,
        file_size: file.size,
        is_anonymous: false,
      });
      
      loadMessages();
    } catch (error) {
      console.error('Failed to upload file:', error);
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
    if (!confirm(deleteForEveryone ? 'Delete for everyone?' : 'Delete for me?')) return;
    
    try {
      await messageApi.deleteMessage(messageId, deleteForEveryone);
      loadMessages();
      setSelectedMessage(null);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await messageApi.editMessage(messageId, newContent);
      loadMessages();
      setSelectedMessage(null);
    } catch (error) {
      console.error('Failed to edit message:', error);
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
    alert('Forward feature - select chats to forward to');
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const isMyMessage = (message: Message) => {
    return message.sender_id === user?.id || !message.is_anonymous;
  };

  const getDisplayName = (message: Message) => {
    if (message.is_anonymous) return 'Anonymous';
    return message.sender?.username || message.sender?.phone_number || 'User';
  };

  return (
    <div className={`flex flex-col h-full ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Chat Header - WhatsApp Style */}
      <div className="bg-green-500 p-4 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/20 rounded-full transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-semibold">
            {chatInfo?.group_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {chatInfo?.group_name || 'Chat'}
            </h2>
            {isTyping && (
              <p className="text-xs text-green-100">typing...</p>
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
            <p className="text-xs text-green-700 font-semibold">Replying to {getDisplayName(replyingTo)}</p>
            <p className="text-sm text-gray-700 truncate">{replyingTo.content || 'Media'}</p>
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
      <div className={`flex-1 overflow-y-auto p-4 space-y-2 ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
        {messages.map((message, index) => {
          const isMine = isMyMessage(message);
          const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;
          const showTime = index === messages.length - 1 || 
                          new Date(messages[index + 1].created_at).getTime() - new Date(message.created_at).getTime() > 300000;
          
          if (message.is_deleted) {
            return (
              <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className="px-4 py-2 bg-gray-200 rounded-lg text-gray-500 italic text-sm">
                  This message was deleted
                </div>
              </div>
            );
          }

          return (
            <div
              key={message.id}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}
            >
              <div className={`flex items-end space-x-2 max-w-[70%] ${isMine ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {!isMine && showAvatar && (
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {getDisplayName(message)[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="relative">
                  <div
                    className={`px-4 py-2 rounded-lg shadow-sm ${
                      isMine
                        ? 'bg-green-500 text-white'
                        : actualTheme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
                    }`}
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
                      <img
                        src={`${getBaseUrl()}${message.file_url}`}
                        alt="Shared image"
                        className="max-w-full rounded-lg mb-2"
                      />
                    )}
                    {message.message_type === 'audio' && message.file_url && (
                      <audio controls src={`${getBaseUrl()}${message.file_url}`} className="w-full mb-2" />
                    )}
                    {message.content && (
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                    
                    {/* Message Footer */}
                    <div className={`flex items-center justify-end space-x-1 mt-1 ${
                      isMine ? 'text-white/70' : 'text-gray-500'
                    }`}>
                      {message.is_edited && (
                        <span className="text-xs italic">edited</span>
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
                        <span>Reply</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowEmojiPicker(true);
                          setSelectedMessage(message);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <span>😊</span>
                        <span>React</span>
                      </button>
                      <button
                        onClick={() => handleForwardMessage(message.id)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <span>↪️</span>
                        <span>Forward</span>
                      </button>
                      {isMine && (
                        <>
                          <button
                            onClick={() => {
                              const newContent = prompt('Edit message:', message.content);
                              if (newContent) handleEditMessage(message.id, newContent);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <span>✏️</span>
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(message.id, false)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <span>🗑️</span>
                            <span>Delete for me</span>
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(message.id, true)}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <span>🗑️</span>
                            <span>Delete for everyone</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSelectedMessage(null)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
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
      <div className={`p-3 ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-t ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,audio/*,video/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
          <div className={`flex-1 ${actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} rounded-full px-4 py-2 flex items-center`}>
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTypingIndicator();
              }}
              placeholder="Type a message"
              className={`flex-1 bg-transparent outline-none text-sm ${actualTheme === 'dark' ? 'text-white placeholder-gray-400' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          <button
            type="submit"
            disabled={loading || !newMessage.trim()}
            className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>

      {/* Click outside to close menus */}
      {(selectedMessage || showEmojiPicker) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setSelectedMessage(null);
            setShowEmojiPicker(false);
          }}
        />
      )}
    </div>
  );
}
