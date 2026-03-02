'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { WebSocketClient } from '@/lib/websocket';
import ChatWindow from '@/components/ChatWindow';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import { useSearchParams } from 'next/navigation';
import { api, callApi, userApi } from '@/lib/api';

type RingtoneKind = 'caller' | 'callee';

function useRingtone(play: boolean, kind: RingtoneKind = 'callee') {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (!play) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      // Safely close AudioContext
      if (ctxRef.current) {
        const ctx = ctxRef.current;
        ctxRef.current = null;
        try {
          if (ctx.state !== 'closed') {
            const closeResult = ctx.close();
            if (closeResult && typeof closeResult === 'object' && 'catch' in closeResult) {
              (closeResult as Promise<void>).catch(() => {}); // Silently ignore
            }
          }
        } catch (_) {
          // Silently ignore - context might already be closed
        }
      }
      return;
    }
    if (typeof window === 'undefined') return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const scheduleTone = (frequency: number, startAt: number, duration: number, type: OscillatorType, volume: number) => {
        if (ctx.state === 'closed') return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, startAt);
        g.gain.setValueAtTime(Math.max(0.0001, volume), startAt);
        g.gain.exponentialRampToValueAtTime(0.0001, startAt + Math.max(0.02, duration));
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(startAt);
        osc.stop(startAt + duration);
      };

      const playCaller = () => {
        const t = ctx.currentTime;
        scheduleTone(900, t + 0.00, 0.12, 'sine', 0.18);
        scheduleTone(900, t + 0.32, 0.12, 'sine', 0.18);
      };

      const playCallee = () => {
        const t = ctx.currentTime;
        scheduleTone(523.25, t + 0.00, 0.18, 'triangle', 0.12); // C5
        scheduleTone(659.25, t + 0.22, 0.18, 'triangle', 0.12); // E5
        scheduleTone(783.99, t + 0.44, 0.22, 'triangle', 0.12); // G5
      };

      const playOnce = () => {
        if (kind === 'caller') playCaller();
        else playCallee();
      };

      const intervalMs = kind === 'caller' ? 1400 : 2000;
      playOnce();
      intervalRef.current = setInterval(playOnce, intervalMs);
    } catch (_) {}
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Safely close AudioContext
      if (ctxRef.current) {
        const ctx = ctxRef.current;
        ctxRef.current = null;
        try {
          if (ctx.state !== 'closed') {
            const closeResult = ctx.close();
            if (closeResult && typeof closeResult === 'object' && 'catch' in closeResult) {
              (closeResult as Promise<void>).catch(() => {}); // Silently ignore
            }
          }
        } catch (_) {
          // Silently ignore - context might already be closed
        }
      }
    };
  }, [play, kind]);
}

function ChatContent() {
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocketClient | null>(null);
  const [prefilledIncomingCall, setPrefilledIncomingCall] = useState<any>(null);
  const [incomingGlobalCall, setIncomingGlobalCall] = useState<any>(null);
  const [isDecliningCall, setIsDecliningCall] = useState(false);
  const [callerInfo, setCallerInfo] = useState<any>(null);

  useRingtone(!!incomingGlobalCall, 'callee');

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

  // Global call listener: ensure incoming calls are visible even if the user isn't inside that chat yet.
  useEffect(() => {
    if (!ws) return;

    const onCall = async (data: any) => {
      try {
        const callData = typeof data === 'string' ? JSON.parse(data) : data;
        if (callData?.type === 'call' && callData?.chat_id) {
          setIncomingGlobalCall(callData);
          
          // Load caller information
          if (callData?.caller_id) {
            try {
              const caller = await userApi.getUserById(callData.caller_id);
              setCallerInfo(caller);
            } catch (err) {
              console.error('Failed to load caller info:', err);
              setCallerInfo(null);
            }
          }
        }
      } catch (e) {
        console.error('Failed to handle incoming call event:', e);
      }
    };

    const onCallEnded = (data: any) => {
      try {
        const callData = typeof data === 'string' ? JSON.parse(data) : data;
        // If the call was declined/ended, clear the incoming call modal
        if (callData?.type === 'call_ended' || callData?.status === 'ended') {
          setIncomingGlobalCall(null);
          setPrefilledIncomingCall(null);
          setCallerInfo(null);
        }
      } catch (e) {
        console.error('Failed to handle call ended event:', e);
      }
    };

    ws.on('call', onCall);
    ws.on('call_ended', onCallEnded);
    return () => {
      ws.off('call', onCall);
      ws.off('call_ended', onCallEnded);
    };
  }, [ws]);

  const acceptIncomingCall = async () => {
    if (!incomingGlobalCall) return;
    // Open the chat window and auto-accept inside ChatWindow
    setSelectedChat(String(incomingGlobalCall.chat_id));
    setPrefilledIncomingCall({ ...(incomingGlobalCall || {}), autoAccept: true });
    setIncomingGlobalCall(null);
  };

  const declineIncomingCall = async () => {
    if (isDecliningCall) return; // Prevent double-click
    const callId = incomingGlobalCall?.call_id || incomingGlobalCall?.id;
    
    setIsDecliningCall(true);
    // Immediately clear state to close modal - this happens synchronously
    setIncomingGlobalCall(null);
    setPrefilledIncomingCall(null);
    
    if (callId) {
      try {
        await callApi.endCall(String(callId));
      } catch (e) {
        console.error('Failed to end call:', e);
        // Even if API call fails, modal is already closed
      } finally {
        setIsDecliningCall(false);
      }
    } else {
      setIsDecliningCall(false);
    }
  };

  const connectWebSocket = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No token found, skipping WebSocket connection');
        return;
      }

      // First, check if backend is reachable via health check
      try {
        await api.get('/health');
        console.log('✅ Backend health check passed');
      } catch (healthError) {
        console.error('❌ Backend health check failed:', healthError);
        console.error('💡 Make sure the backend server is running!');
        console.error('   For localhost: Run `cd back-end && go run main.go`');
        console.error('   Backend should be listening on port 8080');
        // Continue anyway - maybe health endpoint is not available
      }

      // WebSocketClient constructor will use getWsUrlRuntime() if no URL provided
      // This handles both build-time env vars and runtime detection
      const client = new WebSocketClient(undefined, token);

      // Set a timeout for connection (10 seconds)
      const connectionTimeout = setTimeout(() => {
        console.error('⏱️ WebSocket connection timeout after 10 seconds');
        console.error('💡 TROUBLESHOOTING:');
        console.error('   1. Make sure the backend server is running');
        console.error('   2. Check if the WebSocket URL is correct');
        console.error('   3. For localhost: Backend should be on port 8080');
        console.error('   4. For production: Set NEXT_PUBLIC_WS_URL environment variable');
        console.error('   5. Check browser console for CORS or network errors');
      }, 10000);

      try {
        await client.connect();
        clearTimeout(connectionTimeout);
        setWs(client);
      } catch (error: any) {
        clearTimeout(connectionTimeout);
        console.error('Failed to connect WebSocket:', error);
        console.error('💡 TROUBLESHOOTING:');
        console.error('   1. Make sure the backend server is running');
        console.error('   2. Check if the WebSocket URL is correct');
        console.error('   3. For localhost: Backend should be on port 8080');
        console.error('   4. For production: Set NEXT_PUBLIC_WS_URL environment variable');
        console.error('   5. Check browser console for CORS or network errors');
        // Don't set ws on error, so UI can show connection failed state
        // But don't throw - let the reconnect mechanism handle it
      }
    } catch (error) {
      console.error('Failed to initialize WebSocket client:', error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className={`flex h-dvh max-h-dvh overflow-hidden ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {incomingGlobalCall && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
          <div className={`${actualTheme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} w-full max-w-sm rounded-xl shadow-xl border ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} p-6 animate-scale-in`}>
            <div className="text-center mb-4">
              {/* Caller Avatar */}
              <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                {callerInfo?.avatar ? (
                  <img src={callerInfo.avatar} alt={callerInfo.username || 'Caller'} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-white">
                    {(callerInfo?.username || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              
              {/* Caller Name */}
              <h3 className="text-xl font-semibold mb-1">
                {callerInfo?.username || 'Unknown User'}
              </h3>
              
              {/* Call Type */}
              <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {incomingGlobalCall?.call_type === 'video' ? '📹 Video Call' : '📞 Voice Call'}
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={declineIncomingCall}
                disabled={isDecliningCall}
                className={`flex-1 px-4 py-3 rounded-lg bg-red-500 text-white hover:bg-red-600 transition font-medium ${
                  isDecliningCall ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isDecliningCall ? 'Declining...' : 'Decline'}
              </button>
              <button
                onClick={acceptIncomingCall}
                className="flex-1 px-4 py-3 rounded-lg bg-green-500 text-white hover:bg-green-600 transition font-medium"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Desktop: Sidebar always visible, Mobile: Show sidebar when no chat selected; mobilde footer için yer bırak */}
      <div className={`${
        selectedChat 
          ? 'hidden md:block'
          : 'block'
      } w-full md:w-[420px] flex-shrink-0 min-h-0 overflow-hidden ${
        !selectedChat ? 'h-[calc(100dvh-4.5rem)] md:h-full' : 'h-full'
      }`}>
        <Sidebar onChatSelect={setSelectedChat} selectedChat={selectedChat} />
      </div>
      
      {/* Chat Window: Desktop always visible, Mobile: Show when chat selected */}
      <div className={`${
        selectedChat 
          ? 'block'
          : 'hidden md:flex'
      } flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
        {selectedChat ? (
          <ChatWindow
            chatId={selectedChat}
            ws={ws}
            onBack={() => setSelectedChat(null)}
            prefilledIncomingCall={prefilledIncomingCall}
          />
        ) : (
          <div className={`hidden md:flex flex-1 items-center justify-center ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <div className="text-center">
              <div className={`w-24 h-24 ${actualTheme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className={`text-2xl font-semibold mb-2 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                {t('welcomeToChatApp')}
              </h2>
              <p className={`mb-4 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('selectChat')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mobil: Sohbet listesi/gruplar/contacts görünürken footer her zaman altta; iki kişi mesajlaşma ekranında gizli */}
      {!selectedChat ? (
        <div
          className="fixed bottom-0 left-0 right-0 z-[35] md:hidden"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <BottomNav />
        </div>
      ) : null}
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
