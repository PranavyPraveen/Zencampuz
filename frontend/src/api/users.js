import axiosInstance from './axios';

const unpack = (r) => r.data.results || r.data;

export const usersApi = {
  // --- ROLES ---
  getRoles: async () => unpack(await axiosInstance.get('/auth/roles/')),

  // --- USERS ---
  getUsers: async (params) => unpack(await axiosInstance.get('/auth/users/', { params })),
  getUser: async (id) => (await axiosInstance.get(`/auth/users/${id}/`)).data,
  createUser: async (data) => (await axiosInstance.post('/auth/users/', data)).data,
  updateUser: async (id, data) => (await axiosInstance.patch(`/auth/users/${id}/`, data)).data,
  deleteUser: async (id) => (await axiosInstance.delete(`/auth/users/${id}/`)).data,
  getRoleDefaults: async (roleName) => (await axiosInstance.get(`/auth/role-defaults/?role_name=${roleName}`)).data,

  // --- STATUS ACTIONS ---
  activateUser: async (id) => (await axiosInstance.patch(`/auth/users/${id}/activate/`)).data,
  deactivateUser: async (id) => (await axiosInstance.patch(`/auth/users/${id}/deactivate/`)).data,

  // --- BULK IMPORT ---
  bulkImport: async (formData) =>
    (await axiosInstance.post('/auth/users/bulk-import/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data,

  // --- BULK DELETE ---
  bulkDelete: async (userIds) =>
    (await axiosInstance.post('/auth/users/bulk-delete/', { user_ids: userIds })).data,
};
