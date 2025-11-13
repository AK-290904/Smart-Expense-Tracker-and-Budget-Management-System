/**
 * Theme Context
 * Manages dark/light theme state
 */
import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';
import { useAuth } from './AuthContext';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [theme, setTheme] = useState('light');

  // Initialize theme from user preference or localStorage
  useEffect(() => {
    if (isAuthenticated && user?.theme_preference) {
      setTheme(user.theme_preference);
      document.documentElement.setAttribute('data-theme', user.theme_preference);
    } else {
      const savedTheme = localStorage.getItem('theme') || 'light';
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, [user, isAuthenticated]);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Save to backend if authenticated
    if (isAuthenticated) {
      try {
        await authAPI.updateTheme(newTheme);
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    }
  };

  const setThemeMode = async (mode) => {
    if (mode !== 'light' && mode !== 'dark') return;
    
    setTheme(mode);
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('theme', mode);

    // Save to backend if authenticated
    if (isAuthenticated) {
      try {
        await authAPI.updateTheme(mode);
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    }
  };

  const value = {
    theme,
    toggleTheme,
    setThemeMode,
    isDark: theme === 'dark',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
