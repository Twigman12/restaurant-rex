# API Reference

## Overview

Complete API reference for ML-enhanced Restaurant Rex features.

---

## TypeScript Types

### Experience

```typescript
export type PricePoint = 'budget' | 'moderate' | 'splurge';

export interface Experience {
  // Core fields
  id: string;
  user_id: string;
  restaurant_id: string;
  rating: number;                    // 1-5
  notes?: string;
  visited_at: string;
  scenario_id?: string;
  created_at: string;
  updated_at: string;
  
  // ML-enhanced fields
  dish_tags: string[];               // e.g., ["pasta", "seafood"]
  taste_profile_tags: string[];      // e.g., ["spicy", "creamy"]
  atmosphere_score?: number;         // 1-5
  price_point?: PricePoint;          // "budget" | "moderate" | "splurge"
  party_size: number;                // Default: 1
  wait_time_minutes?: number;
  return_likelihood?: number;        // 1-5
  photo_urls: string[];              // Array of image URLs
}
```

### Tag Suggestion

```typescript
export interface TagSuggestion {
  tag: string;
  confidence: number;                // 0-1
  category: 'dish' | 'taste_profile' | 'quality';
}
```

### ML Features

```typescript
export interface MLFeatures {
  id: string;
  experience_id: string;
  extracted_features: {
    sentiment_score: number;
    key_phrases: string[];
    cuisine_indicators: string[];
    quality_indicators: string[];
  };
  confidence_scores: {
    [key: string]: number;
  };
  created_at: string;
}
```

### User Taste Profile

```typescript
export interface UserTasteProfile {
  id: string;
  user_id: string;
  preferred_tastes: string[];        // From high-rated experiences
  avoided_tastes: string[];          // From low-rated experiences
  preferred_price_points: string[];
  favorite_dish_types: string[];
  avg_rating: number;
  profile_confidence: number;        // 0-1 (reaches 1 at 20+ experiences)
  total_experiences: number;
  created_at: string;
  updated_at: string;
}
```

---

## REST API Endpoints

### POST /api/experiences

Create a new experience with ML-enhanced fields.

**Request Body:**
```typescript
{
  restaurant_id: string;
  rating: number;                    // Required: 1-5
  notes?: string;
  atmosphere_score?: number;         // 1-5
  price_point?: PricePoint;
  party_size?: number;
  wait_time_minutes?: number;
  return_likelihood?: number;        // 1-5
  dish_tags?: string[];
  taste_profile_tags?: string[];
  photo_urls?: string[];
}
```

**Response:**
```typescript
{
  id: string;
  user_id: string;
  // ... all Experience fields
}
```

**Example:**
```typescript
const response = await fetch('/api/experiences', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
    rating: 5,
    atmosphere_score: 4,
    price_point: 'moderate',
    party_size: 2,
    wait_time_minutes: 15,
    return_likelihood: 5,
    notes: 'Amazing grilled salmon, very tender and smoky',
    dish_tags: ['seafood', 'grilled'],
    taste_profile_tags: ['tender', 'smoky']
  })
});
```

---

### GET /api/experiences/user

Get all experiences for the authenticated user.

**Query Parameters:**
- `limit?: number` - Max results (default: 50)
- `offset?: number` - Pagination offset
- `sort?: 'visited_at' | 'rating' | 'created_at'`
- `order?: 'asc' | 'desc'`

**Response:**
```typescript
{
  experiences: Experience[];
  total: number;
}
```

---

### GET /api/taste-profile

Get the authenticated user's taste profile.

**Response:**
```typescript
{
  profile: UserTasteProfile;
}
```

**Example:**
```typescript
const response = await fetch('/api/taste-profile');
const { profile } = await response.json();

console.log(profile.preferred_tastes);  // ["spicy", "creamy", "tender"]
console.log(profile.profile_confidence); // 0.85 (85% confidence)
```

---

### POST /api/tag-suggestions

Get tag suggestions for notes (alternative to client-side extraction).

**Request Body:**
```typescript
{
  notes: string;
  limit?: number;  // Default: 5
}
```

**Response:**
```typescript
{
  dish_tags: string[];
  taste_profile_tags: string[];
  all_suggestions: TagSuggestion[];
}
```

**Example:**
```typescript
const response = await fetch('/api/tag-suggestions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    notes: 'The pasta was incredibly creamy with a nice garlicky flavor'
  })
});

const { dish_tags, taste_profile_tags } = await response.json();
// dish_tags: ["pasta"]
// taste_profile_tags: ["creamy", "garlicky"]
```

---

### GET /api/restaurants/:id/similar

Find similar restaurants based on tag overlap.

**Query Parameters:**
- `limit?: number` - Max results (default: 10)

**Response:**
```typescript
{
  similar: Array<{
    restaurant_id: string;
    restaurant_name: string;
    similarity_score: number;        // 0-1
    shared_tags: string[];
  }>;
}
```

**Example:**
```typescript
const response = await fetch('/api/restaurants/abc123/similar?limit=5');
const { similar } = await response.json();

similar.forEach(r => {
  console.log(`${r.restaurant_name} (${r.similarity_score * 100}% similar)`);
  console.log(`Shared tags: ${r.shared_tags.join(', ')}`);
});
```

---

## Database Functions

### find_similar_restaurants()

PostgreSQL function to find similar restaurants.

**Signature:**
```sql
find_similar_restaurants(
  target_restaurant_id UUID,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  restaurant_id UUID,
  restaurant_name TEXT,
  similarity_score DECIMAL(3,2),
  shared_tags TEXT[]
)
```

**Usage:**
```sql
SELECT * FROM find_similar_restaurants(
  '123e4567-e89b-12d3-a456-426614174000'::UUID,
  5
);
```

---

### update_user_taste_profile()

Trigger function that auto-updates taste profiles.

**Triggered by:**
- INSERT on `experiences`
- UPDATE on `experiences` (rating, taste_profile_tags, dish_tags, price_point)

**Logic:**
- Rating 4-5 → adds tags to `preferred_tastes` and `favorite_dish_types`
- Rating 1-2 → adds tags to `avoided_tastes`
- Recalculates `avg_rating` and `profile_confidence`

---

## React Hooks

### useTagSuggestions

Real-time tag extraction hook with debouncing.

**Usage:**
```typescript
import { useTagSuggestions } from '@/hooks/useTagSuggestions';

function MyComponent() {
  const [notes, setNotes] = useState('');
  const { suggestions, isAnalyzing } = useTagSuggestions(notes);
  
  return (
    <div>
      <textarea 
        value={notes} 
        onChange={e => setNotes(e.target.value)} 
      />
      
      {isAnalyzing && <p>✨ Analyzing...</p>}
      
      <div>
        Suggested dishes: {suggestions.dish_tags.join(', ')}
      </div>
      <div>
        Suggested flavors: {suggestions.taste_profile_tags.join(', ')}
      </div>
    </div>
  );
}
```

**Parameters:**
- `notes: string` - User's notes to analyze

**Returns:**
```typescript
{
  suggestions: {
    dish_tags: string[];
    taste_profile_tags: string[];
  };
  isAnalyzing: boolean;
}
```

**Debounce:** 500ms

---

## Tag Extractor Service

### tagExtractor.extractTags()

Client-side tag extraction.

**Usage:**
```typescript
import { tagExtractor } from '@/lib/ml/tagExtractor';

const suggestions = tagExtractor.extractTags(
  'The steak was tender and smoky'
);

suggestions.forEach(s => {
  console.log(`${s.tag} (${s.confidence * 100}% confident, ${s.category})`);
});
// Output:
// tender (30% confident, taste_profile)
// smoky (30% confident, taste_profile)
// meat (40% confident, dish)
```

**Parameters:**
- `notes: string` - Text to analyze

**Returns:** `TagSuggestion[]`

---

### tagExtractor.getTopSuggestions()

Get filtered, top-N suggestions.

**Usage:**
```typescript
const { dish_tags, taste_profile_tags } = tagExtractor.getTopSuggestions(
  'Amazing seafood pasta, very creamy',
  5  // limit
);

console.log(dish_tags);          // ["pasta", "seafood"]
console.log(taste_profile_tags); // ["creamy"]
```

**Parameters:**
- `notes: string`
- `limit?: number` - Max tags per category (default: 5)

**Returns:**
```typescript
{
  dish_tags: string[];
  taste_profile_tags: string[];
}
```

**Filters:** Only includes tags with confidence > 0.3

---

## Error Responses

### Standard Error Format

```typescript
{
  error: string;
  code?: string;
  details?: any;
}
```

### Common Error Codes

- `401 Unauthorized` - User not authenticated
- `400 Bad Request` - Invalid input (e.g., rating not 1-5)
- `404 Not Found` - Resource doesn't exist
- `500 Internal Server Error` - Database or server error

---

## Rate Limits

- Tag extraction: Client-side (no limits)
- API endpoints: 100 requests/minute per user
- Database triggers: Automatic (no user control)

---

## Changelog

### v2.0 (Current)
- Added ML-enhanced experience fields
- Added tag extraction service
- Added user taste profiles
- Added restaurant similarity matching

### v1.0
- Basic experience logging
- Simple rating system

---

**See also:**
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md)
- [Tag Dictionaries](./TAG_DICTIONARIES.md)
- [Testing Guide](./TESTING_GUIDE.md)
