// context/ThemeContext.js - COMPLETE FIXED VERSION
import React, { createContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // ==================== STATE ====================
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('fontSize');
    return saved || 'medium';
  });

  const [colorScheme, setColorScheme] = useState(() => {
    const saved = localStorage.getItem('colorScheme');
    return saved || 'indigo';
  });

  const [density, setDensity] = useState(() => {
    const saved = localStorage.getItem('density');
    return saved || 'comfortable';
  });

  const [animations, setAnimations] = useState(() => {
    const saved = localStorage.getItem('animations');
    return saved ? JSON.parse(saved) : true;
  });

  const [reducedMotion, setReducedMotion] = useState(() => {
    const saved = localStorage.getItem('reducedMotion');
    return saved ? JSON.parse(saved) : false;
  });

  const [highContrast, setHighContrast] = useState(() => {
    const saved = localStorage.getItem('highContrast');
    return saved ? JSON.parse(saved) : false;
  });

  // ==================== AVAILABLE OPTIONS ====================
  const availableFontSizes = ['small', 'medium', 'large', 'x-large'];
  const availableColorSchemes = ['indigo', 'blue', 'green', 'purple', 'orange', 'red', 'pink'];
  const availableDensities = ['compact', 'comfortable', 'spacious'];

  // ==================== APPLY THEME TO DOCUMENT ====================
  const applyTheme = useCallback((newTheme) => {
    const root = document.documentElement;
    
    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
      
      // Set dark mode colors
      root.style.setProperty('--bg-primary', '#111827');
      root.style.setProperty('--bg-secondary', '#1F2937');
      root.style.setProperty('--bg-tertiary', '#374151');
      root.style.setProperty('--text-primary', '#F9FAFB');
      root.style.setProperty('--text-secondary', '#E5E7EB');
      root.style.setProperty('--text-tertiary', '#9CA3AF');
      root.style.setProperty('--border-color', '#374151');
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
      
      // Set light mode colors
      root.style.setProperty('--bg-primary', '#FFFFFF');
      root.style.setProperty('--bg-secondary', '#F9FAFB');
      root.style.setProperty('--bg-tertiary', '#F3F4F6');
      root.style.setProperty('--text-primary', '#111827');
      root.style.setProperty('--text-secondary', '#374151');
      root.style.setProperty('--text-tertiary', '#6B7280');
      root.style.setProperty('--border-color', '#E5E7EB');
    }
  }, []);

  // ==================== APPLY COLOR SCHEME ====================
  const applyColorScheme = useCallback((scheme) => {
    const root = document.documentElement;
    
    const colors = {
      indigo: { primary: '#4F46E5', hover: '#6366F1' },
      blue: { primary: '#2563EB', hover: '#3B82F6' },
      green: { primary: '#16A34A', hover: '#22C55E' },
      purple: { primary: '#9333EA', hover: '#A855F7' },
      orange: { primary: '#EA580C', hover: '#F97316' },
      red: { primary: '#DC2626', hover: '#EF4444' },
      pink: { primary: '#DB2777', hover: '#EC4899' }
    };

    const color = colors[scheme] || colors.indigo;
    
    root.style.setProperty('--color-primary', color.primary);
    root.style.setProperty('--color-primary-hover', color.hover);
    root.style.setProperty('--color-primary-light', `${color.primary}20`);
    root.style.setProperty('--color-primary-dark', `${color.primary}CC`);
  }, []);

  // ==================== APPLY FONT SIZE ====================
  const applyFontSize = useCallback((size) => {
    const root = document.documentElement;
    
    const sizes = {
      small: '14px',
      medium: '16px',
      large: '18px',
      'x-large': '20px'
    };

    root.style.fontSize = sizes[size] || sizes.medium;
  }, []);

  // ==================== APPLY DENSITY ====================
  const applyDensity = useCallback((density) => {
    const root = document.documentElement;
    
    const spacings = {
      compact: {
        padding: '0.5rem',
        margin: '0.25rem',
        gap: '0.5rem'
      },
      comfortable: {
        padding: '1rem',
        margin: '0.5rem',
        gap: '1rem'
      },
      spacious: {
        padding: '1.5rem',
        margin: '1rem',
        gap: '1.5rem'
      }
    };

    const spacing = spacings[density] || spacings.comfortable;
    
    root.style.setProperty('--spacing-padding', spacing.padding);
    root.style.setProperty('--spacing-margin', spacing.margin);
    root.style.setProperty('--spacing-gap', spacing.gap);
  }, []);

  // ==================== APPLY ANIMATIONS ====================
  const applyAnimations = useCallback((enable) => {
    const root = document.documentElement;
    
    if (!enable || reducedMotion) {
      root.style.setProperty('--animation-duration', '0ms');
      root.style.setProperty('--transition-duration', '0ms');
    } else {
      root.style.setProperty('--animation-duration', '300ms');
      root.style.setProperty('--transition-duration', '200ms');
    }
  }, [reducedMotion]);

  // ==================== TOGGLE THEME ====================
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  // ==================== TOGGLE SIDEBAR ====================
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // ==================== DETECT SYSTEM PREFERENCE ====================
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // ==================== DETECT REDUCED MOTION PREFERENCE ====================
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    setReducedMotion(mediaQuery.matches);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // ==================== APPLY ALL THEME SETTINGS ====================
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme, applyTheme]);

  useEffect(() => {
    applyColorScheme(colorScheme);
    localStorage.setItem('colorScheme', colorScheme);
  }, [colorScheme, applyColorScheme]);

  useEffect(() => {
    applyFontSize(fontSize);
    localStorage.setItem('fontSize', fontSize);
  }, [fontSize, applyFontSize]);

  useEffect(() => {
    applyDensity(density);
    localStorage.setItem('density', density);
  }, [density, applyDensity]);

  useEffect(() => {
    applyAnimations(animations);
    localStorage.setItem('animations', JSON.stringify(animations));
  }, [animations, applyAnimations]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // ==================== VALUE ====================
  const value = {
    // State
    theme,
    sidebarCollapsed,
    fontSize,
    colorScheme,
    density,
    animations,
    reducedMotion,
    highContrast,
    
    // Setters
    setTheme,
    setSidebarCollapsed,
    setFontSize,
    setColorScheme,
    setDensity,
    setAnimations,
    setHighContrast,
    
    // Toggles
    toggleTheme,
    toggleSidebar,
    
    // Available options
    availableFontSizes,
    availableColorSchemes,
    availableDensities,
    
    // Helpers
    isDark: theme === 'dark',
    isLight: theme === 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;