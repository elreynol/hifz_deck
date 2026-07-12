import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const CARD_MULT: Record<number, number> = { 3: 1.0, 4: 1.25, 5: 1.5 }
const LEVEL_MULT: Record<string, number> = { beginner: 1.0, experienced: 1.75 }
const DIRECTION_MULT: Record<string, number> = { forward: 1.0, reverse: 1.5 }

function computePoints(opts: {
  ayahCount: number
  durationSeconds: number
  cardCount: number
  difficulty: string
  playDirection: string
  stopwatchEnabled: boolean
}) {
  const ayahs = Math.max(1, opts.ayahCount || 1)
  const duration = Math.max(1, Math.round(opts.durationSeconds || 1))
  const cardMult = CARD_MULT[opts.cardCount] ?? 1.0
  const levelMult = LEVEL_MULT[opts.difficulty] ?? 1.0
  const directionMult = DIRECTION_MULT[opts.playDirection] ?? 1.0
  if (!opts.stopwatchEnabled) {
    return Math.round(ayahs * 10 * cardMult * levelMult * directionMult)
  }
  return Math.round(((ayahs * 100) / duration) * cardMult * levelMult * directionMult)
}

async function getSupabaseClientWithUserToken(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const token = authHeader.replace(/^Bearer\s+/, '')
  if (!token) {
    return new Response(JSON.stringify({ error: 'Malformed Authorization header. Token is missing.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const tempClient = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error: userError } = await tempClient.auth.getUser(token)

  if (userError || !user) {
    return new Response(JSON.stringify({ error: userError?.message || 'Invalid token.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  return { client: supabase, user }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed. Please use POST.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const clientResult = await getSupabaseClientWithUserToken(req)
  if (clientResult instanceof Response) return clientResult
  const { client: supabase, user } = clientResult

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const surah_id = parseInt(String(body.surah_id), 10)
  const duration_seconds = Math.max(1, parseInt(String(body.duration_seconds), 10) || 0)
  const ayah_count = Math.max(1, parseInt(String(body.ayah_count ?? 1), 10) || 1)
  const card_count = [3, 4, 5].includes(Number(body.card_count)) ? Number(body.card_count) : 5
  const difficulty = body.difficulty === 'experienced' ? 'experienced' : 'beginner'
  const play_direction = body.play_direction === 'reverse' ? 'reverse' : 'forward'
  const stopwatch_enabled = body.stopwatch_enabled !== false
  const juz = body.juz != null ? parseInt(String(body.juz), 10) : null
  const hizb = body.hizb != null ? parseInt(String(body.hizb), 10) : null
  const ayah_start = body.ayah_start != null ? parseInt(String(body.ayah_start), 10) : null
  const ayah_end = body.ayah_end != null ? parseInt(String(body.ayah_end), 10) : null
  const badge_ids = Array.isArray(body.badge_ids)
    ? body.badge_ids.filter((id) => typeof id === 'string')
    : []
  const current_streak = Math.max(0, parseInt(String(body.current_streak ?? 0), 10) || 0)
  const last_play_date = typeof body.last_play_date === 'string' ? body.last_play_date : null

  if (isNaN(surah_id) || surah_id <= 0) {
    return new Response(JSON.stringify({ error: 'surah_id must be a positive number.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const points = computePoints({
    ayahCount: ayah_count,
    durationSeconds: duration_seconds,
    cardCount: card_count,
    difficulty,
    playDirection: play_direction,
    stopwatchEnabled: stopwatch_enabled,
  })

  try {
    const insertRow: Record<string, unknown> = {
      user_id: user.id,
      surah_id,
      duration_seconds,
      difficulty,
      card_count,
      play_direction,
      points,
    }
    if (juz != null && !isNaN(juz)) insertRow.juz = juz
    if (hizb != null && !isNaN(hizb)) insertRow.hizb = hizb
    if (ayah_start != null && !isNaN(ayah_start)) insertRow.ayah_start = ayah_start
    if (ayah_end != null && !isNaN(ayah_end)) insertRow.ayah_end = ayah_end

    const { data, error: insertError } = await supabase
      .from('completed_surahs')
      .insert(insertRow)
      .select()

    if (insertError) {
      return new Response(JSON.stringify({
        error: 'Failed to record progress.',
        details: insertError.message,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (last_play_date) {
      await supabase
        .from('profiles')
        .update({
          last_play_date,
          current_streak,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
    }

    if (badge_ids.length > 0) {
      const rows = badge_ids.map((badge_id: string) => ({
        user_id: user.id,
        badge_id,
      }))
      await supabase.from('user_badges').upsert(rows, {
        onConflict: 'user_id,badge_id',
        ignoreDuplicates: true,
      })
    }

    return new Response(JSON.stringify({
      message: 'Progress recorded successfully!',
      recorded_progress: data ? data[0] : null,
      points,
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Unexpected error in progress function:', err)
    return new Response(JSON.stringify({ error: 'An unexpected server error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
