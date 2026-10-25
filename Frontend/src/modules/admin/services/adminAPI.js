import api from '@/services/api/axios.js'

const data = (res) => res.data.data

export const adminAPI = {
  login: (body) => api.post('/admin/auth/login', body).then(data),
  me: () => api.get('/admin/auth/me').then(data),
  updateProfile: (body) => api.patch('/admin/auth/profile', body).then(data),
  changePassword: (body) => api.post('/admin/auth/change-password', body).then(data),

  getDashboardStats: (params) => api.get('/admin/dashboard/stats', { params }).then(data),
  getSettings: () => api.get('/admin/settings').then(data),
  saveSettings: (body) => api.put('/admin/settings', body).then(data),
  getAuthPages: () => api.get('/admin/auth-pages').then(data),
  saveAuthPages: (body) => api.put('/admin/auth-pages', body).then(data),

  // Reports: path is e.g. "transactions" or "tax/<hotelId>"
  report: (path, params) => api.get(`/admin/reports/${path}`, { params }).then(data),

  // Broadcast notifications
  listBroadcasts: (params) => api.get('/admin/broadcasts', { params }).then(data),
  createBroadcast: (body) => api.post('/admin/broadcasts', body).then(data),
  deleteBroadcast: (id) => api.delete(`/admin/broadcasts/${id}`).then(data),
  searchRecipients: (q) => api.get('/admin/broadcasts/recipients', { params: { q } }).then(data),

  // Pages & Social Media (terms, privacy, refund, cancellation, about, social)
  getPage: (key) => api.get(`/admin/pages/${key}`).then(data),
  savePage: (key, body) => api.put(`/admin/pages/${key}`, body).then(data),

  // Developer tools (super admin only)
  getEnvSettings: () => api.get('/admin/developer/env').then(data),
  saveEnvSettings: (body) => api.put('/admin/developer/env', body).then(data),
  getUploadSettings: () => api.get('/admin/developer/upload-settings').then(data),
  saveUploadSettings: (body) => api.put('/admin/developer/upload-settings', body).then(data),
  getOperationalDataCounts: () => api.get('/admin/developer/operational-data').then(data),
  clearOperationalData: (body) => api.post('/admin/developer/operational-data/clear', body).then(data),

  // Generic resource calls; `endpoint` is the URL segment, e.g. "hotels" or "room-types"
  list: (endpoint, params) => api.get(`/admin/${endpoint}`, { params }).then(data),
  create: (endpoint, body) => api.post(`/admin/${endpoint}`, body).then(data),
  update: (endpoint, id, body) => api.patch(`/admin/${endpoint}/${id}`, body).then(data),
  remove: (endpoint, id) => api.delete(`/admin/${endpoint}/${id}`).then(data),
  options: (endpoint) => api.get(`/admin/${endpoint}/options`).then(data),
}
