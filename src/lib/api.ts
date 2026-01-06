const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string, options?: { data?: any }): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: options?.data ? JSON.stringify(options.data) : undefined,
    });
  }

  async uploadFile(endpoint: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }
}

export const api = new ApiClient(API_URL);

// Auth API
export const authApi = {
  register: (data: { phone_number: string; username?: string; password?: string }) =>
    api.post('/auth/register', data),
  login: (data: { phone_number: string; password: string }) =>
    api.post('/auth/login', data),
  getQRCode: (userId: string) => api.get(`/auth/qr/${userId}`),
  sendCode: (phoneNumber: string) =>
    api.post('/auth/send-code', { phone_number: phoneNumber }),
  verifyCode: (phoneNumber: string, code: string) =>
    api.post('/auth/verify-code', { phone_number: phoneNumber, code }),
  registerWithCode: (data: {
    phone_number: string;
    code: string;
    username?: string;
    user_type: 'normal' | 'company';
    company_name?: string;
    company_category?: string;
  }) => api.post('/auth/register-with-code', data),
};

// User API
export const userApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data: any) => api.put('/users/me', data),
  updateLocation: (data: { latitude: number; longitude: number; address?: string }) =>
    api.put('/users/location', data),
  getNearbyUsers: (radius?: number) =>
    api.get(`/users/nearby${radius ? `?radius=${radius}` : ''}`),
  searchByUsername: (query: string) =>
    api.get(`/public/users/search?q=${encodeURIComponent(query)}`),
  searchUsers: (query: string) =>
    api.get(`/public/users/search?q=${encodeURIComponent(query)}`),
};

// Contact API
export const contactApi = {
  getContacts: () => api.get('/contacts'),
  addContact: (userId: string) => api.post('/contacts', { user_id: userId }),
  scanQRCode: (qrData: string) => api.post('/contacts/scan', { qr_data: qrData }),
  deleteContact: (contactId: string) => api.delete(`/contacts/${contactId}`),
  removeContact: (contactId: string) => api.delete(`/contacts/${contactId}`),
};

// Chat API
export const chatApi = {
  getChats: () => api.get('/chats'),
  createChat: (data: { type: string; member_ids?: string[]; group_name?: string }) =>
    api.post('/chats', data),
  getChat: (chatId: string) => api.get(`/chats/${chatId}`),
  getMessages: (chatId: string) => api.get(`/chats/${chatId}/messages`),
  sendMessage: (chatId: string, data: any) => api.post(`/chats/${chatId}/messages`, data),
};

// Message API
export const messageApi = {
  editMessage: (messageId: string, content: string) => 
    api.put(`/messages/${messageId}`, { content }),
  deleteMessage: (messageId: string, deleteForEveryone?: boolean) => 
    api.delete(`/messages/${messageId}`, deleteForEveryone ? { data: { delete_for_everyone: deleteForEveryone } } : undefined),
  forwardMessage: (messageId: string, chatIds: string[]) => 
    api.post(`/messages/${messageId}/forward`, { chat_ids: chatIds }),
  addReaction: (messageId: string, emoji: string) => 
    api.post(`/messages/${messageId}/reaction`, { emoji }),
  removeReaction: (messageId: string) => 
    api.delete(`/messages/${messageId}/reaction`),
  markAsRead: (chatId: string, messageIds?: string[]) => 
    api.post(`/messages/read`, { chat_id: chatId, message_ids: messageIds || [] }),
  pinMessage: (chatId: string, messageId: string) => 
    api.post(`/messages/${messageId}/pin`),
  unpinMessage: (chatId: string, messageId: string) => 
    api.delete(`/messages/${messageId}/pin`),
  votePoll: (messageId: string, optionId: string) => 
    api.post(`/messages/${messageId}/poll/vote`, { option_id: optionId }),
  searchMessages: (query: string, chatId?: string) => 
    api.get(`/messages/search?q=${encodeURIComponent(query)}${chatId ? `&chat_id=${chatId}` : ''}`),
  translateMessage: (messageId: string, lang?: string) => 
    api.get(`/messages/${messageId}/translate${lang ? `?lang=${lang}` : ''}`),
};

// Typing API
export const typingApi = {
  setTyping: (chatId: string, type: 'typing' | 'recording_voice' | 'recording_video') => 
    api.post(`/typing/${chatId}`, { type }),
  getTyping: (chatId: string) => api.get(`/typing/${chatId}`),
};

// Group API
export const groupApi = {
  createGroup: (data: { group_name: string; group_icon?: string; member_ids?: string[] }) =>
    api.post('/groups', data),
  getGroups: () => api.get('/groups'),
  getGroup: (groupId: string) => api.get(`/groups/${groupId}`),
  updateGroup: (groupId: string, data: any) => api.put(`/groups/${groupId}`, data),
  deleteGroup: (groupId: string) => api.delete(`/groups/${groupId}`),
  addMember: (groupId: string, memberId: string) =>
    api.post(`/groups/${groupId}/members`, { member_id: memberId }),
  removeMember: (groupId: string, memberId: string) =>
    api.delete(`/groups/${groupId}/members/${memberId}`),
};

// Proposal API
export const proposalApi = {
  createProposal: (data: { receiver_id: string; title: string; content: string }) =>
    api.post('/proposals', data),
  getProposals: () => api.get('/proposals'),
  acceptProposal: (proposalId: string) => api.put(`/proposals/${proposalId}/accept`),
  rejectProposal: (proposalId: string) => api.put(`/proposals/${proposalId}/reject`),
};

// Call API
export const callApi = {
  initiateCall: (data: { type: string; chat_id: string; members?: string[] }) =>
    api.post('/calls', data),
  answerCall: (callId: string) => api.post(`/calls/${callId}/answer`),
  endCall: (callId: string) => api.post(`/calls/${callId}/end`),
};

// File API
export const fileApi = {
  uploadFile: (file: File) => api.uploadFile('/files/upload', file),
};

// Settings API
export const settingsApi = {
  getSettings: () => api.get('/settings'),
  updateSettings: (data: any) => api.put('/settings', data),
  updateAccountSettings: (data: any) => api.put('/settings/account', data),
  updatePrivacySettings: (data: any) => api.put('/settings/privacy', data),
  updateChatSettings: (data: any) => api.put('/settings/chat', data),
  updateNotificationSettings: (data: any) => api.put('/settings/notifications', data),
  updateAppearanceSettings: (data: any) => api.put('/settings/appearance', data),
  updateDataSettings: (data: any) => api.put('/settings/data', data),
  updateCallSettings: (data: any) => api.put('/settings/calls', data),
  updateGroupSettings: (data: any) => api.put('/settings/groups', data),
  updateAdvancedSettings: (data: any) => api.put('/settings/advanced', data),
  getSessions: () => api.get('/settings/sessions'),
  terminateSession: (sessionId: string) => api.delete(`/settings/sessions/${sessionId}`),
  blockUser: (userId: string) => api.post('/settings/block', { user_id: userId }),
  unblockUser: (userId: string) => api.delete(`/settings/block/${userId}`),
  getBlockedUsers: () => api.get('/settings/blocked'),
  suspendAccount: () => api.post('/settings/suspend'),
  deleteAccount: () => api.post('/settings/delete'),
  clearCache: () => api.post('/settings/cache/clear'),
  getDataUsage: () => api.get('/settings/data-usage'),
};

// Product API
export const productApi = {
  createProduct: (data: {
    name: string;
    description: string;
    category: string;
    media_urls: string[];
    product_id?: string;
    price?: number;
    privacy?: string;
  }) => api.post('/products', data),
  getProducts: (params?: { page?: number; limit?: number; category?: string; owner_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.category) query.append('category', params.category);
    if (params?.owner_id) query.append('owner_id', params.owner_id);
    return api.get(`/products?${query.toString()}`);
  },
  getProduct: (productId: string) => api.get(`/products/${productId}`),
  updateProduct: (productId: string, data: any) => api.put(`/products/${productId}`, data),
  deleteProduct: (productId: string) => api.delete(`/products/${productId}`),
  getUserProducts: (userId: string) => api.get(`/products/user/${userId}`),
};

// Comment API
export const commentApi = {
  createComment: (productId: string, data: { content: string; parent_id?: string }) =>
    api.post(`/products/${productId}/comments`, data),
  getComments: (productId: string) => api.get(`/products/${productId}/comments`),
  deleteComment: (commentId: string) => api.delete(`/comments/${commentId}`),
  reportSpam: (commentId: string) => api.post(`/comments/${commentId}/report`),
};

// Like API
export const likeApi = {
  likeProduct: (productId: string) => api.post(`/products/${productId}/like`),
  unlikeProduct: (productId: string) => api.delete(`/products/${productId}/like`),
  likeComment: (commentId: string) => api.post(`/comments/${commentId}/like`),
  unlikeComment: (commentId: string) => api.delete(`/comments/${commentId}/like`),
  getProductLikes: (productId: string) => api.get(`/products/${productId}/likes`),
};
