import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient'; // Adjust path if your supabaseClient is elsewhere

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false); // For individual auth operations
  const [initialLoading, setInitialLoading] = useState(true); // For the initial session check

  console.log('[AuthProvider] Initializing. User:', user, 'Session:', session, 'InitialLoading:', initialLoading);

  useEffect(() => {
    console.log('[AuthProvider] useEffect triggered for session and auth listener setup.');
    setInitialLoading(true);
    // Check for an existing session when the component mounts
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log('[AuthProvider] getSession() completed. Session:', currentSession);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setInitialLoading(false);
      console.log('[AuthProvider] State after getSession(): User:', currentSession?.user ?? null, 'InitialLoading:', false);
    }).catch(error => {
      console.error('[AuthProvider] Error in getSession():', error);
      setInitialLoading(false);
    });

    // Listen for changes in authentication state
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[AuthProvider] onAuthStateChange event:', event, 'New Session:', newSession);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setInitialLoading(false);
        setLoading(false);
        console.log('[AuthProvider] State after onAuthStateChange: User:', newSession?.user ?? null, 'Event:', event);
      }
    );
    console.log('[AuthProvider] onAuthStateChange listener subscribed:', authListener);

    // Cleanup function to unsubscribe from the listener when the component unmounts
    return () => {
      if (authListener?.subscription) {
        console.log('[AuthProvider] Unsubscribing from onAuthStateChange.');
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Sign up function
  const signUp = async (email, password, username) => {
    console.log('[AuthProvider] signUp called for email:', email, 'username:', username);
    setLoading(true);
    try {
      const { data: invokeData, error: functionError } = await supabase.functions.invoke('signup', {
        body: { email, password, username },
      });
      console.log('[AuthProvider] signUp invoke result - data:', invokeData, 'functionError:', functionError);
      
      if (functionError) throw functionError;
      if (invokeData.error) throw invokeData.error;

      if (invokeData.session && invokeData.user) {
        console.log('[AuthProvider] signUp successful, calling setSession with:', invokeData.session);
        const { error: setError } = await supabase.auth.setSession(invokeData.session);
        if (setError) {
          console.error('[AuthProvider] Error in signUp while calling setSession:', setError);
        }
      } else if (invokeData.user) {
        console.log('[AuthProvider] signUp created user, but no session returned directly. User:', invokeData.user);
      }

      setLoading(false);
      return { data: invokeData, error: null }; 
    } catch (error) {
      console.error('[AuthProvider] signUp caught error:', error);
      setLoading(false);
      return { data: null, error };
    }
  };

  // Login function
  const login = async (email, password) => {
    console.log('[AuthProvider] login called for email:', email);
    setLoading(true);
    try {
      const { data: invokeData, error: functionError } = await supabase.functions.invoke('login', {
        body: { email, password },
      });
      console.log('[AuthProvider] login invoke result - data:', invokeData, 'functionError:', functionError);

      if (functionError) throw functionError;
      if (invokeData.error) throw invokeData.error; // Error object from within the Edge Function
      
      // Crucially, set the session on the client-side supabase instance
      if (invokeData.session && invokeData.user) {
        console.log('[AuthProvider] Login successful, calling setSession with:', invokeData.session);
        const { error: setError } = await supabase.auth.setSession(invokeData.session);
        if (setError) {
          // This is a critical error if setSession fails, as the app state won't be correct.
          console.error('[AuthProvider] Error in login while calling setSession:', setError);
          // We should probably throw this so the component knows something went wrong.
          throw setError; 
        }
        // onAuthStateChange should now fire with SIGNED_IN due to setSession
      } else {
        // This case should ideally not happen if login was successful in the Edge Function
        // as it should always return a user and session.
        console.warn('[AuthProvider] Login invoke data missing user or session:', invokeData);
        throw new Error('Login succeeded but session data was not returned from function.');
      }

      setLoading(false);
      return { data: invokeData, error: null }; 
    } catch (error) {
      console.error('[AuthProvider] login caught error:', error);
      setLoading(false);
      return { data: null, error }; // Return the caught error
    }
  };

  const updateUserPassword = async (password) => {
    console.log('[AuthProvider] updateUserPassword called.');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-password', {
        body: { password },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      console.log('[AuthProvider] Password updated successfully:', data);
      setLoading(false);
      return { data, error: null };
    } catch (error) {
      console.error('[AuthProvider] updateUserPassword caught error:', error);
      setLoading(false);
      return { data: null, error };
    }
  };

  const updateUsername = async (username) => {
    console.log('[AuthProvider] updateUsername called for username:', username);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-username', {
        body: { username },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      console.log('[AuthProvider] Username updated successfully:', data);
      setLoading(false);
      return { data, error: null };
    } catch (error) {
      console.error('[AuthProvider] updateUsername caught error:', error);
      setLoading(false);
      return { data: null, error };
    }
  };

  const sendPasswordResetEmail = async (email) => {
    console.log('[AuthProvider] sendPasswordResetEmail called for email:', email);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`, // URL to redirect to after email link is clicked
      });

      if (error) throw error;

      console.log('[AuthProvider] Password reset email sent successfully:', data);
      setLoading(false);
      return { data, error: null };
    } catch (error) {
      console.error('[AuthProvider] sendPasswordResetEmail caught error:', error);
      setLoading(false);
      return { data: null, error };
    }
  };

  // Logout function
  const logout = async () => {
    console.log('[AuthProvider] logout called.');
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      // Handle error, maybe show a toast
      console.error('[AuthProvider] Error logging out:', error);
    }
    // onAuthStateChange will set user and session to null
    setLoading(false);
    console.log('[AuthProvider] logout completed (error or not).');
  };

  const value = {
    user,
    session,
    signUp,
    login,
    logout,
    updateUserPassword,
    updateUsername,
    sendPasswordResetEmail,
    loading, // For individual operations like a button spinner
    initialLoading, // To know if we're still waiting for the first session check
  };

  // Log value provided by context just before rendering Provider
  // console.log('[AuthProvider] Providing value:', value);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 