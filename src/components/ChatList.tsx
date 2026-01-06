'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface Chat {
  id: string;
  type: string;
  group_name?: string;
  members: any[];
  last_message?: {
    content: string;
    created_at: string;
    sender_id?: string;
  };
  updated_at: string;
  unread_count?: number;
}

interface ChatListProps {
  chats: Chat[];
  onSelectChat: (chatId: string) => void;
  selectedChat: string | null;
}

export default function ChatList({ chats, onSelectChat, selectedChat }: ChatListProps) {
  const { t } = useLanguage();
  
  // Null/undefined check
  if (!chats || !Array.isArray(chats)) {
    return (
      <div className="p-4 text-center text-gray-500">{t('noChats') || 'No chats'}</div>
    );
  }
  
  const formatTime = (dateString: string) => {
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
  
  return (
    <div className="divide-y divide-gray-200">
      {chats.length === 0 ? (
        <div className="p-4 text-center text-gray-500">{t('noChats') || 'No chats yet'}</div>
      ) : (
        chats.map((chat) => {
          const lastMessage = chat.last_message;
          const displayName = chat.type === 'group' ? chat.group_name : 'Direct Chat';
          const unreadCount = chat.unread_count || 0;
          
          return (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
                selectedChat === chat.id ? 'bg-green-50' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                    {chat.type === 'group' ? (chat.group_name?.[0]?.toUpperCase() || 'G') : 'U'}
                  </div>
                  {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {displayName}
                    </p>
                    {lastMessage && (
                      <p className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {formatTime(lastMessage.created_at)}
                      </p>
                    )}
                  </div>
                  {lastMessage ? (
                    <p className="text-xs text-gray-600 truncate">
                      {lastMessage.content || 'Media'}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No messages yet</p>
                  )}
                </div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
