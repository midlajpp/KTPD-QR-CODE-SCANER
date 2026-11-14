import api from './api';

export const memberService = {
  // Fetch members with search, filters, pagination
  getMembers: async (params = {}) => {
    const response = await api.get('/members', { params });
    return response.data;
  },

  // Fetch single member by ID or memberId
  getMemberById: async (id) => {
    const response = await api.get(`/members/${id}`);
    return response.data;
  },

  // Create new member
  createMember: async (memberData) => {
    const response = await api.post('/members', memberData);
    return response.data;
  },

  // Update member (memberId and qrToken are strictly preserved)
  updateMember: async (id, memberData) => {
    const response = await api.put(`/members/${id}`, memberData);
    return response.data;
  },

  // Soft delete member
  deleteMember: async (id) => {
    const response = await api.delete(`/members/${id}`);
    return response.data;
  },

  // Bulk soft delete members
  bulkDeleteMembers: async (ids) => {
    const response = await api.post('/members/bulk-delete', { ids });
    return response.data;
  },

  // Toggle active/inactive status
  toggleStatus: async (id, status) => {
    const response = await api.patch(`/members/${id}/status`, { status });
    return response.data;
  },

  // Get QR image URL (includes token query param for browser <img> tags and direct clicks)
  getQrImageUrl: (id, download = false) => {
    const baseUrl = api.defaults.baseURL || '/api';
    const token = localStorage.getItem('ktpd_token');
    const params = new URLSearchParams();
    if (download) params.append('download', 'true');
    if (token) params.append('token', token);
    const queryString = params.toString();
    return `${baseUrl}/members/${id}/qr${queryString ? `?${queryString}` : ''}`;
  },

  // Fetch QR image as authenticated Blob URL for preview in <img />
  getQrImageBlob: async (id) => {
    const response = await api.get(`/members/${id}/qr`, {
      responseType: 'blob'
    });
    return window.URL.createObjectURL(response.data);
  },

  // Download individual QR code as high-res PNG file using authenticated request
  downloadQrCode: async (id, memberId) => {
    const response = await api.get(`/members/${id}/qr?download=true`, {
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'image/png' });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${memberId || id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  },

  // Download dynamic CSV export (Filename: KTPD-Members.csv)
  downloadMembersCsv: async (params = {}) => {
    const response = await api.get('/members/export', {
      params,
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'KTPD-Members.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  },

  // Download QR PNG ZIP archive (Filename: KTPD-QR-Codes.zip)
  downloadQrZip: async (params = {}) => {
    const response = await api.get('/members/export/qr-zip', {
      params,
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'application/zip' });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'KTPD-QR-Codes.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  },

  // Download All (CSV + QR ZIP) in unified archive (Filename: KTPD-Export.zip)
  downloadCompleteExportZip: async (params = {}) => {
    const response = await api.get('/members/export/all', {
      params,
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'application/zip' });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'KTPD-Export.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  },

  // Backward-compatibility wrapper for legacy download calls
  downloadIllustratorZip: async (params = {}) => {
    if (params.qrOnly) {
      return memberService.downloadQrZip(params);
    }
    return memberService.downloadCompleteExportZip(params);
  },

  // Download sample CSV template using authenticated request
  downloadTemplateCsv: async () => {
    const response = await api.get('/members/template', {
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'ktpd_members_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  },

  // Get public profile URL
  getProfileUrl: async (id) => {
    const response = await api.get(`/members/${id}/profile-url`);
    return response.data;
  },

  // Preview smart CSV import: detect columns, suggested types, duplicates, and new fields
  previewImportCsv: async (formData) => {
    const response = await api.post('/members/import/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Upload and execute smart CSV import with column mappings & duplicate strategy
  importCsv: async (formData, params = {}) => {
    const response = await api.post('/members/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      params
    });
    return response.data;
  },

  // Download standard CSV export URL with token
  exportCsvUrl: (params = {}) => {
    const baseUrl = api.defaults.baseURL || '/api';
    const token = localStorage.getItem('ktpd_token');
    const qParams = new URLSearchParams(params);
    if (token) qParams.append('token', token);
    const queryString = qParams.toString();
    return `${baseUrl}/members/export${queryString ? `?${queryString}` : ''}`;
  },

  // Download QR ZIP package URL with token
  exportQrZipUrl: (params = {}) => {
    const baseUrl = api.defaults.baseURL || '/api';
    const token = localStorage.getItem('ktpd_token');
    const qParams = new URLSearchParams(params);
    if (token) qParams.append('token', token);
    const queryString = qParams.toString();
    return `${baseUrl}/members/export/qr-zip${queryString ? `?${queryString}` : ''}`;
  },

  // Download All (CSV + QR ZIP) URL with token
  exportCompleteZipUrl: (params = {}) => {
    const baseUrl = api.defaults.baseURL || '/api';
    const token = localStorage.getItem('ktpd_token');
    const qParams = new URLSearchParams(params);
    if (token) qParams.append('token', token);
    const queryString = qParams.toString();
    return `${baseUrl}/members/export/all${queryString ? `?${queryString}` : ''}`;
  },

  // Legacy Illustrator ZIP package URL with token (maintained for backward-compatibility)
  exportIllustratorZipUrl: (params = {}) => {
    const baseUrl = api.defaults.baseURL || '/api';
    const token = localStorage.getItem('ktpd_token');
    const qParams = new URLSearchParams(params);
    if (token) qParams.append('token', token);
    const queryString = qParams.toString();
    return `${baseUrl}/members/qr/export${queryString ? `?${queryString}` : ''}`;
  },

  // Download sample CSV template URL with token
  getTemplateUrl: () => {
    const baseUrl = api.defaults.baseURL || '/api';
    const token = localStorage.getItem('ktpd_token');
    return `${baseUrl}/members/template${token ? `?token=${token}` : ''}`;
  },

  // Public QR scan fetch (no auth required)
  getPublicProfile: async (token) => {
    const response = await api.get(`/public/members/${token}`);
    return response.data;
  }
};

