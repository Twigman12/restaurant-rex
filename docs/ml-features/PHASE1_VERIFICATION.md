# Phase 1 Migration - Verification Steps

## ✅ Migration Successful!

The migration ran successfully. Now run these verification queries in Supabase SQL Editor:

---

## Verification Query 1: Check New Columns

**Run this in Supabase:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'experiences' 
  AND column_name IN (
    'dish_tags', 'taste_profile_tags', 'atmosphere_score', 
    'price_point', 'party_size', 'wait_time_minutes', 
    'return_likelihood', 'photo_urls'
  )
ORDER BY column_name;
```

**Expected:** 8 rows returned

---

## Verification Query 2: Check Indexes

**Run this:**
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'experiences' 
  AND indexname IN (
    'idx_experiences_dish_tags',
    'idx_experiences_taste_profile',
    'idx_experiences_price_point',
    'idx_experiences_return_likelihood',
    'idx_experiences_atmosphere_score'
  )
ORDER BY indexname;
```

**Expected:** 5 rows returned

---

## Verification Query 3: Check New Tables

**Run this:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('experience_ml_features', 'user_taste_profiles')
ORDER BY table_name;
```

**Expected:** 2 rows returned

---

## Verification Query 4: Check Trigger

**Run this:**
```sql
SELECT trigger_name, event_manipulation
FROM information_schema.triggers 
WHERE event_object_table = 'experiences' 
  AND trigger_name = 'trigger_update_taste_profile';
```

**Expected:** 1 row (or multiple rows for INSERT/UPDATE events)

---

## Verification Query 5: Check RLS Policies

**Run this:**
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('user_taste_profiles', 'experience_ml_features')
ORDER BY tablename, policyname;
```

**Expected:** 5 rows (3 for user_taste_profiles, 2 for experience_ml_features)

---

## Optional: Test the Trigger

**Run this to test taste profile auto-creation:**
```sql
-- Insert a test experience
INSERT INTO experiences (
  user_id,
  restaurant_id,
  rating,
  taste_profile_tags,
  dish_tags,
  price_point,
  atmosphere_score,
  party_size,
  return_likelihood,
  notes
) VALUES (
  auth.uid(),
  (SELECT id FROM restaurants LIMIT 1),
  5,
  ARRAY['creamy', 'smoky'],
  ARRAY['pasta'],
  'moderate',
  4,
  2,
  5,
  'Test experience for ML features'
);

-- Check taste profile was created
SELECT 
  preferred_tastes, 
  favorite_dish_types, 
  total_experiences, 
  profile_confidence 
FROM user_taste_profiles 
WHERE user_id = auth.uid();
```

**Expected:**
- `preferred_tastes`: should include 'creamy' and 'smoky'
- `favorite_dish_types`: should include 'pasta'
- `total_experiences`: 1 (or incremented)
- `profile_confidence`: calculated value

---

## ✅ Verification Complete Checklist

After running all queries above:

- [ ] Query 1: 8 columns returned ✓
- [ ] Query 2: 5 indexes returned ✓
- [ ] Query 3: 2 tables returned ✓
- [ ] Query 4: Trigger exists ✓
- [ ] Query 5: 5 policies returned ✓
- [ ] Optional: Trigger test passed ✓

Once all checks pass, Phase 1 is **complete**! ✅

---

**Next:** Proceed to Phase 2 (TypeScript Types)
