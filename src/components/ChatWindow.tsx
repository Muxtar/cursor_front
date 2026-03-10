'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { chatApi, fileApi, messageApi, typingApi, contactApi, userApi, callApi, getFileBaseUrl } from '@/lib/api';
import { WebSocketClient } from '@/lib/websocket';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

// Full URL for message file/image (uses same base as API so localhost works)
const getMessageFileUrl = (fileUrl: string | undefined): string => {
  if (!fileUrl) return '';
  const base = getFileBaseUrl();
  if (fileUrl.startsWith('http')) return fileUrl;
  if (fileUrl.startsWith('/api/v1/files/')) return base + fileUrl;
  if (fileUrl.startsWith('/uploads/')) return base + '/api/v1/files/' + fileUrl.replace(/^\/uploads\//, '');
  return base + fileUrl;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
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
  /** If an incoming call arrives while this chat isn't mounted, parent can pass it here. */
  prefilledIncomingCall?: any;
}

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function ChatWindow({ chatId, ws, onBack, prefilledIncomingCall }: ChatWindowProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const router = useRouter();
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
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageLongPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messageLongPressMessageRef = useRef<Message | null>(null);
  const messageJustDidLongPressRef = useRef(false);
  const selectedMessageBubbleRef = useRef<HTMLDivElement>(null);
  const [messageMenuOpenUp, setMessageMenuOpenUp] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCallStateRaw] = useState<any>(null);
  const [otherPartyInfo, setOtherPartyInfo] = useState<any>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStreamStateRaw] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  // Wrapped setters with logging to track when state is cleared
  const setActiveCall = (value: any) => {
    if (value === null && activeCall !== null) {
      console.log('🔄 setActiveCall(null) called', {
        previous_call_id: activeCall?.call_id || activeCall?.id,
        timestamp: new Date().toISOString(),
        stack: new Error().stack?.split('\n').slice(1, 5).join('\n'),
      });
    } else if (value !== null && activeCall === null) {
      console.log('🔄 setActiveCall(new call) called', {
        call_id: value?.call_id || value?.id,
        call_type: value?.type || value?.call_type,
        timestamp: new Date().toISOString(),
      });
    }
    setActiveCallStateRaw(value);
  };
  
  const setLocalStream = (value: MediaStream | null) => {
    if (value === null && localStream !== null) {
      console.log('🔄 setLocalStream(null) called', {
        previous_stream_tracks: localStream.getTracks().length,
        timestamp: new Date().toISOString(),
        stack: new Error().stack?.split('\n').slice(1, 5).join('\n'),
      });
    } else if (value !== null && localStream === null) {
      console.log('🔄 setLocalStream(new stream) called', {
        tracks: value.getTracks().length,
        video_tracks: value.getVideoTracks().length,
        audio_tracks: value.getAudioTracks().length,
        timestamp: new Date().toISOString(),
      });
    }
    setLocalStreamStateRaw(value);
  };
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const markedReadRef = useRef<Set<string>>(new Set());
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const iceCandidateQueueRef = useRef<RTCIceCandidate[]>([]);
  const MAX_ICE_CANDIDATE_QUEUE_SIZE = 50; // Limit queue size to prevent memory issues
  const isSettingRemoteDescriptionRef = useRef<boolean>(false);
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ringtoneAudioContextRef = useRef<AudioContext | null>(null);
  const isPlayingRingtoneRef = useRef(false);
  const isStartingVideoCallRef = useRef(false); // Prevent duplicate startVideoCall calls
  const isAcceptingCallRef = useRef(false); // Prevent race condition between acceptCall and handleWebRTCOffer
  const localStreamRef = useRef<MediaStream | null>(null); // Ref to track local stream for handleCallAnswered
  const activeCallRef = useRef<any>(null); // Ref to track active call for handleCallAnswered
  const processingCallAnsweredRef = useRef(false); // Prevent duplicate handleCallAnswered calls
  const lastCallAnsweredIdRef = useRef<string | null>(null); // Track last processed call_answered event
  
  // Deduplication for call_ended events
  const processedCallEndedIdsRef = useRef<Set<string>>(new Set()); // Track processed call_ended message_ids
  const lastCallEndedIdRef = useRef<string | null>(null); // Track last processed call_ended call_id
  
  // Perfect Negotiation: Track polite/impolite peer
  const isPoliteRef = useRef<boolean>(false); // true = we received offer first (polite), false = we sent offer first (impolite)
  const makingOfferRef = useRef<boolean>(false); // Track if we're currently making an offer
  
  // Deduplication: Track processed WebRTC messages by messageId
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  const processedSDPHashesRef = useRef<Set<string>>(new Set()); // Hash of SDP for dedup
  const processedICECandidatesRef = useRef<Set<string>>(new Set()); // Hash of ICE candidate for dedup
  
  // Mutex for setRemoteDescription operations
  const settingRemoteDescriptionRef = useRef<boolean>(false);
  const settingLocalDescriptionRef = useRef<boolean>(false);

  // Çağrı sesi: gelen arama veya karşı taraf cevap verene kadar (çağıran taraf) çalar
  const stopRingtone = () => {
    // Prevent multiple calls - check if already stopped
    if (!ringtoneIntervalRef.current && !ringtoneAudioContextRef.current) {
      return;
    }
    
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    
    // Safely close AudioContext - AGGRESSIVE error handling
    if (ringtoneAudioContextRef.current) {
      const ctx = ringtoneAudioContextRef.current;
      // Store reference and clear ref immediately to prevent double cleanup
      ringtoneAudioContextRef.current = null;
      
      // Wrap entire close operation in try-catch to prevent any errors from propagating
      try {
        // Check state first
        let state: string;
        try {
          state = ctx.state;
        } catch (e: any) {
          // Context might be in invalid state, can't check state - just return
          return;
        }
        
        // If already closed, do nothing
        if (state === 'closed') {
          return;
        }
        
        // Only attempt to close if not already closed
        if (state === 'running' || state === 'suspended') {
          try {
            // close() may throw synchronously or return a promise that rejects
            const closeResult = ctx.close();
            
            // Handle promise rejection if close() returns a promise
            if (closeResult && typeof closeResult === 'object' && 'catch' in closeResult) {
              (closeResult as Promise<void>).catch((err: any) => {
                // Silently ignore ALL errors - context might be closing/closed by another call
                // This is expected behavior in concurrent scenarios
              });
            }
          } catch (e: any) {
            // Synchronous error during close() - silently ignore
            // This happens when context is already closed or in invalid state
          }
        }
      } catch (e: any) {
        // Any other error - silently ignore
        // Context cleanup is best-effort, errors here are not critical
      }
    }
    
    // Mark as stopped
    isPlayingRingtoneRef.current = false;
  };

  type RingtoneKind = 'caller' | 'callee';

  const playRingtone = (kind: RingtoneKind) => {
    if (typeof window === 'undefined') return;
    stopRingtone();
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      ringtoneAudioContextRef.current = ctx;

      const scheduleTone = (frequency: number, startAt: number, duration: number, type: OscillatorType, volume: number) => {
        if (ctx.state === 'closed') return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, startAt);
        gain.gain.setValueAtTime(Math.max(0.0001, volume), startAt);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + Math.max(0.02, duration));
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startAt);
        osc.stop(startAt + duration);
      };

      // caller: "diit diit" -> iki kısa bip, sonra kısa bekleme
      const playCaller = () => {
        const t = ctx.currentTime;
        scheduleTone(900, t + 0.00, 0.12, 'sine', 0.18);
        scheduleTone(900, t + 0.32, 0.12, 'sine', 0.18);
      };

      // callee: basit "çalgi müziği" -> kısa melodi (3 nota)
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

      // interval: caller daha sık, callee daha seyrek/melodik
      const intervalMs = kind === 'caller' ? 1400 : 2000;
      playOnce();
      ringtoneIntervalRef.current = setInterval(playOnce, intervalMs);
    } catch (e) {
      console.warn('Ringtone failed:', e);
    }
  };

  useEffect(() => {
    // Ringtone çalma koşulları:
    // 1. Gelen arama varsa (callee) - her zaman çal
    // 2. Aktif arama var ama remote stream yoksa (caller veya callee bağlantı kurulmamış) - çal
    const hasIncomingCall = !!incomingCall;
    const hasActiveCallWithoutConnection = !!activeCall && !remoteStream;
    const shouldRing = hasIncomingCall || hasActiveCallWithoutConnection;
    
    // Prevent infinite loops - only change if state actually changed
    const wasPlaying = isPlayingRingtoneRef.current;
    
    if (!shouldRing) {
      if (wasPlaying) {
        stopRingtone();
        isPlayingRingtoneRef.current = false;
      }
      return;
    }

    // Only start ringtone if we're not already playing
    if (!wasPlaying) {
      // Ringtone tipi: gelen arama varsa 'callee', yoksa 'caller' (arayan kişi)
      const kind: RingtoneKind = hasIncomingCall ? 'callee' : 'caller';
      console.log(`🔔 Playing ringtone: ${kind} (incomingCall: ${hasIncomingCall}, activeCall: ${!!activeCall}, remoteStream: ${!!remoteStream})`);
      playRingtone(kind);
      isPlayingRingtoneRef.current = true;
    }
    
    return () => {
      // Cleanup function - safely stop ringtone when component unmounts or dependencies change
      if (isPlayingRingtoneRef.current) {
        stopRingtone();
        isPlayingRingtoneRef.current = false;
      }
    };
  }, [incomingCall, activeCall, remoteStream]);

  // Local video stream'i video element'e bağla
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      const hasVideo = localStream.getVideoTracks().length > 0;
      if (hasVideo) {
        console.log('📹 Setting local video stream to video element');
        localVideoRef.current.srcObject = localStream;
        // Ensure video plays (only if not already playing to prevent loops)
        if (localVideoRef.current.paused) {
          localVideoRef.current.play().catch(err => {
            // Silently ignore AbortError - this happens when stream changes quickly
            if (err.name !== 'AbortError') {
              console.warn('⚠️ Failed to play local video:', err);
            }
          });
        }
      } else {
        localVideoRef.current.srcObject = null;
      }
    } else if (localVideoRef.current && !localStream) {
      localVideoRef.current.srcObject = null;
    }
  }, [localStream]); // Removed activeCall dependency to prevent loops

  // Remote video/audio stream'i video/audio element'lere bağla
  useEffect(() => {
    const videoElement = remoteVideoRef.current;
    const audioElement = remoteAudioRef.current;
    
    // If video element doesn't exist yet but we have an active call, wait a bit for it to mount
    if (!videoElement && activeCall && (activeCall.type === 'video' || activeCall.call_type === 'video')) {
      console.log('⏳ Video element not mounted yet, waiting...');
      const checkMount = setInterval(() => {
        if (remoteVideoRef.current) {
          clearInterval(checkMount);
          // Trigger re-run by setting a dummy state or force update
          console.log('✅ Video element mounted, will set stream...');
        }
      }, 100);
      
      return () => clearInterval(checkMount);
    }
    
    if (!videoElement && !audioElement) return;
    
    if (remoteStream && videoElement) {
      const currentRemoteStream = remoteStream as MediaStream;
      const videoTracks = currentRemoteStream.getVideoTracks();
      console.log('📹 Setting remote video stream to video element', {
        hasStream: !!remoteStream,
        videoTracks: videoTracks.length,
        tracksEnabled: videoTracks.map(t => t.enabled),
        tracksReadyState: videoTracks.map(t => t.readyState),
      });
      
      // Ensure video tracks are enabled and live
      videoTracks.forEach(track => {
        if (!track.enabled) {
          console.log('⚠️ Enabling video track');
          track.enabled = true;
        }
        if (track.readyState !== 'live') {
          console.log(`⚠️ Video track readyState is ${track.readyState}, waiting for 'live'...`);
        }
      });
      
      // Only set srcObject if it's different to avoid unnecessary reloads
      if (videoElement.srcObject !== currentRemoteStream) {
        console.log('🔄 Setting video element srcObject...');
        videoElement.srcObject = currentRemoteStream;
        // Don't call load() - it resets the stream and causes issues
      }
      
      videoElement.muted = false; // Ensure not muted
      
      // Force play immediately - don't wait
      if (videoElement.paused) {
        console.log('🔄 Force playing video immediately...');
        videoElement.play().catch(err => {
          if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
            console.warn('⚠️ Failed to force play video:', err);
          }
        });
      }
      
      // Note: Video tracks should already be 'live' when received via ontrack
      // But we'll check anyway and try to play when ready
      
      // Log video element state
      console.log('📹 Video element state:', {
        paused: videoElement.paused,
        readyState: videoElement.readyState,
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight,
        srcObject: !!videoElement.srcObject,
        muted: videoElement.muted,
      });
      
      // Force play function
      const forcePlay = async () => {
        try {
          if (!videoElement || !remoteStream) return;
          
          // Check if stream still matches
          if (videoElement.srcObject !== currentRemoteStream) {
            console.log('⚠️ Stream changed, skipping play');
            return;
          }
          
          // Check if video is ready
          if (videoElement.readyState < 2) {
            console.log(`⏳ Video not ready yet (readyState: ${videoElement.readyState}), waiting...`);
            return;
          }
          
          // Check if video tracks are live
          const currentVideoTracks = currentRemoteStream.getVideoTracks();
          const hasLiveVideoTrack = currentVideoTracks.some(t => t.readyState === 'live' && t.enabled);
          if (!hasLiveVideoTrack) {
            console.log('⏳ No live video tracks yet, waiting...');
            return;
          }
          
          // Try to play
          if (videoElement.paused) {
            await videoElement.play();
            console.log('✅ Remote video playing', {
              videoWidth: videoElement.videoWidth,
              videoHeight: videoElement.videoHeight,
              readyState: videoElement.readyState,
            });
          } else {
            console.log('✅ Remote video already playing');
          }
        } catch (err: any) {
          // Silently ignore AbortError - this happens when stream changes quickly
          if (err.name !== 'AbortError') {
            console.warn('⚠️ Failed to play video:', err);
          }
        }
      };
      
      // Event handlers
      const handleLoadedMetadata = () => {
        console.log('📹 Video loadedmetadata event');
        if (videoElement.srcObject === currentRemoteStream) {
          forcePlay();
        }
      };
      
      const handleLoadedData = () => {
        console.log('📹 Video loadeddata event');
        if (videoElement.srcObject === currentRemoteStream) {
          forcePlay();
        }
      };
      
      const handleCanPlay = () => {
        console.log('📹 Video canplay event');
        if (videoElement.srcObject === currentRemoteStream) {
          forcePlay();
        }
      };
      
      const handleCanPlayThrough = () => {
        console.log('📹 Video canplaythrough event');
        if (videoElement.srcObject === currentRemoteStream) {
          forcePlay();
        }
      };
      
      const handlePlaying = () => {
        console.log('✅ Video playing event');
      };
      
      // Add event listeners
      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.addEventListener('loadeddata', handleLoadedData);
      videoElement.addEventListener('canplay', handleCanPlay);
      videoElement.addEventListener('canplaythrough', handleCanPlayThrough);
      videoElement.addEventListener('playing', handlePlaying);
      
      // Try to play after delays (progressive retry)
      const retryTimeout1 = setTimeout(() => {
        if (videoElement && videoElement.srcObject === currentRemoteStream && videoElement.paused && videoElement.readyState >= 2) {
          console.log('🔄 Retrying video play after 500ms...');
          forcePlay();
        }
      }, 500);
      
      const retryTimeout2 = setTimeout(() => {
        if (videoElement && videoElement.srcObject === currentRemoteStream && videoElement.paused && videoElement.readyState >= 2) {
          console.log('🔄 Retrying video play after 1000ms...');
          forcePlay();
        }
      }, 1000);
      
      const retryTimeout3 = setTimeout(() => {
        if (videoElement && videoElement.srcObject === currentRemoteStream && videoElement.paused) {
          console.log('🔄 Final retry video play after 2000ms...');
          // Force play even if readyState is low - sometimes it works
          videoElement.play().catch(err => {
            if (err.name !== 'AbortError') {
              console.warn('⚠️ Final retry failed:', err);
            }
          });
        }
      }, 2000);
      
      // Also try when video element becomes ready (even if readyState was 0)
      const checkInterval = setInterval(() => {
        if (videoElement && videoElement.srcObject === currentRemoteStream) {
          if (videoElement.readyState >= 2 && videoElement.paused) {
            console.log('🔄 Video became ready, attempting play...');
            videoElement.play().catch(err => {
              if (err.name !== 'AbortError') {
                console.warn('⚠️ Play failed:', err);
              }
            });
            clearInterval(checkInterval);
          }
        } else {
          clearInterval(checkInterval);
        }
      }, 200);
      
      // Clear interval after 10 seconds
      const intervalTimeout = setTimeout(() => {
        clearInterval(checkInterval);
      }, 10000);
      
      // Cleanup on unmount or stream change
      return () => {
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('loadeddata', handleLoadedData);
        videoElement.removeEventListener('canplay', handleCanPlay);
        videoElement.removeEventListener('canplaythrough', handleCanPlayThrough);
        videoElement.removeEventListener('playing', handlePlaying);
        clearTimeout(retryTimeout1);
        clearTimeout(retryTimeout2);
        clearTimeout(retryTimeout3);
        clearTimeout(intervalTimeout);
        clearInterval(checkInterval);
      };
    } else if (videoElement) {
      videoElement.srcObject = null;
    }
    
    if (audioElement && remoteStream) {
      const audioStream = remoteStream as MediaStream;
      const audioTracks = audioStream.getAudioTracks();
      console.log('🔊 Setting remote audio stream to audio element', {
        hasStream: !!remoteStream,
        audioTracks: audioTracks.length,
        tracksEnabled: audioTracks.map(t => t.enabled),
      });
      
      // Ensure audio tracks are enabled
      audioTracks.forEach(track => {
        if (!track.enabled) {
          console.log('⚠️ Enabling audio track');
          track.enabled = true;
        }
      });
      
      audioElement.srcObject = audioStream;
      
      // Force play audio
      const playAudio = async () => {
        try {
          if (audioElement && audioElement.paused) {
            await audioElement.play();
            console.log('✅ Remote audio playing');
          }
        } catch (err: any) {
          // Silently ignore AbortError - this happens when stream changes quickly
          if (err.name !== 'AbortError') {
            console.warn('⚠️ Failed to play remote audio:', err);
          }
        }
      };
      
      playAudio();
    } else if (audioElement && !remoteStream) {
      audioElement.srcObject = null;
    }
  }, [remoteStream, activeCall]); // Added activeCall to trigger when video UI mounts

  // Random isim generator (anonymous mesajlar için)
  const generateRandomName = (seed: string): string => {
    const adjectives = ['Cool', 'Mysterious', 'Bright', 'Swift', 'Calm', 'Bold', 'Wise', 'Gentle', 'Brave', 'Clever'];
    const nouns = ['Tiger', 'Eagle', 'Wolf', 'Phoenix', 'Dragon', 'Lion', 'Falcon', 'Bear', 'Fox', 'Hawk'];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const adjIndex = Math.abs(hash) % adjectives.length;
    const nounIndex = Math.abs(hash >> 8) % nouns.length;
    return `${adjectives[adjIndex]} ${nouns[nounIndex]}`;
  };
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initializeChat = async () => {
      await loadContacts();
      await loadChatInfo();
    };
    initializeChat();
    loadMessages();
    loadOnlineUsers();
    if (ws) {
      ws.joinChat(chatId);
      ws.on('message', handleNewMessage);
      ws.on('typing', handleTyping);
      ws.on('call', handleIncomingCall);
      ws.on('call_answered', handleCallAnswered);
      ws.on('call_ended', handleCallEnded);
      ws.on('message_read', handleMessageRead);
      ws.on('webrtc_offer', handleWebRTCOffer);
      ws.on('webrtc_answer', handleWebRTCAnswer);
      ws.on('webrtc_ice', handleWebRTCICE);
    }

    // Refresh online status every 10 seconds
    const interval = setInterval(() => {
      loadOnlineUsers();
    }, 10000);

    return () => {
      if (ws) {
        ws.leaveChat(chatId);
        ws.off('message', handleNewMessage);
        ws.off('typing', handleTyping);
        ws.off('call', handleIncomingCall);
        ws.off('call_answered', handleCallAnswered);
        ws.off('call_ended', handleCallEnded);
        ws.off('message_read', handleMessageRead);
        ws.off('webrtc_offer', handleWebRTCOffer);
        ws.off('webrtc_answer', handleWebRTCAnswer);
        ws.off('webrtc_ice', handleWebRTCICE);
      }
      clearInterval(interval);
      // INSTRUMENTATION: Log why cleanup fired
      const cleanupReason = (() => {
        if (!chatId) return 'chatId_null';
        if (!ws) return 'ws_null';
        return 'effect_cleanup';
      })();
      console.log('🧹 useEffect cleanup firing', {
        reason: cleanupReason,
        chatId: chatId,
        ws_instance: ws ? `exists_${ws.constructor.name}` : 'null',
        ws_instance_id: ws ? (ws as any).id || 'no_id' : 'null',
        hasActiveCall: !!activeCall,
        activeCall_id: activeCall?.call_id || activeCall?.id || null,
      });
      stopVideoCall(cleanupReason, { chatId_changed: chatId, ws_instance: ws ? 'exists' : 'null' });
    };
  }, [chatId, ws]);

  // If parent provides an incoming call (received while this chat wasn't mounted),
  // apply it once when it matches this chat.
  useEffect(() => {
    if (!prefilledIncomingCall) return;
    const callData = typeof prefilledIncomingCall === 'string' ? JSON.parse(prefilledIncomingCall) : prefilledIncomingCall;
    const callId = callData?.call_id || callData?.id;
    const currentId = incomingCall?.call_id || incomingCall?.id;
    if (callData?.type === 'call' && callData?.chat_id === chatId && callId && callId !== currentId) {
      setIncomingCall(callData);
      if (callData?.autoAccept) {
        // Auto-accept when parent accepted from global modal
        setTimeout(() => {
          acceptCall(callData);
        }, 0);
      }
    }
  }, [prefilledIncomingCall, chatId, incomingCall]);

  // Video stream cleanup
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (remoteStream) {
        (remoteStream as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream, remoteStream]);

  const handleIncomingCall = (data: any) => {
    try {
      const callData = typeof data === 'string' ? JSON.parse(data) : data;
      if (callData.type === 'call' && callData.chat_id === chatId) {
        // CRITICAL FIX: Ignore call events where caller_id matches current user
        // This prevents caller from receiving their own call event
        const myId = String(user?.id || user?._id || '');
        const callerId = callData?.caller_id || callData?.callerId;
        
        if (callerId && String(callerId) === myId) {
          console.log('⚠️ Ignoring own call event (caller_id matches current user)', {
            call_id: callData?.call_id,
            caller_id: callerId,
            my_id: myId,
          });
          return;
        }
        
        // Also ignore if we already have an active call (to prevent UI conflicts)
        if (activeCall) {
          console.log('⚠️ Ignoring incoming call event (active call already exists)', {
            incoming_call_id: callData?.call_id,
            active_call_id: activeCall?.call_id || activeCall?.id,
          });
          return;
        }
        
        console.log('📞 Received incoming call event', {
          call_id: callData?.call_id,
          caller_id: callerId,
          call_type: callData?.call_type,
        });
        setIncomingCall(callData);
      }
    } catch (error) {
      console.error('Failed to parse call data:', error);
    }
  };

  const handleCallAnswered = async (data: any) => {
    try {
      const evt = typeof data === 'string' ? JSON.parse(data) : data;
      if (evt?.type === 'call_answered' && evt?.chat_id === chatId) {
        const messageId = evt?.message_id;
        const callId = evt?.call_id || evt?.id;
        
        // INSTRUMENTATION: Log received event
        console.log('📥 call_answered received', {
          type: 'call_answered',
          call_id: callId,
          chat_id: evt?.chat_id,
          message_id: messageId,
        });
        
        // DEDUPLICATION: Check messageId in processedMessageIdsRef (shared for all call lifecycle events)
        if (messageId && processedMessageIdsRef.current.has(messageId)) {
          console.log('⚠️ Duplicate call_answered message_id ignored', { message_id: messageId, call_id: callId });
          return;
        }
        
        // Prevent duplicate processing
        if (processingCallAnsweredRef.current) {
          console.log('⚠️ handleCallAnswered already processing, skipping duplicate...');
          return;
        }
        
        if (lastCallAnsweredIdRef.current === callId) {
          console.log('⚠️ call_answered event already processed for this call, skipping...');
          return;
        }
        
        processingCallAnsweredRef.current = true;
        lastCallAnsweredIdRef.current = callId || null;
        if (messageId) processedMessageIdsRef.current.add(messageId);
        
        // Use refs to get current values (state might not be updated yet)
        const currentActiveCall = activeCallRef.current || activeCall;
        const currentLocalStream = localStreamRef.current || localStream;
        
        // INSTRUMENTATION: Structured log
        const myId = String(user?.id || user?._id || '');
        const callerIdFromEvent = evt?.caller_id || currentActiveCall?.caller_id || currentActiveCall?.callerId;
        const isCallerFromEvent = callerIdFromEvent && String(callerIdFromEvent) === myId;
        
        console.log('📞 call_answered event', {
          call_id: callId,
          message_id: messageId,
          answered_by: evt?.answered_by,
          caller_id: callerIdFromEvent,
          my_id: myId,
          is_caller: isCallerFromEvent,
          timestamp: new Date().toISOString(),
          hasLocalStream: !!localStream,
          hasActiveCall: !!activeCall,
          activeCall_caller_id: currentActiveCall?.caller_id || currentActiveCall?.callerId,
          localStreamTracks: localStream ? localStream.getTracks().map(t => ({
            kind: t.kind,
            enabled: t.enabled,
            readyState: t.readyState,
          })) : [],
        });
        
        try {
          // currentActiveCall and currentLocalStream already defined above
          
          // INSTRUMENTATION: Log state before processing
          const myId = String(user?.id || user?._id || '');
          const callerId = currentActiveCall?.caller_id || currentActiveCall?.callerId || evt?.caller_id;
          const isCaller = callerId && String(callerId) === myId;
          
          console.log('📊 State before processing call_answered:', {
            hasActiveCall: !!currentActiveCall,
            hasLocalStream: !!currentLocalStream,
            localStreamRef: !!localStreamRef.current,
            activeCallRef: !!activeCallRef.current,
            my_id: myId,
            caller_id: callerId,
            is_caller: isCaller,
            activeCall_caller_id: currentActiveCall?.caller_id || currentActiveCall?.callerId,
          });
          
          if (!currentActiveCall) {
            console.warn('⚠️ call_answered received but no activeCall found', {
              call_id: callId,
              message_id: messageId,
            });
            return;
          }
          
          // Call was answered by the other party, ensure WebRTC is ready
          console.log('✅ Call answered by other party, ensuring WebRTC connection...', {
            is_caller: isCaller,
            caller_id: callerId,
            my_id: myId,
          });
          
          // Only send offer if we're the caller (check caller_id from call data)
          // Callee should wait for offer, not send it
          if (!isCaller) {
            console.log('📞 We are callee, waiting for offer from caller...', {
              caller_id: callerId,
              my_id: myId,
            });
            return;
          }
          
          console.log('📞 We are caller, will send offer after ensuring stream/PC is ready...', {
            hasPC: !!peerConnectionRef.current,
            hasStream: !!currentLocalStream,
          });
          
          // If we're the caller but don't have peer connection or stream yet, wait a bit and retry
          if (!peerConnectionRef.current || !currentLocalStream) {
            console.warn('⚠️ Missing peer connection or stream, waiting and retrying...', {
              hasPC: !!peerConnectionRef.current,
              hasStream: !!currentLocalStream,
              isStartingVideoCall: isStartingVideoCallRef.current,
            });
            
            // If startVideoCall is in progress, wait for it to complete first
            if (isStartingVideoCallRef.current) {
              console.log('⏳ startVideoCall in progress, waiting for it to complete...');
              let waitCount = 0;
              const maxWait = 50; // 5 seconds max (50 * 100ms)
              while (isStartingVideoCallRef.current && waitCount < maxWait) {
                await new Promise(resolve => setTimeout(resolve, 100));
                waitCount++;
              }
              // Re-check after waiting
              const pcAfterWait = peerConnectionRef.current;
              const streamAfterWait = localStreamRef.current || localStream;
              if (pcAfterWait && streamAfterWait) {
                console.log('✅ Stream and PC ready after waiting for startVideoCall, sending offer...');
                await sendOfferIfReady(pcAfterWait, streamAfterWait, currentActiveCall);
                return;
              }
            }
            
            // Wait a bit for stream/PC to be ready (they might still be initializing)
            let retryCount = 0;
            const maxRetries = 30; // Increased from 10 to 30 (6 seconds total)
            const retryInterval = 200; // 200ms
            
            const retryOffer = setInterval(async () => {
              retryCount++;
              const pc = peerConnectionRef.current;
              const stream = localStreamRef.current || localStream;
              
              if (pc && stream) {
                clearInterval(retryOffer);
                console.log('✅ Stream and PC ready, sending offer...');
                await sendOfferIfReady(pc, stream, currentActiveCall);
              } else if (retryCount >= maxRetries) {
                clearInterval(retryOffer);
                console.error('❌ Timeout waiting for stream/PC to be ready', {
                  hasPC: !!pc,
                  hasStream: !!stream,
                  isStartingVideoCall: isStartingVideoCallRef.current,
                });
              }
            }, retryInterval);
            
            return;
          }
          
          // We have both PC and stream, send offer
          // INSTRUMENTATION: Log state before sending offer
          console.log('📊 State before sending offer:', {
            hasPC: !!peerConnectionRef.current,
            hasStream: !!currentLocalStream,
            streamTracks: currentLocalStream ? currentLocalStream.getTracks().map(t => ({
              kind: t.kind,
              enabled: t.enabled,
              readyState: t.readyState,
            })) : [],
          });
          
          const willCreateOffer = !peerConnectionRef.current?.localDescription;
          await sendOfferIfReady(peerConnectionRef.current, currentLocalStream, currentActiveCall);
          
          // INSTRUMENTATION: Log whether offer was created
          console.log('📞 call_answered processed', {
            call_id: callId,
            message_id: messageId,
            createdOffer: willCreateOffer && !!peerConnectionRef.current?.localDescription,
            hasLocalStream: !!localStream,
            localStreamTracks: localStream ? localStream.getTracks().map(t => ({
              kind: t.kind,
              enabled: t.enabled,
              readyState: t.readyState,
            })) : [],
          });
        } finally {
          // Always reset processing flag
          processingCallAnsweredRef.current = false;
        }
      }
    } catch (error) {
      console.error('❌ Failed to parse call_answered event:', error);
      processingCallAnsweredRef.current = false;
    }
  };
  
  // Helper function to send offer if ready (Perfect Negotiation pattern)
  const sendOfferIfReady = async (pc: RTCPeerConnection, stream: MediaStream, call: any) => {
    const callId = call?.call_id || call?.id;
    
    // PERFECT NEGOTIATION: Check if we're already polite (received offer first)
    if (isPoliteRef.current) {
      console.log('⚠️ Perfect Negotiation: We are polite (received offer first), not sending offer...');
      return;
    }
    
    if (pc.localDescription !== null) {
      console.log('⚠️ Offer already sent, skipping...');
      return;
    }
    
    // MUTEX: Prevent concurrent setLocalDescription
    if (settingLocalDescriptionRef.current) {
      console.log('⚠️ setLocalDescription already in progress, skipping offer creation...');
      return;
    }
    
    try {
      // Ensure tracks are added
      if (pc.getSenders().length === 0) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        console.log('📤 Added local tracks to PC before offer');
      }
      
      // PERFECT NEGOTIATION: Mark that we're making an offer (impolite)
      makingOfferRef.current = true;
      isPoliteRef.current = false;
      
      console.log('📤 Creating offer (caller, after call answered)...');
      const offer = await pc.createOffer();
      settingLocalDescriptionRef.current = true;
      await pc.setLocalDescription(offer);
      settingLocalDescriptionRef.current = false;
      console.log(`✅ Local description set (offer after answer) state=${pc.signalingState} (call_id=${callId})`);
      
      if (ws && callId) {
        ws.send({
          type: 'webrtc_offer',
          chat_id: chatId,
          call_id: callId,
          offer: JSON.stringify(offer),
          message_id: generateMessageId(), // Generate unique messageId
          sender_id: user?.id || user?._id || '',
          timestamp: Date.now(),
        });
        console.log('📤 WebRTC offer sent (caller, after call answered)');
      }
    } catch (err) {
      console.error('❌ Failed to create offer after call answered:', err);
      makingOfferRef.current = false;
      settingLocalDescriptionRef.current = false;
    }
  };

  const handleCallEnded = (data: any) => {
    try {
      const evt = typeof data === 'string' ? JSON.parse(data) : data;
      if (evt?.type === 'call_ended' && evt?.chat_id === chatId) {
        const messageId = evt?.message_id;
        const callId = evt?.call_id || evt?.id;
        const reason = evt?.reason || 'user_ended';
        
        // INSTRUMENTATION: Log received event
        console.log('📥 call_ended received', {
          type: 'call_ended',
          call_id: callId,
          chat_id: evt?.chat_id,
          message_id: messageId,
        });
        
        // DEDUPLICATION: Check messageId in processedMessageIdsRef (shared for all call lifecycle events)
        if (messageId && processedMessageIdsRef.current.has(messageId)) {
          console.log('⚠️ Duplicate call_ended message_id ignored', { message_id: messageId, call_id: callId });
          return;
        }
        
        // HARD GUARD: Only process if this matches current active call
        const currentActiveCallId = activeCallRef.current?.call_id || activeCallRef.current?.id || activeCall?.call_id || activeCall?.id;
        
        // If no active call, ignore (might be old/stale event)
        if (!activeCallRef.current && !activeCall) {
          console.log('⚠️ call_ended ignored (no active call)', {
            event_call_id: callId,
            message_id: messageId,
          });
          return;
        }
        
        // If call_id doesn't match, ignore
        if (currentActiveCallId && callId && String(currentActiveCallId) !== String(callId)) {
          console.log('⚠️ call_ended ignored (call_id mismatch)', {
            event_call_id: callId,
            active_call_id: currentActiveCallId,
            message_id: messageId,
          });
          return;
        }
        
        // Mark as processed
        if (messageId) {
          processedMessageIdsRef.current.add(messageId);
          processedCallEndedIdsRef.current.add(messageId);
        }
        if (callId) lastCallEndedIdRef.current = callId;
        
        // INSTRUMENTATION: Structured log
        console.log('📞 call_ended event processed', {
          call_id: callId,
          message_id: messageId,
          reason: reason,
          activeCall_id: currentActiveCallId,
          timestamp: new Date().toISOString(),
        });
        
        // Call was ended (by other party or declined), clean up UI immediately
        // CRITICAL: Store state BEFORE clearing to prevent race conditions
        const wasActiveCall = !!activeCallRef.current || !!activeCall;
        const currentLocalStream = localStreamRef.current || localStream;
        const currentPeerConnection = peerConnectionRef.current;
        
        // Log detailed state before cleanup
        console.log('🧹 Cleaning up call_ended', {
          wasActiveCall,
          hasLocalStream: !!currentLocalStream,
          hasPeerConnection: !!currentPeerConnection,
          localStreamTracks: currentLocalStream?.getTracks().length || 0,
          peerConnectionState: currentPeerConnection ? {
            signalingState: currentPeerConnection.signalingState,
            connectionState: currentPeerConnection.connectionState,
            iceConnectionState: currentPeerConnection.iceConnectionState,
          } : null,
        });
        
        // Only stop video call if we actually had an active call
        if (wasActiveCall) {
          stopVideoCall(`call_ended:${reason}`, { evt_call_id: callId, evt_message_id: messageId });
        } else {
          console.log('⚠️ call_ended received but no active call to clean up', {
            call_id: callId,
            message_id: messageId,
          });
        }
        
        // Clear state AFTER stopVideoCall to ensure cleanup happens first
        setIncomingCall(null);
        setActiveCall(null);
        activeCallRef.current = null;
        setIsMuted(false);
        setIsVideoOff(false);
      }
    } catch (error) {
      console.error('❌ Failed to parse call_ended event:', error);
    }
  };

  const handleMessageRead = (data: any) => {
    try {
      const evt = typeof data === 'string' ? JSON.parse(data) : data;
      if (evt?.type === 'message_read' && evt?.chat_id === chatId) {
        // Reload to update ✓ / ✓✓ status
        loadMessages();
      }
    } catch (error) {
      console.error('Failed to parse message_read event:', error);
    }
  };

  // WebRTC handlers with Perfect Negotiation pattern and deduplication
  const handleWebRTCOffer = async (data: any) => {
    try {
      const evt = typeof data === 'string' ? JSON.parse(data) : data;
      if (evt?.chat_id !== chatId) return;

      // DEDUPLICATION: Check messageId
      const messageId = evt?.message_id;
      if (messageId && processedMessageIdsRef.current.has(messageId)) {
        console.log(`⚠️ Duplicate offer message_id=${messageId}, skipping...`);
        return;
      }

      // DEDUPLICATION: Check SDP hash
      const offerSDP = evt?.offer ? JSON.parse(evt.offer).sdp : null;
      if (offerSDP) {
        const sdpHash = hashSDP(offerSDP);
        if (processedSDPHashesRef.current.has(sdpHash)) {
          console.log(`⚠️ Duplicate offer SDP hash=${sdpHash}, skipping...`);
          return;
        }
        processedSDPHashesRef.current.add(sdpHash);
      }

      console.log(`📥 Received WebRTC offer call_id=${evt.call_id} sender_id=${evt.sender_id} message_id=${messageId || 'none'}`);

      // MUTEX: Prevent concurrent setRemoteDescription
      if (settingRemoteDescriptionRef.current) {
        console.log('⚠️ setRemoteDescription already in progress, queuing offer...');
        // Could queue here, but for simplicity, skip duplicate
        return;
      }

      // Wait if acceptCall is in progress to prevent race condition
      if (isAcceptingCallRef.current) {
        console.log('⚠️ acceptCall in progress, waiting for it to complete...');
        let waitCount = 0;
        const maxWait = 100;
        while (isAcceptingCallRef.current && waitCount < maxWait) {
          await new Promise(resolve => setTimeout(resolve, 100));
          waitCount++;
        }
        if (waitCount >= maxWait) {
          console.warn('⚠️ Timeout waiting for acceptCall to complete, proceeding anyway...');
        }
      }

      // Ensure we have a peer connection and local stream
      if (!peerConnectionRef.current) {
        console.log('⚠️ No peer connection, initializing...');
        if (!localStream) {
          const callType = evt?.call_type || activeCall?.type || activeCall?.call_type || incomingCall?.call_type || incomingCall?.type || 'video';
          if (callType === 'video') {
            if (!isStartingVideoCallRef.current) {
              await startVideoCall();
            } else {
              let waitCount = 0;
              while (isStartingVideoCallRef.current && waitCount < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                waitCount++;
              }
            }
          } else {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setLocalStream(stream);
            localStreamRef.current = stream;
            await initializePeerConnection(stream, 'voice');
          }
        } else {
          const callType = evt?.call_type || activeCall?.type || activeCall?.call_type || incomingCall?.call_type || incomingCall?.type || 'video';
          await initializePeerConnection(localStream, callType);
        }
      }

      const pc = peerConnectionRef.current;
      if (!pc) {
        console.error('❌ Failed to create peer connection');
        return;
      }

      // PERFECT NEGOTIATION: Mark as polite (we received offer first)
      isPoliteRef.current = true;

      // PERFECT NEGOTIATION: If we're making an offer, rollback
      if (makingOfferRef.current) {
        console.log('🔄 Perfect Negotiation: Rolling back local offer, remote offer received first');
        try {
          await pc.setLocalDescription({ type: 'rollback' });
        } catch (e) {
          // Rollback may fail if already set, ignore
        }
        makingOfferRef.current = false;
      }

      // Check signaling state
      const currentState = pc.signalingState;
      console.log(`📊 Signaling state before offer: ${currentState} (call_id=${evt.call_id})`);

      // PERFECT NEGOTIATION: Only accept offer in stable state
      if (currentState !== 'stable') {
        console.warn(`⚠️ Cannot set remote offer in state: ${currentState}, skipping...`);
        return;
      }

      const offer = JSON.parse(evt.offer);
      const stateBefore = pc.signalingState;
      console.log('📥 Setting remote description (offer)...', {
        message_id: messageId,
        call_id: evt.call_id,
        signalingState_before: stateBefore,
      });
      settingRemoteDescriptionRef.current = true;
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const stateAfter = pc.signalingState;
        console.log('📥 WebRTC offer processed', {
          message_id: messageId,
          call_id: evt.call_id,
          signalingState_before: stateBefore,
          signalingState_after: stateAfter,
        });
        
        // Mark as processed
        if (messageId) processedMessageIdsRef.current.add(messageId);
      } catch (error: any) {
        console.error(`❌ Failed to set remote description: ${error.name} state=${pc.signalingState} (call_id=${evt.call_id})`);
        settingRemoteDescriptionRef.current = false;
        if (error.name === 'InvalidStateError') {
          if (pc.remoteDescription !== null) {
            console.log('⚠️ Remote description already set, continuing...');
          } else {
            return;
          }
        } else {
          return;
        }
      } finally {
        settingRemoteDescriptionRef.current = false;
      }

      // Process queued ICE candidates
      let processedCount = 0;
      const MAX_PROCESSING_ATTEMPTS = 100;
      while (iceCandidateQueueRef.current.length > 0 && processedCount < MAX_PROCESSING_ATTEMPTS) {
        const candidate = iceCandidateQueueRef.current.shift();
        if (candidate) {
          try {
            await pc.addIceCandidate(candidate);
            processedCount++;
          } catch (err) {
            console.warn('⚠️ Failed to add queued ICE candidate:', err);
          }
        }
      }
      if (iceCandidateQueueRef.current.length > 0) {
        iceCandidateQueueRef.current = [];
      }

      // Create and send answer
      const stateBeforeAnswer = pc.signalingState;
      if (stateBeforeAnswer !== 'have-remote-offer' && stateBeforeAnswer !== 'have-local-pranswer') {
        console.warn(`⚠️ Cannot create answer in state: ${stateBeforeAnswer}, skipping...`);
        return;
      }

      console.log('📤 Creating answer...');
      try {
        const answer = await pc.createAnswer();
        settingLocalDescriptionRef.current = true;
        await pc.setLocalDescription(answer);
        settingLocalDescriptionRef.current = false;
        console.log(`✅ Local description set (answer) state=${pc.signalingState} (call_id=${evt.call_id})`);

        if (ws && evt.call_id) {
          ws.send({
            type: 'webrtc_answer',
            chat_id: chatId,
            call_id: evt.call_id,
            answer: JSON.stringify(answer),
            message_id: generateMessageId(), // Generate unique messageId
            sender_id: user?.id || user?._id || '',
            timestamp: Date.now(),
          });
          console.log('📤 WebRTC answer sent');
        }
      } catch (error: any) {
        settingLocalDescriptionRef.current = false;
        if (error.name === 'InvalidStateError' && pc.localDescription !== null) {
          console.log('⚠️ Answer already created, skipping...');
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('❌ Failed to handle WebRTC offer:', error);
      settingRemoteDescriptionRef.current = false;
      settingLocalDescriptionRef.current = false;
    }
  };

  const handleWebRTCAnswer = async (data: any) => {
    try {
      const evt = typeof data === 'string' ? JSON.parse(data) : data;
      if (evt?.chat_id !== chatId) return;

      // DEDUPLICATION: Check messageId
      const messageId = evt?.message_id;
      if (messageId && processedMessageIdsRef.current.has(messageId)) {
        console.log(`⚠️ Duplicate answer message_id=${messageId}, skipping...`);
        return;
      }

      // DEDUPLICATION: Check SDP hash
      const answerSDP = evt?.answer ? JSON.parse(evt.answer).sdp : null;
      if (answerSDP) {
        const sdpHash = hashSDP(answerSDP);
        if (processedSDPHashesRef.current.has(sdpHash)) {
          console.log(`⚠️ Duplicate answer SDP hash=${sdpHash}, skipping...`);
          return;
        }
        processedSDPHashesRef.current.add(sdpHash);
      }

      console.log(`📥 Received WebRTC answer call_id=${evt.call_id} sender_id=${evt.sender_id} message_id=${messageId || 'none'}`);

      const pc = peerConnectionRef.current;
      if (!pc) {
        console.warn('⚠️ No peer connection when receiving answer');
        return;
      }

      // MUTEX: Prevent concurrent setRemoteDescription
      if (settingRemoteDescriptionRef.current) {
        console.log('⚠️ setRemoteDescription already in progress, skipping duplicate answer...');
        return;
      }

      // Check signaling state
      const currentState = pc.signalingState;
      console.log(`📊 Signaling state before answer: ${currentState} (call_id=${evt.call_id})`);

      // PERFECT NEGOTIATION: Only accept answer if we're impolite (we sent offer first)
      // If we're polite (received offer first), we already sent answer, so ignore this
      if (isPoliteRef.current) {
        console.log('⚠️ Perfect Negotiation: We are polite (received offer first), ignoring duplicate answer...');
        return;
      }

      // Check if answer was already set
      if (pc.remoteDescription !== null) {
        console.log('⚠️ Answer already set, skipping...');
        return;
      }

      // PERFECT NEGOTIATION: Must be in have-local-offer state
      if (currentState !== 'have-local-offer' && currentState !== 'have-local-pranswer') {
        if (currentState === 'stable') {
          console.log('⚠️ Peer connection already stable (negotiation complete), skipping answer...');
        } else {
          console.warn(`⚠️ Cannot set remote answer in state: ${currentState}, skipping...`);
        }
        return;
      }

      const answer = JSON.parse(evt.answer);
      const stateBefore = pc.signalingState;
      const myId = String(user?.id || user?._id || '');
      const currentActiveCall = activeCallRef.current || activeCall;
      const isCaller = currentActiveCall?.caller_id && String(currentActiveCall.caller_id) === myId;
      
      console.log('📥 Setting remote description (answer)...', {
        message_id: messageId,
        call_id: evt.call_id,
        signalingState_before: stateBefore,
        is_caller: isCaller,
        my_id: myId,
        caller_id: currentActiveCall?.caller_id || currentActiveCall?.callerId,
        hasLocalStream: !!localStreamRef.current || !!localStream,
        hasRemoteStream: !!remoteStream,
        receivers_before: pc.getReceivers().length,
      });
      settingRemoteDescriptionRef.current = true;
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        const stateAfter = pc.signalingState;
        const receiversAfter = pc.getReceivers();
        const transceiversAfter = pc.getTransceivers();
        
        console.log('📥 WebRTC answer processed', {
          message_id: messageId,
          call_id: evt.call_id,
          signalingState_before: stateBefore,
          signalingState_after: stateAfter,
          is_caller: isCaller,
          receivers_count: receiversAfter.length,
          transceivers_count: transceiversAfter.length,
          receivers: receiversAfter.map(r => ({
            track_kind: r.track?.kind,
            track_enabled: r.track?.enabled,
            track_readyState: r.track?.readyState,
          })),
          transceivers: transceiversAfter.map(t => ({
            direction: t.direction,
            currentDirection: t.currentDirection,
            receiver_track_kind: t.receiver.track?.kind,
            receiver_track_enabled: t.receiver.track?.enabled,
            receiver_track_readyState: t.receiver.track?.readyState,
          })),
          hasRemoteStream: !!remoteStream,
          remoteStreamTracks: remoteStream ? (remoteStream as MediaStream).getTracks().length : 0,
        });
        
        // Check if we have receivers but no remote stream yet (ontrack might fire later)
        if (receiversAfter.length > 0 && !remoteStream) {
          console.log('⏳ Receivers exist but no remote stream yet, waiting for ontrack event...');
          // Set a timeout to check if ontrack fires
          setTimeout(() => {
            const currentRemoteStream = remoteStream;
            const currentReceivers = pc.getReceivers();
            if (!currentRemoteStream && currentReceivers.length > 0) {
              console.warn('⚠️ Still no remote stream after answer, receivers:', currentReceivers.map(r => ({
                track_kind: r.track?.kind,
                track_enabled: r.track?.enabled,
                track_readyState: r.track?.readyState,
              })));
            }
          }, 2000);
        }
        
        // Mark as processed
        if (messageId) processedMessageIdsRef.current.add(messageId);
      } catch (error: any) {
        console.error(`❌ Failed to set remote description: ${error.name} state=${pc.signalingState} (call_id=${evt.call_id})`);
        settingRemoteDescriptionRef.current = false;
        if (error.name === 'InvalidStateError') {
          if (pc.remoteDescription !== null) {
            console.log('⚠️ Remote description already set, continuing...');
          } else if (pc.signalingState === 'stable') {
            console.log('⚠️ Peer connection already stable (negotiation complete), continuing...');
          } else {
            console.warn(`⚠️ InvalidStateError in state: ${pc.signalingState}, continuing anyway...`);
          }
        } else {
          console.error('❌ Real error setting remote description:', error);
          return;
        }
      } finally {
        settingRemoteDescriptionRef.current = false;
      }

      // Process queued ICE candidates
      let processedCount = 0;
      const MAX_PROCESSING_ATTEMPTS = 100;
      while (iceCandidateQueueRef.current.length > 0 && processedCount < MAX_PROCESSING_ATTEMPTS) {
        const candidate = iceCandidateQueueRef.current.shift();
        if (candidate) {
          try {
            await pc.addIceCandidate(candidate);
            processedCount++;
          } catch (err) {
            console.warn('⚠️ Failed to add queued ICE candidate:', err);
          }
        }
      }
      if (iceCandidateQueueRef.current.length > 0) {
        iceCandidateQueueRef.current = [];
      }
    } catch (error) {
      console.error('❌ Failed to handle WebRTC answer:', error);
      settingRemoteDescriptionRef.current = false;
    }
  };

  const handleWebRTCICE = async (data: any) => {
    try {
      const evt = typeof data === 'string' ? JSON.parse(data) : data;
      if (evt?.chat_id !== chatId) return;

      const pc = peerConnectionRef.current;
      if (!pc) {
        console.warn('⚠️ No peer connection when receiving ICE candidate');
        return;
      }

      if (!evt.candidate) {
        // End of candidates
        console.log('📥 End of ICE candidates');
        return;
      }

      const candidate = JSON.parse(evt.candidate);
      const iceCandidate = new RTCIceCandidate(candidate);

      // DEDUPLICATION: Check ICE candidate hash
      const candidateHash = hashICECandidate(iceCandidate);
      if (processedICECandidatesRef.current.has(candidateHash)) {
        console.log(`⚠️ Duplicate ICE candidate hash=${candidateHash}, skipping...`);
        return;
      }
      processedICECandidatesRef.current.add(candidateHash);

      // If remote description is not set yet, queue the candidate
      if (pc.remoteDescription === null || settingRemoteDescriptionRef.current) {
        // Limit queue size to prevent memory issues
        if (iceCandidateQueueRef.current.length >= MAX_ICE_CANDIDATE_QUEUE_SIZE) {
          console.warn(`⚠️ ICE candidate queue full (${MAX_ICE_CANDIDATE_QUEUE_SIZE}), dropping oldest candidate`);
          iceCandidateQueueRef.current.shift(); // Remove oldest
        }
        console.log(`📥 Queueing ICE candidate (waiting for remote description, queue size: ${iceCandidateQueueRef.current.length + 1})`);
        iceCandidateQueueRef.current.push(iceCandidate);
        return;
      }

      // Otherwise, add it immediately
      try {
        await pc.addIceCandidate(iceCandidate);
        console.log('📥 ICE candidate added');
      } catch (error: any) {
        // If adding fails, it might be because remote description is still being set
        if (error.name === 'InvalidStateError' || error.name === 'OperationError') {
          // Limit queue size
          if (iceCandidateQueueRef.current.length >= MAX_ICE_CANDIDATE_QUEUE_SIZE) {
            console.warn(`⚠️ ICE candidate queue full (${MAX_ICE_CANDIDATE_QUEUE_SIZE}), dropping oldest candidate`);
            iceCandidateQueueRef.current.shift(); // Remove oldest
          }
          console.log(`📥 Queueing ICE candidate (retry, queue size: ${iceCandidateQueueRef.current.length + 1})`);
          iceCandidateQueueRef.current.push(iceCandidate);
        } else {
          console.warn('⚠️ Failed to add ICE candidate:', error);
        }
      }
    } catch (error) {
      console.error('❌ Failed to handle WebRTC ICE candidate:', error);
    }
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

  // Sesli arama başlat
  const handleVoiceCall = async () => {
    try {
      const response: any = await callApi.initiateCall({
        type: 'voice',
        chat_id: chatId,
      });
      setRemoteStream(null);
      // CRITICAL: Ensure both type and call_type are set for consistency
      const callData = { 
        ...(response || {}), 
        type: 'voice',
        call_type: response?.call_type || response?.type || 'voice', // Preserve backend's call_type if present
      };
      console.log('📞 Voice call initiated', {
        call_id: callData?.call_id || callData?.id,
        type: callData?.type,
        call_type: callData?.call_type,
        caller_id: callData?.caller_id || callData?.callerId,
      });
      setActiveCall(callData);
      activeCallRef.current = callData; // Update ref immediately
      
      // Start audio stream and WebRTC connection
      try {
        // Try with enhanced audio first
        let stream: MediaStream | null = null;
        const audioStrategies = [
          {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          },
          {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
            },
          },
          {
            audio: true,
          },
        ];

        for (const constraints of audioStrategies) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            break;
          } catch (error: any) {
            console.warn('Audio strategy failed:', error.name);
            if (constraints === audioStrategies[audioStrategies.length - 1]) {
              throw error;
            }
          }
        }

        if (!stream || stream.getAudioTracks().length === 0) {
          throw new Error('No audio track available');
        }

        setLocalStream(stream);
        localStreamRef.current = stream; // Sync ref immediately so handleCallAnswered can find it
        // Small delay to ensure stream is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        await initializePeerConnection(stream, 'voice');

        // NOTE: Offer will be sent ONLY after call_answered event is received
        // This ensures callee has accepted the call and is ready for WebRTC connection
        // See handleCallAnswered() for offer sending logic
      } catch (error: any) {
        console.error('Failed to start voice call stream:', error);
        
        let errorMessage = 'Failed to start voice call. ';
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage += 'Please allow microphone access in your browser settings.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage += 'No microphone found. Please connect a microphone and try again.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage += 'Microphone is already in use by another application.';
        } else if (error.message) {
          errorMessage += error.message;
        } else {
          errorMessage += 'Please check your microphone permissions and try again.';
        }
        
        alert(errorMessage);
        setActiveCall(null);
        activeCallRef.current = null;
        setLocalStream(null);
        localStreamRef.current = null;
      }
    } catch (error) {
      console.error('Failed to initiate voice call:', error);
      alert('Failed to initiate voice call');
      setActiveCall(null);
      activeCallRef.current = null;
    }
  };

  // Video görüntülü arama başlat
  const handleVideoCall = async () => {
    try {
      const response: any = await callApi.initiateCall({
        type: 'video',
        chat_id: chatId,
      });
      setRemoteStream(null);
      // CRITICAL: Ensure both type and call_type are set for consistency
      const callData = { 
        ...(response || {}), 
        type: 'video',
        call_type: response?.call_type || response?.type || 'video', // Preserve backend's call_type if present
      };
      console.log('📞 Video call initiated', {
        call_id: callData?.call_id || callData?.id,
        type: callData?.type,
        call_type: callData?.call_type,
        caller_id: callData?.caller_id || callData?.callerId,
      });
      setActiveCall(callData);
      activeCallRef.current = callData; // Update ref immediately
      
      // Video stream'i başlat ve stream'i al
      const stream = await startVideoCall();
      
      if (!stream) {
        console.error('❌ Failed to get stream from startVideoCall');
        return;
      }
      
      // NOTE: Offer will be sent ONLY after call_answered event is received
      // This ensures callee has accepted the call and is ready for WebRTC connection
      // See handleCallAnswered() for offer sending logic
    } catch (error) {
      console.error('Failed to initiate video call:', error);
      alert('Failed to initiate video call');
      setActiveCall(null);
      activeCallRef.current = null;
    }
  };

  // List available media devices (after permissions are granted)
  const loadMediaDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAvailableDevices(devices.filter(d => d.kind === 'videoinput' || d.kind === 'audioinput'));
      return devices;
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      return [];
    }
  };

  // Video call stream'lerini başlat
  const startVideoCall = async (): Promise<MediaStream | null> => {
    // If already starting, wait for it to finish and return whatever we have.
    if (isStartingVideoCallRef.current) {
      console.log('⚠️ startVideoCall already in progress, waiting...');
      let waited = 0;
      const stepMs = 100;
      const maxWaitMs = 5000;
      while (isStartingVideoCallRef.current && waited < maxWaitMs) {
        await new Promise((r) => setTimeout(r, stepMs));
        waited += stepMs;
      }
      const existing = localStreamRef.current || localStream;
      if (existing) return existing;
      console.warn('⚠️ startVideoCall finished but no stream available');
      return null;
    }
    
    // If we already have a local stream, reuse it (and ensure PC exists)
    const existingStream = localStreamRef.current || localStream;
    if (existingStream && (existingStream.getVideoTracks().length > 0 || existingStream.getAudioTracks().length > 0)) {
      console.log('⚠️ Local stream already exists, reusing it');
      localStreamRef.current = existingStream;
      if (!peerConnectionRef.current) {
        const existingType = existingStream.getVideoTracks().length > 0 ? 'video' : 'voice';
        console.log('⚠️ No peer connection, initializing with existing stream...', { existingType });
        await initializePeerConnection(existingStream, existingType);
      }
      return existingStream;
    }
    
    isStartingVideoCallRef.current = true;
    
    try {
      let stream: MediaStream | null = null;
      
      // Strategy: Try different constraint combinations progressively
      const strategies = [
        // Strategy 1: Full video + audio with ideal constraints
        {
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        },
        // Strategy 2: Full video + audio with basic constraints
        {
          video: {
            facingMode: 'user',
          },
          audio: true,
        },
        // Strategy 3: Any video device + audio
        {
          video: true,
          audio: true,
        },
        // Strategy 4: Audio only (fallback)
        {
          video: false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        },
        // Strategy 5: Basic audio only
        {
          video: false,
          audio: true,
        },
      ];

      let lastError: any = null;
      
      for (let i = 0; i < strategies.length; i++) {
        try {
          console.log(`Trying strategy ${i + 1}/${strategies.length}...`);
          stream = await navigator.mediaDevices.getUserMedia(strategies[i]);
          
          // Success! Now enumerate devices if we got video
          if (stream.getVideoTracks().length > 0) {
            await loadMediaDevices();
          }
          
          break; // Exit loop on success
        } catch (error: any) {
          console.warn(`Strategy ${i + 1} failed:`, error.name, error.message);
          lastError = error;
          
          // If this is the last strategy, throw the error
          if (i === strategies.length - 1) {
            throw error;
          }
          
          // Continue to next strategy
          continue;
        }
      }

      if (!stream) {
        throw new Error('Failed to access camera or microphone. Please check your device permissions.');
      }

      // Check what we actually got
      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;

      if (!hasVideo && !hasAudio) {
        throw new Error('No media tracks available');
      }

      if (!hasVideo) {
        console.warn('⚠️ Video not available, continuing with audio only');
        // Keep video call type but show video UI anyway (it will show avatar/placeholder)
        // This allows user to see the call UI even without video
      }

      setLocalStream(stream);
      localStreamRef.current = stream; // Update ref immediately
      // Note: Local video will be set via useEffect when localStream changes
      // This ensures video element is mounted before we try to set srcObject
      
      // Initialize WebRTC peer connection (use 'voice' if no video, otherwise 'video')
      const finalCallType = hasVideo ? 'video' : 'voice';
      await initializePeerConnection(stream, finalCallType);
      
      console.log('✅ Peer connection initialized');
      
      // Return stream so caller can use it immediately
      isStartingVideoCallRef.current = false;
      return stream;
    } catch (error: any) {
      console.error('Failed to start video call:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to start video call. ';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow camera/microphone access in your browser settings.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera or microphone found. Connect a device and try again.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage += 'Camera or microphone is already in use by another application.';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please check your device permissions and try again.';
      }
      
      // Show error but don't reset call - let user decide
      // If it's a NotFoundError, try to continue with audio-only
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        // Try audio-only as last resort
        try {
          console.log('Attempting audio-only fallback...');
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (audioStream && audioStream.getAudioTracks().length > 0) {
            setLocalStream(audioStream);
            localStreamRef.current = audioStream; // Update ref immediately
            await initializePeerConnection(audioStream, 'voice');
            // Update call type to voice but keep UI open
            if (activeCall) {
              setActiveCall({ ...activeCall, type: 'voice' });
            }
            alert('Video camera not available. Continuing with audio only.');
            isStartingVideoCallRef.current = false;
            return audioStream; // Success with audio-only
          }
        } catch (audioError) {
          console.error('Audio-only fallback also failed:', audioError);
        }
      }
      
      alert(errorMessage);
      
      // Only reset call state if we truly can't continue
      setActiveCall(null);
      activeCallRef.current = null;
      setLocalStream(null);
      localStreamRef.current = null;
      isStartingVideoCallRef.current = false;
      return null;
    }
  };

  // Helper: Generate UUID for messageId
  const generateMessageId = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Helper: Generate hash from SDP string for deduplication
  const hashSDP = (sdp: string): string => {
    // Simple hash function (FNV-1a variant)
    let hash = 2166136261;
    for (let i = 0; i < sdp.length; i++) {
      hash ^= sdp.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash.toString(36);
  };

  // Helper: Generate hash from ICE candidate for deduplication
  const hashICECandidate = (candidate: RTCIceCandidate): string => {
    const str = `${candidate.candidate}|${candidate.sdpMLineIndex}|${candidate.sdpMid}`;
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash.toString(36);
  };

  // Initialize WebRTC peer connection
  const initializePeerConnection = async (localStream: MediaStream, callTypeOverride?: string) => {
    try {
      const callType = callTypeOverride || activeCall?.type || activeCall?.call_type || 'voice';
      
      // Build ICE server list - STUN always included, TURN added when env vars are set
      const iceServers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ];
      const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
      if (turnUrl) {
        iceServers.push({
          urls: turnUrl,
          username: process.env.NEXT_PUBLIC_TURN_USERNAME || '',
          credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || '',
        });
        console.log('✅ TURN server configured:', turnUrl);
      } else {
        console.warn('⚠️ No TURN server configured. Calls may fail across different networks/NATs. Set NEXT_PUBLIC_TURN_URL to fix.');
      }
      const configuration: RTCConfiguration = {
        iceServers,
        iceCandidatePoolSize: 10, // Pre-gather ICE candidates
      };

      const pc = new RTCPeerConnection(configuration);
      peerConnectionRef.current = pc;
      
      // Reset Perfect Negotiation state
      isPoliteRef.current = false;
      makingOfferRef.current = false;

      // Yerel ses/video track'lerini ekle (karşı tarafa gidecek)
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });

      // Renegotiation handler: triggered by ICE restarts or track changes.
      // Initial offer is sent manually after call_answered - skip the first trigger.
      pc.onnegotiationneeded = async () => {
        // If no local description yet, the initial offer hasn't been sent.
        // sendOfferIfReady() handles that path after call_answered arrives.
        if (!pc.localDescription) return;
        // Polite peer (callee) never initiates offers
        if (isPoliteRef.current) return;
        // Guard against concurrent negotiation
        if (makingOfferRef.current || settingLocalDescriptionRef.current) return;

        const currentCall = activeCallRef.current;
        if (!currentCall) return;
        const callId = currentCall.call_id || currentCall.id;

        try {
          makingOfferRef.current = true;
          const offer = await pc.createOffer();
          settingLocalDescriptionRef.current = true;
          await pc.setLocalDescription(offer);
          settingLocalDescriptionRef.current = false;

          if (ws && callId) {
            ws.send({
              type: 'webrtc_offer',
              chat_id: chatId,
              call_id: callId,
              offer: JSON.stringify(offer),
              message_id: generateMessageId(),
              sender_id: user?.id || user?._id || '',
              timestamp: Date.now(),
            });
            console.log('📤 WebRTC re-offer sent (renegotiation/ICE restart)');
          }
        } catch (err) {
          console.error('❌ Failed to renegotiate:', err);
        } finally {
          makingOfferRef.current = false;
          settingLocalDescriptionRef.current = false;
        }
      };

      // Karşı taraftan gelen ses/video
      pc.ontrack = (event) => {
        const myId = String(user?.id || user?._id || '');
        const currentActiveCall = activeCallRef.current || activeCall;
        const isCaller = currentActiveCall?.caller_id && String(currentActiveCall.caller_id) === myId;
        
        console.log('✅ Received remote track:', event.track.kind, event);
        console.log('📊 Track details:', {
          kind: event.track.kind,
          enabled: event.track.enabled,
          readyState: event.track.readyState,
          streams: event.streams.length,
          is_caller: isCaller,
          my_id: myId,
          caller_id: currentActiveCall?.caller_id || currentActiveCall?.callerId,
          call_id: currentActiveCall?.call_id || currentActiveCall?.id,
          hasRemoteStream: !!remoteStream,
          remoteStreamTracks: remoteStream ? (remoteStream as MediaStream).getTracks().length : 0,
        });
        
        // Ensure track is enabled
        if (!event.track.enabled) {
          console.log(`⚠️ Track ${event.track.kind} is disabled, enabling...`);
          event.track.enabled = true;
        }
        
        // For video tracks, wait for them to be 'live' before setting stream
        if (event.track.kind === 'video' && event.track.readyState !== 'live') {
          console.log(`⏳ Video track not live yet (${event.track.readyState}), waiting...`);
          event.track.addEventListener('ended', () => {
            console.log('⚠️ Video track ended');
          });
          // Track will become 'live' automatically when ready
        }
        
        // Use event.streams if available, otherwise create new stream from track
        if (event.streams && event.streams.length > 0) {
          const remoteStream = event.streams[0];
          console.log(`✅ Received remote stream with ${remoteStream.getTracks().length} tracks`);

          // Ensure all tracks are enabled
          remoteStream.getTracks().forEach(track => {
            if (!track.enabled) {
              console.log(`⚠️ Enabling ${track.kind} track`);
              track.enabled = true;
            }
            console.log(`📊 Track ${track.kind}: enabled=${track.enabled}, readyState=${track.readyState}`);
          });

          // Single source of truth: update state only. useEffect will update the video element.
          console.log('🔄 Setting remote stream state...');
          setRemoteStream(remoteStream);
        } else {
          // Fallback: create stream from track (for browsers that don't provide streams)
          setRemoteStream((prev) => {
            const next = prev ? new MediaStream(prev.getTracks()) : new MediaStream();
            if (!next.getTracks().includes(event.track)) {
              next.addTrack(event.track);
              console.log(`✅ Added ${event.track.kind} track to remote stream. Total tracks: ${next.getTracks().length}`);
            }
            // Ensure all tracks are enabled
            next.getTracks().forEach(track => {
              if (!track.enabled) {
                console.log(`⚠️ Enabling ${track.kind} track`);
                track.enabled = true;
              }
            });
            return next;
          });
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && ws) {
          const callId = activeCallRef.current?.call_id || activeCallRef.current?.id || activeCall?.call_id || activeCall?.id;
          if (callId) {
            ws.send({
              type: 'webrtc_ice',
              chat_id: chatId,
              call_id: callId,
              candidate: JSON.stringify(event.candidate),
            });
            console.log('📤 ICE candidate sent');
          } else {
            console.warn('⚠️ Cannot send ICE candidate: no call_id available');
          }
        } else if (event.candidate === null) {
          console.log('✅ ICE gathering complete - sending end-of-candidates signal');
          // Notify the remote peer that ICE gathering is done
          const callIdForEoc = activeCallRef.current?.call_id || activeCallRef.current?.id || activeCall?.call_id || activeCall?.id;
          if (callIdForEoc && ws) {
            ws.send({
              type: 'webrtc_ice',
              chat_id: chatId,
              call_id: callIdForEoc,
              candidate: null,
            });
          }
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log('🔌 Peer connection state:', state);
        
        switch (state) {
          case 'connected':
            console.log('✅ WebRTC connected!');
            break;
          case 'disconnected':
            console.warn('⚠️ WebRTC disconnected');
            // Try to reconnect
            setTimeout(() => {
              if (pc.connectionState === 'disconnected' && activeCall) {
                console.log('🔄 Attempting to reconnect...');
                // Restart ICE
                pc.restartIce();
              }
            }, 2000);
            break;
          case 'failed':
            console.error('❌ WebRTC connection failed');
            // Try to restart ICE
            if (activeCall && localStream) {
              console.log('🔄 Attempting to recover connection...');
              setTimeout(() => {
                if (pc.connectionState === 'failed') {
                  pc.restartIce();
                }
              }, 2000);
            }
            break;
          case 'closed':
            console.log('🔌 WebRTC connection closed');
            break;
        }
      };

      // Handle ICE connection state changes
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log('🧊 ICE connection state:', state);
        
        if (state === 'failed') {
          console.warn('⚠️ ICE connection failed, restarting ICE...');
          pc.restartIce();
        }
      };

      // Handle ICE gathering state changes
      pc.onicegatheringstatechange = () => {
        console.log('🧊 ICE gathering state:', pc.iceGatheringState);
      };
    } catch (error) {
      console.error('Failed to initialize peer connection:', error);
    }
  };

  const acceptCall = async (callData: any) => {
    if (!callData) return;
    
    // Prevent race condition: if already accepting, return
    if (isAcceptingCallRef.current) {
      console.log('⚠️ acceptCall already in progress, skipping...');
      return;
    }
    
    const callType = callData.call_type || callData.type || 'voice';
    const callId = callData.call_id || callData.id;
    if (!callId) {
      alert('Invalid call (missing call id)');
      return;
    }

    isAcceptingCallRef.current = true;
    
    try {
      await callApi.answerCall(callId);
      // Preserve caller_id from callData to ensure we can identify caller vs callee
      const answeredCallData = { 
        ...(callData || {}), 
        type: callType,
        call_type: callType, // Also set call_type for consistency
        caller_id: callData?.caller_id || callData?.callerId, // Ensure caller_id is preserved
      };
      setActiveCall(answeredCallData);
      activeCallRef.current = answeredCallData; // Update ref immediately
      setIncomingCall(null);

      // Clear any existing peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      iceCandidateQueueRef.current = [];
      
      // Only clear remoteStream if it exists (to prevent unnecessary re-renders)
      // setRemoteStream(null); // Removed to prevent loop

      // Start media stream based on call type
      if (callType === 'video') {
        // Video call - start video stream
        // Only start if not already starting or if we don't have a stream
        if (!isStartingVideoCallRef.current && (!localStream || localStream.getVideoTracks().length === 0)) {
          const stream = await startVideoCall();
          if (stream) {
            // Ensure stream is set in both state and ref
            setLocalStream(stream);
            localStreamRef.current = stream;
          }
        } else if (localStream && localStream.getVideoTracks().length > 0) {
          // We already have a stream, ensure it's in ref and initialize peer connection
          localStreamRef.current = localStream;
          await initializePeerConnection(localStream, 'video');
        } else {
          // No stream yet, start one
          const stream = await startVideoCall();
          if (stream) {
            setLocalStream(stream);
            localStreamRef.current = stream;
          }
        }
      } else {
        // Voice call
        let stream: MediaStream | null = null;
        const audioStrategies = [
          { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } },
          { audio: { echoCancellation: true, noiseSuppression: true } },
          { audio: true },
        ];

        for (const constraints of audioStrategies) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            break;
          } catch (error: any) {
            console.warn('Audio strategy failed:', error.name);
            if (constraints === audioStrategies[audioStrategies.length - 1]) {
              throw error;
            }
          }
        }

        if (!stream || stream.getAudioTracks().length === 0) {
          throw new Error('No audio track available');
        }

        setLocalStream(stream);
        localStreamRef.current = stream; // Update ref immediately
        // Small delay to ensure stream is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        await initializePeerConnection(stream, 'voice');
      }
    } catch (error) {
      console.error('Failed to answer call:', error);
      alert('Failed to answer call');
      setActiveCall(null);
      setIncomingCall(null);
    } finally {
      isAcceptingCallRef.current = false;
    }
  };

  // Video call'u durdur - comprehensive cleanup
  const stopVideoCall = (reason: string, meta?: any) => {
    try {
      // INSTRUMENTATION: Structured log at TOP with reason and state
      // CRITICAL: Use refs instead of state to avoid race conditions
      const pc = peerConnectionRef.current;
      const currentLocalStream = localStreamRef.current || localStream;
      const currentActiveCall = activeCallRef.current || activeCall;
      const currentIncomingCall = incomingCall;
      const logData: any = {
        reason: reason,
        timestamp: new Date().toISOString(),
        activeCall_id: currentActiveCall?.call_id || currentActiveCall?.id || null,
        incomingCall_id: currentIncomingCall?.call_id || currentIncomingCall?.id || null,
        chatId: chatId,
        hasLocalStream: !!currentLocalStream,
        hasRemoteStream: !!remoteStream,
        hasActiveCall: !!currentActiveCall,
        hasIncomingCall: !!currentIncomingCall,
        localStreamTracks: currentLocalStream ? currentLocalStream.getTracks().map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState,
        })) : [],
      };
      
      if (pc) {
        logData.pc_signalingState = pc.signalingState;
        logData.pc_connectionState = pc.connectionState;
        logData.pc_iceConnectionState = pc.iceConnectionState;
      }
      
      // Add meta data if provided
      if (meta) {
        logData.meta = meta;
      }
      
      console.trace(`🧹 stopVideoCall reason="${reason}" [STACK TRACE]`);
      console.log('🧹 stopVideoCall', logData);
      
      // Log localStream tracks readyState before cleanup
      // CRITICAL: Use ref instead of state to avoid race conditions
      if (currentLocalStream) {
        const videoTracks = currentLocalStream.getVideoTracks();
        const audioTracks = currentLocalStream.getAudioTracks();
        console.log('📊 Local stream tracks BEFORE cleanup:', {
          videoTracks: videoTracks.length,
          audioTracks: audioTracks.length,
          videoTracksState: videoTracks.map(t => ({
            enabled: t.enabled,
            readyState: t.readyState,
          })),
          audioTracksState: audioTracks.map(t => ({
            enabled: t.enabled,
            readyState: t.readyState,
          })),
        });
      }
      
      // Reset flags
      isAcceptingCallRef.current = false;
      isStartingVideoCallRef.current = false;
      settingRemoteDescriptionRef.current = false;
      settingLocalDescriptionRef.current = false;
      
      // Reset Perfect Negotiation state
      isPoliteRef.current = false;
      makingOfferRef.current = false;
      
      // Clear deduplication caches
      processedMessageIdsRef.current.clear();
      processedSDPHashesRef.current.clear();
      processedICECandidatesRef.current.clear();
      processedCallEndedIdsRef.current.clear();
      lastCallEndedIdRef.current = null;
      
      // Close peer connection first
      if (peerConnectionRef.current) {
        try {
          peerConnectionRef.current.close();
        } catch (e) {
          console.warn('Error closing peer connection:', e);
        }
        peerConnectionRef.current = null;
      }
      
      // Stop local stream tracks
      // CRITICAL: Use ref instead of state to avoid race conditions
      if (currentLocalStream) {
        try {
          const tracksBeforeStop = currentLocalStream.getTracks().map(t => ({
            kind: t.kind,
            enabled: t.enabled,
            readyState: t.readyState,
          }));
          
          console.log('🛑 Stopping local stream tracks', {
            reason: reason,
            tracksCount: tracksBeforeStop.length,
            tracksBeforeStop,
          });
          
          currentLocalStream.getTracks().forEach(track => {
            try {
              console.log(`🛑 Stopping local ${track.kind} track`, {
                enabled: track.enabled,
                readyState: track.readyState,
                muted: track.muted,
              });
              track.stop();
            } catch (e) {
              console.warn('Error stopping local track:', e);
            }
          });
          
          // Log tracks after stop
          const tracksAfterStop = currentLocalStream.getTracks().map(t => ({
            kind: t.kind,
            enabled: t.enabled,
            readyState: t.readyState,
          }));
          console.log('📊 Local stream tracks AFTER stop:', {
            tracksBeforeStop,
            tracksAfterStop,
            tracksStillExist: tracksAfterStop.length > 0,
          });
        } catch (e) {
          console.warn('Error stopping local stream:', e);
        }
        
        console.log('🛑 Clearing localStream state', { reason: reason });
        setLocalStream(null);
        localStreamRef.current = null;
      } else {
        console.log('⚠️ stopVideoCall: No localStream to stop', { reason: reason });
      }
      
      // Stop remote stream tracks
      if (remoteStream) {
        try {
          (remoteStream as MediaStream).getTracks().forEach(track => {
            try {
              track.stop();
            } catch (e) {
              console.warn('Error stopping remote track:', e);
            }
          });
        } catch (e) {
          console.warn('Error stopping remote stream:', e);
        }
        setRemoteStream(null);
      }
      
      // Clear ICE candidate queue
      iceCandidateQueueRef.current = [];
      
      // Clear video refs
      if (localVideoRef.current) {
        try {
          localVideoRef.current.srcObject = null;
        } catch (e) {
          console.warn('Error clearing local video ref:', e);
        }
      }
      if (remoteVideoRef.current) {
        try {
          remoteVideoRef.current.srcObject = null;
        } catch (e) {
          console.warn('Error clearing remote video ref:', e);
        }
      }
      if (remoteAudioRef.current) {
        try {
          (remoteAudioRef.current as HTMLAudioElement).srcObject = null;
        } catch (e) {
          console.warn('Error clearing remote audio ref:', e);
        }
      }
      
      console.log('✅ Video call cleanup complete');
    } catch (error) {
      console.error('Error in stopVideoCall:', error);
      // Continue anyway - ensure state is cleared
      setLocalStream(null);
      localStreamRef.current = null;
      setRemoteStream(null);
      setActiveCall(null);
      activeCallRef.current = null;
      setIncomingCall(null);
      if (peerConnectionRef.current) {
        peerConnectionRef.current = null;
      }
    }
  };

  // Gelen çağrıyı kabul et
  const handleAnswerCall = async () => {
    if (!incomingCall) return;
    await acceptCall(incomingCall);
  };

  // Çağrıyı reddet veya sonlandır
  const handleEndCall = async () => {
    const callId = activeCall?.call_id || activeCall?.id || incomingCall?.call_id || incomingCall?.id;
    const currentActiveCall = activeCallRef.current || activeCall;
    const currentLocalStream = localStreamRef.current || localStream;
    const currentRemoteStream = remoteStream;
    const currentPeerConnection = peerConnectionRef.current;
    
    // INSTRUMENTATION: Log detailed state when user clicks End Call
    console.log('📞 handleEndCall called (user clicked End Call button)', {
      call_id: callId,
      hasActiveCall: !!currentActiveCall,
      hasLocalStream: !!currentLocalStream,
      hasRemoteStream: !!currentRemoteStream,
      hasPeerConnection: !!currentPeerConnection,
      localStreamTracks: currentLocalStream ? currentLocalStream.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        readyState: t.readyState,
      })) : [],
      remoteStreamTracks: currentRemoteStream ? (currentRemoteStream as MediaStream).getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        readyState: t.readyState,
      })) : [],
      peerConnectionState: currentPeerConnection ? {
        signalingState: currentPeerConnection.signalingState,
        connectionState: currentPeerConnection.connectionState,
        iceConnectionState: currentPeerConnection.iceConnectionState,
      } : null,
      stack: new Error().stack,
    });
    
    // Immediately clean up UI state (synchronous) - this closes modals immediately
    setActiveCall(null);
    activeCallRef.current = null;
    setIncomingCall(null);
    
    // Stop all media tracks and clean up WebRTC
    stopVideoCall('user_end_call', {});
    
    // Reset mute/video states
    setIsMuted(false);
    setIsVideoOff(false);
    
    // Then try to end call on server (but don't block on error)
    if (callId) {
      try {
        await callApi.endCall(String(callId));
        console.log('✅ EndCall API called successfully', { call_id: callId });
      } catch (error) {
        console.error('Failed to end call on server:', error);
        // Silently fail - UI is already cleaned up
      }
    }
  };

  // Gelen video çağrıyı kabul et
  const handleAnswerVideoCall = async () => {
    if (!incomingCall) return;
    try {
      await callApi.answerCall(incomingCall.call_id || incomingCall.id);
      setActiveCall({ ...(incomingCall || {}), type: incomingCall.call_type || 'video' });
      setIncomingCall(null);
      await startVideoCall();
    } catch (error) {
      console.error('Failed to answer video call:', error);
      alert('Failed to answer video call');
    }
  };

  // Ses kaydı başlat
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

        mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        
        // Ses dosyasını gönder (voice_message tipi ile)
        try {
          setLoading(true);
          const response = await fileApi.uploadFile(audioFile);
          
          await chatApi.sendMessage(chatId, {
            content: 'Voice message',
            message_type: 'voice_message',
            file_url: response.file_url || response.url,
            file_name: audioFile.name,
            file_size: audioFile.size,
            duration: recordingTime,
            is_anonymous: false,
            reply_to_id: replyingTo?.id,
          });
          
          setReplyingTo(null);
          await loadMessages();
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        } catch (error) {
          console.error('Failed to send voice message:', error);
          alert('Failed to send voice message');
        } finally {
          setLoading(false);
        }
        
        // Stream'i durdur
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        setRecordingTime(0);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Kayıt süresini say
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Typing indicator gönder
      try {
        await typingApi.setTyping(chatId, 'recording_voice');
      } catch (error) {
        console.error('Failed to send typing indicator:', error);
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Microphone access denied');
    }
  };

  // Ses kaydını durdur
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  // Attachment menü seçenekleri
  const handleAttachmentSelect = (type: string) => {
    setShowAttachmentMenu(false);
    switch (type) {
      case 'document':
        fileInputRef.current?.click();
        break;
      case 'picture':
        const imageInput = document.createElement('input');
        imageInput.type = 'file';
        imageInput.accept = 'image/*';
        imageInput.onchange = (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files && files.length > 0) {
            handleFileUpload(files[0]);
          }
        };
        imageInput.click();
        break;
      case 'video':
        const videoInput = document.createElement('input');
        videoInput.type = 'file';
        videoInput.accept = 'video/*';
        videoInput.onchange = (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files && files.length > 0) {
            handleFileUpload(files[0]);
          }
        };
        videoInput.click();
        break;
      case 'location':
        handleShareLocation();
        break;
    }
  };

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
      const data: any = await chatApi.getChat(chatId);
      setChatInfo(data);
      
      // Direct chat'lerde karşı tarafın bilgilerini al
      if (data?.type === 'direct' && Array.isArray(data.members)) {
        const otherMemberId = data.members.find((m: any) => {
          const memberId = String(m.id || m._id || m);
          return memberId !== String(user?.id || user?._id);
        });
        
        if (otherMemberId) {
          const otherMemberIdStr = String(otherMemberId.id || otherMemberId._id || otherMemberId);
          // Contact listesinden karşı tarafın bilgilerini bul
          const contact = contacts.find((c: any) => {
            const contactUserId = c.user?.id || c.user?._id || c.contact?.contact_id;
            return contactUserId && String(contactUserId) === otherMemberIdStr;
          });
          
          if (contact) {
            setOtherPartyInfo({
              id: otherMemberIdStr,
              username: contact.user?.username || contact.user?.display_name || contact.user?.phone_number,
              avatar: contact.user?.avatar || null,
              phone_number: contact.user?.phone_number,
            });
          } else {
            // Contact listesinde yoksa user API'den al
            try {
              const userData: any = await userApi.getUserById(otherMemberIdStr);
              setOtherPartyInfo({
                id: otherMemberIdStr,
                username: userData?.username || userData?.phone_number,
                avatar: userData?.avatar || null,
                phone_number: userData?.phone_number,
              });
            } catch (err) {
              console.error('Failed to load other party info:', err);
            }
          }
        }
      }
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

  // Mark incoming messages as read when they are loaded/displayed
  useEffect(() => {
    const myId = String(user?.id || user?._id || '');
    if (!myId || messages.length === 0) return;

    const toMark = messages
      .filter((m) => {
        const senderId = String(m.sender_id || '');
        if (!senderId || senderId === myId) return false;
        if (m.is_deleted) return false;
        if (m.status === 'read') return false;
        if (markedReadRef.current.has(m.id)) return false;
        return true;
      })
      .map((m) => m.id);

    if (toMark.length === 0) return;
    toMark.forEach((id) => markedReadRef.current.add(id));

    messageApi.markAsRead(chatId, toMark).catch((err) => {
      console.error('Failed to mark messages as read:', err);
      // allow retry if it failed
      toMark.forEach((id) => markedReadRef.current.delete(id));
    });
  }, [messages, chatId, user?.id, user?._id]);

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

  const MESSAGE_LONG_PRESS_MS = 500;

  const handleMessageTouchStart = (e: React.TouchEvent, message: Message) => {
    messageLongPressMessageRef.current = message;
    messageLongPressTimerRef.current = setTimeout(() => {
      messageLongPressTimerRef.current = null;
      const msg = messageLongPressMessageRef.current;
      messageLongPressMessageRef.current = null;
      if (msg) {
        setSelectedMessage(msg);
        messageJustDidLongPressRef.current = true;
        setTimeout(() => { messageJustDidLongPressRef.current = false; }, 300);
      }
    }, MESSAGE_LONG_PRESS_MS);
  };

  const handleMessageTouchEnd = () => {
    if (messageLongPressTimerRef.current) {
      clearTimeout(messageLongPressTimerRef.current);
      messageLongPressTimerRef.current = null;
    }
    messageLongPressMessageRef.current = null;
  };

  const handleMessageTouchMove = () => {
    if (messageLongPressTimerRef.current) {
      clearTimeout(messageLongPressTimerRef.current);
      messageLongPressTimerRef.current = null;
    }
    messageLongPressMessageRef.current = null;
  };

  const MESSAGE_MENU_ESTIMATED_HEIGHT = 320;

  useEffect(() => {
    if (!selectedMessage) {
      setMessageMenuOpenUp(false);
      return;
    }
    const measure = () => {
      const el = selectedMessageBubbleRef.current;
      if (!el || typeof window === 'undefined') return;
      const rect = el.getBoundingClientRect();
      setMessageMenuOpenUp(rect.bottom + MESSAGE_MENU_ESTIMATED_HEIGHT > window.innerHeight);
    };
    const raf = requestAnimationFrame(() => requestAnimationFrame(measure));
    return () => cancelAnimationFrame(raf);
  }, [selectedMessage?.id]);

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
    if (message.is_anonymous) {
      // Anonymous mesaj için random isim üret (sender_id'ye göre)
      if (message.sender_id) {
        return generateRandomName(String(message.sender_id));
      }
      return t('anonymous');
    }
    // Contact listesinden gönderenin ismini bul
    if (message.sender_id && chatInfo?.type === 'group') {
      const senderContact = contacts.find((c: any) => {
        const contactUserId = c.user?.id || c.user?._id || c.contact?.contact_id;
        return contactUserId && String(contactUserId) === String(message.sender_id);
      });
      if (senderContact) {
        return senderContact.user?.username || senderContact.user?.display_name || senderContact.user?.phone_number || 'Someone';
      }
    }
    return message.sender?.username || message.sender?.phone_number || t('profile');
  };

  return (
    <div className={`flex flex-col h-full min-h-0 ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Gelen Çağrı Modal */}
      {/* CRITICAL FIX: Only show incoming call modal when there's no active call */}
      {incomingCall && !activeCall && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-md w-full mx-4 shadow-xl`}>
            <div className="text-center mb-4">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                {incomingCall.call_type === 'video' ? (
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                )}
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {incomingCall.call_type === 'video' ? 'Video Call' : 'Voice Call'}
              </h3>
              <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Incoming call...
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleEndCall();
                }}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Decline
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAnswerCall();
                }}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Call UI - Full Screen - Show for video calls or if we have video tracks */}
      {(() => {
        const shouldShowVideoUI = activeCall && (activeCall.type === 'video' || activeCall.call_type === 'video' || (localStream && localStream.getVideoTracks().length > 0));
        if (shouldShowVideoUI) {
          console.log('🎬 Rendering Video Call UI', {
            activeCall: !!activeCall,
            type: activeCall?.type,
            call_type: activeCall?.call_type,
            hasLocalStream: !!localStream,
            hasVideoTracks: localStream ? localStream.getVideoTracks().length > 0 : false,
            hasRemoteStream: !!remoteStream,
            activeCall_id: activeCall?.call_id || activeCall?.id,
            caller_id: activeCall?.caller_id || activeCall?.callerId,
            my_id: user?.id || user?._id,
            is_caller: activeCall?.caller_id && String(activeCall.caller_id) === String(user?.id || user?._id),
          });
        }
        return shouldShowVideoUI;
      })() && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Remote Video (Karşı Taraf) */}
          <div className="flex-1 relative bg-gray-900">
            <video
              ref={(el) => {
                remoteVideoRef.current = el;
                // When video element mounts, immediately set stream if available
                if (el && remoteStream) {
                  console.log('🎬 Video element mounted, setting stream immediately...');
                  el.srcObject = remoteStream as MediaStream;
                  el.muted = false;
                  el.play().catch(err => {
                    if (err.name !== 'AbortError') {
                      console.warn('⚠️ Failed to play on mount:', err);
                    }
                  });
                }
              }}
              autoPlay
              playsInline
              muted={false}
              className="w-full h-full object-cover"
              style={{ backgroundColor: '#111827' }}
              onLoadedMetadata={(e) => {
                const video = e.currentTarget;
                console.log('📹 Video onLoadedMetadata callback', {
                  readyState: video.readyState,
                  videoWidth: video.videoWidth,
                  videoHeight: video.videoHeight,
                  paused: video.paused,
                });
                // Try to play when metadata is loaded
                if (video.paused) {
                  video.play().catch(err => {
                    if (err.name !== 'AbortError') {
                      console.warn('⚠️ Failed to play in onLoadedMetadata:', err);
                    }
                  });
                }
              }}
              onLoadedData={(e) => {
                const video = e.currentTarget;
                console.log('📹 Video onLoadedData callback', {
                  readyState: video.readyState,
                  paused: video.paused,
                });
                if (video.paused && video.readyState >= 2) {
                  video.play().catch(err => {
                    if (err.name !== 'AbortError') {
                      console.warn('⚠️ Failed to play in onLoadedData:', err);
                    }
                  });
                }
              }}
              onCanPlay={(e) => {
                const video = e.currentTarget;
                console.log('📹 Video onCanPlay callback', {
                  readyState: video.readyState,
                  paused: video.paused,
                });
                if (video.paused) {
                  video.play().catch(err => {
                    if (err.name !== 'AbortError') {
                      console.warn('⚠️ Failed to play in onCanPlay:', err);
                    }
                  });
                }
              }}
              onCanPlayThrough={(e) => {
                const video = e.currentTarget;
                console.log('📹 Video onCanPlayThrough callback');
                if (video.paused) {
                  video.play().catch(err => {
                    if (err.name !== 'AbortError') {
                      console.warn('⚠️ Failed to play in onCanPlayThrough:', err);
                    }
                  });
                }
              }}
              onPlaying={(e) => {
                const video = e.currentTarget;
                console.log('✅ Video onPlaying callback', {
                  videoWidth: video.videoWidth,
                  videoHeight: video.videoHeight,
                });
              }}
              onError={(e) => {
                console.error('❌ Video element error:', e);
              }}
            />
            {(!remoteStream || (remoteStream && (remoteStream as MediaStream).getVideoTracks().length === 0) || 
              (remoteStream && (remoteStream as MediaStream).getVideoTracks().every(t => !t.enabled || t.readyState !== 'live'))) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`w-24 h-24 ${actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-600'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    {otherPartyInfo?.avatar ? (
                      <img src={otherPartyInfo.avatar} alt={otherPartyInfo.username} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-4xl text-white font-semibold">
                        {otherPartyInfo?.username?.[0]?.toUpperCase() || chatInfo?.name?.[0]?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <p className="text-white text-lg font-semibold">{otherPartyInfo?.username || chatInfo?.name || 'Connecting...'}</p>
                  <p className="text-gray-400 text-sm mt-2">
                    {remoteStream && (remoteStream as MediaStream).getVideoTracks().length > 0 
                      ? 'Video connecting...' 
                      : 'Waiting for video connection...'}
                  </p>
                </div>
              </div>
            )}
            
            {/* Local Video (Küçük Pencere) - Only show if we have video */}
            {localStream && localStream.getVideoTracks().length > 0 && (
              <div className="absolute bottom-20 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-white">
                <video
                  ref={(el) => {
                    localVideoRef.current = el;
                    // When local video element mounts, immediately set stream if available
                    if (el && localStream && localStream.getVideoTracks().length > 0) {
                      console.log('🎬 Local video element mounted, setting stream immediately...');
                      el.srcObject = localStream;
                      el.muted = true;
                      el.play().catch(err => {
                        if (err.name !== 'AbortError') {
                          console.warn('⚠️ Failed to play local video on mount:', err);
                        }
                      });
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Call Controls */}
          <div className="bg-gray-900/90 p-4 flex items-center justify-center space-x-4">
            <button
              onClick={() => {
                setIsMuted(!isMuted);
                if (localStream) {
                  localStream.getAudioTracks().forEach(track => {
                    track.enabled = isMuted;
                  });
                }
              }}
              className={`p-3 rounded-full transition ${isMuted ? 'bg-red-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMuted ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0a11 11 0 01-11-11m11 11a11 11 0 0011-11M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                )}
              </svg>
            </button>
            
            <button
              onClick={() => {
                setIsVideoOff(!isVideoOff);
                if (localStream) {
                  localStream.getVideoTracks().forEach(track => {
                    track.enabled = isVideoOff;
                  });
                }
              }}
              className={`p-3 rounded-full transition ${isVideoOff ? 'bg-red-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
              title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isVideoOff ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                )}
              </svg>
            </button>

            <button
              onClick={() => {
                // Switch camera (front/back)
                if (localStream) {
                  const videoTrack = localStream.getVideoTracks()[0];
                  if (videoTrack && 'getCapabilities' in videoTrack) {
                    const capabilities = videoTrack.getCapabilities();
                    if (capabilities.facingMode) {
                      const facingMode = videoTrack.getSettings().facingMode === 'user' ? 'environment' : 'user';
                      videoTrack.applyConstraints({ facingMode });
                    }
                  }
                }
              }}
              className="p-3 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition"
              title="Switch camera"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleEndCall();
              }}
              className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition"
              title="End call"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Sesli aramada karşı tarafın sesini çalmak için gizli audio */}
      {activeCall && (
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      )}

      {/* Voice Call UI */}
      {activeCall && (activeCall.type === 'voice' || activeCall.call_type === 'voice') && !(activeCall.type === 'video' || activeCall.call_type === 'video' || (localStream && localStream.getVideoTracks().length > 0)) && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
          <div className="text-center mb-8">
            <div className={`w-32 h-32 ${actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-600'} rounded-full flex items-center justify-center mx-auto mb-4`}>
              {otherPartyInfo?.avatar ? (
                <img src={otherPartyInfo.avatar} alt={otherPartyInfo.username} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-6xl text-white font-semibold">
                  {otherPartyInfo?.username?.[0]?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <h3 className="text-2xl font-semibold text-white mb-2">{otherPartyInfo?.username || 'Voice Call'}</h3>
            <p className="text-gray-400">Calling...</p>
          </div>
          
          {/* Voice Call Controls */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => {
                setIsMuted(!isMuted);
                if (localStream) {
                  localStream.getAudioTracks().forEach(track => {
                    track.enabled = isMuted;
                  });
                }
              }}
              className={`p-4 rounded-full transition ${isMuted ? 'bg-red-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMuted ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0a11 11 0 01-11-11m11 11a11 11 0 0011-11M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                )}
              </svg>
            </button>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleEndCall();
              }}
              className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition"
              title="End call"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Chat Header - sabit üstdə */}
      <div className={`flex-shrink-0 p-3 md:p-4 ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between shadow-sm`}>
        <div className="flex items-center space-x-2 md:space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className={`p-2 md:p-2 rounded-full transition md:hidden ${actualTheme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
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
              className={`hidden md:block p-2 rounded-full transition ${actualTheme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
              aria-label="Back to chats"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {/* Avatar — direct chat: click opens profile; avatar click shows full image */}
          <button
            onClick={() => {
              if (chatInfo?.type === 'direct' && !chatInfo?.other_party_anonymous && otherPartyInfo?.id) {
                router.push(`/profile/${otherPartyInfo.id}`);
              } else if (chatInfo?.type === 'direct' && otherPartyInfo?.avatar) {
                setShowAvatarModal(true);
              }
            }}
            className="flex-shrink-0"
          >
            {chatInfo?.type === 'direct' && otherPartyInfo?.avatar ? (
              <img
                src={otherPartyInfo.avatar}
                alt={otherPartyInfo.username || 'User'}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition"
              />
            ) : (
              <div className={`w-9 h-9 md:w-10 md:h-10 ${actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-full flex items-center justify-center font-semibold text-sm md:text-base ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'} ${chatInfo?.type === 'direct' && !chatInfo?.other_party_anonymous ? 'cursor-pointer hover:opacity-80 transition' : ''}`}>
                {chatInfo?.type === 'direct' && otherPartyInfo?.username
                  ? otherPartyInfo.username[0]?.toUpperCase()
                  : (chatInfo?.other_party_anonymous ? 'A' : chatInfo?.group_name?.[0]) || 'U'}
              </div>
            )}
          </button>
          {/* Name — direct non-anonymous chat: click opens profile */}
          <div className="min-w-0 flex-1">
            <h2
              onClick={() => {
                if (chatInfo?.type === 'direct' && !chatInfo?.other_party_anonymous && otherPartyInfo?.id) {
                  router.push(`/profile/${otherPartyInfo.id}`);
                }
              }}
              className={`text-base md:text-lg font-semibold truncate ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'} ${chatInfo?.type === 'direct' && !chatInfo?.other_party_anonymous && otherPartyInfo?.id ? 'cursor-pointer hover:underline' : ''}`}
            >
              {chatInfo?.type === 'direct' && otherPartyInfo?.username
                ? otherPartyInfo.username
                : (chatInfo?.other_party_anonymous ? t('anonymous') : (chatInfo?.group_name || t('chats')))}
            </h2>
            {chatInfo?.type === 'group' && Array.isArray(chatInfo?.members) && (
              <p className={`text-[11px] ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {chatInfo.members.length} {t('contactsTab').toLowerCase()}
              </p>
            )}
            {chatInfo?.type === 'direct' && !chatInfo?.other_party_anonymous && otherPartyInfo?.id && !isTyping && (
              <p className={`text-[11px] ${actualTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                Profili gör →
              </p>
            )}
            {isTyping && (
              <p className={`text-xs ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('typing')}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Sesli Arama Butonu */}
          <button
            onClick={handleVoiceCall}
            className={`p-2 rounded-full transition ${actualTheme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
            title="Voice Call"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
          {/* Video Görüntülü Arama Butonu */}
          <button
            onClick={handleVideoCall}
            className={`p-2 rounded-full transition ${actualTheme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
            title="Video Call"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Reply Bar - sabit */}
      {replyingTo && (
        <div className="flex-shrink-0 bg-green-100 p-3 border-l-4 border-green-500 flex items-center justify-between">
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

      {/* Messages - yalnız bu hissə scroll olur */}
      <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-2 md:p-4 ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
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
                  <div className="relative flex-shrink-0 mb-0.5">
                    <div className="w-7 h-7 md:w-8 md:h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {getDisplayName(message)[0]?.toUpperCase() || 'U'}
                    </div>
                    {chatInfo?.type === 'group' && message.sender_id && onlineUsers.has(String(message.sender_id)) && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border border-white dark:border-gray-800 rounded-full"></div>
                    )}
                  </div>
                )}
                {!isMine && !showAvatar && (
                  <div className="w-7 md:w-8 flex-shrink-0"></div>
                )}
                <div
                  className="relative"
                  ref={selectedMessage?.id === message.id ? selectedMessageBubbleRef : null}
                >
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
                    onTouchStart={(e) => handleMessageTouchStart(e, message)}
                    onTouchEnd={handleMessageTouchEnd}
                    onTouchMove={handleMessageTouchMove}
                    onTouchCancel={handleMessageTouchEnd}
                    onClick={(e) => {
                      if (messageJustDidLongPressRef.current) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                  >
                    {/* Grup mesajlarında gönderen ismini göster */}
                    {chatInfo?.type === 'group' && !isMine && showAvatar && (
                      <p className={`text-xs font-semibold mb-1 ${isMine ? 'text-white/90' : actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {getDisplayName(message)}
                      </p>
                    )}
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

                    {/* Message Content - WhatsApp style: media first, then optional caption */}
                    {message.message_type === 'image' && message.file_url && (
                      <div className="mb-1">
                        <div className="rounded-lg overflow-hidden max-w-[280px] sm:max-w-[320px]">
                          <img
                            src={getMessageFileUrl(message.file_url)}
                            alt={message.content || 'Shared image'}
                            className="w-full max-h-80 object-cover cursor-pointer block"
                            loading="lazy"
                            onClick={() => window.open(getMessageFileUrl(message.file_url), '_blank')}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const wrap = (e.target as HTMLImageElement).closest('.rounded-lg');
                              const fallback = wrap?.querySelector('.img-fallback');
                              if (fallback) (fallback as HTMLElement).classList.remove('hidden');
                            }}
                          />
                          <div className="img-fallback hidden py-8 px-4 bg-gray-300 dark:bg-gray-600 rounded-b-lg text-center text-sm">
                            {t('image')}
                          </div>
                        </div>
                        {message.content && (
                          <p className="text-sm whitespace-pre-wrap break-words mt-1">{message.content}</p>
                        )}
                      </div>
                    )}
                    {message.message_type === 'video' && message.file_url && (
                      <div className="mb-1">
                        <video controls src={getMessageFileUrl(message.file_url)} className="max-w-full max-h-80 rounded-lg w-full" />
                        {message.content && (
                          <p className="text-sm whitespace-pre-wrap break-words mt-1">{message.content}</p>
                        )}
                      </div>
                    )}
                    {(message.message_type === 'audio' || message.message_type === 'voice_message') && message.file_url && (
                      <div className="mb-1">
                        <audio controls src={getMessageFileUrl(message.file_url)} className="w-full max-w-[280px]" />
                        {message.content && (
                          <p className="text-sm whitespace-pre-wrap break-words mt-1">{message.content}</p>
                        )}
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
                      <a
                        href={getMessageFileUrl(message.file_url)}
                        download={message.file_name || undefined}
                        className="mb-1 flex items-center gap-3 p-3 rounded-lg bg-gray-200/80 dark:bg-gray-700/80 hover:bg-gray-300/80 dark:hover:bg-gray-600/80 max-w-[280px] sm:max-w-[320px]"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-400 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{message.file_name || message.content}</p>
                          {message.file_size != null && message.file_size > 0 && (
                            <p className="text-xs opacity-75">{formatFileSize(message.file_size)}</p>
                          )}
                        </div>
                        <svg className="w-5 h-5 flex-shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    )}
                    {message.content && message.message_type === 'text' && (
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
                        <span className="text-xs flex items-center space-x-0.5">
                          {/* Read: blue double check, Unread: grey single check */}
                          {message.status === 'read' ? (
                            <span className="text-blue-400" title="Read">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" transform="translate(2 2)" />
                              </svg>
                            </span>
                          ) : (
                            <span className="text-gray-400" title="Unread">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
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

                  {/* Message Options Menu - aynı stil: grup sağ tık menüsü; altda yer qalmırsa yuxarı açılır */}
                  {selectedMessage?.id === message.id && (
                    <div
                      className={`absolute z-10 min-w-[200px] max-w-[260px] rounded-lg shadow-xl border ${
                        messageMenuOpenUp ? 'bottom-full mb-2' : 'top-full mt-2'
                      } ${isMine ? 'right-0' : 'left-0'} ${
                        actualTheme === 'dark'
                          ? 'bg-gray-800 border-gray-700 text-white'
                          : 'bg-white border-gray-200 text-gray-800'
                      }`}
                    >
                      <button
                        onClick={() => {
                          setReplyingTo(message);
                          setSelectedMessage(null);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <span>💬</span>
                        <span>{t('reply')}</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowEmojiPicker(true);
                          setSelectedMessage(message);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <span>😊</span>
                        <span>{t('react')}</span>
                      </button>
                      <button
                        onClick={() => handleForwardMessage(message.id)}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
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
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                          >
                            <span>✏️</span>
                            <span>{t('edit')}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(message.id, false)}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                          >
                            <span>🗑️</span>
                            <span>{t('deleteForMe')}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(message.id, true)}
                            className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                          >
                            <span>🗑️</span>
                            <span>{t('deleteForEveryone')}</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSelectedMessage(null)}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
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

      {/* Message Input - sabit aşağıda */}
      <div className={`flex-shrink-0 p-2 md:p-3 ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-t ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        {/* Ses kaydı göstergesi */}
        {isRecording && (
          <div className="mb-2 flex items-center justify-center space-x-2 p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
            </span>
            <button
              onClick={stopRecording}
              className="px-3 py-1 bg-red-500 text-white rounded-full text-sm hover:bg-red-600"
            >
              Stop & Send
            </button>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex items-end space-x-1 md:space-x-2">
          <div className="relative">
            {/* Attachment Menu Button */}
            <button
              type="button"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              className="p-2 md:p-2 text-gray-500 hover:text-gray-700 transition active:bg-gray-100 rounded-full"
              title="Attach"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            {/* Attachment Menu Dropdown */}
            {showAttachmentMenu && (
              <div className={`absolute bottom-full left-0 mb-2 w-56 rounded-lg shadow-xl border z-50 ${
                actualTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <button
                  type="button"
                  onClick={() => handleAttachmentSelect('document')}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 rounded-t-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAttachmentSelect('picture')}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Photo & Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAttachmentSelect('location')}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 rounded-b-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Location</span>
                </button>
              </div>
            )}
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
            {/* Ses kaydı butonu veya input */}
            {isRecording ? (
              <div className="flex-1 flex items-center justify-center">
                <button
                  type="button"
                  onClick={stopRecording}
                  className="text-red-500 hover:text-red-600"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                  </svg>
                </button>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
          {/* Gönder butonu veya ses kaydı butonu */}
          {isRecording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="p-2 md:p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition active:bg-red-600 flex-shrink-0"
              title="Stop recording"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
            </button>
          ) : newMessage.trim() ? (
            <button
              type="submit"
              disabled={loading}
              className="p-2 md:p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed active:bg-green-600 flex-shrink-0"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                startRecording();
              }}
              onMouseUp={(e) => {
                e.preventDefault();
                if (isRecording && recordingTime > 0) {
                  stopRecording();
                }
              }}
              onMouseLeave={(e) => {
                if (isRecording && recordingTime > 0) {
                  stopRecording();
                }
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                startRecording();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                if (isRecording && recordingTime > 0) {
                  stopRecording();
                }
              }}
              className="p-2 md:p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition active:bg-green-600 flex-shrink-0"
              title="Hold to record voice"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
              </svg>
            </button>
          )}
        </form>
      </div>

      {/* Avatar Modal - Resme tıklayınca büyük gösterim */}
      {showAvatarModal && otherPartyInfo?.avatar && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={() => setShowAvatarModal(false)}>
          <div className="max-w-4xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={otherPartyInfo.avatar}
              alt={otherPartyInfo.username || 'User'}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setShowAvatarModal(false)}
              className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close menus */}
      {(selectedMessage || showEmojiPicker || showContactPicker || showAttachmentMenu) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setSelectedMessage(null);
            setShowEmojiPicker(false);
            setShowContactPicker(false);
            setShowAttachmentMenu(false);
          }}
        />
      )}
    </div>
  );
}
