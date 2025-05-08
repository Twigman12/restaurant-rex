"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase"
import type { Restaurant, Experience } from "@/lib/types"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, MapPin, DollarSign, Star, Calendar, ArrowLeft } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { format } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"

// Define an intermediate type for fetched data
type RawRestaurantData = {
  id: string;
  name: string;
  cuisine_type: string;
  address: string | null;
  neighborhood: string;
  description: string | null;
  price_range: number;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  dietary_options: string[] | null;
  experiences: any[] | null; // Allow 'any' for nested structure initially
}

type RestaurantWithExperiences = Restaurant & {
  experiences: (Experience & {
    profiles: { username: string }
    scenarios: { name: string } | null
  })[]
}

export default function RestaurantPage() {
  const { id } = useParams<{ id: string }>()
  const [restaurant, setRestaurant] = useState<RestaurantWithExperiences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userExperiences, setUserExperiences] = useState<(Experience & { scenarios: { name: string } | null })[]>([])
  const [publicExperiences, setPublicExperiences] = useState<
    (Experience & {
      profiles: { username: string }
      scenarios: { name: string } | null
    })[]
  >([])
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!id) return

      setIsLoading(true)

      try {
        const supabase = createClientSupabaseClient()
        const { data: rawData, error } = await supabase
          .from("restaurants")
          .select(`
            *,
            experiences(
              *,
              profiles(username),
              scenarios(name)
            )
          `)
          .eq("id", id)
          .single()

        if (error) throw error

        const rawDataTyped = rawData as unknown as RawRestaurantData | null
        let mappedRestaurant: RestaurantWithExperiences | null = null
        let processedExperiences: (Experience & { profiles: { username: string }; scenarios: { name: string } | null })[] = [] 

        if (rawDataTyped) {
          // Process experiences first, ensuring nested objects conform
          processedExperiences = Array.isArray(rawDataTyped.experiences) 
            ? rawDataTyped.experiences.map((exp: any) => ({ // Use 'any' for raw exp, but type output
                id: exp.id ?? '',
                user_id: exp.user_id ?? '',
                restaurant_id: exp.restaurant_id ?? '',
                scenario_id: exp.scenario_id,
                rating: exp.rating,
                notes: exp.notes,
                visited_at: exp.visited_at,
                created_at: exp.created_at ?? '',
                updated_at: exp.updated_at ?? '',
                // Ensure nested profiles/scenarios match the expected structure
                profiles: exp.profiles ? { username: exp.profiles.username ?? 'Unknown' } : { username: 'Unknown' },
                scenarios: exp.scenarios ? { name: exp.scenarios.name ?? 'N/A' } : null,
              })) 
            : []

          // Map restaurant fields, providing defaults for required fields
          mappedRestaurant = {
            id: rawDataTyped.id ?? '',
            name: rawDataTyped.name ?? 'Unnamed Restaurant',
            cuisine_type: rawDataTyped.cuisine_type ?? 'Unknown Cuisine',
            address: rawDataTyped.address ?? 'Address not available', 
            neighborhood: rawDataTyped.neighborhood ?? 'Unknown Neighborhood',
            description: rawDataTyped.description, 
            price_range: rawDataTyped.price_range ?? 0, 
            image_url: rawDataTyped.image_url, 
            created_at: rawDataTyped.created_at ?? '',
            updated_at: rawDataTyped.updated_at ?? '', // Now safe to access
            dietary_options: rawDataTyped.dietary_options, 
            experiences: processedExperiences, 
          }
        }

        setRestaurant(mappedRestaurant)

        // Filtering logic
        if (user && mappedRestaurant) {
          // Filter the ALREADY correctly typed processedExperiences
          const userExps = processedExperiences.filter((exp) => exp.user_id === user.id)
          const publicExps = processedExperiences.filter((exp) => exp.user_id !== user.id)
          // No complex cast needed here as userExps is already typed
          setUserExperiences(userExps)
          setPublicExperiences(publicExps)
        } else {
          setUserExperiences([])
          setPublicExperiences(processedExperiences)
        }
      } catch (error) {
        console.error("Error fetching restaurant:", error)
        toast({
          title: "Error",
          description: "Failed to load restaurant details.",
          variant: "destructive",
        })
        router.push("/restaurants")
      } finally {
        setIsLoading(false)
      }
    }

    fetchRestaurant()
  }, [id, toast, router, user])

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-rex-red" />
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-4">Restaurant not found</h2>
          <Button asChild className="rex-button">
            <Link href="/restaurants">Back to Restaurants</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Calculate average rating
  const allRatings = [...userExperiences, ...publicExperiences]
    .filter((exp) => exp.rating !== null)
    .map((exp) => exp.rating as number)

  const averageRating =
    allRatings.length > 0 ? allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length : 0

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-5xl">
        <Button
          variant="ghost"
          className="mb-6 text-muted-foreground hover:text-foreground hover:bg-accent h-auto p-1 rounded-md focus-visible:ring-ring"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>

        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            <Card className="rex-card">
              <CardHeader className="p-4 md:p-6">
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div>
                    <CardTitle className="text-xl md:text-2xl font-semibold text-foreground">{restaurant.name}</CardTitle>
                    <CardDescription className="flex items-center text-sm text-muted-foreground pt-1">
                      <MapPin className="h-4 w-4 mr-1.5 flex-shrink-0" />
                      {restaurant.neighborhood}
                    </CardDescription>
                  </div>
                  {averageRating > 0 && (
                    <Badge variant="secondary" className="flex items-center px-2.5 py-1 rounded-md">
                      <Star className="h-4 w-4 mr-1.5 text-rex-red fill-rex-red" />
                      <span className="font-semibold">{averageRating.toFixed(1)}</span>
                      <span className="ml-1 text-muted-foreground">({allRatings.length})</span>
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1.5">Cuisine</h3>
                    <p className="text-foreground">{restaurant.cuisine_type}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1.5">Price Range</h3>
                    <div className="flex items-center">
                      {Array.from({ length: restaurant.price_range || 0 }).map((_, i) => (
                        <DollarSign key={i} className="h-5 w-5 text-rex-red" />
                      ))}
                      {Array.from({ length: 4 - (restaurant.price_range || 0) }).map((_, i) => (
                        <DollarSign key={i} className="h-5 w-5 text-muted-foreground/50" />
                      ))}
                    </div>
                  </div>

                  {restaurant.address && (
                    <div className="sm:col-span-2">
                      <h3 className="text-sm font-medium text-muted-foreground mb-1.5">Address</h3>
                      <p className="text-foreground">{restaurant.address}</p>
                    </div>
                  )}
                </div>

                {restaurant.dietary_options && restaurant.dietary_options.length > 0 && (
                  <div className="pt-2">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Dietary Options</h3>
                    <div className="flex flex-wrap gap-2">
                      {restaurant.dietary_options.map((option) => (
                        <Badge key={option} variant="outline" className="px-2.5 py-0.5 text-xs rounded-full font-normal">
                          {option}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {restaurant.description && (
                  <div className="pt-2">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                    <p className="text-foreground leading-relaxed">{restaurant.description}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 md:p-6 border-t border-border">
                <Button asChild className="w-full rex-button">
                  <Link href={`/experiences/add?restaurant=${restaurant.id}`}>Log Your Experience</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="md:col-span-1 space-y-6">
            {userExperiences.length > 0 && (
              <div>
                <h2 className="text-lg md:text-xl font-semibold mb-4 text-foreground">Your Experiences</h2>
                <div className="space-y-4">
                  {userExperiences.map((exp) => (
                    <Card key={exp.id} className="rex-card">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          {exp.rating && (
                            <div className="flex items-center">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < exp.rating! ? "text-rex-red fill-rex-red" : "text-muted-foreground/40"
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                          {exp.visited_at && (
                            <span className="flex items-center text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(exp.visited_at), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                        {exp.scenarios && (
                          <div className="text-sm">
                            <span className="font-medium text-muted-foreground">Occasion:</span>{" "}
                            <span className="text-foreground">{exp.scenarios.name}</span>
                          </div>
                        )}
                        {exp.notes && <p className="text-sm text-foreground leading-snug">{exp.notes}</p>}
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="mt-2 w-full rounded-md focus-visible:ring-ring"
                        >
                          <Link href={`/experiences/${exp.id}`}>View Details</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {publicExperiences.length > 0 && (
              <div>
                <h2 className="text-lg md:text-xl font-semibold mb-4 text-foreground">Community Experiences</h2>
                <div className="space-y-4">
                  {publicExperiences.slice(0, 3).map((exp) => (
                    <Card key={exp.id} className="rex-card">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-foreground">
                            {exp.profiles?.username || "Anonymous"}
                          </span>
                          {exp.rating && (
                            <div className="flex items-center">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < exp.rating! ? "text-rex-red fill-rex-red" : "text-muted-foreground/40"
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        {exp.visited_at && (
                          <span className="flex items-center text-xs text-muted-foreground mb-2">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(new Date(exp.visited_at), "MMM d, yyyy")}
                          </span>
                        )}
                        {exp.scenarios && (
                          <div className="text-sm">
                            <span className="font-medium text-muted-foreground">Occasion:</span>{" "}
                            <span className="text-foreground">{exp.scenarios.name}</span>
                          </div>
                        )}
                        {exp.notes && <p className="text-sm text-foreground leading-snug mt-1">{exp.notes}</p>}
                      </CardContent>
                    </Card>
                  ))}

                  {publicExperiences.length > 3 && (
                    <div className="text-center mt-4">
                      <Button variant="link" className="text-rex-red hover:text-rex-red/80 h-auto p-1">
                        View All {publicExperiences.length} Reviews
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(userExperiences.length === 0 && publicExperiences.length === 0) && (
              <div>
                <h2 className="text-lg md:text-xl font-semibold mb-4 text-foreground">Community Experiences</h2>
                <p className="text-muted-foreground text-sm">No experiences logged for this restaurant yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
