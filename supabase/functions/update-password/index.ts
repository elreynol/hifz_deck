// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 1. Get the user's access token from the request headers
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Authorization header is required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 2. Parse the request body to get the new password
  let newPassword;
  try {
    const body = await req.json();
    newPassword = body.password;
    if (!newPassword || newPassword.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters long' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // 3. Create a Supabase client with the user's access token
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  // 4. Update the user's password
  const { data, error } = await supabaseClient.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.status || 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 5. Return a success response
  return new Response(JSON.stringify({ message: 'Password updated successfully', user: data.user }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}); 