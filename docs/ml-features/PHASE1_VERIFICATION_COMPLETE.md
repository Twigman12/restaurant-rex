# Phase 1 Database Migration - Complete Verification Checklist

Run these queries in **Supabase SQL Editor** to verify the migration:

---

## ✅ Step 1: Verify New Columns (Should return 8 rows)

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'experiences' 
  AND column_name IN (
    'dish_tags', 'taste_profile_tags', 'atmosphere_score', 
    'price_point', 'party_size', 'wait_time_minutes', 
    'return_likelihood', 'photo_urls'
  )
ORDER BY column_name;
```

**Expected**: 8 rows showing all new columns

---

## ✅ Step 2: Verify GIN Indexes (Should return 2 rows)

```sql
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'experiences' 
  AND indexname IN (
    'idx_experiences_dish_tags',
    'idx_experiences_taste_profile'
  )
ORDER BY indexname;
```

**Expected**: 2 GIN indexes on tag arrays

---

## ✅ Step 3: Verify All Indexes (Should return 5 rows)

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

**Expected**: All 5 indexes created

---

## ✅ Step 4: Verify experience_ml_features Table

```sql
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'experience_ml_features'
ORDER BY ordinal_position;
```

**Expected**: Columns: id, experience_id, extracted_features (jsonb), confidence_scores (jsonb), created_at

---

## ✅ Step 5: Verify user_taste_profiles Table

```sql
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_taste_profiles'
ORDER BY ordinal_position;
```

**Expected**: Columns including preferred_tastes, avoided_tastes, favorite_dish_types, avg_rating, profile_confidence, total_experiences

---

## ✅ Step 6: Verify RLS Policies (Should return 5 rows)

```sql
SELECT 
  schemaname,
  tablename, 
  policyname,
  cmd as command
FROM pg_policies 
WHERE tablename IN ('user_taste_profiles', 'experience_ml_features')
ORDER BY tablename, policyname;
```

**Expected**: 
- 3 policies on user_taste_profiles (view, update, insert)
- 2 policies on experience_ml_features (view, manage)

---

## ✅ Step 7: Verify Trigger Exists

```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'experiences' 
  AND trigger_name = 'trigger_update_taste_profile';
```

**Expected**: Trigger that fires on INSERT or UPDATE

---

## ✅ Step 8: Test Trigger (Insert Test Experience)

```sql
-- Insert a test experience with high rating
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
  ARRAY['creamy', 'smoky', 'tender'],
  ARRAY['pasta', 'seafood'],
  'moderate',
  4,
  2,
  5,
  'Test ML enhancement - amazing creamy pasta with smoky flavor'
);
```

**Expected**: Query executes successfully

---

## ✅ Step 9: Verify Taste Profile Auto-Created

```sql
SELECT 
  user_id,
  preferred_tastes,
  favorite_dish_types,
  preferred_price_points,
  total_experiences,
  profile_confidence,
  avg_rating
FROM user_taste_profiles 
WHERE user_id = auth.uid();
```

**Expected**:
- `preferred_tastes` contains: `creamy`, `smoky`, `tender`
- `favorite_dish_types` contains: `pasta`, `seafood`
- `preferred_price_points` contains: `moderate`
- `total_experiences` = 1 (or incremented)
- `profile_confidence` is calculated (probably 0.05 for 1 experience)
- `avg_rating` = 5.00

---

## ✅ Step 10: Test Low Rating (Avoided Tastes)

```sql
-- Insert experience with low rating
INSERT INTO experiences (
  user_id,
  restaurant_id,
  rating,
  taste_profile_tags,
  notes
) VALUES (
  auth.uid(),
  (SELECT id FROM restaurants LIMIT 1),
  2,
  ARRAY['bland', 'dry'],
  'Test - disappointing and bland'
);

-- Check avoided tastes were added
SELECT avoided_tastes 
FROM user_taste_profiles 
WHERE user_id = auth.uid();
```

**Expected**: `avoided_tastes` contains `bland` and `dry`

---

## ✅ Step 11: Test find_similar_restaurants Function

```sql
-- Test the similarity function
SELECT * FROM find_similar_restaurants(
  (SELECT id FROM restaurants LIMIT 1),
  5
);
```

**Expected**: Returns similar restaurants based on tag overlap (may be empty if not enough data)

---

## 📋 Verification Checklist

Copy these to Supabase and check off:

- [ ] Step 1: 8 new columns exist ✓
- [ ] Step 2: 2 GIN indexes created ✓
- [ ] Step 3: All 5 indexes confirmed ✓
- [ ] Step 4: experience_ml_features table structure correct ✓
- [ ] Step 5: user_taste_profiles table structure correct ✓
- [ ] Step 6: 5 RLS policies exist ✓
- [ ] Step 7: Trigger exists ✓
- [ ] Step 8: Test experience inserted ✓
- [ ] Step 9: Taste profile auto-created with correct data ✓
- [ ] Step 10: Avoided tastes work correctly ✓
- [ ] Step 11: Similarity function works ✓

---

## 🎯 After Verification

Once all steps pass, update `task.md`:
- Mark all Phase 1 verification steps as `[x]`
- Phase 1 is truly complete ✅

---

**Time Estimate**: 10-15 minutes to run all queries
