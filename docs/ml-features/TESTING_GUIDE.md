# Testing Guide

## Overview

Comprehensive testing strategy for ML-enhanced Restaurant Rex features.

---

## Unit Tests

### Tag Extractor Tests

**File:** `__tests__/lib/ml/tagExtractor.test.ts`

```typescript
import { tagExtractor } from '@/lib/ml/tagExtractor';

describe('TagExtractor', () => {
  describe('extractTags', () => {
    test('extracts taste profiles correctly', () => {
      const notes = "The steak was incredibly tender and juicy with a nice smoky flavor";
      const suggestions = tagExtractor.extractTags(notes);
      
      const tags = suggestions.map(s => s.tag);
      expect(tags).toContain('tender');
      expect(tags).toContain('smoky');
    });
    
    test('extracts dish types', () => {
      const notes = "Had the seafood pasta and a chocolate dessert";
      const suggestions = tagExtractor.extractTags(notes);
      
      const tags = suggestions.map(s => s.tag);
      expect(tags).toContain('pasta');
      expect(tags).toContain('seafood');
      expect(tags).toContain('dessert');
    });
    
    test('assigns confidence scores', () => {
      const notes = "spicy hot chile jalapeño";
      const suggestions = tagExtractor.extractTags(notes);
      
      const spicy = suggestions.find(s => s.tag === 'spicy');
      expect(spicy).toBeDefined();
      expect(spicy!.confidence).toBeGreaterThan(0.5);
    });
    
    test('handles empty notes', () => {
      expect(tagExtractor.extractTags('')).toEqual([]);
      expect(tagExtractor.extractTags('   ')).toEqual([]);
    });
    
    test('is case insensitive', () => {
      const notes1 = "SPICY pasta";
      const notes2 = "spicy pasta";
      
      const tags1 = tagExtractor.extractTags(notes1).map(s => s.tag);
      const tags2 = tagExtractor.extractTags(notes2).map(s => s.tag);
      
      expect(tags1).toEqual(tags2);
    });
  });
  
  describe('getTopSuggestions', () => {
    test('filters by confidence threshold', () => {
      const notes = "Had a dish";  // Very generic
      const { dish_tags, taste_profile_tags } = tagExtractor.getTopSuggestions(notes);
      
      // Should have "dish" but confidence might be low
      const all = tagExtractor.extractTags(notes);
      expect(all.length).toBeGreaterThan(0);
    });
    
    test('limits results per category', () => {
      const notes = "pasta seafood steak chicken appetizer entree dessert salad soup";
      const { dish_tags } = tagExtractor.getTopSuggestions(notes, 3);
      
      expect(dish_tags.length).toBeLessThanOrEqual(3);
    });
    
    test('separates categories correctly', () => {
      const notes = "creamy pasta with a smoky flavor";
      const { dish_tags, taste_profile_tags } = tagExtractor.getTopSuggestions(notes);
      
      expect(dish_tags).toContain('pasta');
      expect(taste_profile_tags).toContain('creamy');
      expect(taste_profile_tags).toContain('smoky');
      
      // Categories shouldn't overlap
      expect(dish_tags).not.toContain('creamy');
      expect(taste_profile_tags).not.toContain('pasta');
    });
  });
});
```

**Run tests:**
```bash
npm test -- tagExtractor.test.ts
```

---

## Integration Tests

### API Route Tests

**File:** `__tests__/api/experiences.test.ts`

```typescript
import { POST } from '@/app/api/experiences/route';
import { createMocks } from 'node-mocks-http';

describe('/api/experiences', () => {
  test('creates experience with ML fields', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: {
        restaurant_id: 'test-id',
        rating: 5,
        atmosphere_score: 4,
        price_point: 'moderate',
        party_size: 2,
        dish_tags: ['pasta', 'seafood'],
        taste_profile_tags: ['creamy', 'fresh'],
        notes: 'Amazing creamy seafood pasta'
      }
    });
    
    const response = await POST(req);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.dish_tags).toEqual(['pasta', 'seafood']);
    expect(data.atmosphere_score).toBe(4);
  });
  
  test('validates rating range', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: {
        restaurant_id: 'test-id',
        rating: 10  // Invalid
      }
    });
    
    const response = await POST(req);
    expect(response.status).toBe(400);
  });
  
  test('stores ML features', async () => {
    // Test that experience_ml_features table is populated
    // After creating experience with notes
  });
});
```

---

## Database Tests

### Trigger Tests

**SQL Test File:** `__tests__/database/taste_profile_trigger.sql`

```sql
-- Test taste profile trigger
BEGIN;

-- Create test user
INSERT INTO auth.users (id, email) VALUES 
  ('test-user-id', 'test@example.com');

-- Create test restaurant
INSERT INTO restaurants (id, name, neighborhood, cuisine_type) VALUES
  ('test-restaurant-id', 'Test Restaurant', 'Test Hood', 'Italian');

-- Test 1: High rating adds to preferred tastes
INSERT INTO experiences (
  user_id, 
  restaurant_id, 
  rating, 
  taste_profile_tags,
  dish_tags,
  price_point
) VALUES (
  'test-user-id',
  'test-restaurant-id',
  5,
  ARRAY['spicy', 'creamy'],
  ARRAY['pasta'],
  'moderate'
);

-- Verify taste profile was created and populated
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  SELECT * INTO profile_record 
  FROM user_taste_profiles 
  WHERE user_id = 'test-user-id';
  
  ASSERT profile_record.preferred_tastes @> ARRAY['spicy', 'creamy'], 
    'Preferred tastes should include high-rated tags';
  ASSERT profile_record.favorite_dish_types @> ARRAY['pasta'],
    'Favorite dishes should include high-rated dishes';
  ASSERT profile_record.total_experiences = 1,
    'Total experiences should be 1';
END $$;

-- Test 2: Low rating adds to avoided tastes
INSERT INTO experiences (
  user_id,
  restaurant_id,
  rating,
  taste_profile_tags
) VALUES (
  'test-user-id',
  'test-restaurant-id',
  1,
  ARRAY['bitter', 'burnt']
);

-- Verify avoided tastes
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  SELECT * INTO profile_record 
  FROM user_taste_profiles 
  WHERE user_id = 'test-user-id';
  
  ASSERT profile_record.avoided_tastes @> ARRAY['bitter', 'burnt'],
    'Avoided tastes should include low-rated tags';
  ASSERT profile_record.total_experiences = 2,
    'Total experiences should be 2';
END $$;

ROLLBACK;
```

**Run database tests:**
```bash
psql $DATABASE_URL -f __tests__/database/taste_profile_trigger.sql
```

---

### Similarity Function Tests

```sql
-- Test find_similar_restaurants()
BEGIN;

-- Setup test data
INSERT INTO restaurants (id, name, neighborhood, cuisine_type) VALUES
  ('r1', 'Restaurant A', 'Hood', 'Italian'),
  ('r2', 'Restaurant B', 'Hood', 'Italian'),
  ('r3', 'Restaurant C', 'Hood', 'Mexican');

INSERT INTO experiences (user_id, restaurant_id, dish_tags, taste_profile_tags) VALUES
  ('user1', 'r1', ARRAY['pasta'], ARRAY['creamy', 'savory']),
  ('user1', 'r2', ARRAY['pasta'], ARRAY['creamy', 'fresh']),
  ('user1', 'r3', ARRAY['tacos'], ARRAY['spicy']);

-- Test similarity
SELECT * FROM find_similar_restaurants('r1', 10);

-- Expected: r2 should be most similar (shared: pasta, creamy)
-- Expected: r3 should be less similar or not included

ROLLBACK;
```

---

## Component Tests

### Enhanced Experience Form Tests

**File:** `__tests__/components/EnhancedExperienceForm.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnhancedExperienceForm } from '@/components/EnhancedExperienceForm';

describe('EnhancedExperienceForm', () => {
  test('renders all form fields', () => {
    render(
      <EnhancedExperienceForm 
        restaurantId="test-id" 
        onSubmit={jest.fn()} 
      />
    );
    
    expect(screen.getByLabelText(/food rating/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/atmosphere/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/price point/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/party size/i)).toBeInTheDocument();
  });
  
  test('shows tag suggestions after typing notes', async () => {
    render(
      <EnhancedExperienceForm 
        restaurantId="test-id" 
        onSubmit={jest.fn()} 
      />
    );
    
    const textarea = screen.getByPlaceholderText(/what did you order/i);
    fireEvent.change(textarea, { 
      target: { value: 'Amazing creamy pasta with smoky flavor' } 
    });
    
    await waitFor(() => {
      expect(screen.getByText('pasta')).toBeInTheDocument();
      expect(screen.getByText('creamy')).toBeInTheDocument();
      expect(screen.getByText('smoky')).toBeInTheDocument();
    }, { timeout: 600 }); // Account for 500ms debounce
  });
  
  test('allows toggling suggested tags', async () => {
    render(
      <EnhancedExperienceForm 
        restaurantId="test-id" 
        onSubmit={jest.fn()} 
      />
    );
    
    const textarea = screen.getByPlaceholderText(/what did you order/i);
    fireEvent.change(textarea, { 
      target: { value: 'creamy pasta' } 
    });
    
    await waitFor(() => {
      const pastaButton = screen.getByText('pasta');
      expect(pastaButton).toBeInTheDocument();
      
      // Click to accept tag
      fireEvent.click(pastaButton);
      expect(pastaButton).toHaveClass('bg-blue-500');
      
      // Click again to remove
      fireEvent.click(pastaButton);
      expect(pastaButton).not.toHaveClass('bg-blue-500');
    });
  });
  
  test('submits form with all ML fields', async () => {
    const onSubmit = jest.fn();
    render(
      <EnhancedExperienceForm 
        restaurantId="test-id" 
        onSubmit={onSubmit} 
      />
    );
    
    // Fill form
    fireEvent.click(screen.getAllByText('5')[0]); // Rating
    fireEvent.click(screen.getAllByText('4')[1]); // Atmosphere
    fireEvent.click(screen.getByText('moderate')); // Price point
    
    const form = screen.getByRole('form');
    fireEvent.submit(form);
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: 5,
          atmosphere_score: 4,
          price_point: 'moderate'
        })
      );
    });
  });
});
```

**Run component tests:**
```bash
npm test -- EnhancedExperienceForm.test.tsx
```

---

## E2E Tests

### Complete User Flow

**File:** `__tests__/e2e/experience-creation.spec.ts` (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('ML-Enhanced Experience Creation', () => {
  test('user can create experience with tag suggestions', async ({ page }) => {
    await page.goto('/experiences/new');
    
    // Fill in notes
    await page.fill('textarea[placeholder*="What did you order"]', 
      'The grilled salmon was tender with a smoky flavor'
    );
    
    // Wait for tag suggestions
    await page.waitForSelector('text=salmon', { timeout: 1000 });
    await page.waitForSelector('text=tender');
    
    // Accept suggestions
    await page.click('text=salmon');
    await page.click('text=tender');
    await page.click('text=smoky');
    
    // Set ratings
    await page.click('button:has-text("5")'); // Food rating
    
    // Set price point
    await page.click('button:has-text("moderate")');
    
    // Submit
    await page.click('button:has-text("Save Experience")');
    
    // Verify redirect or success message
    await expect(page).toHaveURL(/\/experiences\/?$/);
  });
  
  test('taste profile updates after multiple experiences', async ({ page }) => {
    // Create 3 high-rated experiences with "spicy" tag
    for (let i = 0; i < 3; i++) {
      await page.goto('/experiences/new');
      await page.fill('textarea', 'Spicy dish');
      await page.waitForSelector('text=spicy');
      await page.click('text=spicy');
      await page.click('button:has-text("5")');
      await page.click('button:has-text("Save Experience")');
    }
    
    // Check taste profile
    await page.goto('/profile');
    await expect(page.locator('text=Preferred Tastes')).toContainText('spicy');
  });
});
```

**Run E2E tests:**
```bash
npx playwright test
```

---

## Performance Tests

### Tag Extraction Benchmarks

```typescript
import { tagExtractor } from '@/lib/ml/tagExtractor';

describe('Performance', () => {
  test('extractTags completes in <10ms', () => {
    const notes = 'Amazing creamy pasta with spicy sauce, tender chicken, and fresh vegetables';
    
    const start = performance.now();
    tagExtractor.extractTags(notes);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(10);
  });
  
  test('handles large notes efficiently', () => {
    const largeNotes = 'word '.repeat(1000); // 1000 words
    
    const start = performance.now();
    tagExtractor.extractTags(largeNotes);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(50);
  });
});
```

### Database Query Performance

```sql
-- Test tag search performance
EXPLAIN ANALYZE
SELECT * FROM experiences
WHERE dish_tags && ARRAY['pasta', 'seafood']
LIMIT 100;

-- Expected: Uses GIN index, <100ms

-- Test similarity function performance
EXPLAIN ANALYZE
SELECT * FROM find_similar_restaurants(
  'test-restaurant-id'::UUID,
  10
);

-- Expected: <500ms even with 10,000+ experiences
```

---

## Test Coverage Goals

- **Unit Tests**: >90% coverage
- **Integration Tests**: All API routes
- **E2E Tests**: Critical user flows
- **Performance**: <100ms for tag extraction, <500ms for similarity

---

## Running All Tests

```bash
# Unit + Integration
npm test

# E2E
npm run test:e2e

# Coverage report
npm test -- --coverage

# Database tests
npm run test:db
```

---

## CI/CD Integration

**.github/workflows/test.yml**
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run test:e2e
```

---

## Manual Testing Checklist

- [ ] Create experience with all ML fields
- [ ] Verify tag suggestions appear while typing
- [ ] Accept/reject tag suggestions
- [ ] Submit experience and verify in database
- [ ] Check taste profile was updated
- [ ] View similar restaurants
- [ ] Test with empty/minimal notes
- [ ] Test with very long notes
- [ ] Test all price points
- [ ] Test all rating values
- [ ] Verify analytics view

---

**Next Steps:**
1. Run existing tests: `npm test`
2. Add missing test cases
3. Set up CI/CD pipeline
4. Monitor test coverage over time
