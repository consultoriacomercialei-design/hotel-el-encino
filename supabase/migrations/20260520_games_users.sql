-- ============================================================
-- Games & Public Users — 2026-05-20
-- ============================================================

-- 1. Public user profiles (display name for games / leaderboard)
CREATE TABLE IF NOT EXISTS user_profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name   TEXT NOT NULL
                   CHECK (length(trim(display_name)) >= 2 AND length(display_name) <= 30),
  avatar_emoji   TEXT NOT NULL DEFAULT '🎮'
                   CHECK (length(avatar_emoji) <= 8),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Game scores — one row per completed attempt
CREATE TABLE IF NOT EXISTS game_scores (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_slug      TEXT NOT NULL,           -- e.g. 'crucigrama-jun-2026'
  score_seconds  INTEGER NOT NULL,        -- elapsed seconds (lower = better)
  session_token  TEXT NOT NULL,           -- anti-cheat: server-issued token
  completed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_score CHECK (score_seconds > 10 AND score_seconds < 7200)
);

CREATE UNIQUE INDEX IF NOT EXISTS game_scores_one_per_user
  ON game_scores (user_id, game_slug);     -- each user submits once per puzzle

CREATE INDEX IF NOT EXISTS game_scores_slug_time
  ON game_scores (game_slug, score_seconds ASC);

-- 3. User favorites — saved businesses
CREATE TABLE IF NOT EXISTS user_favorites (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_slug   TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, listing_slug)
);

CREATE INDEX IF NOT EXISTS user_favorites_user_id ON user_favorites (user_id);

-- ── Row Level Security ──────────────────────────────────────

ALTER TABLE user_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_scores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites   ENABLE ROW LEVEL SECURITY;

-- user_profiles: each user manages their own row
CREATE POLICY "users_own_profile"
  ON user_profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- game_scores: users can read all scores (leaderboard) but only insert their own
CREATE POLICY "anyone_can_read_scores"
  ON game_scores FOR SELECT USING (true);

CREATE POLICY "users_insert_own_score"
  ON game_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- user_favorites: each user manages their own favorites
CREATE POLICY "users_own_favorites"
  ON user_favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Helper function: update updated_at on profile changes ──
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
