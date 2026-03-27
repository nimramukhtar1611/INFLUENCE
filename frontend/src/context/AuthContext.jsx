import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));

  const normalizeUser = (userData) => {
    if (!userData) return null;
    const normalized = { ...userData };
    if (normalized.role === 'admin' || normalized.userType === 'admin') normalized.userType = 'admin';
    else if (normalized.role === 'brand' || normalized.userType === 'brand') normalized.userType = 'brand';
    else if (normalized.role === 'creator' || normalized.userType === 'creator') normalized.userType = 'creator';
    return normalized;
  };

  const loadUser = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const normalized = normalizeUser(parsed);
        setUser(normalized);
        setIsAuthenticated(true);
        setToken(storedToken);
        setRefreshToken(localStorage.getItem('refreshToken'));
      } catch (e) {
        console.error('Failed to restore session', e);
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = user || api.getCurrentUser();
      const currentRole = currentUser?.userType || currentUser?.role;

      // /auth/me is guarded by user auth middleware; avoid forcing admin sessions through it.
      if (currentRole === 'admin' || currentRole === 'super_admin') {
        const normalizedAdmin = normalizeUser(currentUser);
        if (normalizedAdmin) {
          setUser((prev) => ({ ...prev, ...normalizedAdmin }));
          localStorage.setItem('user', JSON.stringify(normalizedAdmin));
        }
        return normalizedAdmin;
      }

      const res = await api.get('/auth/me');
      if (res.data?.success) {
        const normalized = normalizeUser(res.data.user);
        setUser(prev => ({ ...prev, ...normalized }));
        localStorage.setItem('user', JSON.stringify(normalized));
        return normalized;
      }
    } catch (error) {
      console.error('Failed to refresh user', error);
    }
  }, [user]);

  const login = async (email, password, userType, captchaToken) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password, userType, captchaToken });
      // Check for 2FA requirement FIRST before completing login
      if (res.data?.require2FA) {
        return { success: true, require2FA: true, userId: res.data.userId };
      }
      if (res.data?.success) {
        const { token: newToken, refreshToken: newRefresh, user: userData } = res.data;
        const normalized = normalizeUser(userData);
        localStorage.setItem('token', newToken);
        localStorage.setItem('refreshToken', newRefresh);
        localStorage.setItem('user', JSON.stringify(normalized));
        setToken(newToken);
        setRefreshToken(newRefresh);
        setUser(normalized);
        setIsAuthenticated(true);
        toast.success('Login successful!');
        return { success: true, user: normalized };
      }
      return { success: false, error: res.data?.error || 'Login failed' };
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Login failed';
      toast.error(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const loginAdmin = async (email, password, twoFactorCode = null) => {
    setLoading(true);
    try {
      const payload = { email, password };
      if (twoFactorCode) payload.two_factor_code = twoFactorCode;
      const res = await api.post('/admin/login', payload);
      if (res.data?.require2FA) return { success: true, require2FA: true, userId: res.data.userId };
      if (res.data?.success) {
        const { token: newToken, refreshToken: newRefresh, admin } = res.data;
        const normalized = normalizeUser(admin);
        localStorage.setItem('token', newToken);
        localStorage.setItem('refreshToken', newRefresh);
        localStorage.setItem('user', JSON.stringify(normalized));
        setToken(newToken);
        setRefreshToken(newRefresh);
        setUser(normalized);
        setIsAuthenticated(true);
        toast.success('Admin login successful!');
        return { success: true, user: normalized };
      }
      return { success: false, error: res.data?.error || 'Invalid response' };
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Admin login failed';
      toast.error(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', userData);
      if (res.data?.success) {
        const { token: newToken, refreshToken: newRefresh, user: newUser } = res.data;
        const normalized = normalizeUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('refreshToken', newRefresh);
        localStorage.setItem('user', JSON.stringify(normalized));
        setToken(newToken);
        setRefreshToken(newRefresh);
        setUser(normalized);
        setIsAuthenticated(true);
        toast.success('Registration successful!');
        return { success: true, user: normalized };
      }
      return { success: false };
    } catch (error) {
      const msg = error.response?.data?.error || 'Signup failed';
      toast.error(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const refToken = localStorage.getItem('refreshToken');
      if (refToken) await api.post('/auth/logout', { refreshToken: refToken }).catch(() => {});
    } finally {
      localStorage.clear();
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      setIsAuthenticated(false);
      toast.success('Logged out successfully');
      const isAdminRoute = window.location.pathname.startsWith('/admin');
      window.location.href = isAdminRoute ? '/admin/login' : '/login';
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return { success: false, error: 'Password too short' };
    }
    try {
      const res = await api.post('/auth/change-password', { currentPassword, newPassword });
      if (res.data?.success) {
        toast.success('Password changed successfully');
        return { success: true };
      }
      return { success: false, error: res.data?.message || 'Failed to change password' };
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Failed to change password';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const forgotPassword = async (email) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data?.success) {
        toast.success(res.data?.message || 'Password reset link sent');
        return { success: true, message: res.data?.message };
      }

      const msg = res.data?.error || res.data?.message || 'Failed to send reset link';
      toast.error(msg);
      return { success: false, error: msg };
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to send reset link';
      toast.error(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async (password) => {
    try {
      const res = await api.delete('/compliance/account', { data: { password, confirm: 'DELETE' } });
      if (res.data?.success) {
        toast.success('Account deleted successfully');
        await logout();
        return { success: true };
      }
      return { success: false, error: res.data?.message || 'Failed to delete account' };
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Failed to delete account';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const sendEmailOTP = async (email) => {
    try {
      const res = await api.post('/auth/send-otp', { email });
      if (res.data?.success) {
        toast.success('OTP sent to your email');
        return { success: true };
      }
      toast.error(res.data?.message || 'Failed to send OTP');
      return { success: false };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
      return { success: false, error: error.response?.data?.message };
    }
  };

  const verifyEmailOTP = async (email, code) => {
    try {
      const res = await api.post('/auth/verify-otp', { email, otp: code });
      if (res.data?.success) {
        toast.success('Email verified successfully');
        return { success: true };
      }
      toast.error(res.data?.message || 'Invalid OTP');
      return { success: false };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed');
      return { success: false, error: error.response?.data?.message };
    }
  };

  const sendPhoneOTP = async (phone) => {
    try {
      const res = await api.post('/auth/send-phone-otp', { phone });
      if (res.data?.success) {
        toast.success('OTP sent to your phone');
        return { success: true };
      }
      toast.error(res.data?.message || 'Failed to send OTP');
      return { success: false };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
      return { success: false, error: error.response?.data?.message };
    }
  };

  const verifyPhoneOTP = async (phone, code) => {
    try {
      const res = await api.post('/auth/verify-phone-otp', { phone, otp: code });
      if (res.data?.success) {
        toast.success('Phone verified successfully');
        return { success: true };
      }
      toast.error(res.data?.message || 'Invalid OTP');
      return { success: false };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed');
      return { success: false, error: error.response?.data?.message };
    }
  };

  const completeLogin = (userData, newToken, newRefreshToken) => {
    const normalized = normalizeUser(userData);
    localStorage.setItem('token', newToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    localStorage.setItem('user', JSON.stringify(normalized));
    setToken(newToken);
    setRefreshToken(newRefreshToken);
    setUser(normalized);
    setIsAuthenticated(true);
  };

  const updateUser = (newData) => {
    setUser(prev => {
      const updated = { ...prev, ...newData };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => { loadUser(); }, [loadUser]);

  const isAdmin = user?.userType === 'admin' || user?.role === 'admin' || user?.role === 'super_admin';
  const isBrand = user?.userType === 'brand';
  const isCreator = user?.userType === 'creator';

  const value = {
    user, loading, isAuthenticated, token, refreshToken,
    isAdmin, isBrand, isCreator,
    updateUser, completeLogin, signup, login, refreshUser, deleteAccount, changePassword, forgotPassword,
    loginAdmin, logout,
    sendEmailOTP, verifyEmailOTP, sendPhoneOTP, verifyPhoneOTP,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;