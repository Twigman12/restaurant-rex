# Query Debugging Status

## Current Test

Removed joins from the query to isolate the issue:

### Before (hanging):
```typescript
.select(`
  id, user_id, restaurant_id, scenario_id,
  rating, notes, visited_at, created_at, updated_at,
  restaurants(*),
  scenarios(name)
`)
```

### After (testing now):
```typescript
.select(`
  id, user_id, restaurant_id, scenario_id,
  rating, notes, visited_at, created_at, updated_at
`)
```

## What to Check

Look in browser console for:
- `[DEBUG] Experiences query result:` 
- This was MISSING before, indicating query never completed

## Interpretation

**If query completes**: Issue is with joins → we'll fix the join syntax
**If query still hangs**: Issue is with experiences table → possible RLS or column issue

## Next Step

Waiting for console output to determine root cause.
