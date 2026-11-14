import api from './api';

export const dashboardService = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  getRecent: async () => {
    const response = await api.get('/dashboard/recent');
    return response.data;
  }
};

