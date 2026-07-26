/**
 * API Client for Cloudflare Workers backend
 * Replaces Supabase client functionality
 */

// Get API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

/**
 * Storage key for JWT token
 */
const TOKEN_KEY = 'hifzDeckToken';

/**
 * Get stored auth token
 */
export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

/**
 * Store auth token
 */
export const setToken = (token) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store token:', error);
  }
};

/**
 * Remove auth token
 */
export const removeToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to remove token:', error);
  }
};

/**
 * Make an authenticated API request
 */
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const config = {
    ...options,
    headers,
  };
  
  const response = await fetch(`${API_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }
  
  return response.json();
};

/**
 * Authentication API
 */
export const auth = {
  /**
   * Sign up with email and password
   */
  signup: async (email, password, username) => {
    try {
      const data = await apiRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, username }),
      });
      
      if (data.session?.access_token) {
        setToken(data.session.access_token);
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  /**
   * Login with email and password
   */
  login: async (email, password) => {
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      if (data.session?.access_token) {
        setToken(data.session.access_token);
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  /**
   * Get current user profile
   */
  getProfile: async () => {
    try {
      const data = await apiRequest('/auth/profile');
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  /**
   * Update password
   */
  updatePassword: async (password) => {
    try {
      const data = await apiRequest('/auth/update-password', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  /**
   * Update username
   */
  updateUsername: async (username) => {
    try {
      const data = await apiRequest('/auth/update-username', {
        method: 'POST',
        body: JSON.stringify({ username }),
      });
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  /**
   * Logout (just remove token)
   */
  logout: () => {
    removeToken();
    return { error: null };
  },
};

/**
 * Progress API
 */
export const progress = {
  /**
   * Record completion progress
   */
  record: async (progressData) => {
    try {
      const data = await apiRequest('/progress', {
        method: 'POST',
        body: JSON.stringify(progressData),
      });
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  /**
   * Get user progress by username
   */
  getByUsername: async (username) => {
    try {
      const data = await apiRequest(`/progress/user/${username}`);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

/**
 * Leaderboard API
 */
export const leaderboard = {
  /**
   * Get leaderboard data
   */
  get: async (limit = 10) => {
    try {
      const data = await apiRequest(`/leaderboard?limit=${limit}`);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  /**
   * Get user's leaderboard position
   */
  getUserPosition: async (username) => {
    try {
      const data = await apiRequest(`/leaderboard/user/${username}`);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

/**
 * Profiles API (for direct database queries)
 */
export const profiles = {
  /**
   * Get profile by username
   */
  getByUsername: async (username) => {
    try {
      const data = await apiRequest(`/progress/user/${username}`);
      return { data: data.profile, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

// Legacy compatibility - export a supabase-like object
export const api = {
  auth,
  from: (table) => {
    // Simplified table access
    if (table === 'profiles') {
      return {
        select: () => ({
          eq: async (field, value) => {
            if (field === 'username') {
              return profiles.getByUsername(value);
            }
            return { data: null, error: new Error('Not implemented') };
          },
        }),
      };
    }
    return {
      select: () => ({ eq: async () => ({ data: null, error: new Error('Not implemented') }) }),
    };
  },
};
