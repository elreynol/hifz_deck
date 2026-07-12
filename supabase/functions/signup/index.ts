// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
// import { createClient } from 'jsr:@supabase/supabase-js@^2' // Old JSR import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2' // Using esm.sh

// Define CORS headers at the top for easy reuse
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allows all origins
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', // Crucial headers
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Must include OPTIONS and POST
}

// console.log("Signup function initializing"); // Optional: for observing function cold starts

console.log("[signup-stub] File loaded. Deno object:", typeof Deno);

Deno.serve(async (req: Request) => {
  console.log("SIGNUP FUNCTION (FULL LOGIC) STARTED"); 
  const serviceKey = Deno.env.get("SERVICE_ROLE_KEY");
  console.log("SERVICE_ROLE_KEY retrieved:", serviceKey ? `vorhanden (Länge: ${serviceKey.length})` : "NICHT GEFUNDEN oder leer");

  if (!serviceKey) {
    console.error("CRITICAL: SERVICE_ROLE_KEY is missing or empty in environment!");
    return new Response(JSON.stringify({ error: "CRITICAL: SERVICE_ROLE_KEY is missing or empty!" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Validate request method (ensure it's POST)
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed. Please use POST.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) { 
    console.error("SUPABASE_URL or SUPABASE_ANON_KEY not found.");
    return new Response(JSON.stringify({ error: "Server configuration error (URL/AnonKey missing)." }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey);
  const supabaseAdminClient = createClient(supabaseUrl, serviceKey); 

  let email, password, providedUsername, finalUsername;
  try {
    const body = await req.json();
    email = body.email;
    password = body.password;
    providedUsername = body.username; 

    if (!email || !password) { 
      return new Response(JSON.stringify({ error: 'Email and password are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (providedUsername && providedUsername.trim().length >= 3) {
      finalUsername = providedUsername.trim();
    } else {
      const emailParts = email.split('@');
      finalUsername = emailParts[0];
      if (providedUsername && providedUsername.trim().length > 0 && providedUsername.trim().length < 3) {
          console.log("Provided username was too short:", providedUsername);
          return new Response(JSON.stringify({ error: 'Provided username must be at least 3 characters long.' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
      }
      console.log(`Username not provided or valid, defaulting to '${finalUsername}' from email.`);
    }

  } catch (error) {
    console.error("Error parsing request body:", error);
    return new Response(JSON.stringify({ error: 'Invalid request body. Please send JSON with email and password (username optional).' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
    });
  }

  try {
    const { data: authData, error: authError } = await supabaseAuthClient.auth.signUp({
      email: email,
      password: password,
    });

    if (authError) {
      console.error('Supabase signup authError:', authError.message, 'Status:', authError.status);
      const status = authError.status || (authError.message.includes("User already registered") ? 409 : 400);
      return new Response(JSON.stringify({ error: authError.message }), {
        status: status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!authData.user) {
      console.warn("Supabase signup warning: User object is null after signUp without an explicit authError. AuthData:", authData);
      return new Response(JSON.stringify({ error: "Signup process failed to return user details." }), {
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log("User created in auth.users:", authData.user.id);

    console.log(`Attempting to update profile ID ${authData.user.id} with username ${finalUsername}`);
    const { error: profileUpdateError } = await supabaseAdminClient
      .from('profiles')
      .update({ username: finalUsername })
      .eq('id', authData.user.id);

    if (profileUpdateError) {
      console.error('Error updating profile username after signup:', profileUpdateError.message, 'Details:', profileUpdateError);
      return new Response(JSON.stringify({ 
        message: "Signup successful (auth user created), but an issue occurred setting the username in profile. Please contact support.", 
        warning: "Profile username may not be set correctly.",
        details: profileUpdateError.message,
        user: authData.user, 
        session: authData.session 
      }), {
        status: 207,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log("Profile username updated successfully for:", authData.user.id);

    return new Response(JSON.stringify({ 
      message: "Signup successful! Username processed.", 
      user: authData.user, 
      session: authData.session,
      username: finalUsername
    }), {
      status: 201, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Unexpected error in signup function main try-catch block:', err);
    return new Response(JSON.stringify({ error: 'An unexpected server error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/* 
Test with curl:

curl -i -X POST http://localhost:54321/functions/v1/signup \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "email": "test@example.com", "password": "password123", "username": "testuser" }'

Replace YOUR_SUPABASE_ANON_KEY with your actual anon key.
If testing deployed function, use the deployed URL.
The Authorization header with anon key is not strictly needed for signUp if RLS allows,
but it's good practice for functions that might interact with other tables.
For Supabase client on the server-side, service_role key is often used for admin tasks,
but for auth.signUp, the anon key is appropriate when called by an end-user action.
However, when initializing the client in an Edge Function, SUPABASE_ANON_KEY is used by default.
*/
