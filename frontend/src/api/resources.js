import axiosInstance from './axios';

const resolve = (r) => r.data.results || r.data;

export const resourcesApi = {
    // --- TAGS ---
    getTags: async () => resolve(await axiosInstance.get('/resources/tags/')),
    createTag: async (data) => (await axiosInstance.post('/resources/tags/', data)).data,
    deleteTag: async (id) => (await axiosInstance.delete(`/resources/tags/${id}/`)).data,

    // --- CATEGORIES ---
    getCategories: async (params) => resolve(await axiosInstance.get('/resources/categories/', { params })),
    createCategory: async (data) => (await axiosInstance.post('/resources/categories/', data)).data,
    updateCategory: async (id, data) => (await axiosInstance.patch(`/resources/categories/${id}/`, data)).data,
    deleteCategory: async (id) => (await axiosInstance.delete(`/resources/categories/${id}/`)).data,

    // --- ASSETS / RESOURCES ---
    getAssets: async (params) => resolve(await axiosInstance.get('/resources/assets/', { params })),
    getAsset: async (id) => (await axiosInstance.get(`/resources/assets/${id}/`)).data,
    generateCode: async (name) => (await axiosInstance.get('/resources/assets/generate-code/', { params: { name } })).data,
    createAsset: async (data) => (await axiosInstance.post('/resources/assets/', data)).data,
    updateAsset: async (id, data) => (await axiosInstance.patch(`/resources/assets/${id}/`, data)).data,
    deleteAsset: async (id) => (await axiosInstance.delete(`/resources/assets/${id}/`)).data,
    bulkUploadAssets: async (formData) =>
        (await axiosInstance.post('/resources/assets/bulk-upload/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data,

    // --- SUB-UNITS ---
    getSubUnits: async (params) => resolve(await axiosInstance.get('/resources/sub-units/', { params })),
    createSubUnit: async (data) => (await axiosInstance.post('/resources/sub-units/', data)).data,
    updateSubUnit: async (id, data) => (await axiosInstance.patch(`/resources/sub-units/${id}/`, data)).data,
    deleteSubUnit: async (id) => (await axiosInstance.delete(`/resources/sub-units/${id}/`)).data,

    // --- ROOM MAPPINGS ---
    getRoomMappings: async (params) => resolve(await axiosInstance.get('/resources/room-mappings/', { params })),
    createRoomMapping: async (data) => (await axiosInstance.post('/resources/room-mappings/', data)).data,
    deleteRoomMapping: async (id) => (await axiosInstance.delete(`/resources/room-mappings/${id}/`)).data,

    // --- MAINTENANCE ---
    getMaintenance: async (params) => resolve(await axiosInstance.get('/resources/maintenance/', { params })),
    createMaintenance: async (data) => (await axiosInstance.post('/resources/maintenance/', data)).data,
    updateMaintenance: async (id, data) => (await axiosInstance.patch(`/resources/maintenance/${id}/`, data)).data,
    deleteMaintenance: async (id) => (await axiosInstance.delete(`/resources/maintenance/${id}/`)).data,

    // --- UTILIZATION LOGS ---
    getUtilizationLogs: async (params) => resolve(await axiosInstance.get('/resources/utilization/', { params })),
};
