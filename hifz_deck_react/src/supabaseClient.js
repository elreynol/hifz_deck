import { createClient } from '@supabase/supabase-js'

// Get Supabase URL and Anon Key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log to console to ensure variables are loaded (optional, good for debugging)
// console.log('Supabase URL:', supabaseUrl);
// console.log('Supabase Anon Key:', !!supabaseAnonKey); // Log true if key exists

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey); 