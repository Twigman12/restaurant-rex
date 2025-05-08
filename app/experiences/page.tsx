"use client"

import type React from "react"
import { useAuth } from "@/contexts/auth-context"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus, Star, Calendar, MapPin, Utensils, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase"
import type { Experience, Restaurant } from "@/lib/types"
import Link from "next/link"
import { format } from "date-fns"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ExperienceWithRestaurant = Experience & {
  restaurants: Restaurant
  scenarios: {
    name: string
  } | null
}

export default function ExperiencesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [experiences, setExperiences] = useState<ExperienceWithRestaurant[]>([])
  const [filteredExperiences, setFilteredExperiences] = useState<ExperienceWithRestaurant[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("date-desc")
  const [ratingFilter, setRatingFilter] = useState("all")
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const fetchExperiences = async () => {
      if (!user) return

      setIsLoading(true)

      try {
        const { data, error } = await supabase
          .from("experiences")
          .select(`
            *,
            restaurants(*),
            scenarios(name)
          `)
          .eq("user_id", user.id)
          .order("visited_at", { ascending: false })

        if (error) throw error

        setExperiences(data || [])
        setFilteredExperiences(data || [])
      } catch (error) {
        console.error("Error fetching experiences:", error)
        toast({
          title: "Error",
          description: "Failed to load experiences.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchExperiences()
  }, [user, supabase, toast])

  // Filter and sort experiences
  useEffect(() => {
    let filtered = [...experiences]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (exp) =>
          exp.restaurants.name.toLowerCase().includes(query) ||
          exp.restaurants.cuisine_type.toLowerCase().includes(query) ||
          exp.restaurants.neighborhood.toLowerCase().includes(query) ||
          exp.notes?.toLowerCase().includes(query) ||
          exp.scenarios?.name.toLowerCase().includes(query),
      )
    }

    // Apply rating filter
    if (ratingFilter !== "all") {
      const rating = Number.parseInt(ratingFilter)
      filtered = filtered.filter((exp) => exp.rating === rating)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.visited_at || b.created_at).getTime() - new Date(a.visited_at || a.created_at).getTime()
        case "date-asc":
          return new Date(a.visited_at || a.created_at).getTime() - new Date(b.visited_at || b.created_at).getTime()
        case "rating-desc":
          return (b.rating || 0) - (a.rating || 0)
        case "rating-asc":
          return (a.rating || 0) - (b.rating || 0)
        case "name-asc":
          return a.restaurants.name.localeCompare(b.restaurants.name)
        case "name-desc":
          return b.restaurants.name.localeCompare(a.restaurants.name)
        default:
          return 0
      }
    })

    setFilteredExperiences(filtered)
  }, [experiences, searchQuery, sortBy, ratingFilter])

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
          <h1 className="text-2xl font-bold text-rex-black">Your Restaurant Experiences</h1>
          <Button asChild className="bg-rex-red hover:bg-red-700 text-white">
            <Link href="/experiences/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Experience
            </Link>
          </Button>
        </div>

        {experiences.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-rex-black/50" />
              <Input
                placeholder="Search your experiences..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-rex-black/20 focus-visible:ring-rex-red"
              />
            </div>

            <div className="flex gap-2">
              <div className="w-40">
                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                  <SelectTrigger className="border-rex-black/20 focus:ring-rex-red">
                    <SelectValue placeholder="Filter by rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <SelectItem key={rating} value={rating.toString()}>
                        {rating} {rating === 1 ? "Star" : "Stars"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-48">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="border-rex-black/20 focus:ring-rex-red">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Newest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="rating-desc">Highest Rated</SelectItem>
                    <SelectItem value="rating-asc">Lowest Rated</SelectItem>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {filteredExperiences.length === 0 ? (
          <Card className="border-none shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Utensils className="h-12 w-12 text-rex-red mb-4" />
              <p className="text-lg font-medium mb-2 text-rex-black">
                {experiences.length === 0 ? "No experiences yet" : "No matching experiences found"}
              </p>
              <p className="text-rex-black/70 mb-6">
                {experiences.length === 0
                  ? "Start logging your restaurant visits to build your dining history."
                  : "Try adjusting your search or filters to see more results."}
              </p>
              <Button asChild className="bg-rex-red hover:bg-red-700 text-white">
                {experiences.length === 0 ? (
                  <Link href="/chat">Get Restaurant Recommendations</Link>
                ) : (
                  <Button
                    onClick={() => {
                      setSearchQuery("")
                      setRatingFilter("all")
                      setSortBy("date-desc")
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredExperiences.map((experience) => (
              <Card key={experience.id} className="border-none shadow-md overflow-hidden">
                <CardHeader className="bg-rex-black text-rex-cream pb-3">
                  <CardTitle>{experience.restaurants.name}</CardTitle>
                  <CardDescription className="flex items-center text-rex-cream/80">
                    <MapPin className="h-4 w-4 mr-1" />
                    {experience.restaurants.neighborhood}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 pt-4">
                  {experience.rating && (
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < experience.rating! ? "text-rex-red fill-rex-red" : "text-rex-black/30"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                  {experience.visited_at && (
                    <div className="flex items-center text-sm text-rex-black/70">
                      <Calendar className="h-4 w-4 mr-1" />
                      {format(new Date(experience.visited_at), "MMMM d, yyyy")}
                    </div>
                  )}
                  {experience.scenarios && (
                    <div className="text-sm">
                      <span className="font-medium text-rex-black">Occasion:</span>{" "}
                      <span className="text-rex-black/70">{experience.scenarios.name}</span>
                    </div>
                  )}
                  {experience.notes && (
                    <p className="text-sm mt-2 text-rex-black/70 line-clamp-3">{experience.notes}</p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full border-rex-red text-rex-red hover:bg-rex-red/10"
                  >
                    <Link href={`/experiences/${experience.id}`}>View Details</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
