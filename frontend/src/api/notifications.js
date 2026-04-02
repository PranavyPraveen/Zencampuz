import api from './axios';

const unpack = (r) => r.data?.results ?? r.data;

export const notificationsApi = {
  getNotifications: async (params) => unpack(await api.get('/notifications/', { params })),
  markRead: async (id) => (await api.post(`/notifications/${id}/mark-read/`)).data,
  markAllRead: async () => (await api.post('/notifications/mark-all-read/')).data,
};
