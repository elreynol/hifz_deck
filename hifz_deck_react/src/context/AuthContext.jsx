import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth as apiAuth, getToken } from '../apiClient';
import { authRedirectToHome, authRedirectToUpdatePassword } from '../utils/authRedirect';

const AuthContext = createContext();

/** localStorage key for temporary guest play (not a real account) */
export const GUEST_STORAGE_KEY = 'hifzDeckGuest';

/** True when this "user" is a local guest, not a Supabase account */
export const isGuestUser = (user) => !!(user && user.isGuest);

/** Build a short temporary name like Guest_7K2Q */
const makeGuestUsername = () => {
  const code = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `Guest_${code}`;
};

const readStoredGuest = () => {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id || !parsed?.username) return null;
    return parsed;
  } catch {
    return null;
  }
};

const guestUserFromStored = (stored) => ({
  id: stored.id,
  isGuest: true,
  email: null,
  user_metadata: { username: stored.username },
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    setInitialLoading(true);
    
    // Check if we have a stored token
    const token = getToken();
    
    if (token) {
      // Fetch current user profile with token
      apiAuth.getProfile().then(({ data, error }) => {
        if (data && !error) {
          localStorage.removeItem(GUEST_STORAGE_KEY);
          const mockSession = { access_token: token };
          const mockUser = {
            id: data.user.id,
            email: data.user.email,
            user_metadata: { username: data.profile.username },
          };
          setSession(mockSession);
          setUser(mockUser);
        } else {
          // Token is invalid, check for guest
          apiAuth.logout();
          setSession(null);
          const stored = readStoredGuest();
          setUser(stored ? guestUserFromStored(stored) : null);
        }
        setInitialLoading(false);
      }).catch((error) => {
        console.error('[AuthProvider] Error in getProfile():', error);
        const stored = readStoredGuest();
        setUser(stored ? guestUserFromStored(stored) : null);
        setInitialLoading(false);
      });
    } else {
      // No token, check for guest
      setSession(null);
      const stored = readStoredGuest();
      setUser(stored ? guestUserFromStored(stored) : null);
      setInitialLoading(false);
    }
  }, []);

  /**
   * Play without an account. Progress stays in this browser only
   * under a temporary Guest_XXXX name.
   */
  const signInAsGuest = () => {
    setLoading(true);
    try {
      const username = makeGuestUsername();
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? `guest-${crypto.randomUUID()}`
          : `guest-${Date.now()}`;
      const stored = { id, username, createdAt: new Date().toISOString() };
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(stored));
      setSession(null);
      setUser(guestUserFromStored(stored));
      setLoading(false);
      return { data: { user: guestUserFromStored(stored) }, error: null };
    } catch (error) {
      console.error('[AuthProvider] signInAsGuest error:', error);
      setLoading(false);
      return { data: null, error };
    }
  };

  const signUp = async (email, password, username) => {
    setLoading(true);
    try {
      const { data: invokeData, error: functionError } = await apiAuth.signup(email, password, username);

      if (functionError) throw functionError;
      if (invokeData.error) throw invokeData.error;

      if (invokeData.session && invokeData.user) {
        localStorage.removeItem(GUEST_STORAGE_KEY);
        const mockSession = { access_token: invokeData.session.access_token };
        const mockUser = {
          id: invokeData.user.id,
          email: invokeData.user.email,
          user_metadata: { username: invokeData.username },
        };
        setSession(mockSession);
        setUser(mockUser);
      }

      setLoading(false);
      return { data: invokeData, error: null };
    } catch (error) {
      console.error('[AuthProvider] signUp caught error:', error);
      setLoading(false);
      return { data: null, error };
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data: invokeData, error: functionError } = await apiAuth.login(email, password);

      if (functionError) throw functionError;
      if (invokeData.error) throw invokeData.error;

      if (invokeData.session && invokeData.user) {
        localStorage.removeItem(GUEST_STORAGE_KEY);
        
        // Fetch profile to get username
        const { data: profileData } = await apiAuth.getProfile();
        const mockSession = { access_token: invokeData.session.access_token };
        const mockUser = {
          id: invokeData.user.id,
          email: invokeData.user.email,
          user_metadata: { username: profileData?.profile?.username || invokeData.user.email.split('@')[0] },
        };
        setSession(mockSession);
        setUser(mockUser);
      } else {
        throw new Error('Login succeeded but session data was not returned from function.');
      }

      setLoading(false);
      return { data: invokeData, error: null };
    } catch (error) {
      console.error('[AuthProvider] login caught error:', error);
      setLoading(false);
      return { data: null, error };
    }
  };

  /** Google OAuth - Not yet implemented in Cloudflare Workers */
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      // TODO: Implement Google OAuth flow with Cloudflare Workers
      console.warn('[AuthProvider] Google OAuth not yet implemented with Cloudflare Workers');
      setLoading(false);
      return { data: null, error: new Error('Google OAuth not yet implemented') };
    } catch (error) {
      console.error('[AuthProvider] signInWithGoogle caught error:', error);
      setLoading(false);
      return { data: null, error };
    }
  };

  const updateUserPassword = async (password) => {
    setLoading(true);
    try {
      const { data, error } = await apiAuth.updatePassword(password);

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setLoading(false);
      return { data, error: null };
    } catch (error) {
      console.error('[AuthProvider] updateUserPassword caught error:', error);
      setLoading(false);
      return { data: null, error };
    }
  };

  const updateUsername = async (username) => {
    setLoading(true);
    try {
      const { data, error } = await apiAuth.updateUsername(username);

      if (error) {
        throw error;
      }
      if (data?.error) throw new Error(data.error);

      // Update local user state with new username
      if (user && data?.username) {
        setUser({
          ...user,
          user_metadata: { ...user.user_metadata, username: data.username },
        });
      }

      setLoading(false);
      return { data, error: null };
    } catch (error) {
      console.error('[AuthProvider] updateUsername caught error:', error);
      setLoading(false);
      return { data: null, error };
    }
  };

  const sendPasswordResetEmail = async (email) => {
    setLoading(true);
    try {
      // TODO: Implement password reset email functionality
      console.warn('[AuthProvider] Password reset email not yet implemented with Cloudflare Workers');
      setLoading(false);
      return { data: null, error: new Error('Password reset not yet implemented') };
    } catch (error) {
      console.error('[AuthProvider] sendPasswordResetEmail caught error:', error);
      setLoading(false);
      return { data: null, error };
    }
  };

  const logout = async () => {
    setLoading(true);
    // End guest session (local only)
    localStorage.removeItem(GUEST_STORAGE_KEY);
    if (session) {
      apiAuth.logout();
    }
    setUser(null);
    setSession(null);
    setLoading(false);
  };

  const value = {
    user,
    session,
    isGuest: isGuestUser(user),
    signInAsGuest,
    signUp,
    login,
    signInWithGoogle,
    logout,
    updateUserPassword,
    updateUsername,
    sendPasswordResetEmail,
    loading,
    initialLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
