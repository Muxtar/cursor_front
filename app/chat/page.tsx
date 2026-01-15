'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { chatApi } from '@/lib/api';
import { WebSocketClient } from '@/lib/websocket';
import ChatWindow from '@/components/ChatWindow';
import Sidebar from '@/components/Sidebar';
import { useRouter } from 'next/navigation';

export default function ChatPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { actualTheme } = useTheme();
  const router = useRouter();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocketClient | null>(null);

  useEffect(() => {
    if (user) {
      connectWebSocket();
    }

    return () => {
      if (ws) {
        ws.disconnect();
      }
    };
  }, [user]);

  const connectWebSocket = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';
      const client = new WebSocketClient(wsUrl, token);
      
      client.on('connect', () => {
        console.log('WebSocket connected');
      });

      client.on('message', (data: any) => {
        console.log('Message received:', data);
        // Handle incoming messages
      });

      client.on('error', (error: any) => {
        console.error('WebSocket error:', error);
      });

      setWs(client);
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className={`flex h-screen ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Sidebar */}
      <Sidebar onChatSelect={setSelectedChat} selectedChat={selectedChat} />

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
        {selectedChat ? (
          <ChatWindow chatId={selectedChat} ws={ws} onBack={() => setSelectedChat(null)} />
        ) : (
          <div className={`flex-1 flex items-center justify-center ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <div className="text-center">
              <div className={`w-24 h-24 ${actualTheme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className={`text-2xl font-semibold mb-2 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                Welcome to Chat App
              </h2>
              <p className={`mb-4 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Select a chat to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
