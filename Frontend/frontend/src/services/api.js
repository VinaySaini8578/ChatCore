import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  console.log('API Request:', config.method?.toUpperCase(), config.url);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const messageAPI = {
  sendMessage: (receiverId, message) => api.post(`/message/send/${receiverId}`, { message }),
  getMessages: (receiverId) => api.get(`/message/${receiverId}`),
  clearChat: (receiverId) => api.delete(`/message/clear/${receiverId}`),
  deleteForMe: (messageIds) =>
    api.post("/message/delete/me", { messageIds }),
  deleteForEveryone: (messageIds) =>
    api.post("/message/delete/everyone", { messageIds }),
  sendMediaMessage: (receiverId, file, onUploadProgress, abortSignal = null) => {
    const formData = new FormData();
    formData.append('media', file);
    
    const config = {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    };
    
    // Add abort signal if provided
    if (abortSignal) {
      config.signal = abortSignal;
    }
    
    return api.post(`/message/send-media/${receiverId}`, formData, config);
  },
};

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
};

export const userAPI = {
  searchUsers: (search = '') => api.get(`/user/search?search=${search}`),
  getCurrentChatters: () => api.get('/user/getCurrentChatters'),
};

export default api;