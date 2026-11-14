import api from './api';

export const accountService = {
  // Get all accounts with search, filter, pagination
  getAccounts: async (params = {}) => {
    const response = await api.get('/accounts', { params });
    return response.data;
  },

  // Get single account by ID
  getAccountById: async (id) => {
    const response = await api.get(`/accounts/${id}`);
    return response.data;
  },

  // Create new account
  createAccount: async (data) => {
    const response = await api.post('/accounts', data);
    return response.data;
  },

  // Update account (Name, Email, Role, Status)
  updateAccount: async (id, data) => {
    const response = await api.put(`/accounts/${id}`, data);
    return response.data;
  },

  // Toggle account status (active / inactive)
  toggleStatus: async (id, status) => {
    const response = await api.patch(`/accounts/${id}/status`, { status });
    return response.data;
  },

  // Change account role
  changeRole: async (id, role) => {
    const response = await api.patch(`/accounts/${id}/role`, { role });
    return response.data;
  },

  // Reset account password
  resetPassword: async (id, newPassword, confirmPassword) => {
    const response = await api.patch(`/accounts/${id}/password`, {
      newPassword,
      confirmPassword
    });
    return response.data;
  },

  // Delete account
  deleteAccount: async (id) => {
    const response = await api.delete(`/accounts/${id}`);
    return response.data;
  }
};

