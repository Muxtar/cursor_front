'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import ChatWindow from '@/components/ChatWindow';
import { useSearchParams } from 'next/navigation';
import { callApi, userApi } from '@/lib/api';
import { useChatState } from '@/components/AppLayout';

type RingtoneKind = 'caller' | 'callee';

function useRingtone(play: boolean, kind: RingtoneKind = 'callee') {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (!play) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      if (ctxRef.current) {
        const ctx = ctxRef.current;
        ctxRef.current = null;
        try {
          if (ctx.state !== 'closed') {
            const closeResult = ctx.close();
            if (closeResult && typeof closeResult === 'object' && 'catch' in closeResult) {
              (closeResult as Promise<void>).catch(() => {});
            }
          }
        } catch (_) {}
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
        g.gain.setValueAtTime(volume, startAt);
        g.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
        osc.connect(g).connect(ctx.destination);
        osc.start(startAt);
        osc.stop(startAt + duration);
      };
      const playPattern = () => {
        if (!ctxRef.current || ctx.state === 'closed') return;
        const now = ctx.currentTime;
        if (kind === 'caller') {
          scheduleTone(900, now, 0.3, 'sine', 0.15);
          scheduleTone(900, now + 0.5, 0.3, 'sine', 0.15);
        } else {
          scheduleTone(523.25, now, 0.15, 'sine', 0.18);
          scheduleTone(659.25, now + 0.15, 0.15, 'sine', 0.18);
          scheduleTone(783.99, now + 0.3, 0.25, 'sine', 0.18);
        }
      };
      playPattern();
      intervalRef.current = setInterval(playPattern, kind === 'caller' ? 3000 : 2500);
    } catch (_) {}
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (ctxRef.current) {
        const ctx = ctxRef.current;
        ctxRef.current = null;
        try {
          if (ctx.state !== 'closed') {
            const closeResult = ctx.close();
            if (closeResult && typeof closeResult === 'object' && 'catch' in closeResult) {
              (closeResult as Promise<void>).catch(() => {});
            }
          }
        } catch (_) {}
      }
    };
  }, [play, kind]);
}

function ChatContent() {
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const { t } = useLanguage();
  const searchParams = useSearchParams();

  // Get shared state from AppLayout (persistent Sidebar + WebSocket)
  const { selectedChat, setSelectedChat, ws } = useChatState();

  const [prefilledIncomingCall, setPrefilledIncomingCall] = useState<any>(null);
  const [incomingGlobalCall, setIncomingGlobalCall] = useState<any>(null);
  const [isDecliningCall, setIsDecliningCall] = useState(false);
  const [callerInfo, setCallerInfo] = useState<any>(null);

  useRingtone(!!incomingGlobalCall, 'callee');

  useEffect(() => {
    const openChatId = searchParams.get('open');
    if (openChatId) setSelectedChat(openChatId);
  }, [searchParams]);

  // Global call listener
  useEffect(() => {
    if (!ws) return;

    const onCall = async (data: any) => {
      try {
        const callData = typeof data === 'string' ? JSON.parse(data) : data;
        if (callData?.type === 'call' && callData?.chat_id) {
          setIncomingGlobalCall(callData);
          if (callData?.caller_id) {
            try {
              const caller = await userApi.getUserById(callData.caller_id);
              setCallerInfo(caller);
            } catch (err) {
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
        if (callData?.type === 'call_ended' || callData?.status === 'ended') {
          setIncomingGlobalCall(null);
          setPrefilledIncomingCall(null);
          setCallerInfo(null);
        }
      } catch (e) {}
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
    setSelectedChat(String(incomingGlobalCall.chat_id));
    setPrefilledIncomingCall({ ...(incomingGlobalCall || {}), autoAccept: true });
    setIncomingGlobalCall(null);
  };

  const declineIncomingCall = async () => {
    if (isDecliningCall) return;
    const callId = incomingGlobalCall?.call_id || incomingGlobalCall?.id;
    setIsDecliningCall(true);
    setIncomingGlobalCall(null);
    setPrefilledIncomingCall(null);
    if (callId) {
      try { await callApi.endCall(String(callId)); } catch (e) {}
      finally { setIsDecliningCall(false); }
    } else {
      setIsDecliningCall(false);
    }
  };

  if (!user) return null;

  return (
    <div className={`flex flex-col h-full min-h-0 overflow-hidden ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Incoming call modal */}
      {incomingGlobalCall && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
          <div className={`${actualTheme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} w-full max-w-sm rounded-xl shadow-xl border ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} p-6 animate-scale-in`}>
            <div className="text-center mb-4">
              <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                {callerInfo?.avatar ? (
                  <img src={callerInfo.avatar} alt={callerInfo.username || 'Caller'} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-white">
                    {(callerInfo?.username || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-semibold mb-1">{callerInfo?.username || 'Unknown User'}</h3>
              <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {incomingGlobalCall?.call_type === 'video' ? '📹 Video Call' : '📞 Voice Call'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={declineIncomingCall}
                disabled={isDecliningCall}
                className={`flex-1 px-4 py-3 rounded-lg bg-red-500 text-white hover:bg-red-600 transition font-medium ${isDecliningCall ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isDecliningCall ? 'Declining...' : 'Decline'}
              </button>
              <button onClick={acceptIncomingCall} className="flex-1 px-4 py-3 rounded-lg bg-green-500 text-white hover:bg-green-600 transition font-medium">
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Window or empty placeholder */}
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
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" /></div>}>
      <ChatContent />
    </Suspense>
  );
}
