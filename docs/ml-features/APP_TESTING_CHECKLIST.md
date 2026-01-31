# App Functionality Test Checklist

**Purpose**: Verify existing Restaurant Rex features work after database migration

**Server Status**: ✅ Running at http://localhost:3000

---

## Critical Features to Test

### 1. Authentication ✓
- [ ] Navigate to http://localhost:3000/login
- [ ] Sign in with existing account
- [ ] Verify successful login

### 2. Restaurant Browsing ✓
- [ ] Navigate to home page
- [ ] Browse restaurant list
- [ ] Click on a restaurant
- [ ] Verify restaurant details page loads

### 3. Experience Creation (CRITICAL - New Columns Added) ✓
- [ ] Navigate to a restaurant page
- [ ] Click "Add Experience" or similar
- [ ] Fill out **basic** experience form (rating, notes)
- [ ] Submit the form
- [ ] **Expected**: Form submits successfully (new columns use default values)
- [ ] Verify experience appears in your list

### 4. View Existing Experiences ✓
- [ ] Navigate to /experiences
- [ ] Verify existing experiences display correctly
- [ ] Check that no errors appear

### 5. Chat/Recommendations (if applicable) ✓
- [ ] Navigate to /chat
- [ ] Test recommendation feature
- [ ] Verify it works normally

### 6. Profile Page ✓
- [ ] Navigate to /profile
- [ ] Verify profile loads correctly

---

## Database Backward Compatibility Check

The migration added these columns with **safe defaults**:
- `dish_tags` → `'{}'` (empty array)
- `taste_profile_tags` → `'{}'` (empty array)
- `atmosphere_score` → `NULL`
- `price_point` → `NULL`
- `party_size` → `1`
- `wait_time_minutes` → `NULL`
- `return_likelihood` → `NULL`
- `photo_urls` → `'{}'` (empty array)

**This means**:
- Existing experiences won't break
- New experiences can be created without these fields
- Everything optional except party_size (defaults to 1)

---

## What to Watch For

### ✅ Good Signs:
- App loads without errors
- Can create new experiences with just rating + notes
- Existing experiences display correctly
- No console errors related to database

### ⚠️ Warning Signs:
- TypeScript errors in browser console
- Database query errors
- "Column not found" errors
- Form submission failures

---

## If Issues Found

1. **Check browser console** (F12 → Console tab)
2. **Note the error message**
3. **Screenshot if needed**
4. We'll fix before Phase 5

---

## Quick Test Script

**Fastest way to verify** (2 minutes):

1. Open http://localhost:3000
2. Sign in
3. Click any restaurant
4. Add a new experience (just rating + basic notes)
5. Submit
6. If it works → **We're good to proceed to Phase 5!**

---

**Status**: Ready for testing
**Next**: Once verified, proceed to Phase 5 (Enhanced Form Component)
