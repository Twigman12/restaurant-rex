-- Phase 2: Rex Gallery (conversation + recommendations) tables
-- Run this in your Supabase SQL Editor
-- Date: 2026-01-31

-- =====================================================
-- STEP 1: Conversations (one row per recommendation event)
-- =====================================================

CREATE TABLE IF NOT EXISTS rex_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_message TEXT NOT NULL,
  is_more_options BOOLEAN DEFAULT FALSE NOT NULL,
  follow_up_count INTEGER DEFAULT 0 NOT NULL,
  search_key TEXT NOT NULL,
  extracted_preferences JSONB
);

CREATE INDEX IF NOT EXISTS idx_rex_conversations_user_created
  ON rex_conversations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rex_conversations_user_search_key
  ON rex_conversations(user_id, search_key);

-- =====================================================
-- STEP 2: Recommendations (snapshot rows per conversation)
-- =====================================================

CREATE TABLE IF NOT EXISTS rex_conversation_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES rex_conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- NOTE: This is a string because we support BOTH:
  -- - local restaurant UUIDs (from `restaurants.id`)
  -- - Google Places `place_id` values
  restaurant_id TEXT NOT NULL,
  restaurant_name TEXT,
  neighborhood TEXT,
  borough TEXT,
  cuisine_type TEXT,
  price_range INTEGER CHECK (price_range >= 1 AND price_range <= 4),
  rating NUMERIC,
  user_ratings_total INTEGER,
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_rex_recs_conversation_created
  ON rex_conversation_recommendations(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rex_recs_user_created
  ON rex_conversation_recommendations(user_id, created_at DESC);

-- =====================================================
-- STEP 3: RLS + Policies
-- =====================================================

ALTER TABLE rex_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rex_conversation_recommendations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own rex conversations" ON rex_conversations;
DROP POLICY IF EXISTS "Users can insert own rex conversations" ON rex_conversations;
DROP POLICY IF EXISTS "Users can delete own rex conversations" ON rex_conversations;

DROP POLICY IF EXISTS "Users can view own rex conversation recommendations" ON rex_conversation_recommendations;
DROP POLICY IF EXISTS "Users can insert own rex conversation recommendations" ON rex_conversation_recommendations;
DROP POLICY IF EXISTS "Users can delete own rex conversation recommendations" ON rex_conversation_recommendations;

-- Conversations policies
CREATE POLICY "Users can view own rex conversations"
  ON rex_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rex conversations"
  ON rex_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own rex conversations"
  ON rex_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Recommendations policies
CREATE POLICY "Users can view own rex conversation recommendations"
  ON rex_conversation_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rex conversation recommendations"
  ON rex_conversation_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own rex conversation recommendations"
  ON rex_conversation_recommendations FOR DELETE
  USING (auth.uid() = user_id);

