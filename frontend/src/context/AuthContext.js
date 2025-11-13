/**
 * Authentication Context
 * Manages user authentication state and provides auth methods
 */
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { authAPI } from '../services/api';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const justLoggedInRef = useRef(false);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check if we just logged in (prevent race condition)
      if (justLoggedInRef.current) {
        setLoading(false);
        // Don't set isAuthenticated here - it's already set by login
        return;
      }

      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (!token && !refreshToken) {
        // No tokens at all, user is not authenticated
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      if (token) {
        // Set the token in API default headers before making any requests
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        try {
          const response = await authAPI.getProfile();
          if (response.data && response.data.user) {
            setUser(response.data.user);
            setIsAuthenticated(true);
            setLoading(false);
            // Ensure token is still in defaults after successful auth
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            return;
          } else {
            throw new Error('Invalid response format');
          }
        } catch (error) {
          console.error(' Auth check failed:', error.response?.status, error.response?.data);
          
          // Don't clear tokens immediately - try refresh first
          // Only clear if refresh also fails
          if (refreshToken && (error.response?.status === 401 || error.response?.status === 422)) {
            try {
              console.log('🔄 Attempting token refresh on auth check...');
              const refreshResponse = await api.post('/auth/refresh', {}, {
                headers: {
                  Authorization: `Bearer ${refreshToken}`,
                },
              });
              
              const { access_token } = refreshResponse.data;
              if (access_token) {
                localStorage.setItem('access_token', access_token);
                api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
                
                // Try to get profile again
                const profileResponse = await authAPI.getProfile();
                if (profileResponse.data && profileResponse.data.user) {
                  setUser(profileResponse.data.user);
                  setIsAuthenticated(true);
                  setLoading(false);
                  console.log(' Auth check successful after refresh');
                  return;
                } else {
                  throw new Error('Invalid profile response');
                }
              } else {
                throw new Error('No access token in refresh response');
              }
            } catch (refreshError) {
              console.error(' Token refresh failed on auth check:', refreshError);
              // Only clear tokens if refresh actually failed with auth error
              // Don't clear on network errors
              if (refreshError.response?.status === 401 || refreshError.response?.status === 422) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                delete api.defaults.headers.common['Authorization'];
                setIsAuthenticated(false);
                setLoading(false);
              } else {
                // Network error or other - keep tokens, just set not authenticated for now
                setIsAuthenticated(false);
                setLoading(false);
              }
            }
          } else {
            // No refresh token or different error - only clear if it's an auth error
            if (error.response?.status === 401 || error.response?.status === 422) {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              delete api.defaults.headers.common['Authorization'];
              setIsAuthenticated(false);
              setLoading(false);
            } else {
              // Other error (network, etc) - don't clear tokens
              setIsAuthenticated(false);
              setLoading(false);
            }
          }
        }
      } else if (refreshToken) {
        // Only refresh token available, try to refresh
        try {
          console.log('🔄 Only refresh token available, attempting refresh...');
          const refreshResponse = await api.post('/auth/refresh', {}, {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          });
          
          const { access_token } = refreshResponse.data;
          if (access_token) {
            localStorage.setItem('access_token', access_token);
            api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
            
            // Try to get profile
            const profileResponse = await authAPI.getProfile();
            if (profileResponse.data && profileResponse.data.user) {
              setUser(profileResponse.data.user);
              setIsAuthenticated(true);
              setLoading(false);
              console.log('✅ Auth check successful after refresh');
              return;
            } else {
              throw new Error('Invalid profile response');
            }
          } else {
            throw new Error('No access token in refresh response');
          }
        } catch (refreshError) {
          console.error(' Token refresh failed:', refreshError);
          // Only clear if it's an auth error
          if (refreshError.response?.status === 401 || refreshError.response?.status === 422) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            delete api.defaults.headers.common['Authorization'];
            setIsAuthenticated(false);
            setLoading(false);
          } else {
            // Network error - keep tokens
            setIsAuthenticated(false);
            setLoading(false);
          }
        }
      }
      
      setLoading(false);
    };

    // Small delay to prevent race condition with login
    const timeoutId = setTimeout(() => {
      checkAuth();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  const login = async (email, password) => {
    try {
      // Set flag to prevent auth check from running
      justLoggedInRef.current = true;
      setLoading(true);
      
      const response = await authAPI.login({ email, password });
      const { user, access_token, refresh_token } = response.data;
      
      console.log('🔑 Login Response:', { 
        hasUser: !!user, 
        hasAccessToken: !!access_token, 
        hasRefreshToken: !!refresh_token,
        accessTokenLength: access_token?.length,
        refreshTokenLength: refresh_token?.length
      });
      
      if (!access_token || !refresh_token) {
        justLoggedInRef.current = false;
        setLoading(false);
        throw new Error('Missing tokens in login response');
      }
      
      // Store tokens first
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      
      // Set the token in API default headers immediately
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Verify the token works by getting profile
      try {
        const profileResponse = await authAPI.getProfile();
        if (profileResponse.data && profileResponse.data.user) {
          setUser(profileResponse.data.user);
          setIsAuthenticated(true);
          setLoading(false);
          
          console.log('✅ Login successful, tokens saved and verified');
          toast.success('Login successful!');
          
          // Clear the flag after a delay to allow navigation
          setTimeout(() => {
            justLoggedInRef.current = false;
          }, 2000);
          
          return { success: true };
        } else {
          throw new Error('Invalid profile response');
        }
      } catch (profileError) {
        console.error('Profile fetch failed after login:', profileError);
        // Even if profile fails, we have valid tokens, so set authenticated
        setUser(user);
        setIsAuthenticated(true);
        setLoading(false);
        
        console.log('Login successful (profile fetch failed but tokens are valid)');
        toast.success('Login successful!');
        
        setTimeout(() => {
          justLoggedInRef.current = false;
        }, 2000);
        
        return { success: true };
      }
    } catch (error) {
      justLoggedInRef.current = false;
      setLoading(false);
      console.error('❌ Login failed:', error.response?.status, error.response?.data);
      const message = error.response?.data?.error || error.message || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (email, password) => {
    try {
      // Set flag to prevent auth check from running
      justLoggedInRef.current = true;
      
      const response = await authAPI.register({ email, password });
      const { user, access_token, refresh_token } = response.data;
      
      if (!access_token || !refresh_token) {
        justLoggedInRef.current = false;
        throw new Error('Missing tokens in registration response');
      }
      
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      
      // Set the token in API default headers
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setUser(user);
      setIsAuthenticated(true);
      setLoading(false);
      
      toast.success('Registration successful!');
      
      // Clear the flag after a longer delay to allow navigation
      setTimeout(() => {
        justLoggedInRef.current = false;
      }, 3000);
      
      return { success: true };
    } catch (error) {
      justLoggedInRef.current = false;
      const message = error.response?.data?.error || error.message || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    justLoggedInRef.current = false;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Remove the token from API default headers
    delete api.defaults.headers.common['Authorization'];
    
    setUser(null);
    setIsAuthenticated(false);
    setLoading(false);
    toast.success('Logged out successfully');
  };

  const updateUser = async (data) => {
    try {
      const response = await authAPI.updateProfile(data);
      setUser(response.data.user);
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Update failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
