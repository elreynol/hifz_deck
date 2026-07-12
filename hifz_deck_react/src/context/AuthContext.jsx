import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
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
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (currentSession?.user) {
        // Real account wins — drop any leftover guest stub
        localStorage.removeItem(GUEST_STORAGE_KEY);
        setSession(currentSession);
        setUser(currentSession.user);
      } else {
        setSession(null);
        const stored = readStoredGuest();
        setUser(stored ? guestUserFromStored(stored) : null);
      }
      setInitialLoading(false);
    }).catch((error) => {
      console.error('[AuthProvider] Error in getSession():', error);
      const stored = readStoredGuest();
      setUser(stored ? guestUserFromStored(stored) : null);
      setInitialLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (newSession?.user) {
          localStorage.removeItem(GUEST_STORAGE_KEY);
          setSession(newSession);
          setUser(newSession.user);
        } else {
          setSession(null);
          // Keep guest if present (sign-out of a real account, or token refresh with no session)
          const stored = readStoredGuest();
          setUser(stored ? guestUserFromStored(stored) : null);
        }
        setInitialLoading(false);
        setLoading(false);
      }
    );

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
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
      const { data: invokeData, error: functionError } = await supabase.functions.invoke('signup', {
        body: { email, password, username },
      });

      if (functionError) throw functionError;
      if (invokeData.error) throw invokeData.error;

      if (invokeData.session && invokeData.user) {
        localStorage.removeItem(GUEST_STORAGE_KEY);
        const { error: setError } = await supabase.auth.setSession(invokeData.session);
        if (setError) {
          console.error('[AuthProvider] Error in signUp while calling setSession:', setError);
        }
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
      const { data: invokeData, error: functionError } = await supabase.functions.invoke('login', {
        body: { email, password },
      });

      if (functionError) throw functionError;
      if (invokeData.error) throw invokeData.error;

      if (invokeData.session && invokeData.user) {
        localStorage.removeItem(GUEST_STORAGE_KEY);
        const { error: setError } = await supabase.auth.setSession(invokeData.session);
        if (setError) {
          console.error('[AuthProvider] Error in login while calling setSession:', setError);
          throw setError;
        }
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

  /** Redirects the browser to Google → Supabase → back to the app home URL */
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      // Real OAuth will replace guest after redirect
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: authRedirectToHome(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('[AuthProvider] signInWithGoogle caught error:', error);
      setLoading(false);
      return { data: null, error };
    }
  };

  const updateUserPassword = async (password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-password', {
        body: { password },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

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
      const { data, error } = await supabase.functions.invoke('update-username', {
        body: { new_username: username },
      });

      if (error) {
        let message = error.message || 'Failed to update username.';
        try {
          const body = typeof error.context?.json === 'function'
            ? await error.context.json()
            : null;
          if (body?.error) message = body.error;
        } catch {
          /* ignore parse failures */
        }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);

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
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: authRedirectToUpdatePassword(),
      });

      if (error) throw error;

      setLoading(false);
      return { data, error: null };
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
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AuthProvider] Error logging out:', error);
      }
    } else {
      setUser(null);
      setSession(null);
    }
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
