import axiosInstance from './axios';

export const publicApi = {
    /**
     * Attempts to fetch branding based on the current subdomain.
     * In a real app this hits a public backend endpoint.
     */
    getTenantBranding: async (subdomain) => {
        try {
            const response = await axiosInstance.get(`/tenants/public/branding/${subdomain}/`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch tenant branding:', error);
            return null;
        }
    },

    getPricing: async () => {
        const response = await axiosInstance.get('/tenants/public/pricing/');
        return response.data;
    }
};
