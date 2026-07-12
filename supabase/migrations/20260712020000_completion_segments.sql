-- Segment metadata for full-Quran hizb play units
alter table public.completed_surahs
  add column if not exists juz integer,
  add column if not exists hizb integer,
  add column if not exists ayah_start integer,
  add column if not exists ayah_end integer;
