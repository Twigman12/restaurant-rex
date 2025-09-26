import { GoogleGenerativeAI } from "@google/generative-ai"
import { createServerSupabaseClient } from "@/lib/supabase"
import { ReviewService } from "./review-service"
import type { VibeCheckResponse, Restaurant } from "@/lib/types"
import { Client } from "@googlemaps/google-maps-services-js"

export class VibeCheckService {
  private genAI: GoogleGenerativeAI
  private reviewService: ReviewService
  private supabase: ReturnType<typeof createServerSupabaseClient>

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
    this.reviewService = new ReviewService()
    this.supabase = createServerSupabaseClient()
  }

  async generateVibeCheck(restaurantId: string, forceRefresh = false): Promise<VibeCheckResponse> {
    // Check cache first
    if (!forceRefresh) {
      const cached = await this.getCachedVibeCheck(restaurantId)
      if (cached) {
        return { 
          ambiance: cached.ambiance,
          must_orders: cached.must_orders,
          watch_outs: cached.watch_outs,
          cached: true,
          expires_at: cached.expires_at
        }
      }
    }

    // Get restaurant details
    const restaurant = await this.getRestaurantDetails(restaurantId)
    if (!restaurant) {
      throw new Error('Restaurant not found')
    }

    // Get reviews
    const reviews = await this.reviewService.getComprehensiveReviews(restaurant.name, restaurant.address)
    
    if (reviews.length === 0) {
      // Fallback to basic restaurant info
      return this.generateFallbackVibeCheck(restaurant)
    }

    // Generate AI summary
    const vibeCheck = await this.generateAISummary(reviews, restaurant)
    
    // Cache the result
    await this.cacheVibeCheck(restaurantId, vibeCheck, reviews)

    return { 
      ...vibeCheck, 
      cached: false,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  }

  private async generateAISummary(reviews: string[], restaurant: Restaurant): Promise<Omit<VibeCheckResponse, 'cached' | 'expires_at'>> {
    const prompt = `
You are an expert food critic and data analyst. Your task is to synthesize the following user reviews for a restaurant into a concise, structured JSON object.

Restaurant: ${restaurant.name}
Cuisine: ${restaurant.cuisine_type}
Location: ${restaurant.address}

Analyze the reviews provided below and extract the following information:
1. "ambiance": A single sentence describing the restaurant's atmosphere, noise level, and ideal occasion.
2. "must_orders": An array of 2-3 specific dishes or drinks that are most frequently praised.
3. "watch_outs": An array of 1-2 common logistical challenges or criticisms (e.g., wait times, service, price-to-value).

RULES:
- Be objective and base your summary ONLY on the provided reviews.
- If you cannot find a clear consensus on a point, omit it.
- The output must be valid JSON.
- Keep responses concise and actionable.
- For must_orders, only include items that are mentioned multiple times or with high praise.
- For watch_outs, focus on practical concerns that would help diners prepare.

REVIEWS:
${reviews.join('\n\n')}
`

    try {
      const result = await this.generateWithGeminiFallback(prompt)
      const response = result.response
      const text = response.text()
      
      // Clean up the response text
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      
      const parsed = JSON.parse(cleanedText)
      return {
        ambiance: parsed.ambiance || "A welcoming dining experience with a comfortable atmosphere.",
        must_orders: parsed.must_orders || [],
        watch_outs: parsed.watch_outs || []
      }
    } catch (error) {
      console.error('Error parsing AI response:', error)
      return this.generateFallbackVibeCheck(restaurant)
    }
  }

  // Try multiple Gemini model identifiers to avoid regional/access 404s
  private async generateWithGeminiFallback(prompt: string) {
    const candidates = [
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b",
      "gemini-1.5-flash-001",
    ]
    let lastError: unknown = null
    for (const modelName of candidates) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent(prompt)
        return result
      } catch (err: any) {
        lastError = err
        const message: string = err?.message || ""
        const status: number | undefined = err?.status
        if (status === 404 || message.includes('404') || message.includes('was not found')) {
          continue
        }
        throw err
      }
    }
    throw lastError
  }

  async getCachedVibeCheck(restaurantId: string) {
    const { data } = await this.supabase
      .from('vibe_checks')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .gt('expires_at', new Date().toISOString())
      .single()

    return data
  }

  private async cacheVibeCheck(restaurantId: string, vibeCheck: any, rawReviews: string[]) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    
    await this.supabase
      .from('vibe_checks')
      .upsert({
        restaurant_id: restaurantId,
        ambiance: vibeCheck.ambiance,
        must_orders: vibeCheck.must_orders,
        watch_outs: vibeCheck.watch_outs,
        raw_reviews: rawReviews.join('\n\n---REVIEW_SEPARATOR---\n\n'),
        expires_at: expiresAt
      })
  }

  private async getRestaurantDetails(restaurantId: string): Promise<Restaurant | null> {
    // First try to find in local database
    const { data: localRestaurant } = await this.supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single()

    if (localRestaurant) {
      return localRestaurant
    }

    // If not found locally, try Google Places API (for Google Places IDs)
    try {
      const googleMapsClient = new Client({})
      const response = await googleMapsClient.placeDetails({
        params: {
          place_id: restaurantId,
          fields: ['name', 'formatted_address', 'rating', 'price_level', 'types', 'geometry'],
          key: process.env.GOOGLE_MAPS_API_KEY!
        }
      })

      const place = response.data.result
      if (!place) return null

      // Convert Google Places data to our Restaurant type
      const restaurant: Restaurant = {
        id: restaurantId,
        name: place.name || 'Unknown Restaurant',
        cuisine_type: place.types?.join(', ') || 'Unknown',
        address: place.formatted_address || 'Address not available',
        neighborhood: place.formatted_address?.split(',')[1]?.trim() || 'Unknown',
        borough: place.formatted_address?.split(',')[2]?.trim() || 'Unknown',
        price_range: place.price_level || null,
        dietary_options: null,
        description: null,
        image_url: null,
        popular_items: null,
        vibe: null,
        scenario_tags: null,
        latitude: place.geometry?.location.lat || null,
        longitude: place.geometry?.location.lng || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      return restaurant
    } catch (error) {
      console.error('Error fetching Google Places restaurant:', error)
      return null
    }
  }

  private generateFallbackVibeCheck(restaurant: Restaurant): Omit<VibeCheckResponse, 'cached' | 'expires_at'> {
    return {
      ambiance: `A ${restaurant.cuisine_type} restaurant in ${restaurant.neighborhood} with a welcoming atmosphere.`,
      must_orders: restaurant.popular_items || [],
      watch_outs: []
    }
  }

  // Method to clean up expired cache entries
  async cleanupExpiredCache(): Promise<void> {
    await this.supabase
      .from('vibe_checks')
      .delete()
      .lt('expires_at', new Date().toISOString())
  }
}
