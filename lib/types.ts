// =====================================================
// User Profile Types
// =====================================================

export type Profile = {
  id: string
  username: string | null
  full_name: string | null
  location: string | null
  dietary_preferences: string[] | null
  created_at: string
  updated_at: string
}

// =====================================================
// Restaurant Types
// =====================================================

export type Restaurant = {
  id: string
  name: string
  cuisine_type: string
  address: string
  neighborhood: string
  borough: string | null
  price_range: number | null
  dietary_options: string[] | null
  description: string | null
  image_url: string | null
  popular_items: string[] | null
  vibe: string | null
  scenario_tags: string[] | null
  latitude: number | null
  longitude: number | null
  opening_hours: string[] | null
  rating: number | null
  user_ratings_total: number | null
  matching_score: number | null
  created_at: string
  updated_at: string
}

export type Scenario = {
  id: string
  name: string
  description: string
  created_at: string
}

// =====================================================
// ML Enhancement Types
// =====================================================

export type PricePoint = 'budget' | 'moderate' | 'splurge'

export type Experience = {
  // Core fields
  id: string
  user_id: string
  restaurant_id: string
  scenario_id: string | null
  rating: number | null
  notes: string | null
  visited_at: string | null
  created_at: string
  updated_at: string

  // ML-enhanced fields (Phase 1) - Optional for backward compatibility
  dish_tags?: string[]
  taste_profile_tags?: string[]
  atmosphere_score?: number | null
  price_point?: PricePoint | null
  party_size?: number
  wait_time_minutes?: number | null
  return_likelihood?: number | null
  photo_urls?: string[]
}

export interface TagSuggestion {
  tag: string
  confidence: number // 0-1
  category: 'dish' | 'taste_profile' | 'quality'
}

export interface MLFeatures {
  id: string
  experience_id: string
  extracted_features: {
    sentiment_score?: number
    key_phrases?: string[]
    cuisine_indicators?: string[]
    quality_indicators?: string[]
  }
  confidence_scores: {
    [key: string]: number
  }
  created_at: string
}

export interface UserTasteProfile {
  id: string
  user_id: string
  preferred_tastes: string[]
  avoided_tastes: string[]
  preferred_price_points: string[]
  favorite_dish_types: string[]
  avg_rating: number | null
  profile_confidence: number // 0-1
  total_experiences: number
  created_at: string
  updated_at: string
}

export type Recommendation = {
  id: string
  user_id: string
  restaurant_id: string
  scenario_id: string | null
  reason: string
  created_at: string
}

export type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

export type RecommendationRequest = {
  dietary: string[]
  location: string
  scenario: string
}

export type RecommendationResponse = {
  restaurants: (Restaurant & { reason: string })[]
}

export type VibeCheck = {
  id: string
  restaurant_id: string
  ambiance: string
  must_orders: string[]
  watch_outs: string[]
  raw_reviews?: string
  created_at: string
  expires_at: string
}

export type VibeCheckRequest = {
  restaurant_id: string
  force_refresh?: boolean
}

export type VibeCheckResponse = {
  ambiance: string
  must_orders: string[]
  watch_outs: string[]
  cached: boolean
  expires_at?: string
}
