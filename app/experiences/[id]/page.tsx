"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase"
import type { Restaurant, Experience } from "@/lib/types"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, MapPin, DollarSign, Star, Calendar, ArrowLeft, Pencil, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { format } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
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
  const [isLoading, setIsLoading] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    
    const fetchExperience = async () => {
      if (!id) return

      setIsLoading(true)

      try {
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

        setExperience(data)
      } catch (error) {
        console.error("Error fetching experience:", error)
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

    fetchExperience()
  }, [id, toast, router, user, supabase])

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
          </CardHeader>

          <CardContent className="space-y-4 p-6">
            <div className="flex items-center text-sm text-rex-black/70">
              <Calendar className="h-4 w-4 mr-2" />
              {experience.visited_at
                ? format(new Date(experience.visited_at), "MMMM d, yyyy")
                : format(new Date(experience.created_at), "MMMM d, yyyy")}
            </div>

            {experience.scenarios && (
              <div className="text-sm">
                <span className="font-medium text-rex-black">Occasion:</span>{" "}
                <span className="text-rex-black/70">{experience.scenarios.name}</span>
              </div>
            )}

            <div className="flex items-center text-sm">
              <span className="font-medium text-rex-black mr-2">Cuisine:</span>
              <span className="text-rex-black/70">{experience.restaurants.cuisine_type}</span>
            </div>

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

            {experience.notes && (
              <div className="mt-4">
                <h3 className="text-md font-medium text-rex-black mb-2">Your Notes</h3>
                <p className="text-rex-black/70 whitespace-pre-wrap">{experience.notes}</p>
              </div>
            )}
          </CardContent>

          <CardFooter className="p-6 border-t border-rex-cream/20 flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex-1 border-rex-red text-rex-red hover:bg-rex-red/10"
            >
              <Link href={`/restaurants/${experience.restaurants.id}`}>View Restaurant</Link>
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