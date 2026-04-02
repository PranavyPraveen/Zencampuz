import axiosInstance from './axios';

export const campusApi = {
    // ------------------- CAMPUSES -------------------
    getCampuses: async (params) => {
        const response = await axiosInstance.get('/campus/campuses/', { params });
        return response.data.results || response.data;
    },
    createCampus: async (data) => {
        const response = await axiosInstance.post('/campus/campuses/', data);
        return response.data;
    },
    updateCampus: async (id, data) => {
        const response = await axiosInstance.patch(`/campus/campuses/${id}/`, data);
        return response.data;
    },
    deleteCampus: async (id) => {
        const response = await axiosInstance.delete(`/campus/campuses/${id}/`);
        return response.data;
    },
    
    // ------------------- BUILDINGS -------------------
    getBuildings: async (params) => {
        const response = await axiosInstance.get('/campus/buildings/', { params });
        return response.data.results || response.data;
    },
    createBuilding: async (data) => {
        const response = await axiosInstance.post('/campus/buildings/', data);
        return response.data;
    },
    updateBuilding: async (id, data) => {
        const response = await axiosInstance.patch(`/campus/buildings/${id}/`, data);
        return response.data;
    },
    deleteBuilding: async (id) => {
        const response = await axiosInstance.delete(`/campus/buildings/${id}/`);
        return response.data;
    },
    
    // ------------------- FLOORS -------------------
    getFloors: async (params) => {
        const response = await axiosInstance.get('/campus/floors/', { params });
        return response.data.results || response.data;
    },
    createFloor: async (data) => {
        const response = await axiosInstance.post('/campus/floors/', data);
        return response.data;
    },
    updateFloor: async (id, data) => {
        const response = await axiosInstance.patch(`/campus/floors/${id}/`, data);
        return response.data;
    },
    deleteFloor: async (id) => {
        const response = await axiosInstance.delete(`/campus/floors/${id}/`);
        return response.data;
    },
    
    // ------------------- ROOMS -------------------
    getRooms: async (params) => {
        const response = await axiosInstance.get('/campus/rooms/', { params });
        return response.data.results || response.data;
    },
    getRoom: async (id) => {
        const response = await axiosInstance.get(`/campus/rooms/${id}/`);
        return response.data;
    },
    createRoom: async (data) => {
        const response = await axiosInstance.post('/campus/rooms/', data);
        return response.data;
    },
    updateRoom: async (id, data) => {
        const response = await axiosInstance.patch(`/campus/rooms/${id}/`, data);
        return response.data;
    },
    deleteRoom: async (id) => {
        const response = await axiosInstance.delete(`/campus/rooms/${id}/`);
        return response.data;
    },
    bulkUploadRooms: async (formData) => {
        const response = await axiosInstance.post('/campus/rooms/bulk-upload/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
    
    // ------------------- METADATA -------------------
    getRoomTypes: async () => {
        const response = await axiosInstance.get('/campus/room-types/');
        return response.data.results || response.data;
    },
    getFacilityTags: async () => {
        const response = await axiosInstance.get('/campus/tags/');
        return response.data.results || response.data;
    }
};
