"use client"

import type React from "react"
import { useAuth } from "@/contexts/auth-context"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus, Star, Calendar, MapPin, Utensils, Search, Edit, Eye } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase"
import type { Experience, Restaurant, Scenario } from "@/lib/types"
import Link from "next/link"
import { format } from "date-fns"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"

type ExperienceWithRestaurant = Experience & {
  restaurants: Restaurant
  scenarios: {
    name: string
  } | null
}

// NYC neighborhoods for restaurant selection
const nycNeighborhoods = [
  "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island",
  "Midtown", "Downtown", "Upper East Side", "Upper West Side",
  "East Village", "West Village", "SoHo", "Tribeca", "Chelsea",
  "Williamsburg", "Astoria", "Long Island City", "Harlem",
  "Financial District", "Greenwich Village", "Chinatown", "Little Italy",
  "Lower East Side", "Gramercy", "Murray Hill", "Hell's Kitchen",
  "Times Square", "Flatiron", "Dumbo", "Park Slope", "Bushwick",
  "Fort Greene", "Crown Heights", "Bed-Stuy", "Flushing",
  "Jackson Heights", "Forest Hills"
].sort();

const cuisineTypes = [
  "Italian", "Chinese", "Japanese", "Mexican", "American", "Indian",
  "Thai", "French", "Mediterranean", "Korean", "Vietnamese", "Greek",
  "Spanish", "Middle Eastern", "Other"
].sort();

export default function ExperiencesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [experiences, setExperiences] = useState<ExperienceWithRestaurant[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showExistingExperiences, setShowExistingExperiences] = useState(false)
  
  // Form state
  const [restaurantName, setRestaurantName] = useState("")
  const [neighborhood, setNeighborhood] = useState("")
  const [cuisine, setCuisine] = useState("")
  const [address, setAddress] = useState("")
  const [description, setDescription] = useState("")
  const [priceRange, setPriceRange] = useState<number>(0)
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("")
  const [scenarioId, setScenarioId] = useState("")
  const [rating, setRating] = useState<number | null>(null)
  const [notes, setNotes] = useState("")
  const [date, setDate] = useState<Date | undefined>(new Date())
  
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      setIsLoading(true)

      try {
        // Fetch user's experiences
        const { data: experiencesData, error: experiencesError } = await supabase
          .from("experiences")
          .select(`
            *,
            restaurants(*),
            scenarios(name)
          `)
          .eq("user_id", user.id)
          .order("visited_at", { ascending: false })

        if (experiencesError) throw experiencesError
        setExperiences(experiencesData || [])

        // Fetch restaurants for selection
        const { data: restaurantsData, error: restaurantsError } = await supabase
          .from("restaurants")
          .select("*")
          .order("name")

        if (restaurantsError) throw restaurantsError
        setRestaurants(restaurantsData || [])

        // Fetch scenarios
        const { data: scenariosData, error: scenariosError } = await supabase
          .from("scenarios")
          .select("*")
          .order("name")

        if (scenariosError) throw scenariosError
        setScenarios(scenariosData || [])

        // Check for restaurant ID in URL parameters and set it if present
        const restaurantParam = searchParams.get('restaurant')
        if (restaurantParam) {
          setSelectedRestaurantId(restaurantParam)
        }

      } catch (error: any) {
        console.error("Error fetching data:", error)
        console.error("Fetch error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        })
        toast({
          title: "Error",
          description: error.message || error.details || "Failed to load data.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user, supabase, toast, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log("Form submission started", {
      user: !!user,
      date: !!date,
      selectedRestaurantId,
      restaurantName,
      neighborhood,
      cuisine,
      priceRange
    })

    if (!user) {
      toast({ 
        title: "Not logged in", 
        description: "Please log in to add experiences.", 
        variant: "destructive" 
      })
      return
    }

    if (!date) {
      toast({ 
        title: "Missing date", 
        description: "Please select a date for your visit.", 
        variant: "destructive" 
      })
      return
    }

    // Check if we have restaurant information
    if (!selectedRestaurantId && (!restaurantName || !neighborhood || !cuisine || priceRange === 0)) {
      toast({ 
        title: "Missing restaurant information", 
        description: "Please select an existing restaurant or provide restaurant details.", 
        variant: "destructive" 
      })
      return
    }

    setIsSaving(true)

    try {
      let restaurantId = selectedRestaurantId

      console.log("Starting restaurant creation/selection", { restaurantId, restaurantName, neighborhood, cuisine, priceRange })

      // If no existing restaurant selected, create a new one
      if (!restaurantId && restaurantName && neighborhood && cuisine && priceRange > 0) {
        console.log("Creating new restaurant...")
        const { data: newRestaurant, error: restaurantError } = await supabase
          .from("restaurants")
          .insert({
            name: restaurantName,
            neighborhood,
            cuisine_type: cuisine,
            address: address || null,
            description: description || null,
            price_range: priceRange,
          })
          .select()
          .single()

        if (restaurantError) {
          console.error("Restaurant creation error:", restaurantError)
          throw restaurantError
        }
        restaurantId = newRestaurant.id
        console.log("Restaurant created successfully:", restaurantId)
      }

      if (!restaurantId) {
        toast({ 
          title: "Missing restaurant information", 
          description: "Please select an existing restaurant or provide restaurant details.", 
          variant: "destructive" 
        })
        return
      }

      // Create the experience
      console.log("Creating experience with data:", {
        user_id: user.id,
        restaurant_id: restaurantId,
        scenario_id: scenarioId || null,
        rating,
        notes,
        visited_at: date.toISOString(),
      })

      const { data: experienceData, error } = await supabase.from("experiences").insert({
        user_id: user.id,
        restaurant_id: restaurantId,
        scenario_id: scenarioId || null,
        rating,
        notes,
        visited_at: date.toISOString(),
      }).select()

      if (error) {
        console.error("Experience creation error:", error)
        throw error
      }

      console.log("Experience created successfully:", experienceData)

      toast({
        title: "Success!",
        description: "Experience added successfully.",
      })

      // Reset form
      setRestaurantName("")
      setNeighborhood("")
      setCuisine("")
      setAddress("")
      setDescription("")
      setPriceRange(0)
      setSelectedRestaurantId("")
      setScenarioId("")
      setRating(null)
      setNotes("")
      setDate(new Date())

      // Refresh experiences
      const { data: updatedExperiences } = await supabase
        .from("experiences")
        .select(`
          *,
          restaurants(*),
          scenarios(name)
        `)
        .eq("user_id", user.id)
        .order("visited_at", { ascending: false })

      setExperiences(updatedExperiences || [])

    } catch (error: any) {
      console.error("Error adding experience:", error)
      console.error("Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      })
      toast({
        title: "Error adding experience",
        description: error.message || error.details || "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-rex-cream">
        <Loader2 className="h-8 w-8 animate-spin text-rex-red" />
      </div>
    )
  }

  return (
    <div className="bg-rex-cream min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-rex-black">Add New Experience</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowExistingExperiences(!showExistingExperiences)}
              className="border-rex-red text-rex-red hover:bg-rex-red/10"
            >
              <Eye className="mr-2 h-4 w-4" />
              {showExistingExperiences ? "Hide" : "View"} Experiences
          </Button>
          </div>
        </div>

        {showExistingExperiences && experiences.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-rex-black">Your Recent Experiences</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {experiences.slice(0, 6).map((experience) => (
                <Card key={experience.id} className="border-none shadow-md overflow-hidden">
                  <CardHeader className="bg-rex-black text-rex-cream pb-3">
                    <CardTitle className="text-sm">{experience.restaurants.name}</CardTitle>
                    <CardDescription className="flex items-center text-rex-cream/80 text-xs">
                      <MapPin className="h-3 w-3 mr-1" />
                      {experience.restaurants.neighborhood}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-3">
                    {experience.rating && (
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < experience.rating! ? "text-rex-red fill-rex-red" : "text-rex-black/30"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                    {experience.visited_at && (
                      <div className="flex items-center text-xs text-rex-black/70">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(experience.visited_at), "MMM d, yyyy")}
                      </div>
                    )}
                    {experience.notes && (
                      <p className="text-xs text-rex-black/70 line-clamp-2">{experience.notes}</p>
                    )}
                  </CardContent>
                  <CardFooter className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="w-full border-rex-red text-rex-red hover:bg-rex-red/10 text-xs"
                    >
                      <Link href={`/experiences/${experience.id}`}>
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Card className="border-none shadow-lg">
          <CardHeader className="p-6">
            <CardTitle className="text-xl md:text-2xl font-semibold">Add a New Experience</CardTitle>
            <CardDescription className="pt-1">
              Share your dining experience and help others discover great restaurants.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-5">
              {/* Restaurant Selection */}
              <div className="space-y-2">
                <Label htmlFor="restaurant-select">Select Existing Restaurant (Optional)</Label>
                <Select value={selectedRestaurantId} onValueChange={setSelectedRestaurantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose from existing restaurants..." />
                  </SelectTrigger>
                  <SelectContent>
                    {restaurants.map((restaurant) => (
                      <SelectItem key={restaurant.id} value={restaurant.id}>
                        {restaurant.name} - {restaurant.neighborhood}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Or Add New Restaurant */}
              {!selectedRestaurantId && (
                <>
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium mb-4 text-rex-black">Or Add New Restaurant</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Restaurant Name <span className="text-destructive">*</span></Label>
                      <Input 
                        id="name" 
                        value={restaurantName} 
                        onChange={(e) => setRestaurantName(e.target.value)} 
                        placeholder="e.g., Joe's Pizza" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cuisine">Cuisine Type <span className="text-destructive">*</span></Label>
                      <Select value={cuisine} onValueChange={setCuisine}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select cuisine..." />
                        </SelectTrigger>
                        <SelectContent>
                          {cuisineTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="neighborhood">Neighborhood <span className="text-destructive">*</span></Label>
                      <Select value={neighborhood} onValueChange={setNeighborhood}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select neighborhood..." />
                        </SelectTrigger>
                        <SelectContent>
                          {nycNeighborhoods.map((n) => (
                            <SelectItem key={n} value={n}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="address">Address</Label>
                      <Input 
                        id="address" 
                        value={address} 
                        onChange={(e) => setAddress(e.target.value)} 
                        placeholder="e.g., 123 Main St, New York, NY 10001" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)} 
                      placeholder="Briefly describe the restaurant (optional)" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="price">Price Range <span className="text-destructive">*</span></Label>
                    <Select value={priceRange > 0 ? priceRange.toString() : ""} onValueChange={(v) => setPriceRange(Number.parseInt(v || "0"))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select price range..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">$ (Inexpensive)</SelectItem>
                        <SelectItem value="2">$$ (Moderate)</SelectItem>
                        <SelectItem value="3">$$$ (Pricey)</SelectItem>
                        <SelectItem value="4">$$$$ (Very Expensive)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Experience Details */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4 text-rex-black">Your Experience</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date of Visit <span className="text-destructive">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scenario">Occasion</Label>
                <Select value={scenarioId} onValueChange={setScenarioId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an occasion (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {scenarios.map((scenario) => (
                      <SelectItem key={scenario.id} value={scenario.id}>
                        {scenario.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rating">Rating</Label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                  <Button
                      key={star}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`p-0 h-8 w-8 ${rating && star <= rating ? "text-rex-red" : "text-rex-black/50"}`}
                      onClick={() => setRating(star)}
                    >
                      <Star className={`h-6 w-6 ${rating && star <= rating ? "fill-rex-red" : ""}`} />
              </Button>
                      ))}
                    </div>
                    </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Your Experience Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Share your thoughts about the restaurant, food, service, atmosphere..."
                  rows={4}
                />
                    </div>
                </CardContent>
            <CardFooter className="p-6 border-t border-border">
              <Button type="submit" disabled={isSaving} className="w-full rex-button">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSaving ? "Saving..." : "Add Experience"}
                  </Button>
                </CardFooter>
          </form>
              </Card>
      </div>
    </div>
  )
}
