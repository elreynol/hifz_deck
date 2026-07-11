// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// console.log("Leaderboard function initializing");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS', // This function uses GET
}

Deno.serve(async (req) => {
  // Handle OPTIONS preflight request FIRST
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Validate request method (must be GET for this function)
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed. Please use GET.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 2. Get Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY"); // Using Anon key as this is public data

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("SUPABASE_URL or SUPABASE_ANON_KEY not found for leaderboard function.");
    return new Response(JSON.stringify({ error: "Server configuration error." }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  // IMPORTANT: For calling .rpc(), especially if the underlying PostgreSQL function
  // might have specific permission requirements or if you want to ensure it runs
  // with a role that can definitely execute it, you might consider using the service_role key.
  // However, if your `get_leaderboard` function is invokable by the `anon` role (e.g., grants allow it),
  // then the anon key is fine and simpler for a public endpoint.
  // For now, we'll proceed with the anon key. If RLS/permissions block it, we might need to switch
  // to using the service_role key (which would need to be set as an env var for the function).
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // 3. Parse query parameters (optional, for limit)
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  let limitCount = limitParam ? parseInt(limitParam, 10) : 10;

  if (isNaN(limitCount) || limitCount <= 0) {
    // Default to 10 if invalid, rather than erroring, or choose to error:
    // limitCount = 10;
    return new Response(JSON.stringify({ error: 'Invalid limit parameter. Must be a positive number.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // 4. Call the database function `get_leaderboard`
  try {
    const { data, error } = await supabase.rpc('get_leaderboard', { 
      limit_count: limitCount 
    });

    if (error) {
      console.error('Supabase RPC error fetching leaderboard:', error);
      // Check if it's a PostgREST error (e.g., function not found, RLS issue)
      // error object might have details like: error.message, error.details, error.hint, error.code
      let statusCode = 500;
      if (error.code) {
        // Example: '42P01' for undefined_table or undefined_function, 'PGRST200' for RLS violation on PostgREST directly
        // This mapping is simplistic; proper error handling might need more detail.
        if (error.code.startsWith('PGRST') || error.code === '42P01') {
          statusCode = 404; // Or 400/403 depending on the exact PGRST error
        } else if (error.code.startsWith('22P')) { // data exception
            statusCode = 400;
        }
      }
      return new Response(JSON.stringify({ 
        error: "Failed to fetch leaderboard data.", 
        details: error.message 
      }), {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Return success response with leaderboard data
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Ensure all CORS headers here
    });

  } catch (err) {
    console.error('Unexpected error in leaderboard function:', err);
    return new Response(JSON.stringify({ error: 'An unexpected server error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})

/*
Test with curl:

curl -i -X GET "https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/leaderboard?limit=5" \
  -H "Authorization: Bearer <YOUR_SUPABASE_ANON_KEY>"

(Limit is optional, defaults to 10 in the function)
Replace <YOUR_PROJECT_REF> and <YOUR_SUPABASE_ANON_KEY>.
*/
