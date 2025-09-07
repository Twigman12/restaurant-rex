export type Profile = {
  id: string
  username: string | null
  full_name: string | null
  location: string | null
  dietary_preferences: string[] | null
  created_at: string
  updated_at: string
}

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

export type Experience = {
  id: string
  user_id: string
  restaurant_id: string
  scenario_id: string | null
  rating: number | null
  notes: string | null
  visited_at: string | null
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
