import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize and check current user session
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await apiClient.get('/auth/me');
        if (data.success) {
          setUser(data.user);
        }
      } catch (err) {
        console.error('Session validation failed:', err.message);
        // Api interceptor handles clearing tokens and redirecting if refresh fails
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Login handler
  const login = async (email, password, role) => {
    setLoading(true);
    try {
      const endpoint = role === 'owner' ? '/auth/login-owner' : '/auth/login-tenant';
      const { data } = await apiClient.post(endpoint, { email, password });
      
      if (data.success) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        toast.success(`Welcome back, ${data.user.name}!`);
        return { success: true, user: data.user };
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  // Register Owner handler
  const register = async (name, email, password, contactNumber, address) => {
    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/register', {
        name,
        email,
        password,
        contactNumber,
        address
      });
      if (data.success) {
        toast.success(data.message || 'Registration successful! Check email.');
        return { success: true };
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Registration failed.';
      toast.error(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully.');
  };

  // Update Profile details
  const updateProfile = async (details) => {
    try {
      const { data } = await apiClient.put('/auth/update-details', details);
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast.success('Profile updated successfully.');
        return { success: true };
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Update failed.';
      toast.error(errMsg);
      return { success: false, error: errMsg };
    }
  };

  // Update Photo details
  const updatePhoto = async (formData) => {
    try {
      const { data } = await apiClient.put('/auth/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (data.success) {
        const updatedUser = { ...user, profilePhoto: data.url };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        toast.success('Profile photo uploaded.');
        return { success: true, url: data.url };
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Photo upload failed.';
      toast.error(errMsg);
      return { success: false, error: errMsg };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        updatePhoto
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
