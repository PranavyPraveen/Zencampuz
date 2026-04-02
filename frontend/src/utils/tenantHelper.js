/**
 * Utility functions for resolving tenant context from the URL hostname.
 */

// Define core application domains that are considered "public" (no tenant)
// Add your production base domain here when deploying
const PUBLIC_DOMAINS = ['campuzcore.com', 'www.campuzcore.com', 'localhost', '127.0.0.1'];

export const getSubdomain = () => {
    const host = window.location.hostname;
    
    if (PUBLIC_DOMAINS.includes(host)) {
        return null;
    }
    
    const parts = host.split('.');
    
    if (parts.length >= 2) {
        // e.g., zenith.localhost -> 'zenith'
        // e.g., zenith.campuzcore.com -> 'zenith'
        const subdomain = parts[0];
        
        // Ignore reserved subdomains if you use them
        if (!['www', 'api', 'app'].includes(subdomain)) {
            return subdomain;
        }
    }
    
    return null;
};

export const isPublicHost = () => {
    return getSubdomain() === null;
};
