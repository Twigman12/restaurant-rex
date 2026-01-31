# Phase 1: Database Migration - Execution Guide

## 🎯 Quick Start

You're ready to run the database migration! Follow these steps:

### Step 1: Open Supabase

1. Go to https://supabase.com/dashboard
2. Sign in to your account
3. Select your Restaurant Rex project
4. Click **SQL Editor** in the left sidebar
5. Click **New Query**

### Step 2: Run Migration

1. Open the migration file: `migrations/001_ml_enhancements.sql`
2. Copy **all** content (286 lines)
3. Paste into Supabase SQL Editor
4. Click **Run** button (or press `Ctrl+Enter` / `Cmd+Enter`)
5. Wait for "Success" message (~2-3 seconds)

### Step 3: Verify Migration

Run these verification queries in Supabase:

#### Check 1: New Columns (should return 8 rows)
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'experiences' 
  AND column_name IN (
    'dish_tags', 'taste_profile_tags', 'atmosphere_score', 
    'price_point', 'party_size', 'wait_time_minutes', 
    'return_likelihood', 'photo_urls'
  );
```

#### Check 2: Indexes (should return 5 rows)  
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
  );
```

#### Check 3: New Tables (should return 2 rows)
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('experience_ml_features', 'user_taste_profiles');
```

#### Check 4: Trigger (should return 1 row)
```sql
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'experiences' 
  AND trigger_name = 'trigger_update_taste_profile';
```

### Step 4: Test Trigger (Optional but Recommended)

```sql
-- Insert test experience
INSERT INTO experiences (
  user_id,
  restaurant_id,
  rating,
  taste_profile_tags,
  dish_tags,
  price_point
) VALUES (
  auth.uid(),
  (SELECT id FROM restaurants LIMIT 1),
  5,
  ARRAY['creamy', 'smoky'],
  ARRAY['pasta'],
  'moderate'
);

-- Check taste profile was created
SELECT * FROM user_taste_profiles WHERE user_id = auth.uid();
```

Expected result:
- `preferred_tastes` should include: `creamy`, `smoky`
- `favorite_dish_types` should include: `pasta`
- `total_experiences` should be 1 (or incremented)
- `profile_confidence` should be calculated

---

## ✅ Migration Checklist

- [ ] Opened Supabase SQL Editor
- [ ] Copied migration SQL from `migrations/001_ml_enhancements.sql`
- [ ] Ran migration successfully
- [ ] Verification Check 1: 8 new columns exist
- [ ] Verification Check 2: 5 indexes created
- [ ] Verification Check 3: 2 new tables exist
- [ ] Verification Check 4: Trigger exists
- [ ] Optional: Tested trigger with sample data
- [ ] Updated `task.md` to mark Phase 1 as complete

---

## 🚨 Troubleshooting

### Error: "column already exists"
**Solution**: Some columns may already exist from previous attempts. This is fine - the `IF NOT EXISTS` clauses handle this gracefully.

### Error: "relation already exists"
**Solution**: Tables/indexes may exist. Drop and recreate or skip that specific section.

### Error: "permission denied"
**Solution**: Make sure you're logged in with admin/owner permissions in Supabase.

### Trigger not creating taste profiles
**Solution**: 
1. Check trigger exists (Verification Check 4)
2. Make sure you're inserting with `rating >= 4` to see preferred_tastes updates
3. Ensure `taste_profile_tags` array is not empty

---

## 📊 What This Migration Adds

| Component | Count | Purpose |
|-----------|-------|---------|
| **New Columns** | 8 | Capture rich experience data |
| **Indexes** | 5 | Fast tag searches (GIN) |
| **Tables** | 2 | ML features + taste profiles |
| **Triggers** | 1 | Auto-build taste profiles |
| **Functions** | 2 | Taste profile update + similarity |
| **RLS Policies** | 5 | Secure access control |

---

## ⏭️ After Migration Complete

Once all checks pass:
1. Mark Phase 1 complete in `task.md`
2. Move to **Phase 2**: TypeScript Types
3. Update progress in `docs/ml-features/PROGRESS.md`

---

**Estimated Time**: 5-10 minutes  
**Downtime**: None (additive changes only)  
**Rollback Available**: Yes (see migration file comments)
