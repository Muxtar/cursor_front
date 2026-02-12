'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { WebSocketClient } from '@/lib/websocket';
import ChatWindow from '@/components/ChatWindow';
import Sidebar from '@/components/Sidebar';
import { useSearchParams } from 'next/navigation';

function ChatContent() {
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const searchParams = useSearchParams();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocketClient | null>(null);

  useEffect(() => {
    const openChatId = searchParams.get('open');
    if (openChatId) setSelectedChat(openChatId);
  }, [searchParams]);

  useEffect(() => {
    let client: WebSocketClient | null = null;
    if (user) {
      connectWebSocket().then(() => {});
      // Store ref for cleanup: ws state updates async, so we disconnect in next effect
    }
    return () => {
      setWs((current) => {
        if (current) {
          current.disconnect();
        }
        return null;
      });
    };
  }, [user]);

  const connectWebSocket = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';
      const client = new WebSocketClient(wsUrl, token);

      await client.connect();
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
      <Sidebar onChatSelect={setSelectedChat} selectedChat={selectedChat} />
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

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" /></div>}>
      <ChatContent />
    </Suspense>
  );
}
