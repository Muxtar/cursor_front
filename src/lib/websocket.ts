// WebSocket URL: Railway'da NEXT_PUBLIC_WS_URL verin
// Railway'da şu değişkeni ekleyin:
// NEXT_PUBLIC_WS_URL=wss://cursurback-production.up.railway.app/ws
const getWsUrl = (): string => {
  // 1. Build-time env variable (Railway'da set edilmeli - ZORUNLU)
  const buildTimeUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (buildTimeUrl && buildTimeUrl.trim() !== '') {
    return buildTimeUrl.trim();
  }

  // 2. Runtime detection (sadece browser'da - sadece localhost için)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Local development - sadece localhost için localhost backend kullan
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'ws://localhost:8080/ws';
    }

    // Production'da (Railway) - env variable ZORUNLU
    console.error('❌ NEXT_PUBLIC_WS_URL is not set in Railway!');
    console.error('🔧 ÇÖZÜM:');
    console.error('1. Railway Dashboard → Front-end Service → Variables');
    console.error('2. Şu değişkeni ekleyin:');
    console.error('   NEXT_PUBLIC_WS_URL=wss://cursurback-production.up.railway.app/ws');
    console.error('3. REDEPLOY yapın (Deployments → Redeploy)');
    
    // Geçici olarak Railway backend URL'ini kullan
    return 'wss://cursurback-production.up.railway.app/ws';
  }

  // Server-side (SSR) - build-time env variable zorunlu
  if (!process.env.NEXT_PUBLIC_WS_URL) {
    return 'wss://cursurback-production.up.railway.app/ws'; // Fallback
  }
  return process.env.NEXT_PUBLIC_WS_URL;
};

// Runtime'da her çağrıda yeniden hesapla
let WS_URL: string | null = null;
const getWsUrlRuntime = (): string => {
  if (!WS_URL) {
    WS_URL = getWsUrl();
    if (typeof window !== 'undefined') {
      console.log('✅ WebSocket URL:', WS_URL);
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
  /** Queue for messages sent before connection is open; flushed on open */
  private sendQueue: any[] = [];

  constructor(wsUrl?: string, token?: string) {
    // Runtime'da URL'i dinamik olarak al (build-time'da set edilmemişse)
    this.wsUrl = wsUrl || getWsUrlRuntime();
    this.token = token || null;
  }

  isConnected(): boolean {
    return !!(this.ws && this.ws.readyState === WebSocket.OPEN);
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = this.token ? `${this.wsUrl}?token=${this.token}` : this.wsUrl;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.flushSendQueue();
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

  private flushSendQueue() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    while (this.sendQueue.length > 0) {
      const data = this.sendQueue.shift();
      if (data) this.ws.send(JSON.stringify(data));
    }
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
      this.sendQueue.push(data);
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





