-- Phase 1: ML Enhancement Migration for Restaurant Rex
-- Run this in your Supabase SQL Editor
-- Author: Restaurant Rex ML Team
-- Date: 2026-01-31

-- =====================================================
-- STEP 1: Add ML-Enhanced Columns to experiences table
-- =====================================================

ALTER TABLE experiences
ADD COLUMN IF NOT EXISTS dish_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS taste_profile_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS atmosphere_score INTEGER CHECK (atmosphere_score BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS price_point TEXT CHECK (price_point IN ('budget', 'moderate', 'splurge')),
ADD COLUMN IF NOT EXISTS party_size INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS wait_time_minutes INTEGER,
ADD COLUMN IF NOT EXISTS return_likelihood INTEGER CHECK (return_likelihood BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';

-- =====================================================
-- STEP 2: Create Performance Indexes
-- =====================================================

-- GIN indexes for fast array searches on tags
CREATE INDEX IF NOT EXISTS idx_experiences_dish_tags 
  ON experiences USING GIN(dish_tags);

CREATE INDEX IF NOT EXISTS idx_experiences_taste_profile 
  ON experiences USING GIN(taste_profile_tags);

-- Partial indexes on optional fields for better performance
CREATE INDEX IF NOT EXISTS idx_experiences_price_point 
  ON experiences(price_point) 
  WHERE price_point IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_experiences_return_likelihood 
  ON experiences(return_likelihood) 
  WHERE return_likelihood IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_experiences_atmosphere_score 
  ON experiences(atmosphere_score) 
  WHERE atmosphere_score IS NOT NULL;

-- =====================================================
-- STEP 3: Create ML Features Table
-- =====================================================

CREATE TABLE IF NOT EXISTS experience_ml_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID REFERENCES experiences(id) ON DELETE CASCADE,
  extracted_features JSONB,
  confidence_scores JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for lookups
CREATE INDEX IF NOT EXISTS idx_ml_features_experience_id 
  ON experience_ml_features(experience_id);

-- =====================================================
-- STEP 4: Create User Taste Profiles Table
-- =====================================================

CREATE TABLE IF NOT EXISTS user_taste_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  preferred_tastes TEXT[] DEFAULT '{}',
  avoided_tastes TEXT[] DEFAULT '{}',
  preferred_price_points TEXT[] DEFAULT '{}',
  favorite_dish_types TEXT[] DEFAULT '{}',
  avg_rating DECIMAL(3,2),
  profile_confidence DECIMAL(3,2) DEFAULT 0.0,
  total_experiences INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for user lookups
CREATE INDEX IF NOT EXISTS idx_taste_profiles_user_id 
  ON user_taste_profiles(user_id);

-- Enable RLS
ALTER TABLE user_taste_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_ml_features ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: Create RLS Policies
-- =====================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own taste profile" ON user_taste_profiles;
DROP POLICY IF EXISTS "Users can update own taste profile" ON user_taste_profiles;
DROP POLICY IF EXISTS "Users can insert own taste profile" ON user_taste_profiles;
DROP POLICY IF EXISTS "Users can view own ml features" ON experience_ml_features;
DROP POLICY IF EXISTS "Service role can manage ml features" ON experience_ml_features;

-- User taste profiles policies
CREATE POLICY "Users can view own taste profile" 
  ON user_taste_profiles FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own taste profile" 
  ON user_taste_profiles FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own taste profile" 
  ON user_taste_profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- ML features policies (linked to experiences via foreign key)
CREATE POLICY "Users can view own ml features" 
  ON experience_ml_features FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM experiences 
      WHERE experiences.id = experience_ml_features.experience_id 
      AND experiences.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage ml features" 
  ON experience_ml_features FOR ALL 
  USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- =====================================================
-- STEP 6: Create Trigger Function for Auto Taste Profile
-- =====================================================

CREATE OR REPLACE FUNCTION update_user_taste_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update taste profile
  INSERT INTO user_taste_profiles (user_id, total_experiences)
  VALUES (NEW.user_id, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    total_experiences = user_taste_profiles.total_experiences + 1,
    updated_at = NOW();
  
  -- Update preferred tastes from high-rated experiences (4-5 stars)
  IF NEW.rating >= 4 AND NEW.taste_profile_tags IS NOT NULL AND array_length(NEW.taste_profile_tags, 1) > 0 THEN
    UPDATE user_taste_profiles
    SET 
      preferred_tastes = array(
        SELECT DISTINCT unnest(preferred_tastes || NEW.taste_profile_tags)
      ),
      favorite_dish_types = array(
        SELECT DISTINCT unnest(
          COALESCE(favorite_dish_types, '{}') || COALESCE(NEW.dish_tags, '{}')
        )
      ),
      preferred_price_points = CASE
        WHEN NEW.price_point IS NOT NULL THEN array(
          SELECT DISTINCT unnest(
            COALESCE(preferred_price_points, '{}') || ARRAY[NEW.price_point]
          )
        )
        ELSE preferred_price_points
      END
    WHERE user_id = NEW.user_id;
  END IF;
  
  -- Update avoided tastes from low-rated experiences (1-2 stars)
  IF NEW.rating <= 2 AND NEW.taste_profile_tags IS NOT NULL AND array_length(NEW.taste_profile_tags, 1) > 0 THEN
    UPDATE user_taste_profiles
    SET avoided_tastes = array(
      SELECT DISTINCT unnest(avoided_tastes || NEW.taste_profile_tags)
    )
    WHERE user_id = NEW.user_id;
  END IF;
  
  -- Update average rating and confidence
  UPDATE user_taste_profiles
  SET 
    avg_rating = (
      SELECT AVG(rating)::DECIMAL(3,2) 
      FROM experiences 
      WHERE user_id = NEW.user_id AND rating IS NOT NULL
    ),
    profile_confidence = LEAST(
      (total_experiences::DECIMAL / 20.0), 
      1.0
    )
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 7: Create Trigger
-- =====================================================

DROP TRIGGER IF EXISTS trigger_update_taste_profile ON experiences;
CREATE TRIGGER trigger_update_taste_profile
  AFTER INSERT OR UPDATE OF rating, taste_profile_tags, dish_tags, price_point
  ON experiences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_taste_profile();

-- =====================================================
-- STEP 8: Create Restaurant Similarity Function
-- =====================================================

CREATE OR REPLACE FUNCTION find_similar_restaurants(
  target_restaurant_id UUID,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  restaurant_id UUID,
  restaurant_name TEXT,
  similarity_score DECIMAL(3,2),
  shared_tags TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH target_tags AS (
    SELECT 
      array_agg(DISTINCT tag) as all_tags
    FROM experiences e
    CROSS JOIN LATERAL unnest(e.dish_tags || e.taste_profile_tags) AS tag
    WHERE e.restaurant_id = target_restaurant_id
  ),
  restaurant_similarity AS (
    SELECT 
      r.id,
      r.name,
      array_agg(DISTINCT tag) as restaurant_tags,
      (
        SELECT COUNT(*)
        FROM unnest(array_agg(DISTINCT tag)) AS tag
        WHERE tag = ANY((SELECT all_tags FROM target_tags))
      )::DECIMAL / 
      GREATEST(
        NULLIF((SELECT array_length(all_tags, 1) FROM target_tags), 0),
        1
      ) as score,
      (
        SELECT array_agg(DISTINCT shared_tag)
        FROM unnest(array_agg(DISTINCT tag)) AS shared_tag
        WHERE shared_tag = ANY((SELECT all_tags FROM target_tags))
      ) as shared
    FROM restaurants r
    JOIN experiences e ON e.restaurant_id = r.id
    CROSS JOIN LATERAL unnest(e.dish_tags || e.taste_profile_tags) AS tag
    WHERE r.id != target_restaurant_id
    GROUP BY r.id, r.name
    HAVING COUNT(*) > 0
  )
  SELECT 
    id,
    name,
    LEAST(score, 1.0)::DECIMAL(3,2),
    shared
  FROM restaurant_similarity
  WHERE score > 0.3
  ORDER BY score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICATION QUERIES (Run these after migration)
-- =====================================================

-- Uncomment and run these to verify migration success:

-- Check new columns exist
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'experiences' 
--   AND column_name IN (
--     'dish_tags', 'taste_profile_tags', 'atmosphere_score', 
--     'price_point', 'party_size', 'wait_time_minutes', 
--     'return_likelihood', 'photo_urls'
--   );

-- Check indexes were created
-- SELECT indexname 
-- FROM pg_indexes 
-- WHERE tablename = 'experiences' 
--   AND indexname LIKE 'idx_experiences_%';

-- Check tables were created
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_name IN ('experience_ml_features', 'user_taste_profiles');

-- Check trigger exists
-- SELECT trigger_name 
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'experiences' 
--   AND trigger_name = 'trigger_update_taste_profile';

-- =====================================================
-- Migration complete! ✅
-- =====================================================
