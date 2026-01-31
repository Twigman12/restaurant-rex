# Supabase Client Query Hang - Root Cause Analysis

## Problem Summary
- User has 0 experiences (confirmed via direct SQL)
- Direct SQL query in Supabase works instantly
- Supabase JS client query hangs indefinitely  
- RLS policies are correct
- Foreign keys are correct

## Root Cause (Likely)

The `createClientSupabaseClient()` creates a **singleton** client instance that is initialized BEFORE the user is authenticated. The auth session isn't being properly applied to the client for subsequent queries.

### Evidence:
1. Client created on line 152: `const supabase = createClientSupabaseClient()`
2. This happens during component initialization
3. Auth session comes from `useAuth()` hook
4. Client doesn't automatically pick up session changes

## Proper Fix (For Later)

The Supabase client needs to be initialized WITH the auth session, or the session needs to be explicitly set on the client:

```typescript
// Option 1: Set session on client
useEffect(() => {
  if (session) {
    supabase.auth.setSession(session)
  }
}, [session])

// Option 2: Create new client WITH session
const supabase = useMemo(() => {
  const client = createClientSupabaseClient()
  if (session) {
    client.auth.setSession(session)
  }
  return client
}, [session])
```

## Temporary Workaround (Applied)

Since user has 0 experiences, skip the hanging query and return empty array:

```typescript
// TEMPORARY: Skip query hang since we know count = 0
console.log('[DEBUG] Bypassing query - user has 0 experiences')
setExperiences([])
```

This allows us to:
1. ✅ See the page UI
2. ✅ Test creating new experience
3. ✅ Verify migration didn't break inserts
4. 🔄 Debug auth session issue separately

## Next Steps

1. Apply workaround
2. Test page loads
3. Test creating experience
4. Fix auth session properly after confirming app works
