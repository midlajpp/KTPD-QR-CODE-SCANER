import api from './api';

export const fieldService = {
  // Get all field definitions (optional activeOnly, search)
  getFields: async (params = {}) => {
    const response = await api.get('/fields', { params });
    return response.data;
  },

  // Get single field definition
  getFieldById: async (id) => {
    const response = await api.get(`/fields/${id}`);
    return response.data;
  },

  // Create new custom field
  createField: async (fieldData) => {
    const response = await api.post('/fields', fieldData);
    return response.data;
  },

  // Update existing field definition (preserves fieldKey)
  updateField: async (id, fieldData) => {
    const response = await api.put(`/fields/${id}`, fieldData);
    return response.data;
  },

  // Bulk reorder fields
  reorderFields: async (orders) => {
    const response = await api.put('/fields/reorder', { orders });
    return response.data;
  },

  // Toggle enabled/disabled state
  toggleField: async (id) => {
    const response = await api.patch(`/fields/${id}/toggle`);
    return response.data;
  },

  // Archive or delete field
  deleteField: async (id, permanent = false) => {
    const response = await api.delete(`/fields/${id}${permanent ? '?permanent=true' : ''}`);
    return response.data;
  },

  // Sub-field operations
  getChildFields: async (parentId) => {
    const response = await api.get(`/fields/${parentId}/children`);
    return response.data;
  },

  addChildField: async (parentId, childData) => {
    const response = await api.post(`/fields/${parentId}/children`, childData);
    return response.data;
  },

  updateChildField: async (parentId, childId, childData) => {
    const response = await api.put(`/fields/${parentId}/children/${childId}`, childData);
    return response.data;
  },

  deleteChildField: async (parentId, childId) => {
    const response = await api.delete(`/fields/${parentId}/children/${childId}`);
    return response.data;
  },

  reorderChildFields: async (parentId, childOrders) => {
    const response = await api.put(`/fields/${parentId}/children/reorder`, { childOrders });
    return response.data;
  },

  // Delete individual option from top-level field
  deleteFieldOption: async (fieldId, optionName) => {
    const encoded = encodeURIComponent(optionName);
    const response = await api.delete(`/fields/${fieldId}/options/${encoded}`);
    return response.data;
  },

  // Delete individual option from a sub-field
  deleteChildFieldOption: async (fieldId, childId, optionName) => {
    const encoded = encodeURIComponent(optionName);
    const response = await api.delete(`/fields/${fieldId}/children/${childId}/options/${encoded}`);
    return response.data;
  },

  // Get public field schema for QR verification
  getPublicFields: async () => {
    const response = await api.get('/public/fields');
    return response.data;
  }
};
