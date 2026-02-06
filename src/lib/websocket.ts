// WebSocket URL: Railway'da NEXT_PUBLIC_WS_URL verin, örn: wss://your-backend.up.railway.app/ws
// ÖNEMLİ: Next.js'te NEXT_PUBLIC_* değişkenleri build-time'da bundle'a gömülür.
const getWsUrl = (): string => {
  // 1. Build-time env variable (Railway'da set edilmeli)
  const buildTimeUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (buildTimeUrl) return buildTimeUrl;

  // 2. Runtime detection (sadece browser'da)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'ws://localhost:8080/ws';
    }

    // Railway production - backend URL'i runtime'da localStorage'dan oku (fallback)
    const savedBackendWsUrl = localStorage.getItem('backend_ws_url');
    if (savedBackendWsUrl) {
      return savedBackendWsUrl;
    }

    console.error('❌ NEXT_PUBLIC_WS_URL is not set!');
    console.error('Railway Front-end Service → Variables → Add:');
    console.error('NEXT_PUBLIC_WS_URL=wss://YOUR-BACKEND-SERVICE.up.railway.app/ws');
    console.error('Then REDEPLOY the front-end service!');

    // Fallback: window.location'dan backend URL'ini tahmin etmeye çalış
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${hostname}/ws`; // Bu genelde yanlış olacak
  }

  // Server-side (SSR) - build-time env variable zorunlu
  return process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';
};

// Runtime'da her çağrıda yeniden hesapla
let WS_URL: string | null = null;
const getWsUrlRuntime = (): string => {
  if (!WS_URL) {
    WS_URL = getWsUrl();
    if (typeof window !== 'undefined') {
      console.log('🔗 WebSocket URL:', WS_URL);
    }
  }
  return WS_URL;
};

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private wsUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor(wsUrl?: string, token?: string) {
    // Runtime'da URL'i dinamik olarak al (build-time'da set edilmemişse)
    this.wsUrl = wsUrl || getWsUrlRuntime();
    this.token = token || null;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = this.token ? `${this.wsUrl}?token=${this.token}` : this.wsUrl;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        this.connect().catch(console.error);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  private handleMessage(data: any) {
    if (data.type) {
      const listeners = this.listeners.get(data.type);
      if (listeners) {
        listeners.forEach((listener) => listener(data));
      }
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  joinChat(chatId: string) {
    this.send({ type: 'join_chat', chat_id: chatId });
  }

  leaveChat(chatId: string) {
    this.send({ type: 'leave_chat', chat_id: chatId });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }
}





