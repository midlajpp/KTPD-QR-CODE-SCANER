import api from './api';

export const designService = {
  // Get both draft and published design settings
  getDesignSettings: async () => {
    const response = await api.get('/design');
    return response.data;
  },

  // Save working draft without altering live public profile
  saveDraft: async (draft) => {
    const response = await api.put('/design/draft', { draft });
    return response.data;
  },

  // Publish design live to all existing and new QR code profiles
  publishDesign: async (settings) => {
    const response = await api.post('/design/publish', { settings });
    return response.data;
  },

  // Reset design settings to default KTPD theme
  resetDesign: async () => {
    const response = await api.post('/design/reset');
    return response.data;
  },

  // Upload logo or background image
  uploadAsset: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post('/design/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Fetch published public profile design (No auth required)
  getPublicDesign: async () => {
    const response = await api.get('/public/profile-design');
    return response.data;
  }
};

