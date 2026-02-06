"use client"

import type React from "react"

import { useAuth } from "@/contexts/auth-context"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase"
import type { Profile } from "@/lib/types"
import { MultiSelect } from "@/components/multi-select"
import { isAbortError } from "@/lib/error-utils"

const dietaryOptions = [
  { label: "Vegan", value: "vegan" },
  { label: "Vegetarian", value: "vegetarian" },
  { label: "Gluten-Free", value: "gluten-free" },
  { label: "Dairy-Free", value: "dairy-free" },
  { label: "Nut-Free", value: "nut-free" },
  { label: "Halal", value: "halal" },
  { label: "Kosher", value: "kosher" },
  { label: "Pescatarian", value: "pescatarian" },
  { label: "Keto", value: "keto" },
  { label: "Paleo", value: "paleo" },
]

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [username, setUsername] = useState("")
  const [fullName, setFullName] = useState("")
  const [location, setLocation] = useState("")
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return

      setIsLoading(true)

      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        if (error) throw error

        const profileData = data as any; // Temporary cast for easier access, ideally use generated types

        setProfile(profileData as Profile || null)
        setUsername(profileData?.username ?? "")
        setFullName(profileData?.full_name ?? "")
        setLocation(profileData?.location ?? "")
        setDietaryPreferences(profileData?.dietary_preferences ?? [])
      } catch (error) {
        if (isAbortError(error)) return
        console.error("Error fetching profile:", error)
        toast({
          title: "Error",
          description: "Failed to load profile data.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [user, supabase, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSaving(true)

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username,
          full_name: fullName,
          location,
          dietary_preferences: dietaryPreferences,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Profile updated successfully.",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-rex-red" />
      </div>
    )
  }

  return (
    <div className="bg-background min-h-screen py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-2xl md:text-3xl font-semibold mb-8 text-foreground">Your Profile</h1>

        <Card className="rex-card">
          <CardHeader className="p-6">
            <CardTitle className="text-xl">Profile Information</CardTitle>
            <CardDescription className="pt-1">
              Update your profile details and preferences.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Manhattan, Brooklyn"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dietaryPreferences">Dietary Preferences</Label>
                <MultiSelect
                  options={dietaryOptions}
                  selected={dietaryPreferences}
                  onChange={setDietaryPreferences}
                  placeholder="Select dietary preferences"
                />
              </div>
            </CardContent>
            <CardFooter className="p-6 border-t border-border">
              <Button type="submit" disabled={isSaving} className="rex-button">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
