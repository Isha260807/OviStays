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

  // Generic resource calls; `endpoint` is the URL segment, e.g. "hotels" or "room-types"
  list: (endpoint, params) => api.get(`/admin/${endpoint}`, { params }).then(data),
  create: (endpoint, body) => api.post(`/admin/${endpoint}`, body).then(data),
  update: (endpoint, id, body) => api.patch(`/admin/${endpoint}/${id}`, body).then(data),
  remove: (endpoint, id) => api.delete(`/admin/${endpoint}/${id}`).then(data),
  options: (endpoint) => api.get(`/admin/${endpoint}/options`).then(data),
}
