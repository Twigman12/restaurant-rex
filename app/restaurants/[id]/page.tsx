import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { VibeCheck } from '@/components/vibe-check'
import { RestaurantCard } from '@/components/restaurant-card'
import { MapPin, Clock, DollarSign, ArrowLeft } from 'lucide-react'
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
        fields: ['name', 'formatted_address', 'rating', 'price_level', 'types', 'geometry'],
        key: process.env.GOOGLE_MAPS_API_KEY!
      }
    })

    const place = response.data.result
    if (!place) return null

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
              <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-12">
                {/* Restaurant Info */}
                <div className="space-y-6 sm:space-y-8 order-2 lg:order-1">
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
                    </div>
                    
                    {restaurant.description && (
                      <div className="pt-6">
                        <h3 className="font-medium mb-3">About</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{restaurant.description}</p>
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
                <div className="space-y-6 sm:space-y-8 order-1 lg:order-2">
                  <div className="space-y-6">
                    <h2 className="text-lg sm:text-xl font-semibold">Actions</h2>
                    <div className="space-y-4">
                      <Button asChild className="w-full h-12 sm:h-10">
                        <Link href={`/experiences?restaurant=${restaurant.id}`}>
                          Log Your Experience
                        </Link>
                      </Button>
                      <Button variant="outline" asChild className="w-full h-12 sm:h-10">
                        <Link href={`/chat?restaurant=${restaurant.name}`}>
                          Ask REX About This Place
                        </Link>
                      </Button>
                    </div>
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
