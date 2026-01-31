# Phase 5 Implementation Plan: Enhanced Form Component

## Goal
Integrate ML-powered tag suggestions directly into the existing experiences page form, enhancing it with real-time analysis and new ML fields.

## Approach
**Instead of creating a separate component**, we'll enhance the existing `app/experiences/page.tsx` form inline. This is simpler and avoids migration headaches.

## Changes Required

### 1. Import the Hook
```typescript
import { useTagSuggestions } from '@/hooks/useTagSuggestions'
```

### 2. Add Hook Usage
```typescript
const { suggestions, isAnalyzing } = useTagSuggestions(notes)
```

### 3. Add New Form State
```typescript
const [atmosphereScore, setAtmosphereScore] = useState<number | null>(null)
const [pricePoint, setPricePoint] = useState<'budget' | 'moderate' | 'splurge' | null>(null)
const [partySize, setPartySize] = useState<number>(2)
const [waitTime, setWaitTime] = useState<number | null>(null)
const [returnLikelihood, setReturnLikelihood] = useState<number | null>(null)
const [selectedDishTags, setSelectedDishTags] = useState<string[]>([])
const [selectedTasteTags, setSelectedTasteTags] = useState<string[]>([])
```

### 4. Add UI Components (After Notes Textarea)

#### Tag Suggestions Section
```tsx
{/* ML Tag Suggestions */}
{isAnalyzing && (
  <div className="text-sm text-muted-foreground">
    Analyzing your notes...
  </div>
)}

{suggestions.dish_tags.length > 0 && (
  <div>
    <Label>Suggested Dish Tags</Label>
    <div className="flex flex-wrap gap-2 mt-2">
      {suggestions.dish_tags.map(tag => (
        <Badge
          key={tag}
          variant={selectedDishTags.includes(tag) ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => {
            setSelectedDishTags(prev =>
              prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
            )
          }}
        >
          {tag}
        </Badge>
      ))}
    </div>
  </div>
)}

{/* Same for taste tags */}
```

#### Atmosphere Rating
```tsx
<div className="space-y-2">
  <Label>Atmosphere Rating</Label>
  <RadioGroup
    value={atmosphereScore?.toString()}
    onValueChange={(val) => setAtmosphereScore(parseInt(val))}
  >
    {[1, 2, 3, 4, 5].map(num => (
      <div key={num} className="flex items-center space-x-2">
        <RadioGroupItem value={num.toString()} />
        <Label>{num} {'⭐'.repeat(num)}</Label>
      </div>
    ))}
  </RadioGroup>
</div>
```

#### Price Point Selector
```tsx
<div className="space-y-2">
  <Label>Price Point</Label>
  <div className="flex gap-2">
    {['budget', 'moderate', 'splurge'].map(price => (
      <Button
        key={price}
        type="button"
        variant={pricePoint === price ? "default" : "outline"}
        onClick={() => setPricePoint(price as any)}
      >
        {price === 'budget' && '$ Budget'}
        {price === 'moderate' && '$$ Moderate'}
        {price === 'splurge' && '$$$ Splurge'}
      </Button>
    ))}
  </div>
</div>
```

### 5. Update Form Submission
Add ML fields to the experience insert:
```typescript
dish_tags: selectedDishTags,
taste_profile_tags: selectedTasteTags,
atmosphere_score: atmosphereScore,
price_point: pricePoint,
party_size: partySize,
wait_time_minutes: waitTime,
return_likelihood: returnLikelihood,
```

## Verification Steps
1. ✅ Type "creamy pasta" → see dish and taste tags appear
2. ✅ Click tag pills → they highlight/toggle
3. ✅ All ratings work (food + atmosphere)
4. ✅ Price point buttons toggle
5. ✅ Form submits with ML fields

## Notes
- Keep it simple - inline integration
- Reuse existing form structure
- Use existing UI components (Badge, RadioGroup, Button)
- Tag suggestions appear in real-time as user types
