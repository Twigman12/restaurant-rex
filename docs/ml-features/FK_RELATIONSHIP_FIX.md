# Foreign Key Relationship Diagnostic

## Problem Identified

TypeScript lint error reveals: `"could not find the relation between experiences and restaurants"`

This means the Supabase query `.select('*, restaurants(*), scenarios(name)')` is failing because foreign key relationships may have been affected by the migration.

## Diagnostic Query

Run this in **Supabase SQL Editor**:

```sql
-- Check existing foreign keys on experiences table
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'experiences' 
AND tc.constraint_type = 'FOREIGN KEY';
```

**Expected Results**:
- `experiences.restaurant_id` → `restaurants.id`
- `experiences.scenario_id` → `scenarios.id`
- `experiences.user_id` → `profiles.id` (or `auth.users`)

## If Foreign Keys Are Missing

Run this fix:

```sql
-- Add back foreign key constraints
ALTER TABLE experiences
  DROP CONSTRAINT IF EXISTS experiences_restaurant_id_fkey,
  DROP CONSTRAINT IF EXISTS experiences_scenario_id_fkey,
  DROP CONSTRAINT IF EXISTS experiences_user_id_fkey;

ALTER TABLE experiences
  ADD CONSTRAINT experiences_restaurant_id_fkey 
    FOREIGN KEY (restaurant_id) 
    REFERENCES restaurants(id) 
    ON DELETE CASCADE;

ALTER TABLE experiences
  ADD CONSTRAINT experiences_scenario_id_fkey 
    FOREIGN KEY (scenario_id) 
    REFERENCES scenarios(id) 
    ON DELETE SET NULL;

ALTER TABLE experiences
  ADD CONSTRAINT experiences_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;
```

## Next Steps

1. Run diagnostic query
2. If relationships missing, run fix query
3. Refresh the experiences page
4. Check console logs for [DEBUG] messages
