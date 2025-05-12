"use client"

import type React from "react"

import { useAuth } from "@/contexts/auth-context"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Calendar, Star } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase"
import type { Restaurant, Scenario } from "@/lib/types"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AddExperiencePage() {
  const { user, isLoading: authLoading } = useAuth()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [restaurantId, setRestaurantId] = useState("")
  const [scenarioId, setScenarioId] = useState("")
  const [rating, setRating] = useState<number | null>(null)
  const [notes, setNotes] = useState("")
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
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
        // Fetch restaurants
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
          setRestaurantId(restaurantParam)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load data.",
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
    if (!user || !restaurantId || !date) return

    setIsSaving(true)

    try {
      const { error } = await supabase.from("experiences").insert({
        user_id: user.id,
        restaurant_id: restaurantId,
        scenario_id: scenarioId || null,
        rating,
        notes,
        visited_at: date.toISOString(),
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "Experience added successfully.",
      })

      router.push("/experiences")
    } catch (error) {
      console.error("Error adding experience:", error)
      toast({
        title: "Error",
        description: "Failed to add experience.",
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
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6 text-rex-black">Add Restaurant Experience</h1>

        <Card className="border-none shadow-lg">
          <CardHeader className="bg-rex-black text-rex-cream">
            <CardTitle>Log Your Visit</CardTitle>
            <CardDescription className="text-rex-cream/80">
              Record details about your restaurant experience
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="restaurant" className="text-rex-black">
                  Restaurant
                </Label>
                <Select value={restaurantId} onValueChange={setRestaurantId} required>
                  <SelectTrigger className="border-rex-black/20 focus:ring-rex-red">
                    <SelectValue placeholder="Select a restaurant" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-rex-red/20">
                    {restaurants.map((restaurant) => (
                      <SelectItem
                        key={restaurant.id}
                        value={restaurant.id}
                        className="text-rex-black hover:bg-rex-red/10 hover:text-rex-red"
                      >
                        {restaurant.name} - {restaurant.neighborhood}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="text-rex-black">
                  Date of Visit
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal border-rex-cream/20 text-rex-cream hover:bg-rex-cream/10 hover:text-rex-cream"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-rex-red/20">
                    <CalendarComponent
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      className="rounded-md border-rex-red/20"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scenario" className="text-rex-black">
                  Occasion
                </Label>
                <Select value={scenarioId} onValueChange={setScenarioId}>
                  <SelectTrigger className="border-rex-black/20 focus:ring-rex-red">
                    <SelectValue placeholder="Select an occasion (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-rex-red/20">
                    {scenarios.map((scenario) => (
                      <SelectItem
                        key={scenario.id}
                        value={scenario.id}
                        className="text-rex-black hover:bg-rex-red/10 hover:text-rex-red"
                      >
                        {scenario.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rating" className="text-rex-black">
                  Rating
                </Label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button
                      key={star}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`p-0 h-8 w-8 ${rating && star <= rating ? "text-rex-red" : "text-rex-cream/50"}`}
                      onClick={() => setRating(star)}
                    >
                      <Star className={`h-6 w-6 ${rating && star <= rating ? "fill-rex-red" : ""}`} />
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-rex-black">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Share your thoughts about the restaurant..."
                  rows={4}
                  className="border-rex-black/20 focus-visible:ring-rex-red"
                />
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex space-x-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1 border-rex-red text-rex-red hover:bg-rex-red/10"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="flex-1 bg-rex-red hover:bg-red-700 text-white">
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Experience"
                  )}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
