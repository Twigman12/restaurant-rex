"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase"
import type { Restaurant, Experience, Scenario } from "@/lib/types"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, MapPin, DollarSign, Star, Calendar, ArrowLeft, Pencil, Trash2, Save, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { format } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
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

type ExperienceWithDetails = Experience & {
  restaurants: Restaurant
  scenarios: {
    name: string
  } | null
}

export default function ExperienceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [experience, setExperience] = useState<ExperienceWithDetails | null>(null)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  // Edit form state
  const [editScenarioId, setEditScenarioId] = useState("")
  const [editRating, setEditRating] = useState<number | null>(null)
  const [editNotes, setEditNotes] = useState("")
  const [editDate, setEditDate] = useState<Date | undefined>(new Date())
  
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    
    const fetchData = async () => {
      if (!id) return

      setIsLoading(true)

      try {
        // Fetch experience
        const { data, error } = await supabase
          .from("experiences")
          .select(`
            *,
            restaurants(*),
            scenarios(name)
          `)
          .eq("id", id)
          .single()

        if (error) throw error

        // Verify the experience belongs to the current user
        if (data.user_id !== user.id) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to view this experience.",
            variant: "destructive",
          })
          router.push("/experiences")
          return
        }

        setExperience(data as unknown as ExperienceWithDetails)
        
        // Initialize edit state
        setEditScenarioId((data.scenario_id as string) || "")
        setEditRating((data.rating as number) || null)
        setEditNotes((data.notes as string) || "")
        setEditDate(data.visited_at ? new Date(data.visited_at as string) : new Date())

        // Fetch scenarios for editing
        const { data: scenariosData, error: scenariosError } = await supabase
          .from("scenarios")
          .select("*")
          .order("name")

        if (scenariosError) throw scenariosError
        setScenarios((scenariosData as Scenario[]) || [])

      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load experience details.",
          variant: "destructive",
        })
        router.push("/experiences")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [id, toast, router, user, supabase])

  const handleSave = async () => {
    if (!experience) return

    setIsSaving(true)

    try {
      const { error } = await supabase
        .from("experiences")
        .update({
          scenario_id: editScenarioId || null,
          rating: editRating,
          notes: editNotes,
          visited_at: editDate?.toISOString() || null,
        })
        .eq("id", experience.id)

      if (error) throw error

      // Update local state
      setExperience({
        ...experience,
        scenario_id: editScenarioId || null,
        rating: editRating,
        notes: editNotes,
        visited_at: editDate?.toISOString() || null,
      })

      toast({
        title: "Success",
        description: "Experience updated successfully.",
      })

      setIsEditing(false)
    } catch (error) {
      console.error("Error updating experience:", error)
      toast({
        title: "Error",
        description: "Failed to update experience.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (!experience) return
    
    // Reset edit state to original values
    setEditScenarioId(experience.scenario_id || "")
    setEditRating(experience.rating)
    setEditNotes(experience.notes || "")
    setEditDate(experience.visited_at ? new Date(experience.visited_at) : new Date())
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!experience) return

    try {
      const { error } = await supabase
        .from("experiences")
        .delete()
        .eq("id", experience.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Experience deleted successfully.",
      })

      router.push("/experiences")
    } catch (error) {
      console.error("Error deleting experience:", error)
      toast({
        title: "Error",
        description: "Failed to delete experience.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-rex-cream">
        <Loader2 className="h-8 w-8 animate-spin text-rex-red" />
      </div>
    )
  }

  if (!experience) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-rex-cream">
        <div className="text-center">
          <h2 className="text-xl font-bold text-rex-black mb-4">Experience not found</h2>
          <Button asChild className="bg-rex-red hover:bg-red-700 text-white">
            <Link href="/experiences">Back to Experiences</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-rex-cream min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          className="mb-6 text-rex-black/70 hover:text-rex-black hover:bg-rex-black/10 h-auto p-1 rounded-md"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>

        <Card className="border-none shadow-lg overflow-hidden">
          <CardHeader className="bg-rex-black text-rex-cream">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl font-semibold">{experience.restaurants.name}</CardTitle>
                <CardDescription className="flex items-center text-rex-cream/80 mt-1">
                  <MapPin className="h-4 w-4 mr-1.5" />
                  {experience.restaurants.neighborhood}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="text-rex-cream hover:bg-rex-cream/20"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
                <div className="flex items-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < (experience.rating || 0) ? "text-rex-red fill-rex-red" : "text-rex-cream/30"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-6">
            {/* Date */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-rex-black">Date of Visit</Label>
              {isEditing ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {editDate ? format(editDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={editDate}
                      onSelect={setEditDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="flex items-center text-sm text-rex-black/70">
                  <Calendar className="h-4 w-4 mr-2" />
                  {experience.visited_at
                    ? format(new Date(experience.visited_at), "MMMM d, yyyy")
                    : format(new Date(experience.created_at), "MMMM d, yyyy")}
                </div>
              )}
            </div>

            {/* Occasion */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-rex-black">Occasion</Label>
              {isEditing ? (
                <Select value={editScenarioId} onValueChange={setEditScenarioId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an occasion (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {scenarios.map((scenario) => (
                      <SelectItem key={scenario.id} value={scenario.id}>
                        {scenario.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm">
                  {experience.scenarios ? (
                    <>
                      <span className="font-medium text-rex-black">Occasion:</span>{" "}
                      <span className="text-rex-black/70">{experience.scenarios.name}</span>
                    </>
                  ) : (
                    <span className="text-rex-black/70">No occasion specified</span>
                  )}
                </div>
              )}
            </div>

            {/* Rating */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-rex-black">Rating</Label>
              {isEditing ? (
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button
                      key={star}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`p-0 h-8 w-8 ${editRating && star <= editRating ? "text-rex-red" : "text-rex-black/50"}`}
                      onClick={() => setEditRating(star)}
                    >
                      <Star className={`h-6 w-6 ${editRating && star <= editRating ? "fill-rex-red" : ""}`} />
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < (experience.rating || 0) ? "text-rex-red fill-rex-red" : "text-rex-black/30"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Restaurant Info */}
            <div className="border-t pt-4 space-y-3">
              <h3 className="text-md font-medium text-rex-black">Restaurant Information</h3>
              
              {experience.restaurants.description && (
                <div className="text-sm">
                  <span className="font-medium text-rex-black mr-2">About:</span>
                  <p className="text-rex-black/70 mt-1 leading-relaxed">{experience.restaurants.description}</p>
                </div>
              )}

              <div className="flex items-center text-sm">
                <span className="font-medium text-rex-black mr-2">Price:</span>
                <div className="flex items-center">
                  {Array.from({ length: experience.restaurants.price_range || 0 }).map((_, i) => (
                    <DollarSign key={i} className="h-4 w-4 text-rex-red" />
                  ))}
                  {Array.from({ length: 4 - (experience.restaurants.price_range || 0) }).map((_, i) => (
                    <DollarSign key={i} className="h-4 w-4 text-rex-black/30" />
                  ))}
                </div>
              </div>

              {experience.restaurants.dietary_options && experience.restaurants.dietary_options.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {experience.restaurants.dietary_options.map((option) => (
                    <Badge key={option} variant="outline" className="px-2 py-0.5 text-xs rounded-full font-normal">
                      {option}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-rex-black">Your Notes</Label>
              {isEditing ? (
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Share your thoughts about the restaurant, food, service, atmosphere..."
                  rows={4}
                />
              ) : (
                <div className="mt-2">
                  {experience.notes ? (
                    <p className="text-rex-black/70 whitespace-pre-wrap">{experience.notes}</p>
                  ) : (
                    <p className="text-rex-black/50 italic">No notes added</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="p-6 border-t border-rex-cream/20 flex space-x-2">
            {isEditing ? (
              <>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-rex-black/20 text-rex-black hover:bg-rex-black/10"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  size="sm"
                  className="flex-1 bg-rex-red hover:bg-red-700 text-white"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-rex-red text-rex-red hover:bg-rex-red/10"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this experience record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 