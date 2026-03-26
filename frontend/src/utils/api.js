import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  signup:     (data) => api.post('/auth/signup/', data),
  login:      (data) => api.post('/auth/login/', data),
  logout:     ()     => api.post('/auth/logout/'),
  getProfile: ()     => api.get('/auth/profile/'),
  healthCheck:()     => api.get('/auth/health/'),
};

export const budgetAPI = {
  uploadData:     (data) => api.post('/budget/upload-data/', data),
  trainModel:     ()     => api.post('/budget/train-model/'),
  getRecommendations: (data) => api.post('/budget/recommendations/', data),
  getAnalytics:   ()     => api.get('/budget/analytics/'),
  getCampaigns:   ()     => api.get('/budget/campaigns/'),
  saveCampaign:   (data) => api.post('/budget/campaigns/save/', data),
};

// Channel-Specific Model APIs
export const channelModelAPI = {
  trainChannel:        (data) => api.post('/model/train-channel/', data),
  predictChannel:      (data) => api.post('/model/predict-channel/', data),
  getChannelStatus:    (channel) => api.get('/model/channel-status/', { params: { channel } }),
  getAllChannelStatus: () => api.get('/model/channel-status/'),
  predictAllChannels:  (data) => api.post('/model/predict-all/', data),
};

export default api;