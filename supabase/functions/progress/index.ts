// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// console.log("Progress function initializing");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Ensure OPTIONS is here
}

// Helper function to create a Supabase client with the user's JWT
// This is important because inserts/updates should be done by the user themselves, respecting RLS.
async function getSupabaseClientWithUserToken(req: Request): Promise<SupabaseClient | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Add CORS
    });
  }

  const token = authHeader.replace(/^Bearer\s+/, '');
  if (!token) {
    return new Response(JSON.stringify({ error: 'Malformed Authorization header. Token is missing.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Add CORS
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("SUPABASE_URL or SUPABASE_ANON_KEY not found for progress function (client creation).");
    return new Response(JSON.stringify({ error: "Server configuration error." }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Add CORS
    });
  }

  // Create a temporary client to validate the token and get user info
  // We use the anon key here because this client is just for getUser()
  const tempClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error: userError } = await tempClient.auth.getUser(token);

  if (userError) {
    console.error('JWT validation error (getUser):', userError.message);
    return new Response(JSON.stringify({ error: userError.message || 'Invalid token.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Add CORS
    });
  }

  if (!user) {
    return new Response(JSON.stringify({ error: 'No user found for the provided token.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Add CORS
    });
  }

  // Now, create a new Supabase client scoped to this specific user's session.
  // This client will use the user's JWT for its requests, enforcing RLS.
  // Note: The `createClient` function from `supabase-js` v2 automatically handles this
  // if you pass the `auth.jwt` option OR if you set the Authorization header on the client instance.
  // For Edge Functions, a common pattern is to create a client and then set the auth header for it.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  
  // Attach user to the client object or return it alongside for easier access in the main handler
  // For simplicity, we can just return the user-scoped client and the user object separately.
  return { client: supabase, user: user }; 
}


Deno.serve(async (req) => {
  // Handle OPTIONS preflight request FIRST
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Validate request method (must be POST for this function)
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed. Please use POST.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Add CORS
    });
  }

  // 2. Get user-scoped Supabase client and user object
  const clientResult = await getSupabaseClientWithUserToken(req);
  if (clientResult instanceof Response) {
    return clientResult; // Return the error response from the helper
  }
  const { client: supabase, user } = clientResult;
  // console.log("Authenticated user:", user.id);

  // 3. Parse request body for surah_id and duration_seconds
  let surah_id: number;
  let duration_seconds: number;
  try {
    const body = await req.json();
    surah_id = parseInt(body.surah_id, 10);
    duration_seconds = parseInt(body.duration_seconds, 10);

    if (isNaN(surah_id) || isNaN(duration_seconds)) {
      return new Response(JSON.stringify({ error: 'surah_id and duration_seconds must be numbers.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Add CORS
      });
    }
    if (surah_id <= 0 || duration_seconds <= 0) {
        return new Response(JSON.stringify({ error: 'surah_id and duration_seconds must be positive.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Add CORS
        });
    }
  } catch (error) {
    console.error("Error parsing request body for progress:", error);
    return new Response(JSON.stringify({ error: 'Invalid request body. Expected JSON with surah_id and duration_seconds.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Add CORS
    });
  }

  // 4. Insert progress into `completed_surahs` table
  try {
    const { data, error: insertError } = await supabase
      .from('completed_surahs')
      .insert({
        user_id: user.id, // Use the authenticated user's ID
        surah_id: surah_id,
        duration_seconds: duration_seconds,
        // completed_at is handled by `now()` default in the table
      })
      .select(); // Optionally select the inserted row to return it

    if (insertError) {
      console.error('Supabase insert error for progress:', insertError);
      // Handle potential RLS errors or other database errors
      let statusCode = 500;
      if (insertError.code) {
        if (insertError.code.startsWith('23')) { // Integrity constraint violation (e.g., foreign key, unique)
            statusCode = 409; // Conflict
        } else if (insertError.code.startsWith('PGRST')) { // PostgREST specific errors
            statusCode = 400; // Or more specific based on PGRST error code
        }
      }
      return new Response(JSON.stringify({ 
        error: "Failed to record progress.",
        details: insertError.message
      }), {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Add CORS
      });
    }

    // 5. Return success response (optionally with the created record)
    return new Response(JSON.stringify({
      message: "Progress recorded successfully!",
      recorded_progress: data ? data[0] : null // .select() returns an array
    }), {
      status: 201, // Created
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Add CORS (original was incomplete)
    });

  } catch (err) {
    console.error('Unexpected error in progress function:', err);
    return new Response(JSON.stringify({ error: 'An unexpected server error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Add CORS
    });
  }
})

/*
Test with curl:

(First, get an access_token by calling the login function)
ACCESS_TOKEN="YOUR_USER_ACCESS_TOKEN_FROM_LOGIN"

curl -i -X POST https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/progress \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "surah_id": 1, "duration_seconds": 300 }'

Replace <YOUR_PROJECT_REF>.
*/
