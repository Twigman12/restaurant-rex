import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { VibeCheck } from '@/components/vibe-check'
import { RestaurantCard } from '@/components/restaurant-card'
import { MapPin, Clock, DollarSign, ArrowLeft, Star, Target, Users } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Client } from '@googlemaps/google-maps-services-js'
import type { Restaurant } from '@/lib/types'

interface RestaurantPageProps {
  params: { id: string }
}

// Function to fetch restaurant data from Google Places API
async function fetchGooglePlacesRestaurant(placeId: string): Promise<Restaurant | null> {
  try {
    const googleMapsClient = new Client({})
    const response = await googleMapsClient.placeDetails({
      params: {
        place_id: placeId,
        fields: [
          'name', 
          'formatted_address', 
          'rating', 
          'user_ratings_total',
          'price_level', 
          'types', 
          'geometry',
          'opening_hours',
          'editorial_summary',
          'reviews'
        ],
        key: process.env.GOOGLE_MAPS_API_KEY!
      }
    })

    const place = response.data.result
    if (!place) return null

    // Extract popular menu items from reviews (first 3 reviews)
    const popularItems: string[] = []
    if (place.reviews && place.reviews.length > 0) {
      const reviewTexts = place.reviews.slice(0, 3).map(review => review.text || '').join(' ')
      // Simple extraction of food items mentioned in reviews
      const foodKeywords = ['pizza', 'burger', 'pasta', 'salad', 'sushi', 'tacos', 'sandwich', 'steak', 'chicken', 'fish', 'soup', 'appetizer', 'dessert', 'cocktail', 'wine', 'beer']
      foodKeywords.forEach(keyword => {
        if (reviewTexts.toLowerCase().includes(keyword) && !popularItems.includes(keyword)) {
          popularItems.push(keyword.charAt(0).toUpperCase() + keyword.slice(1))
        }
      })
    }

    // Format opening hours
    const openingHours: string[] = []
    if (place.opening_hours?.weekday_text) {
      openingHours.push(...place.opening_hours.weekday_text)
    }

    // Calculate matching score based on rating and review count
    const matchingScore = place.rating ? Math.min(95, Math.round(place.rating * 18 + (place.user_ratings_total || 0) / 100)) : 75

    // Convert Google Places data to our Restaurant type
    const restaurant: Restaurant = {
      id: placeId,
      name: place.name || 'Unknown Restaurant',
      cuisine_type: place.types?.join(', ') || 'Unknown',
      address: place.formatted_address || 'Address not available',
      neighborhood: place.formatted_address?.split(',')[1]?.trim() || 'Unknown',
      borough: place.formatted_address?.split(',')[2]?.trim() || 'Unknown',
      price_range: place.price_level || null,
      dietary_options: null,
      description: place.editorial_summary?.overview || null,
      image_url: null,
      popular_items: popularItems.length > 0 ? popularItems : null,
      vibe: null,
      scenario_tags: null,
      latitude: place.geometry?.location.lat || null,
      longitude: place.geometry?.location.lng || null,
      opening_hours: openingHours.length > 0 ? openingHours : null,
      rating: place.rating || null,
      user_ratings_total: place.user_ratings_total || null,
      matching_score: matchingScore,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    return restaurant
  } catch (error) {
    console.error('Error fetching Google Places restaurant:', error)
    return null
  }
}

export default async function RestaurantPage({ params }: RestaurantPageProps) {
  const supabase = createServerSupabaseClient()
  
  // Await params before accessing its properties (Next.js 15 requirement)
  const { id } = await params
  
  // First try to find the restaurant in our local database
  const { data: localRestaurant, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .single()

  let restaurant: Restaurant | null = null

  if (localRestaurant && !error) {
    // Found in local database
    restaurant = localRestaurant
  } else {
    // Not found locally, try Google Places API (for Google Places IDs)
    restaurant = await fetchGooglePlacesRestaurant(id)
  }

  if (!restaurant) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <Button variant="ghost" asChild className="mb-3 sm:mb-4">
              <Link href="/" className="flex items-center gap-2 text-sm sm:text-base">
                <ArrowLeft className="h-4 w-4" />
                Back to Restaurants
              </Link>
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{restaurant.name}</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">{restaurant.cuisine_type} • {restaurant.neighborhood}</p>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
              <TabsTrigger value="overview" className="text-sm sm:text-base">Overview</TabsTrigger>
              <TabsTrigger value="vibe-check" className="text-sm sm:text-base">✨ AI Vibe Check</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6 sm:mt-8">
              <div className="flex flex-col gap-8 lg:gap-12">
                {/* Restaurant Info */}
                <div className="space-y-6 sm:space-y-8">
                  <RestaurantCard restaurant={restaurant} showActions={false} />
                  
                  <div className="space-y-6">
                    <h2 className="text-lg sm:text-xl font-semibold">Restaurant Details</h2>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-sm leading-relaxed break-words">{restaurant.address}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm">
                          {Array.from({ length: restaurant.price_range || 0 }).map((_, i) => (
                            <DollarSign key={i} className="h-4 w-4 text-rex-red inline" />
                          ))}
                          {Array.from({ length: 4 - (restaurant.price_range || 0) }).map((_, i) => (
                            <DollarSign key={i} className="h-4 w-4 text-muted-foreground/50 inline" />
                          ))}
                        </span>
                      </div>
                      
                      {/* Rating and Review Count */}
                      {restaurant.rating && (
                        <div className="flex items-center gap-3">
                          <Star className="h-5 w-5 text-yellow-500 fill-current flex-shrink-0" />
                          <span className="text-sm">
                            {restaurant.rating.toFixed(1)} 
                            {restaurant.user_ratings_total && (
                              <span className="text-muted-foreground ml-1">
                                ({restaurant.user_ratings_total.toLocaleString()} reviews)
                              </span>
                            )}
                          </span>
                        </div>
                      )}

                      {/* Matching Score */}
                      {restaurant.matching_score && (
                        <div className="flex items-center gap-3">
                          <Target className="h-5 w-5 text-rex-red flex-shrink-0" />
                          <span className="text-sm">
                            <span className="font-medium">{restaurant.matching_score}%</span> match for your preferences
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {restaurant.description && (
                      <div className="pt-6">
                        <h3 className="font-medium mb-3">About</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{restaurant.description}</p>
                      </div>
                    )}

                    {restaurant.opening_hours && restaurant.opening_hours.length > 0 && (
                      <div className="pt-6">
                        <h3 className="font-medium mb-3">Hours</h3>
                        <div className="space-y-1">
                          {restaurant.opening_hours.map((hours, index) => (
                            <div key={index} className="flex items-center gap-3 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground">{hours}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {restaurant.popular_items && restaurant.popular_items.length > 0 && (
                      <div className="pt-6">
                        <h3 className="font-medium mb-3">Popular Items</h3>
                        <div className="flex flex-wrap gap-2">
                          {restaurant.popular_items.map((item, index) => (
                            <span key={index} className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {restaurant.dietary_options && restaurant.dietary_options.length > 0 && (
                      <div className="pt-6">
                        <h3 className="font-medium mb-3">Dietary Options</h3>
                        <div className="flex flex-wrap gap-2">
                          {restaurant.dietary_options.map((option, index) => (
                            <span key={index} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                              {option}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-6">
                  <h2 className="text-lg sm:text-xl font-semibold">Actions</h2>
                  <div className="space-y-4">
                    <Button asChild className="w-full h-12 sm:h-10">
                      <Link href={`/experiences?restaurant=${restaurant.id}`}>
                        Log Your Experience
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="vibe-check" className="mt-4 sm:mt-6">
              <div className="max-w-2xl mx-auto">
                <VibeCheck 
                  restaurantId={restaurant.id} 
                  restaurantName={restaurant.name} 
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
