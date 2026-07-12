// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define CORS headers at the top for easy reuse
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// console.log("Login function initializing");

Deno.serve(async (req) => {
  // Handle OPTIONS preflight request FIRST
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Validate request method (ensure it's POST)
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed. Please use POST.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Add CORS
    });
  }

  // 2. Get Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("SUPABASE_URL or SUPABASE_ANON_KEY not found for login function.");
    return new Response(JSON.stringify({ error: "Server configuration error." }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Add CORS
    });
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // 3. Parse request body
  let email, password;
  try {
    const body = await req.json();
    email = body.email;
    password = body.password;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Add CORS
      });
    }
  } catch (error) {
    console.error("Error parsing request body for login:", error);
    return new Response(JSON.stringify({ error: 'Invalid request body. Please send JSON.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Add CORS
    });
  }

  // 4. Attempt to sign in the user
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error('Supabase login error:', error.message);
      // Supabase typically returns 400 for invalid credentials with signInWithPassword
      const status = error.status || 400;
      return new Response(JSON.stringify({ error: error.message || 'Invalid login credentials.' }), {
        status: status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Add CORS
      });
    }

    if (!data.user || !data.session) {
        console.warn("Supabase login warning: User or session is null without an explicit error.", data);
        return new Response(JSON.stringify({ error: "Login process incomplete. User or session data missing." }), {
            status: 500, // Server error (unexpected state)
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Add CORS
        });
    }

    // 5. Return success response with user and session (which includes the access_token)
    return new Response(JSON.stringify({
      message: "Login successful!",
      user: data.user,
      session: data.session
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Add CORS
    });

  } catch (err) {
    console.error('Unexpected error in login function:', err);
    return new Response(JSON.stringify({ error: 'An unexpected server error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Add CORS
    });
  }
})

/*
Test with curl:

curl -i -X POST https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/login \
  -H "Authorization: Bearer <YOUR_SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{ "email": "testuser@example.com", "password": "password123" }'

Replace <YOUR_PROJECT_REF> and <YOUR_SUPABASE_ANON_KEY>.
Use an email and password for a user that you created with the signup function.
*/
