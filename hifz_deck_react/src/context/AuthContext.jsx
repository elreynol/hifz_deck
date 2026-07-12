import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { authRedirectToHome, authRedirectToUpdatePassword } from '../utils/authRedirect';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    setInitialLoading(true);
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setInitialLoading(false);
    }).catch((error) => {
      console.error('[AuthProvider] Error in getSession():', error);
      setInitialLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
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

  const signUp = async (email, password, username) => {
    setLoading(true);
    try {
      const { data: invokeData, error: functionError } = await supabase.functions.invoke('signup', {
        body: { email, password, username },
      });

      if (functionError) throw functionError;
      if (invokeData.error) throw invokeData.error;

      if (invokeData.session && invokeData.user) {
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

  /** Redirects the browser to Google → Supabase → back to /hifz_deck/ */
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
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
        body: { username },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

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
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[AuthProvider] Error logging out:', error);
    }
    setLoading(false);
  };

  const value = {
    user,
    session,
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
