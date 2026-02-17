'use client';

import { useState, useEffect, useRef } from 'react';
import { chatApi, fileApi, messageApi, typingApi, contactApi, userApi, callApi } from '@/lib/api';
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
  /** If an incoming call arrives while this chat isn't mounted, parent can pass it here. */
  prefilledIncomingCall?: any;
}

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function ChatWindow({ chatId, ws, onBack, prefilledIncomingCall }: ChatWindowProps) {
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
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [otherPartyInfo, setOtherPartyInfo] = useState<any>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const markedReadRef = useRef<Set<string>>(new Set());
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);

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
        ws.off('message_read', handleMessageRead);
        ws.off('webrtc_offer', handleWebRTCOffer);
        ws.off('webrtc_answer', handleWebRTCAnswer);
        ws.off('webrtc_ice', handleWebRTCICE);
      }
      clearInterval(interval);
      stopVideoCall();
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
    }
  }, [prefilledIncomingCall, chatId, incomingCall]);

  // Video stream cleanup
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream, remoteStream]);

  const handleIncomingCall = (data: any) => {
    try {
      const callData = typeof data === 'string' ? JSON.parse(data) : data;
      if (callData.type === 'call' && callData.chat_id === chatId) {
        setIncomingCall(callData);
      }
    } catch (error) {
      console.error('Failed to parse call data:', error);
    }
  };

  const handleCallAnswered = (data: any) => {
    try {
      const evt = typeof data === 'string' ? JSON.parse(data) : data;
      if (evt?.type === 'call_answered' && evt?.chat_id === chatId && activeCall) {
        // Call was answered by the other party, ensure WebRTC is ready
        console.log('✅ Call answered by other party, ensuring WebRTC connection...');
        // If we're the caller and haven't sent offer yet, do it now
        if (peerConnectionRef.current && localStream) {
          const pc = peerConnectionRef.current;
          const callType = activeCall?.type || activeCall?.call_type || evt?.call_type || 'voice';
          if (pc.localDescription === null) {
            // Create and send offer
            pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: callType === 'video',
            }).then(offer => {
              pc.setLocalDescription(offer);
              if (ws) {
                ws.send({
                  type: 'webrtc_offer',
                  chat_id: chatId,
                  call_id: activeCall?.call_id || activeCall?.id,
                  offer: JSON.stringify(offer),
                });
                console.log('📤 WebRTC offer sent (after call answered)');
              }
            }).catch(err => console.error('Failed to create offer:', err));
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse call_answered event:', error);
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

  // WebRTC handlers
  const handleWebRTCOffer = async (data: any) => {
    try {
      const evt = typeof data === 'string' ? JSON.parse(data) : data;
      if (evt?.chat_id !== chatId) return;

      if (!peerConnectionRef.current) {
        // Initialize peer connection if not already done
        if (localStream) {
          const callType = activeCall?.type || activeCall?.call_type || incomingCall?.call_type || incomingCall?.type || 'video';
          await initializePeerConnection(localStream, callType);
        } else {
          // Start stream first
          await startVideoCall();
        }
      }

      const pc = peerConnectionRef.current;
      if (!pc) return;

      const offer = JSON.parse(evt.offer);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (ws) {
        ws.send({
          type: 'webrtc_answer',
          chat_id: chatId,
          call_id: evt.call_id,
          answer: JSON.stringify(answer),
        });
      }
    } catch (error) {
      console.error('Failed to handle WebRTC offer:', error);
    }
  };

  const handleWebRTCAnswer = async (data: any) => {
    try {
      const evt = typeof data === 'string' ? JSON.parse(data) : data;
      if (evt?.chat_id !== chatId) return;

      const pc = peerConnectionRef.current;
      if (!pc) return;

      const answer = JSON.parse(evt.answer);
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Failed to handle WebRTC answer:', error);
    }
  };

  const handleWebRTCICE = async (data: any) => {
    try {
      const evt = typeof data === 'string' ? JSON.parse(data) : data;
      if (evt?.chat_id !== chatId) return;

      const pc = peerConnectionRef.current;
      if (!pc || !evt.candidate) return;

      const candidate = JSON.parse(evt.candidate);
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Failed to handle WebRTC ICE candidate:', error);
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
      setActiveCall({ ...(response || {}), type: 'voice' });
      
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
        await initializePeerConnection(stream, 'voice');
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
        setLocalStream(null);
      }
    } catch (error) {
      console.error('Failed to initiate voice call:', error);
      alert('Failed to initiate voice call');
      setActiveCall(null);
    }
  };

  // Video görüntülü arama başlat
  const handleVideoCall = async () => {
    try {
      const response: any = await callApi.initiateCall({
        type: 'video',
        chat_id: chatId,
      });
      setActiveCall({ ...(response || {}), type: 'video' });
      // Video stream'i başlat
      await startVideoCall();
    } catch (error) {
      console.error('Failed to initiate video call:', error);
      alert('Failed to initiate video call');
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
  const startVideoCall = async () => {
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
      if (localVideoRef.current && hasVideo) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Initialize WebRTC peer connection (use 'voice' if no video, otherwise 'video')
      const finalCallType = hasVideo ? 'video' : 'voice';
      await initializePeerConnection(stream, finalCallType);
    } catch (error: any) {
      console.error('Failed to start video call:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to start video call. ';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow camera/microphone access in your browser settings.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera or microphone found. Please connect a device and try again.';
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
            await initializePeerConnection(audioStream, 'voice');
            // Update call type to voice but keep UI open
            if (activeCall) {
              setActiveCall({ ...activeCall, type: 'voice' });
            }
            alert('Video camera not available. Continuing with audio only.');
            return; // Success with audio-only
          }
        } catch (audioError) {
          console.error('Audio-only fallback also failed:', audioError);
        }
      }
      
      alert(errorMessage);
      
      // Only reset call state if we truly can't continue
      setActiveCall(null);
      setLocalStream(null);
    }
  };

  // Initialize WebRTC peer connection
  const initializePeerConnection = async (localStream: MediaStream, callTypeOverride?: string) => {
    try {
      const callType = callTypeOverride || activeCall?.type || activeCall?.call_type || 'voice';
      
      // Create RTCPeerConnection with STUN servers
      const configuration: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      };

      const pc = new RTCPeerConnection(configuration);
      peerConnectionRef.current = pc;

      // Add local stream tracks to peer connection
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('✅ Received remote track:', event);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && ws) {
          ws.send({
            type: 'webrtc_ice',
            chat_id: chatId,
            call_id: activeCall?.call_id || activeCall?.id,
            candidate: JSON.stringify(event.candidate),
          });
          console.log('📤 ICE candidate sent');
        } else if (event.candidate === null) {
          console.log('✅ ICE gathering complete');
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('🔌 Peer connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          console.log('✅ WebRTC connected!');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          console.warn('⚠️ WebRTC connection failed or disconnected');
        }
      };

      // Create and send offer if we're the caller (not answering an incoming call)
      // Note: We check !incomingCall to ensure we're the initiator
      // But also check if we already have a local description (to avoid duplicate offers)
      if (activeCall && !incomingCall && pc.localDescription === null) {
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: callType === 'video',
          });
          await pc.setLocalDescription(offer);
          
          if (ws) {
            ws.send({
              type: 'webrtc_offer',
              chat_id: chatId,
              call_id: activeCall?.call_id || activeCall?.id,
              offer: JSON.stringify(offer),
            });
            console.log('📤 WebRTC offer sent');
          }
        } catch (error) {
          console.error('Failed to create/send offer:', error);
        }
      }
    } catch (error) {
      console.error('Failed to initialize peer connection:', error);
    }
  };

  // Video call'u durdur
  const stopVideoCall = () => {
    try {
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
      if (localStream) {
        try {
          localStream.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (e) {
              console.warn('Error stopping local track:', e);
            }
          });
        } catch (e) {
          console.warn('Error stopping local stream:', e);
        }
        setLocalStream(null);
      }
      
      // Stop remote stream tracks
      if (remoteStream) {
        try {
          remoteStream.getTracks().forEach(track => {
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
    } catch (error) {
      console.error('Error in stopVideoCall:', error);
      // Continue anyway - ensure state is cleared
      setLocalStream(null);
      setRemoteStream(null);
      if (peerConnectionRef.current) {
        peerConnectionRef.current = null;
      }
    }
  };

  // Gelen çağrıyı kabul et
  const handleAnswerCall = async () => {
    if (!incomingCall) return;
    const callType = incomingCall.call_type || incomingCall.type || 'voice';
    try {
      await callApi.answerCall(incomingCall.call_id || incomingCall.id);
      setActiveCall({ ...(incomingCall || {}), type: callType });
      setIncomingCall(null);
      // Video call ise stream başlat ve WebRTC bağlantısı kur
      if (callType === 'video') {
        await startVideoCall();
      } else if (callType === 'voice') {
        // Voice call için de audio stream başlat
        try {
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
          await initializePeerConnection(stream, callType);
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
          setLocalStream(null);
        }
      }
    } catch (error) {
      console.error('Failed to answer call:', error);
      alert('Failed to answer call');
      setActiveCall(null);
      setIncomingCall(null);
    }
  };

  // Çağrıyı reddet veya sonlandır
  const handleEndCall = async () => {
    const callId = activeCall?.call_id || activeCall?.id || incomingCall?.call_id || incomingCall?.id;
    
    // Immediately clean up UI state (synchronous)
    setActiveCall(null);
    setIncomingCall(null);
    
    // Stop all media tracks and clean up WebRTC
    stopVideoCall();
    
    // Reset mute/video states
    setIsMuted(false);
    setIsVideoOff(false);
    
    // Then try to end call on server (but don't block on error)
    if (callId) {
      try {
        await callApi.endCall(callId);
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
    <div className={`flex flex-col h-full ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Gelen Çağrı Modal */}
      {incomingCall && (
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
      {activeCall && activeCall.type === 'video' && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Remote Video (Karşı Taraf) */}
          <div className="flex-1 relative bg-gray-900">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {!remoteStream && (
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
                  <p className="text-gray-400 text-sm mt-2">Waiting for video connection...</p>
                </div>
              </div>
            )}
            
            {/* Local Video (Küçük Pencere) - Only show if we have video */}
            {localStream && localStream.getVideoTracks().length > 0 && (
              <div className="absolute bottom-20 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-white">
                <video
                  ref={localVideoRef}
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

      {/* Voice Call UI */}
      {activeCall && activeCall.type === 'voice' && (
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

      {/* Chat Header - WhatsApp Style */}
      <div className={`p-3 md:p-4 ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-b ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between shadow-sm`}>
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
          <button
            onClick={() => {
              if (chatInfo?.type === 'direct' && otherPartyInfo?.avatar) {
                setShowAvatarModal(true);
              }
            }}
            className="flex-shrink-0"
          >
            {chatInfo?.type === 'direct' && otherPartyInfo?.avatar ? (
              <img
                src={otherPartyInfo.avatar}
                alt={otherPartyInfo.username || 'User'}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover cursor-pointer"
              />
            ) : (
              <div className={`w-9 h-9 md:w-10 md:h-10 ${actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-full flex items-center justify-center font-semibold text-sm md:text-base ${actualTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                {chatInfo?.type === 'direct' && otherPartyInfo?.username
                  ? otherPartyInfo.username[0]?.toUpperCase()
                  : (chatInfo?.other_party_anonymous ? 'A' : chatInfo?.group_name?.[0]) || 'U'}
              </div>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <h2 className={`text-base md:text-lg font-semibold truncate ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {chatInfo?.type === 'direct' && otherPartyInfo?.username
                ? otherPartyInfo.username
                : (chatInfo?.other_party_anonymous ? t('anonymous') : (chatInfo?.group_name || t('chats')))}
            </h2>
            {chatInfo?.type === 'group' && Array.isArray(chatInfo?.members) && (
              <p className={`text-[11px] ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {chatInfo.members.length} {t('contactsTab').toLowerCase()}
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
