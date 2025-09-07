import { Client } from "@googlemaps/google-maps-services-js"

export class ReviewService {
  private googleMapsClient: Client

  constructor() {
    this.googleMapsClient = new Client({})
  }

  async getRestaurantReviews(placeId: string): Promise<string[]> {
    try {
      // Get place details including reviews
      const response = await this.googleMapsClient.placeDetails({
        params: {
          place_id: placeId,
          fields: ['reviews', 'name', 'formatted_address'],
          key: process.env.GOOGLE_MAPS_API_KEY!
        }
      })

      const reviews = response.data.result.reviews || []
      return reviews.map(review => review.text || '').filter(text => text.length > 0)
    } catch (error) {
      console.error('Error fetching reviews from Google Places:', error)
      return []
    }
  }

  // Method to find place ID from restaurant name and address
  async findPlaceId(restaurantName: string, address: string): Promise<string | null> {
    try {
      const response = await this.googleMapsClient.textSearch({
        params: {
          query: `${restaurantName} ${address}`,
          key: process.env.GOOGLE_MAPS_API_KEY!
        }
      })

      const results = response.data.results
      if (results && results.length > 0) {
        return results[0].place_id
      }
      return null
    } catch (error) {
      console.error('Error finding place ID:', error)
      return null
    }
  }

  // Fallback method using web scraping for more reviews (future enhancement)
  async getAdditionalReviews(restaurantName: string, address: string): Promise<string[]> {
    // This could be implemented later using services like SerpApi or Apify
    // for more comprehensive review data
    console.log(`Would fetch additional reviews for ${restaurantName} at ${address}`)
    return []
  }

  // Get comprehensive review data for a restaurant
  async getComprehensiveReviews(restaurantName: string, address: string): Promise<string[]> {
    // First try to find the place ID
    const placeId = await this.findPlaceId(restaurantName, address)
    
    if (!placeId) {
      console.log(`Could not find place ID for ${restaurantName}`)
      return []
    }

    // Get reviews from Google Places
    const googleReviews = await this.getRestaurantReviews(placeId)
    
    // Get additional reviews (future enhancement)
    const additionalReviews = await this.getAdditionalReviews(restaurantName, address)
    
    // Combine and deduplicate reviews
    const allReviews = [...googleReviews, ...additionalReviews]
    const uniqueReviews = Array.from(new Set(allReviews))
    
    return uniqueReviews
  }
}
