import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const cachedUser = (() => {
    try {
      const raw = localStorage.getItem('auth_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const [user, setUser] = useState(cachedUser);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const persistUser = useCallback((nextUser) => {
    if (nextUser) {
      localStorage.setItem('auth_user', JSON.stringify(nextUser));
    } else {
      localStorage.removeItem('auth_user');
    }
    setUser(nextUser);
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const [profileResult, permsResult] = await Promise.allSettled([
        api.get('/auth/profile/'),
        api.get('/auth/my-permissions/')
      ]);

      if (profileResult.status === 'fulfilled') {
        persistUser(profileResult.value.data);
      } else {
        const profileStatus = profileResult.reason?.response?.status;
        if (profileStatus === 401) {
          throw profileResult.reason;
        }
        console.error('Profile fetch failed, keeping cached session:', profileResult.reason);
      }

      if (permsResult.status === 'fulfilled') {
        setPermissions(permsResult.value.data.permissions || []);
      } else {
        console.error('Permissions fetch failed, keeping existing permissions:', permsResult.reason);
      }
    } catch (error) {
      console.error('Failed to fetch profile or permissions:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [persistUser]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [fetchProfile]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login/', { email, password });
    
    // If public login returns a ticket redirect instead of tokens
    if (data.ticket && data.subdomain) {
      return data;
    }

    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    persistUser(data.user);
    // Mark loading while we fetch the full profile — prevents ProtectedRoute
    // from rendering with an incomplete user object
    setLoading(true);
    await fetchProfile();
    return data.user;
  }, [fetchProfile, persistUser]);

  const exchangeTicket = useCallback(async (ticket) => {
    const { data } = await api.post('/auth/ticket-exchange/', { ticket });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    persistUser(data.user);
    await fetchProfile();
    return data.user;
  }, [fetchProfile, persistUser]);

  const otpLogin = useCallback(async (email, otp) => {
    const { data } = await api.post('/auth/otp-login/', { email, otp });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    persistUser(data.user);
    await fetchProfile();
    return data.user;
  }, [fetchProfile, persistUser]);

  const logout = useCallback(async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        await api.post('/auth/logout/', { refresh });
      }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth_user');
        setUser(null);
        setPermissions([]);
    }
  }, []);

  /**
   * Helper to intuitively check if the current user can perform an action on a module.
   * e.g. can('timetable', 'view')
   */
  const can = useCallback((moduleName, action) => {
    if (!user) return false;
    // Super admins can do everything
    if (user.role?.name === 'super_admin') return true;
    return permissions.includes(`${moduleName}.${action}`);
  }, [user, permissions]);

  const value = useMemo(() => ({ 
    user, 
    permissions, 
    loading, 
    login, 
    otpLogin, 
    exchangeTicket, 
    logout, 
    fetchProfile, 
    can 
  }), [user, permissions, loading, login, otpLogin, exchangeTicket, logout, fetchProfile, can]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
