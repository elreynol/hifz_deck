// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

console.log("[update-username] Function initializing.");

async function getAuthenticatedSupabaseClient(req: Request): Promise<{ client: SupabaseClient; user: any } | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header.' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const token = authHeader.replace(/^Bearer\s+/, '');
  if (!token) {
    return new Response(JSON.stringify({ error: 'Malformed Authorization header.' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[update-username] SUPABASE_URL or SUPABASE_ANON_KEY not found.");
    return new Response(JSON.stringify({ error: "Server configuration error." }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Create a client with the user's token to respect RLS
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) {
    console.error("[update-username] Error getting user or no user:", userError?.message);
    return new Response(JSON.stringify({ error: userError?.message || 'Invalid token or no user found.' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return { client, user };
}

Deno.serve(async (req) => {
  console.log(`[update-username] Request received. Method: ${req.method}`);
  if (req.method === 'OPTIONS') {
    console.log("[update-username] Responding to OPTIONS request.");
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed. Please use POST.' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get authenticated Supabase client and user
  const authResult = await getAuthenticatedSupabaseClient(req);
  if (authResult instanceof Response) {
    return authResult; // Error response from getAuthenticatedSupabaseClient
  }
  const { client: supabase, user } = authResult;
  console.log(`[update-username] Authenticated user ID: ${user.id}`);

  let newUsername: string;
  try {
    const body = await req.json();
    // Accept both keys so older/newer clients work
    const raw = body.new_username ?? body.username;
    newUsername = typeof raw === 'string' ? raw.trim() : '';
    if (!newUsername || newUsername.length < 3) {
      return new Response(JSON.stringify({ error: 'New username is required and must be at least 3 characters long.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (newUsername.includes('@')) {
      return new Response(JSON.stringify({ error: 'Username cannot look like an email address.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error("[update-username] Error parsing request body:", error);
    return new Response(JSON.stringify({ error: 'Invalid request body. Please send JSON with new_username.' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ username: newUsername })
      .eq('id', user.id) // Ensure user can only update their own profile (RLS also enforces this)
      .select(); // Optionally select to confirm the update and return the new profile

    if (error) {
      console.error("[update-username] Supabase error updating username:", error);
      // Check for unique constraint violation (PostgreSQL error code 23505)
      if (error.code === '23505') {
        return new Response(JSON.stringify({ error: 'This username is already taken.', details: error.message }), {
          status: 409, // Conflict
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to update username.', details: error.message }), {
        status: 500, // Or a more specific error based on error.code
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[update-username] Username updated successfully for user ${user.id} to ${newUsername}`);
    return new Response(JSON.stringify({ 
      message: "Username updated successfully!", 
      updatedProfile: data ? data[0] : null 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error("[update-username] Unexpected error:", err);
    return new Response(JSON.stringify({ error: 'An unexpected server error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/update-username' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
