import axiosInstance from './axios';

export const superAdminApi = {
    getPlatformStats: async () => {
        const response = await axiosInstance.get('/superadmin/platform/statistics/');
        return response.data;
    },
    getTenants: async () => {
        const response = await axiosInstance.get('/superadmin/tenants/');
        return response.data;
    },
    
    getTenantReports: async () => {
        const response = await axiosInstance.get('/superadmin/platform/tenant-reports/');
        return response.data;
    },
    
    getPricingModules: async () => {
        const response = await axiosInstance.get('/superadmin/pricing/');
        return response.data;
    },
    
    updatePricingModule: async (id, data) => {
        const response = await axiosInstance.patch(`/superadmin/pricing/${id}/`, data);
        return response.data;
    },
    
    createPricingModule: async (data) => {
        const response = await axiosInstance.post('/superadmin/pricing/', data);
        return response.data;
    },
    
    deletePricingModule: async (id) => {
        await axiosInstance.delete(`/superadmin/pricing/${id}/`);
    },
    
    createTenant: async (data) => {
        const response = await axiosInstance.post('/superadmin/tenants/', data);
        return response.data;
    },
    
    updateTenant: async (id, data) => {
        const response = await axiosInstance.patch(`/superadmin/tenants/${id}/`, data);
        return response.data;
    },
    
    deleteTenant: async (id) => {
        const response = await axiosInstance.delete(`/superadmin/tenants/${id}/`);
        return response.data;
    },
    
    suspendTenant: async (id) => {
        const response = await axiosInstance.post(`/superadmin/tenants/${id}/suspend/`);
        return response.data;
    },
    
    activateTenant: async (id) => {
        const response = await axiosInstance.post(`/superadmin/tenants/${id}/activate/`);
        return response.data;
    },
    
    archiveTenant: async (id) => {
        const response = await axiosInstance.post(`/superadmin/tenants/${id}/archive/`);
        return response.data;
    },
    
    updateSubscription: async (id, data) => {
        const response = await axiosInstance.put(`/superadmin/tenants/${id}/update_subscription/`, data);
        return response.data;
    },
    
    toggleModules: async (id, modulesData) => {
        const response = await axiosInstance.post(`/superadmin/tenants/${id}/toggle_modules/`, modulesData);
        return response.data;
    },

    getAuditLogs: async (params) => {
        const response = await axiosInstance.get('/superadmin/audit-logs/', { params });
        return response.data;
    }
};
