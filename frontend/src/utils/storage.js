// utils/storage.js - COMPLETE FIXED VERSION

// ==================== LOCAL STORAGE KEYS ====================
export const STORAGE_KEYS = {
  TOKEN: 'token',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebarCollapsed',
  FONT_SIZE: 'fontSize',
  COLOR_SCHEME: 'colorScheme',
  DENSITY: 'density',
  ANIMATIONS: 'animations',
  RECENT_SEARCHES: 'recentSearches',
  NOTIFICATION_SETTINGS: 'notificationSettings',
  LANGUAGE: 'language',
  CURRENCY: 'currency',
  TIMEZONE: 'timezone'
};

// ==================== LOCAL STORAGE UTILITIES ====================

/**
 * Set item in localStorage
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @returns {boolean} Success
 */
export const setStorage = (key, value) => {
  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return false;
  }
};

/**
 * Get item from localStorage
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if not found
 * @returns {any} Stored value or default
 */
export const getStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
};

/**
 * Remove item from localStorage
 * @param {string} key - Storage key
 * @returns {boolean} Success
 */
export const removeStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error removing from localStorage:', error);
    return false;
  }
};

/**
 * Clear all localStorage items
 * @returns {boolean} Success
 */
export const clearStorage = () => {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
};

/**
 * Check if key exists in localStorage
 * @param {string} key - Storage key
 * @returns {boolean}
 */
export const hasStorage = (key) => {
  return localStorage.getItem(key) !== null;
};

/**
 * Get all localStorage keys
 * @returns {Array} Array of keys
 */
export const getStorageKeys = () => {
  return Object.keys(localStorage);
};

/**
 * Get storage size in bytes
 * @returns {number} Size in bytes
 */
export const getStorageSize = () => {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += (localStorage[key].length + key.length) * 2;
    }
  }
  return total;
};

// ==================== AUTH STORAGE ====================

/**
 * Set auth tokens
 * @param {string} token - Access token
 * @param {string} refreshToken - Refresh token
 */
export const setAuthTokens = (token, refreshToken) => {
  setStorage(STORAGE_KEYS.TOKEN, token);
  if (refreshToken) {
    setStorage(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }
};

/**
 * Get auth tokens
 * @returns {Object} Tokens object
 */
export const getAuthTokens = () => {
  return {
    token: getStorage(STORAGE_KEYS.TOKEN),
    refreshToken: getStorage(STORAGE_KEYS.REFRESH_TOKEN)
  };
};

/**
 * Clear auth tokens
 */
export const clearAuthTokens = () => {
  removeStorage(STORAGE_KEYS.TOKEN);
  removeStorage(STORAGE_KEYS.REFRESH_TOKEN);
  removeStorage(STORAGE_KEYS.USER);
};

/**
 * Set user data
 * @param {Object} user - User object
 */
export const setUser = (user) => {
  setStorage(STORAGE_KEYS.USER, user);
};

/**
 * Get user data
 * @returns {Object} User object
 */
export const getUser = () => {
  return getStorage(STORAGE_KEYS.USER);
};

/**
 * Update user data
 * @param {Object} updates - Partial user updates
 */
export const updateUser = (updates) => {
  const user = getUser() || {};
  setUser({ ...user, ...updates });
};

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return !!getStorage(STORAGE_KEYS.TOKEN);
};

// ==================== THEME STORAGE ====================

/**
 * Set theme preference
 * @param {string} theme - Theme name (light/dark)
 */
export const setTheme = (theme) => {
  setStorage(STORAGE_KEYS.THEME, theme);
};

/**
 * Get theme preference
 * @returns {string} Theme name
 */
export const getTheme = () => {
  return getStorage(STORAGE_KEYS.THEME, 'light');
};

/**
 * Set sidebar collapsed state
 * @param {boolean} collapsed - Collapsed state
 */
export const setSidebarCollapsed = (collapsed) => {
  setStorage(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed);
};

/**
 * Get sidebar collapsed state
 * @returns {boolean}
 */
export const getSidebarCollapsed = () => {
  return getStorage(STORAGE_KEYS.SIDEBAR_COLLAPSED, false);
};

/**
 * Set font size preference
 * @param {string} size - Font size
 */
export const setFontSize = (size) => {
  setStorage(STORAGE_KEYS.FONT_SIZE, size);
};

/**
 * Get font size preference
 * @returns {string}
 */
export const getFontSize = () => {
  return getStorage(STORAGE_KEYS.FONT_SIZE, 'medium');
};

/**
 * Set color scheme
 * @param {string} scheme - Color scheme
 */
export const setColorScheme = (scheme) => {
  setStorage(STORAGE_KEYS.COLOR_SCHEME, scheme);
};

/**
 * Get color scheme
 * @returns {string}
 */
export const getColorScheme = () => {
  return getStorage(STORAGE_KEYS.COLOR_SCHEME, 'indigo');
};

// ==================== RECENT SEARCHES ====================

/**
 * Add recent search
 * @param {string} query - Search query
 * @param {number} limit - Max number of searches to keep
 */
export const addRecentSearch = (query, limit = 10) => {
  if (!query) return;
  
  const searches = getRecentSearches();
  const newSearches = [query, ...searches.filter(s => s !== query)].slice(0, limit);
  
  setStorage(STORAGE_KEYS.RECENT_SEARCHES, newSearches);
};

/**
 * Get recent searches
 * @returns {Array} Recent searches
 */
export const getRecentSearches = () => {
  return getStorage(STORAGE_KEYS.RECENT_SEARCHES, []);
};

/**
 * Clear recent searches
 */
export const clearRecentSearches = () => {
  removeStorage(STORAGE_KEYS.RECENT_SEARCHES);
};

/**
 * Remove specific search
 * @param {string} query - Search query to remove
 */
export const removeRecentSearch = (query) => {
  const searches = getRecentSearches();
  const newSearches = searches.filter(s => s !== query);
  setStorage(STORAGE_KEYS.RECENT_SEARCHES, newSearches);
};

// ==================== SETTINGS STORAGE ====================

/**
 * Set notification settings
 * @param {Object} settings - Notification settings
 */
export const setNotificationSettings = (settings) => {
  setStorage(STORAGE_KEYS.NOTIFICATION_SETTINGS, settings);
};

/**
 * Get notification settings
 * @returns {Object}
 */
export const getNotificationSettings = () => {
  return getStorage(STORAGE_KEYS.NOTIFICATION_SETTINGS, {
    email: true,
    push: true,
    sms: false
  });
};

/**
 * Set language preference
 * @param {string} language - Language code
 */
export const setLanguage = (language) => {
  setStorage(STORAGE_KEYS.LANGUAGE, language);
};

/**
 * Get language preference
 * @returns {string}
 */
export const getLanguage = () => {
  return getStorage(STORAGE_KEYS.LANGUAGE, 'en');
};

/**
 * Set currency preference
 * @param {string} currency - Currency code
 */
export const setCurrency = (currency) => {
  setStorage(STORAGE_KEYS.CURRENCY, currency);
};

/**
 * Get currency preference
 * @returns {string}
 */
export const getCurrency = () => {
  return getStorage(STORAGE_KEYS.CURRENCY, 'USD');
};

/**
 * Set timezone preference
 * @param {string} timezone - Timezone
 */
export const setTimezone = (timezone) => {
  setStorage(STORAGE_KEYS.TIMEZONE, timezone);
};

/**
 * Get timezone preference
 * @returns {string}
 */
export const getTimezone = () => {
  return getStorage(STORAGE_KEYS.TIMEZONE, Intl.DateTimeFormat().resolvedOptions().timeZone);
};

// ==================== SESSION STORAGE ====================

/**
 * Set session item (cleared when browser closes)
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 */
export const setSession = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to sessionStorage:', error);
  }
};

/**
 * Get session item
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value
 * @returns {any}
 */
export const getSession = (key, defaultValue = null) => {
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from sessionStorage:', error);
    return defaultValue;
  }
};

/**
 * Remove session item
 * @param {string} key - Storage key
 */
export const removeSession = (key) => {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from sessionStorage:', error);
  }
};

/**
 * Clear all session storage
 */
export const clearSession = () => {
  try {
    sessionStorage.clear();
  } catch (error) {
    console.error('Error clearing sessionStorage:', error);
  }
};

// ==================== COOKIE STORAGE ====================

/**
 * Set cookie
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} days - Expiry in days
 */
export const setCookie = (name, value, days = 7) => {
  try {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/;SameSite=Strict`;
  } catch (error) {
    console.error('Error setting cookie:', error);
  }
};

/**
 * Get cookie
 * @param {string} name - Cookie name
 * @returns {string|null}
 */
export const getCookie = (name) => {
  try {
    const cookieName = `${name}=`;
    const cookies = document.cookie.split(';');
    
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.indexOf(cookieName) === 0) {
        return cookie.substring(cookieName.length, cookie.length);
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting cookie:', error);
    return null;
  }
};

/**
 * Delete cookie
 * @param {string} name - Cookie name
 */
export const deleteCookie = (name) => {
  setCookie(name, '', -1);
};

// ==================== EXPORT ====================
export default {
  STORAGE_KEYS,
  setStorage,
  getStorage,
  removeStorage,
  clearStorage,
  hasStorage,
  getStorageKeys,
  getStorageSize,
  setAuthTokens,
  getAuthTokens,
  clearAuthTokens,
  setUser,
  getUser,
  updateUser,
  isAuthenticated,
  setTheme,
  getTheme,
  setSidebarCollapsed,
  getSidebarCollapsed,
  setFontSize,
  getFontSize,
  setColorScheme,
  getColorScheme,
  addRecentSearch,
  getRecentSearches,
  clearRecentSearches,
  removeRecentSearch,
  setNotificationSettings,
  getNotificationSettings,
  setLanguage,
  getLanguage,
  setCurrency,
  getCurrency,
  setTimezone,
  getTimezone,
  setSession,
  getSession,
  removeSession,
  clearSession,
  setCookie,
  getCookie,
  deleteCookie
};