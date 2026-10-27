import api from '@/services/api/axios.js'

const data = (res) => res.data.data

// Everything the owner panel calls. The server decides which villas and bookings belong to the signed-in owner.
export const ownerAPI = {
  register: (body) => api.post('/hotel/auth/register', body).then(data),
  sendOtp: (body) => api.post('/hotel/auth/send-otp', body).then(data),
  verifyOtp: (body) => api.post('/hotel/auth/verify-otp', body).then(data),
  me: () => api.get('/hotel/auth/me').then(data),
  logoutAll: () => api.post('/hotel/auth/logout-all').then(data),

  tickets: () => api.get('/hotel/support/tickets').then(data),
  createTicket: (body) => api.post('/hotel/support/tickets', body).then(data),
  support: () => api.get('/hotel/support').then(data),
  about: () => api.get('/pages/about').then(data),
  profile: () => api.get('/hotel/profile').then(data),
  saveProfile: (body) => api.patch('/hotel/profile', body).then(data),
  submitKyc: (body) => api.post('/hotel/kyc', body).then(data),

  dashboard: (params) => api.get('/hotel/dashboard', { params }).then(data),
  earnings: (params) => api.get('/hotel/earnings', { params }).then(data),
  reviews: (params) => api.get('/hotel/reviews', { params }).then(data),
  notifications: (params) => api.get('/hotel/notifications', { params }).then(data),
  unreadCount: () => api.get('/hotel/notifications/unread-count').then(data),
  readAll: () => api.post('/hotel/notifications/read-all').then(data),
  readOne: (id) => api.post(`/hotel/notifications/${id}/read`).then(data),

  amenities: () => api.get('/hotel/amenities').then(data),
  villas: () => api.get('/hotel/villas').then(data),
  villa: (id) => api.get(`/hotel/villas/${id}`).then(data),
  createVilla: (body) => api.post('/hotel/villas', body).then(data),
  saveVilla: (id, body) => api.patch(`/hotel/villas/${id}`, body).then(data),
  deleteVilla: (id) => api.delete(`/hotel/villas/${id}`).then(data),
  submitVilla: (id) => api.post(`/hotel/villas/${id}/submit`).then(data),
  setActive: (id, active) => api.post(`/hotel/villas/${id}/active`, { active }).then(data),

  calendar: (id, params) => api.get(`/hotel/villas/${id}/calendar`, { params }).then(data),
  block: (id, body) => api.post(`/hotel/villas/${id}/blocks`, body).then(data),
  unblock: (id, blockId) => api.delete(`/hotel/villas/${id}/blocks/${blockId}`).then(data),
  priceRules: (id) => api.get(`/hotel/villas/${id}/price-rules`).then(data),
  addRule: (id, body) => api.post(`/hotel/villas/${id}/price-rules`, body).then(data),
  saveRule: (id, ruleId, body) => api.patch(`/hotel/villas/${id}/price-rules/${ruleId}`, body).then(data),
  deleteRule: (id, ruleId) => api.delete(`/hotel/villas/${id}/price-rules/${ruleId}`).then(data),

  bookings: (params) => api.get('/hotel/bookings', { params }).then(data),
  booking: (id) => api.get(`/hotel/bookings/${id}`).then(data),
  accept: (id) => api.post(`/hotel/bookings/${id}/accept`).then(data),
  reject: (id, reason) => api.post(`/hotel/bookings/${id}/reject`, { reason }).then(data),
  cancel: (id, reason) => api.post(`/hotel/bookings/${id}/cancel`, { reason }).then(data),
  checkIn: (id, code) => api.post(`/hotel/bookings/${id}/check-in`, { code }).then(data),
  checkOut: (id) => api.post(`/hotel/bookings/${id}/check-out`).then(data),
}
