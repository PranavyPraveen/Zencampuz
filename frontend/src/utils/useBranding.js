import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export const useBranding = () => {
    const { user } = useAuth();
    const [theme, setTheme] = useState({
        primary: '#2563EB',
        secondary: '#22D3EE',
        background: 'var(--bg-main)',
        surface: 'var(--bg-surface)',
        accent: '#2DD4BF',
        text: '#F8FAFC',
    });

    useEffect(() => {
        if (user && user.tenant) {
            setTheme({
                ...theme,
                primary: user.tenant.primary_color || theme.primary,
                secondary: user.tenant.secondary_color || theme.secondary,
            });
        }
    }, [user]);

    return theme;
};
