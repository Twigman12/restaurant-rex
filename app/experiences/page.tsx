"use client"

import type React from "react"
import { useAuth } from "@/contexts/auth-context"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus, Star, Calendar, MapPin, Utensils, Search, Edit, Eye, ChevronDown, ChevronUp, BookOpen, Pencil, Trash2, PartyPopper } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase"
import type { Experience, Restaurant, Scenario, PricePoint } from "@/lib/types"
import Link from "next/link"
import { format } from "date-fns"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { useTagSuggestions } from "@/hooks/useTagSuggestions"

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

function getReviewPreview(
  notes: string | null,
  maxChars = 150
): { preview: string; isTruncated: boolean; charCount: number; wordCount: number } {
  const normalized = (notes ?? "").replace(/\s+/g, " ").trim()
  const charCount = normalized.length
  const wordCount = normalized ? normalized.split(" ").length : 0

  if (!normalized) {
    return { preview: "", isTruncated: false, charCount: 0, wordCount: 0 }
  }

  if (normalized.length <= maxChars) {
    return { preview: normalized, isTruncated: false, charCount, wordCount }
  }

  const slice = normalized.slice(0, maxChars).trimEnd()
  const lastSpace = slice.lastIndexOf(" ")
  const preview = (lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trimEnd()
  return { preview, isTruncated: true, charCount, wordCount }
}

function getPriceLabel(priceRange: number | null): { symbol: string; label: string } {
  const count = Math.max(0, Math.min(4, priceRange ?? 0))
  const symbol = "$".repeat(count || 1)
  const label =
    count <= 1
      ? "Budget-friendly"
      : count === 2
        ? "Moderate"
        : count === 3
          ? "Upscale"
          : "Fine Dining"
  return { symbol, label }
}

function Stars({
  rating,
  sizePx = 18,
  className,
}: {
  rating: number | null
  sizePx?: number
  className?: string
}) {
  const r = Math.max(0, Math.min(5, rating ?? 0))
  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label={`Rating: ${r} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < r
        return (
          <Star
            key={i}
            size={sizePx}
            className={cn(filled ? "text-yellow-400 fill-yellow-400" : "text-rex-cream/25 fill-transparent")}
          />
        )
      })}
    </div>
  )
}

export default function ExperiencesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [experiences, setExperiences] = useState<ExperienceWithRestaurant[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showExistingExperiences, setShowExistingExperiences] = useState(false)
  const [expandedExperienceId, setExpandedExperienceId] = useState<string | null>(null)
  const [readReviewOpen, setReadReviewOpen] = useState(false)
  const [activeReview, setActiveReview] = useState<ExperienceWithRestaurant | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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

  // ML-enhanced form state (Phase 5)
  const [atmosphereScore, setAtmosphereScore] = useState<number | null>(null)
  const [pricePoint, setPricePoint] = useState<PricePoint | null>(null)
  const [partySize, setPartySize] = useState<number>(2)
  const [waitTime, setWaitTime] = useState<number | null>(null)
  const [returnLikelihood, setReturnLikelihood] = useState<number | null>(null)
  const [selectedDishTags, setSelectedDishTags] = useState<string[]>([])
  const [selectedTasteTags, setSelectedTasteTags] = useState<string[]>([])

  // ML tag suggestions hook
  const { suggestions, isAnalyzing } = useTagSuggestions(notes)

  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientSupabaseClient()

  const toggleExpanded = (experienceId: string) => {
    setExpandedExperienceId((prev) => (prev === experienceId ? null : experienceId))
  }

  const openReadReview = (exp: ExperienceWithRestaurant) => {
    setActiveReview(exp)
    setReadReviewOpen(true)
  }

  const deleteExperience = async (experienceId: string) => {
    setIsDeleting(true)
    try {
      const { error } = await supabase.from("experiences").delete().eq("id", experienceId)
      if (error) throw error
      setExperiences((prev) => prev.filter((e) => e.id !== experienceId))
      toast({ title: "Deleted", description: "Experience deleted successfully." })
      setReadReviewOpen(false)
      setActiveReview(null)
      setShowDeleteDialog(false)
    } catch (error: any) {
      toast({
        title: "Error deleting experience",
        description: error.message || "Failed to delete experience.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        return
      }

      setIsLoading(true)
      console.log('[DEBUG] Set isLoading to true')

      try {
        console.log('[DEBUG] Fetching experiences for user:', user.id)

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
        setExperiences(experiencesData as any || [])

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

        console.log('[DEBUG] All data fetched successfully')

      } catch (error: any) {
        console.error("[ERROR] Error fetching data:", error)
        console.error("[ERROR] Fetch error details:", {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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

    if (!rating) {
      toast({
        title: "Missing rating",
        description: "Please rate your experience (1-5 stars).",
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

      // If no existing restaurant selected, create a new one
      if (!restaurantId && restaurantName && neighborhood && cuisine && priceRange > 0) {
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

      const { data: experienceData, error } = await supabase.from("experiences").insert({
        user_id: user.id,
        restaurant_id: restaurantId,
        scenario_id: scenarioId || null,
        rating,
        notes,
        visited_at: date.toISOString(),
        // ML-enhanced fields (Phase 5)
        dish_tags: selectedDishTags,
        taste_profile_tags: selectedTasteTags,
        atmosphere_score: atmosphereScore,
        price_point: pricePoint,
        party_size: partySize,
        wait_time_minutes: waitTime,
        return_likelihood: returnLikelihood,
        photo_urls: [],
      }).select()

      if (error) {
        console.error("Experience creation error:", error)
        throw error
      }

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
      // Reset ML fields
      setAtmosphereScore(null)
      setPricePoint(null)
      setPartySize(2)
      setWaitTime(null)
      setReturnLikelihood(null)
      setSelectedDishTags([])
      setSelectedTasteTags([])

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
              {experiences.slice(0, 6).map((experience) => {
                const isExpanded = expandedExperienceId === experience.id
                const { preview, isTruncated, charCount, wordCount } = getReviewPreview(experience.notes, 150)
                const hasReview = Boolean(experience.notes && experience.notes.trim().length > 0)
                const fullReview = (experience.notes ?? "").trim()
                const contentId = `experience-review-${experience.id}`
                const displayDate = experience.visited_at
                  ? format(new Date(experience.visited_at), "MMM d, yyyy")
                  : format(new Date(experience.created_at), "MMM d, yyyy")

                return (
                  <Card
                    key={experience.id}
                    className="border-none shadow-md overflow-hidden bg-rex-black text-rex-cream"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Expand to read full review"
                      aria-expanded={isExpanded}
                      aria-controls={contentId}
                      onClick={() => toggleExpanded(experience.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          toggleExpanded(experience.id)
                        }
                      }}
                      className="group cursor-pointer outline-none transition-all duration-300 ease-in-out hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-rex-red focus-visible:ring-offset-2 focus-visible:ring-offset-rex-black"
                    >
                      <CardHeader className="relative bg-rex-black text-rex-cream pb-3">
                        <div className="flex items-start justify-between gap-3 pr-14">
                          <CardTitle className="text-lg font-semibold leading-tight">
                            {experience.restaurants.name}
                          </CardTitle>
                          <Stars rating={experience.rating} sizePx={18} />
                        </div>
                        <CardDescription className="flex items-center text-rex-cream/80 text-sm">
                          <MapPin className="h-4 w-4 mr-2" />
                          {experience.restaurants.neighborhood}
                        </CardDescription>

                        <button
                          type="button"
                          aria-label={isExpanded ? "Collapse review" : "Expand review"}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleExpanded(experience.id)
                          }}
                          title="Tap to expand"
                          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-md text-rex-cream/80 transition-all duration-300 ease-in-out hover:text-rex-cream hover:bg-rex-cream/10 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rex-red"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-6 w-6 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:-rotate-6" />
                          ) : (
                            <ChevronDown className="h-6 w-6 transition-transform duration-300 group-hover:translate-y-0.5 group-hover:rotate-6" />
                          )}
                        </button>
                      </CardHeader>

                      <CardContent className="space-y-2 pt-3">
                        <div className="flex items-center text-sm text-rex-cream/80">
                          <Calendar className="h-4 w-4 mr-2" />
                          {displayDate}
                        </div>

                        <p className="text-[16px] leading-[1.6] text-rex-cream/90 break-words line-clamp-3">
                          {hasReview ? (
                            <>
                              <span>{preview}</span>
                              {isTruncated && <span className="text-rex-cream/60">… Read more</span>}
                            </>
                          ) : (
                            <span className="text-rex-cream/60">No review yet.</span>
                          )}
                        </p>

                        {hasReview && (
                          <div className="flex justify-end text-[12px] text-rex-cream/60 opacity-70">
                            {wordCount} words · {charCount} chars
                          </div>
                        )}

                        {/* Expandable full review */}
                        <div
                          id={contentId}
                          className={cn(
                            "grid transition-all duration-300 ease-in-out",
                            isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                          )}
                          aria-hidden={!isExpanded}
                        >
                          <div className="overflow-hidden">
                            {hasReview && (
                              <div className="mt-2 border-t border-rex-cream/10 pt-2">
                                <p className="text-sm leading-[1.6] text-rex-cream/90 whitespace-pre-wrap">
                                  {fullReview}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </div>

                    <div className="px-6 py-3">
                      <div className="h-px bg-rex-cream/10" />
                    </div>

                    <CardFooter className="pt-2 grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        disabled={!hasReview}
                        onClick={() => {
                          if (!hasReview) return
                          openReadReview(experience)
                        }}
                        className="w-full border-rex-red text-rex-red hover:bg-rex-red/10 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <BookOpen className="mr-1 h-3 w-3" />
                        Read Review
                      </Button>

                      <Button
                        variant="outline"
                        size="lg"
                        asChild
                        className="w-full border-rex-red text-rex-red hover:bg-rex-red/10 text-sm"
                      >
                        <Link href={`/experiences/${experience.id}`}>
                          <Edit className="mr-1 h-3 w-3" />
                          Edit
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>

            {/* Read Review Modal */}
            <Dialog
              open={readReviewOpen}
              onOpenChange={(open) => {
                setReadReviewOpen(open)
                if (!open) setActiveReview(null)
              }}
            >
              <DialogContent className="bg-rex-black text-rex-cream border border-rex-red/40 [&>button]:text-rex-cream/80 [&>button]:hover:text-rex-cream [&>button]:hover:bg-rex-cream/10 [&>button]:focus-visible:ring-rex-red">
                {activeReview && (
                  <div className="space-y-5">
                    {/* Header */}
                    <div className="relative pr-20">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-2xl font-bold leading-tight">{activeReview.restaurants.name}</h2>
                          <div className="mt-1 flex items-center text-rex-cream/80">
                            <MapPin className="h-4 w-4 mr-2" />
                            <span className="text-base">{activeReview.restaurants.neighborhood}</span>
                          </div>
                        </div>
                        <Stars rating={activeReview.rating} sizePx={18} className="pt-1" />
                      </div>

                      {/* Edit icon button (top-right, left of the X close button) */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/experiences/${activeReview.id}`)}
                        className="absolute right-12 top-0 h-11 w-11 text-rex-cream/80 hover:text-rex-cream hover:bg-rex-cream/10 focus-visible:ring-2 focus-visible:ring-rex-red"
                        aria-label="Edit review"
                      >
                        <Pencil className="h-5 w-5" />
                      </Button>
                    </div>

                    <div className="h-px bg-rex-cream/10" />

                    {/* Visit details */}
                    <div className="space-y-2 text-[15px] text-rex-cream/80">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium text-rex-cream/90">Visit:</span>
                        <span>
                          {activeReview.visited_at
                            ? format(new Date(activeReview.visited_at), "MMMM d, yyyy")
                            : format(new Date(activeReview.created_at), "MMMM d, yyyy")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <PartyPopper className="h-4 w-4" />
                        <span className="font-medium text-rex-cream/90">Occasion:</span>
                        <span>{activeReview.scenarios?.name ?? "None"}</span>
                      </div>
                    </div>

                    <div className="h-px bg-rex-cream/10" />

                    {/* Hero review */}
                    <div className="space-y-3">
                      <div className="text-base font-bold text-rex-cream">📝 Your Review</div>
                      <div className="rounded-lg border border-rex-cream/10 bg-rex-cream/5 p-4">
                        <div
                          className={cn(
                            "text-[19px] leading-[1.75] text-rex-cream/90 whitespace-pre-wrap",
                            (activeReview.notes?.length ?? 0) > 300 ? "max-h-[40vh] overflow-auto pr-2" : ""
                          )}
                        >
                          {activeReview.notes?.trim() ? activeReview.notes : "No notes added."}
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-rex-cream/10" />

                    {/* Restaurant info */}
                    <div className="space-y-2 text-sm text-rex-cream/80">
                      <div className="text-base font-bold text-rex-cream">ℹ️ Restaurant Info</div>
                      {activeReview.restaurants.description && (
                        <div className="leading-relaxed">{activeReview.restaurants.description}</div>
                      )}
                      <div className="flex items-center gap-2">
                        <span>💰</span>
                        <span className="font-medium text-rex-cream/90">Price:</span>
                        <span>
                          {(() => {
                            const { symbol, label } = getPriceLabel(activeReview.restaurants.price_range)
                            return `${symbol} (${label})`
                          })()}
                        </span>
                      </div>
                    </div>

                    <div className="h-px bg-rex-cream/10" />

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        size="lg"
                        asChild
                        className="border-rex-red text-rex-red hover:bg-rex-red/10"
                      >
                        <Link href={`/experiences/${activeReview.id}`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="lg"
                        onClick={() => setShowDeleteDialog(true)}
                        aria-label="Delete review"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogContent className="bg-rex-black text-rex-cream border border-rex-cream/10">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this experience?</AlertDialogTitle>
                  <AlertDialogDescription className="text-rex-cream/70">
                    This will permanently delete this experience record. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-rex-cream/20 bg-rex-black text-rex-cream hover:bg-rex-cream/10">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => activeReview && deleteExperience(activeReview.id)}
                    className="bg-rex-red hover:bg-red-700"
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
                      className={`p-0 h-10 w-10 hover:bg-transparent ${rating && star <= rating ? "text-rex-red" : "text-gray-400"}`}
                      onClick={() => setRating(star)}
                    >
                      <Star className={`h-7 w-7 ${rating && star <= rating ? "fill-rex-red" : ""}`} />
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

              {/* ML Tag Suggestions (Phase 5) */}
              {isAnalyzing && notes.length > 10 && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Analyzing your notes for tag suggestions...
                </div>
              )}

              {suggestions.dish_tags.length > 0 && (
                <div className="space-y-2">
                  <Label>Suggested Dish Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.dish_tags.map(tag => (
                      <Badge
                        key={tag}
                        variant={selectedDishTags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer transition-all hover:scale-105"
                        onClick={() => {
                          setSelectedDishTags(prev =>
                            prev.includes(tag)
                              ? prev.filter(t => t !== tag)
                              : [...prev, tag]
                          )
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {suggestions.taste_profile_tags.length > 0 && (
                <div className="space-y-2">
                  <Label>Suggested Taste Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.taste_profile_tags.map(tag => (
                      <Badge
                        key={tag}
                        variant={selectedTasteTags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer transition-all hover:scale-105"
                        onClick={() => {
                          setSelectedTasteTags(prev =>
                            prev.includes(tag)
                              ? prev.filter(t => t !== tag)
                              : [...prev, tag]
                          )
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Atmosphere Rating */}
              <div className="space-y-2">
                <Label>Atmosphere Rating (Optional)</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button
                      key={star}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setAtmosphereScore(star === atmosphereScore ? null : star)}
                    >
                      <Star className={`h-5 w-5 ${atmosphereScore && star <= atmosphereScore ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                    </Button>
                  ))}
                  {atmosphereScore && (
                    <span className="ml-2 text-sm text-muted-foreground self-center">
                      {atmosphereScore}/5
                    </span>
                  )}
                </div>
              </div>

              {/* Price Point Selector */}
              <div className="space-y-2">
                <Label>Price Point (Optional)</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={pricePoint === 'budget' ? "default" : "outline"}
                    onClick={() => setPricePoint(pricePoint === 'budget' ? null : 'budget')}
                  >
                    $ Budget
                  </Button>
                  <Button
                    type="button"
                    variant={pricePoint === 'moderate' ? "default" : "outline"}
                    onClick={() => setPricePoint(pricePoint === 'moderate' ? null : 'moderate')}
                  >
                    $$ Moderate
                  </Button>
                  <Button
                    type="button"
                    variant={pricePoint === 'splurge' ? "default" : "outline"}
                    onClick={() => setPricePoint(pricePoint === 'splurge' ? null : 'splurge')}
                  >
                    $$$ Splurge
                  </Button>
                </div>
              </div>

              {/* Additional ML Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="partySize">Party Size</Label>
                  <Input
                    id="partySize"
                    type="number"
                    min="1"
                    value={partySize}
                    onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waitTime">Wait Time (mins)</Label>
                  <Input
                    id="waitTime"
                    type="number"
                    min="0"
                    value={waitTime || ''}
                    onChange={(e) => setWaitTime(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Return Likelihood */}
              <div className="space-y-2">
                <Label>Would You Return?</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <Button
                      key={num}
                      type="button"
                      variant={returnLikelihood === num ? "default" : "outline"}
                      size="sm"
                      onClick={() => setReturnLikelihood(num === returnLikelihood ? null : num)}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  1 = Definitely not, 5 = Absolutely
                </p>
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
