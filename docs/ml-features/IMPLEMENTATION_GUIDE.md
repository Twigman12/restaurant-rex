# Implementation Guide

## Overview

Step-by-step guide to implement ML-enhanced features in Restaurant Rex.

---

## Phase 1: Database Setup

### 1.1 Run Migration
Follow the complete [Database Migration Guide](./DATABASE_MIGRATION.md).

**Quick steps:**
1. Open Supabase SQL Editor
2. Copy and paste migration SQL
3. Run and verify

---

## Phase 2: TypeScript Types

### 2.1 Update Experience Type

**File:** `types/experience.ts` (create if doesn't exist)

```typescript
export type PricePoint = 'budget' | 'moderate' | 'splurge';

export interface Experience {
  // Existing fields
  id: string;
  user_id: string;
  restaurant_id: string;
  rating: number;
  notes?: string;
  visited_at: string;
  scenario_id?: string;
  created_at: string;
  updated_at: string;
  
  // New ML-enhanced fields
  dish_tags: string[];
  atmosphere_score?: number;
  price_point?: PricePoint;
  party_size: number;
  wait_time_minutes?: number;
  return_likelihood?: number;
  photo_urls: string[];
  taste_profile_tags: string[];
}

export interface MLFeatures {
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
}

export interface UserTasteProfile {
  id: string;
  user_id: string;
  preferred_tastes: string[];
  avoided_tastes: string[];
  preferred_price_points: string[];
  favorite_dish_types: string[];
  avg_rating: number;
  profile_confidence: number;
  total_experiences: number;
}
```

---

## Phase 3: Tag Extraction Service

### 3.1 Create Tag Extractor

**File:** `lib/ml/tagExtractor.ts`

```typescript
interface TagSuggestion {
  tag: string;
  confidence: number;
  category: 'dish' | 'taste_profile' | 'quality';
}

export class TagExtractor {
  private readonly TASTE_DESCRIPTORS = {
    spicy: ['spicy', 'hot', 'heat', 'chile', 'jalapeño'],
    sweet: ['sweet', 'sugary', 'dessert', 'candy', 'honey'],
    savory: ['savory', 'umami', 'rich', 'meaty', 'brothy'],
    fresh: ['fresh', 'crisp', 'light', 'clean', 'bright'],
    creamy: ['creamy', 'smooth', 'rich', 'buttery'],
    tender: ['tender', 'soft', 'melt', 'juicy'],
    smoky: ['smoky', 'grilled', 'charred', 'barbecue']
  };

  private readonly DISH_TYPES = {
    appetizer: ['appetizer', 'starter', 'small plate'],
    entree: ['entree', 'main', 'dinner'],
    dessert: ['dessert', 'sweet', 'cake', 'ice cream'],
    pasta: ['pasta', 'noodle', 'spaghetti'],
    seafood: ['fish', 'seafood', 'shrimp', 'salmon'],
    meat: ['steak', 'chicken', 'pork', 'beef']
  };

  extractTags(notes: string): TagSuggestion[] {
    if (!notes?.trim()) return [];
    
    const normalized = notes.toLowerCase();
    const suggestions: TagSuggestion[] = [];
    
    // Extract taste profiles
    Object.entries(this.TASTE_DESCRIPTORS).forEach(([tag, keywords]) => {
      const matches = keywords.filter(kw => normalized.includes(kw));
      if (matches.length > 0) {
        suggestions.push({
          tag,
          confidence: Math.min(matches.length * 0.3, 1),
          category: 'taste_profile'
        });
      }
    });
    
    // Extract dish types
    Object.entries(this.DISH_TYPES).forEach(([tag, keywords]) => {
      const matches = keywords.filter(kw => normalized.includes(kw));
      if (matches.length > 0) {
        suggestions.push({
          tag,
          confidence: Math.min(matches.length * 0.4, 1),
          category: 'dish'
        });
      }
    });
    
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }
  
  getTopSuggestions(notes: string, limit: number = 5) {
    const all = this.extractTags(notes);
    
    return {
      dish_tags: all
        .filter(s => s.category === 'dish' && s.confidence > 0.3)
        .slice(0, limit)
        .map(s => s.tag),
      taste_profile_tags: all
        .filter(s => s.category === 'taste_profile' && s.confidence > 0.3)
        .slice(0, limit)
        .map(s => s.tag)
    };
  }
}

export const tagExtractor = new TagExtractor();
```

**See full tag dictionaries in:** [TAG_DICTIONARIES.md](./TAG_DICTIONARIES.md)

---

## Phase 4: React Hooks

### 4.1 Tag Suggestions Hook

**File:** `hooks/useTagSuggestions.ts`

```typescript
import { useState, useEffect } from 'react';
import { tagExtractor } from '@/lib/ml/tagExtractor';

export function useTagSuggestions(notes: string) {
  const [suggestions, setSuggestions] = useState<{
    dish_tags: string[];
    taste_profile_tags: string[];
  }>({ dish_tags: [], taste_profile_tags: [] });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  useEffect(() => {
    if (!notes || notes.length < 10) {
      setSuggestions({ dish_tags: [], taste_profile_tags: [] });
      return;
    }
    
    setIsAnalyzing(true);
    
    const timer = setTimeout(() => {
      const extracted = tagExtractor.getTopSuggestions(notes);
      setSuggestions(extracted);
      setIsAnalyzing(false);
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timer);
  }, [notes]);
  
  return { suggestions, isAnalyzing };
}
```

---

## Phase 5: Enhanced Experience Form

### 5.1 Create Form Component

**File:** `components/EnhancedExperienceForm.tsx`

**Key Features:**
- Dual rating sliders (food + atmosphere)
- Price point buttons
- Party size & wait time inputs
- Return likelihood scale
- Real-time tag suggestions
- Visual tag management

**See complete component code in user's original documentation.**

**Important patterns:**
```typescript
// State management
const [formData, setFormData] = useState({...});
const { suggestions, isAnalyzing } = useTagSuggestions(formData.notes);

// Tag toggle handler
const handleTagToggle = (tag: string, field: 'dish_tags' | 'taste_profile_tags') => {
  setFormData(prev => ({
    ...prev,
    [field]: prev[field].includes(tag)
      ? prev[field].filter(t => t !== tag)
      : [...prev[field], tag]
  }));
};
```

---

## Phase 6: API Integration

### 6.1 Update Experience API Route

**File:** `app/api/experiences/route.ts`

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { tagExtractor } from '@/lib/ml/tagExtractor';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  
  const body = await request.json();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Insert experience with new fields
  const { data: experience, error } = await supabase
    .from('experiences')
    .insert({
      user_id: user.id,
      restaurant_id: body.restaurant_id,
      rating: body.rating,
      notes: body.notes,
      atmosphere_score: body.atmosphere_score,
      price_point: body.price_point,
      party_size: body.party_size,
      wait_time_minutes: body.wait_time_minutes,
      return_likelihood: body.return_likelihood,
      dish_tags: body.dish_tags || [],
      taste_profile_tags: body.taste_profile_tags || [],
      photo_urls: body.photo_urls || [],
      visited_at: new Date().toISOString()
    })
    .select()
    .single();
  
  // Store ML features for analytics
  if (body.notes) {
    const suggestions = tagExtractor.extractTags(body.notes);
    
    await supabase.from('experience_ml_features').insert({
      experience_id: experience.id,
      extracted_features: {
        suggestions: suggestions.map(s => ({ 
          tag: s.tag, 
          confidence: s.confidence 
        }))
      },
      confidence_scores: suggestions.reduce((acc, s) => ({
        ...acc,
        [s.tag]: s.confidence
      }), {})
    });
  }
  
  return NextResponse.json(experience);
}
```

---

## Phase 7: Integration Points

### 7.1 Add to Existing Experience Page

**File:** `app/experiences/[id]/page.tsx`

```typescript
import { EnhancedExperienceForm } from '@/components/EnhancedExperienceForm';

export default function ExperiencePage() {
  const handleSubmit = async (experience: Partial<Experience>) => {
    const response = await fetch('/api/experiences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(experience)
    });
    
    if (response.ok) {
      // Handle success (redirect, toast, etc.)
    }
  };
  
  return (
    <EnhancedExperienceForm
      restaurantId={params.id}
      onSubmit={handleSubmit}
    />
  );
}
```

---

## Phase 8: Testing

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for:
- Unit tests for tag extraction
- Integration tests for API routes
- E2E tests for form submission
- Performance benchmarks

---

## Common Issues & Solutions

### Issue 1: Tags not appearing
**Solution:** Check that notes are at least 10 characters long (debounce threshold)

### Issue 2: Trigger not firing
**Solution:** Verify trigger exists:
```sql
SELECT * FROM information_schema.triggers 
WHERE event_object_table = 'experiences';
```

### Issue 3: Slow tag extraction
**Solution:** Tag dictionary is keyword-based, should be instant. Check browser console for errors.

---

## Next Steps

1. Deploy database migration
2. Deploy backend changes
3. Deploy frontend changes
4. Monitor user adoption via analytics
5. Iterate on tag dictionaries based on feedback

---

**Estimated Implementation Time:** 2-3 weeks  
**Team Size:** 1-2 developers
