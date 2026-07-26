-- Supabase Data Export Script
-- Run these queries in your Supabase SQL Editor (https://supabase.com/dashboard/project/gdytlwuwlkeconmculeu)
-- Copy the results and share them

-- 1. Check data counts
SELECT 
    'Data Summary' as info,
    (SELECT COUNT(*) FROM public.profiles) as profile_count,
    (SELECT COUNT(*) FROM public.completed_surahs) as completion_count,
    (SELECT COUNT(*) FROM public.user_badges) as badge_count;

-- 2. Export profiles
SELECT 
    id,
    username,
    avatar_url,
    current_streak,
    last_play_date,
    created_at,
    updated_at
FROM public.profiles
ORDER BY created_at;

-- 3. Export completed_surahs
SELECT 
    user_id,
    surah_id,
    duration_seconds,
    difficulty,
    card_count,
    play_direction,
    points,
    juz,
    hizb,
    ayah_start,
    ayah_end,
    created_at
FROM public.completed_surahs
ORDER BY created_at;

-- 4. Export user_badges
SELECT 
    user_id,
    badge_id,
    created_at
FROM public.user_badges
ORDER BY created_at;

-- 5. Export auth users (for reference - passwords can't be migrated)
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at,
    email_confirmed_at
FROM auth.users
ORDER BY created_at;
