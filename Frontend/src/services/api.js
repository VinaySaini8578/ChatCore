const API_BASE_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

const apiRequest = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      credentials: 'include',
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.msg || data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
};

export const resolveAssetUrl = (url) => {
  if (!url) return url;
  if (url.startsWith('/uploads/')) return `${API_ORIGIN}${url}`;
  return url;
};

export const authAPI = {
  checkEmail: (email) => apiRequest('/auth/check-email', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyOtp: (userId, code) => apiRequest('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ userId, code }) }),
  verifyAndRegister: (data) => apiRequest('/auth/verify-and-register', { method: 'POST', body: JSON.stringify(data) }),
  loginWithPassword: (userId, password) => apiRequest('/auth/login-with-password', { method: 'POST', body: JSON.stringify({ userId, password }) }),
  getCurrentUser: () => apiRequest('/auth/me'),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
};

export const userAPI = {
  searchUsers: (query) => apiRequest(`/user/search?q=${encodeURIComponent(query)}`),
  getCurrentChatters: () => apiRequest('/user/getCurrentChatters'),
  updateProfile: ({ about, file, profilepicUrl }) => {
    const form = new FormData();
    if (typeof about === 'string') form.append('about', about);
    if (file) form.append('profilepic', file);
    if (profilepicUrl) form.append('profilepicUrl', profilepicUrl);
    return apiRequest('/user/update-profile', { method: 'POST', body: form });
  },
  block: (otherUserId) => apiRequest(`/user/block/${otherUserId}`, { method: 'POST' }),
  unblock: (otherUserId) => apiRequest(`/user/unblock/${otherUserId}`, { method: 'POST' }),
  listBlocked: () => apiRequest('/user/blocked/list'),
};

export const messageAPI = {
  // 1:1
  getMessages: (userId) => apiRequest(`/message/${userId}`),
  sendMessage: (receiverId, message, options = {}) => 
    apiRequest(`/message/send/${receiverId}`, { 
      method: 'POST', 
      body: JSON.stringify({ message, ...options }) 
    }),
  sendMedia: (receiverId, { file, caption = '', replyTo }) => {
    const formData = new FormData();
    if (file) formData.append('media', file);
    formData.append('message', caption);
    if (replyTo) formData.append('replyTo', replyTo);
    return apiRequest(`/message/send-media/${receiverId}`, { method: 'POST', body: formData });
  },
  deleteForMe: (messageIds) => apiRequest('/message/delete/me', { method: 'POST', body: JSON.stringify({ messageIds }) }),
  deleteForEveryone: (messageIds) => apiRequest('/message/delete/everyone', { method: 'POST', body: JSON.stringify({ messageIds }) }),
  forwardMessages: (messageIds, receiverIds) => apiRequest('/message/forward', { 
    method: 'POST', 
    body: JSON.stringify({ messageIds, receiverIds }) 
  }),

  // Groups
  getGroupMessages: (conversationId) => apiRequest(`/message/group/${conversationId}`),
  sendGroupMessage: (conversationId, message, options = {}) => 
    apiRequest(`/message/group/${conversationId}/send`, { 
      method: 'POST', 
      body: JSON.stringify({ message, ...options }) 
    }),
  sendGroupMedia: (conversationId, { file, caption = '', replyTo }) => {
    const form = new FormData();
    if (file) form.append('media', file);
    form.append('message', caption);
    if (replyTo) form.append('replyTo', replyTo);
    return apiRequest(`/message/group/${conversationId}/send-media`, { method: 'POST', body: form });
  },

  // receipts
  markDelivered: (messageId) => apiRequest(`/message/${messageId}/delivered`, { method: 'POST' }),
  markSeen: (messageId) => apiRequest(`/message/${messageId}/seen`, { method: 'POST' }),
  getReceipts: (messageId) => apiRequest(`/message/${messageId}/receipts`),

  // starred
  star: (messageId) => apiRequest(`/message/star/${messageId}`, { method: 'POST' }),
  unstar: (messageId) => apiRequest(`/message/unstar/${messageId}`, { method: 'POST' }),
  listStarred: () => apiRequest('/message/starred/list'),

  clearChat: (receiverId) => apiRequest(`/message/clear/${receiverId}`, { method: 'DELETE' }),
  clearGroupChat: (groupId) => apiRequest(`/message/group/${groupId}/clear`, { method: 'DELETE' }),
};

export const conversationAPI = {
  createGroup: ({ name, members, groupAvatar }) => {
    const form = new FormData();
    form.append('name', name);
    (members || []).forEach((m) => form.append('members[]', m));
    if (groupAvatar) form.append('groupAvatar', groupAvatar);
    return apiRequest('/conversation/group', { method: 'POST', body: form });
  },
  updateGroup: (groupId, { name, groupAvatar }) => {
    const form = new FormData();
    if (name) form.append('name', name);
    if (groupAvatar) form.append('groupAvatar', groupAvatar);
    return apiRequest(`/conversation/group/${groupId}/update`, { method: 'POST', body: form });
  },
  addMembers: (groupId, members) => apiRequest(`/conversation/group/${groupId}/add-members`, { method: 'POST', body: JSON.stringify({ members }) }),
  getGroupMembers: (groupId) => apiRequest(`/conversation/group/${groupId}/members`),
  archive: (conversationId) => apiRequest(`/conversation/${conversationId}/archive`, { method: 'POST' }),
  unarchive: (conversationId) => apiRequest(`/conversation/${conversationId}/unarchive`, { method: 'POST' }),
  listArchived: () => apiRequest('/conversation/archived/list'),
  ensureOneToOne: (otherUserId) => apiRequest(`/conversation/ensure/${otherUserId}`),
};

export { API_BASE_URL, API_ORIGIN };