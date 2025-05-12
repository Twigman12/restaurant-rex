"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { createClientSupabaseClient } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { nycBoroughs } from "@/lib/constants"

// Re-use or define these constants if not centrally located
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

const dietaryOptionsList = [
  { id: "vegan", label: "Vegan" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "gluten-free", label: "Gluten-Free" },
  { id: "dairy-free", label: "Dairy-Free" },
  { id: "nut-free", label: "Nut-Free" },
  { id: "halal", label: "Halal" },
  { id: "kosher", label: "Kosher" },
];

export default function AddRestaurantPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClientSupabaseClient()
  const { toast } = useToast()

  const [name, setName] = useState("")
  const [neighborhood, setNeighborhood] = useState("")
  const [borough, setBorough] = useState("")
  const [address, setAddress] = useState("")
  const [cuisine, setCuisine] = useState("")
  const [description, setDescription] = useState("")
  const [priceRange, setPriceRange] = useState<number>(0) // 0 for unset, 1-4 for values
  const [selectedDietary, setSelectedDietary] = useState<string[]>([])
  // TODO: Add latitude/longitude fields if needed for mapping
  // const [latitude, setLatitude] = useState<number | null>(null);
  // const [longitude, setLongitude] = useState<number | null>(null);

  const [isSaving, setIsSaving] = useState(false)

  // Redirect if not logged in (optional, depends if adding restaurants requires auth)
  useEffect(() => {
    if (!authLoading && !user) {
      toast({ title: "Please log in to add restaurants.", variant: "destructive" })
      router.push("/login")
    }
  }, [user, authLoading, router, toast])

  const handleDietaryChange = (optionId: string, checked: boolean | string) => {
    setSelectedDietary((prev) =>
      checked
        ? [...prev, optionId]
        : prev.filter((item) => item !== optionId)
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !name || !neighborhood || !cuisine || priceRange === 0) {
       toast({ title: "Missing required fields", description: "Please fill in Name, Neighborhood, Cuisine, and Price Range.", variant: "destructive" });
       return;
    }

    setIsSaving(true)

    try {
      // Derive borough from neighborhood if not set explicitly
      const boroughToSend = borough || getBoroughFromNeighborhood(neighborhood) || null;
      const addressToSend = address || '';

      const { data, error } = await supabase
        .from("restaurants")
        .insert({
          name,
          neighborhood,
          borough: boroughToSend,
          address: addressToSend,
          cuisine_type: cuisine,
          description: description || null,
          price_range: priceRange,
          dietary_options: selectedDietary.length > 0 ? selectedDietary : null,
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Success!",
        description: `Restaurant "${name}" added successfully.`,
      })

      // Redirect to the new restaurant's page or the main list
      if (data?.id) {
        router.push(`/restaurants/${data.id}`)
      } else {
        router.push("/restaurants")
      }

    } catch (error: any) {
      console.error("Error adding restaurant:", error)
      toast({
        title: "Error adding restaurant",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Helper function to guess borough from neighborhood
  function getBoroughFromNeighborhood(neighborhood: string): string | null {
    const brooklynNeighborhoods = ["Williamsburg", "Dumbo", "Park Slope", "Bushwick", "Fort Greene", "Crown Heights", "Bed-Stuy"];
    const queensNeighborhoods = ["Astoria", "Long Island City", "Flushing", "Jackson Heights", "Forest Hills"];
    const bronxNeighborhoods = ["Bronx"]; // Add more Bronx neighborhoods
    const statenIslandNeighborhoods = ["Staten Island"]; // Add more Staten Island neighborhoods
    
    if (brooklynNeighborhoods.includes(neighborhood)) return "Brooklyn";
    if (queensNeighborhoods.includes(neighborhood)) return "Queens";
    if (bronxNeighborhoods.includes(neighborhood)) return "Bronx";
    if (statenIslandNeighborhoods.includes(neighborhood)) return "Staten Island";
    
    // Default to Manhattan for common Manhattan neighborhoods
    if (["Midtown", "Downtown", "Upper East Side", "Upper West Side", "East Village", 
         "West Village", "SoHo", "Tribeca", "Chelsea", "Financial District", 
         "Greenwich Village", "Chinatown", "Little Italy", "Lower East Side", 
         "Gramercy", "Murray Hill", "Hell's Kitchen", "Times Square", "Flatiron"].includes(neighborhood)) {
      return "Manhattan";
    }
    
    return null;
  }

  if (authLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-rex-red" />
        </div>
      )
    }

  return (
    <div className="bg-background min-h-screen py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card className="rex-card">
          <CardHeader className="p-6">
            <CardTitle className="text-xl md:text-2xl font-semibold">Add a New Restaurant</CardTitle>
            <CardDescription className="pt-1">
              Help expand the Restaurant-REX database by adding a new spot.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Restaurant Name <span className="text-destructive">*</span></Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g., Joe's Pizza" />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="cuisine">Cuisine Type <span className="text-destructive">*</span></Label>
                    <Select value={cuisine} onValueChange={setCuisine} required>
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

               {/* Location Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
                 <div className="space-y-1.5">
                    <Label htmlFor="neighborhood">Neighborhood <span className="text-destructive">*</span></Label>
                     <Select value={neighborhood} onValueChange={setNeighborhood} required>
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
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g., 123 Main St, New York, NY 10001" />
                </div>
              </div>

              {/* Details */}
               <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Briefly describe the restaurant (optional)" />
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
                 <div className="space-y-1.5">
                   <Label htmlFor="price">Price Range <span className="text-destructive">*</span></Label>
                   <Select value={priceRange > 0 ? priceRange.toString() : ""} onValueChange={(v) => setPriceRange(Number.parseInt(v || "0"))} required>
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
              </div>

              {/* Dietary Options */}
              <div className="space-y-2.5">
                 <Label>Dietary Options Available</Label>
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
                   {dietaryOptionsList.map((option) => (
                     <div key={option.id} className="flex items-center space-x-2">
                       <Checkbox
                         id={`dietary-${option.id}`}
                         checked={selectedDietary.includes(option.id)}
                         onCheckedChange={(checked) => handleDietaryChange(option.id, checked)}
                       />
                       <Label htmlFor={`dietary-${option.id}`} className="text-sm font-normal">
                         {option.label}
                       </Label>
                     </div>
                   ))}
                 </div>
               </div>

            </CardContent>
            <CardFooter className="p-6 border-t border-border">
               <Button type="submit" disabled={isSaving} className="w-full rex-button">
                 {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                 {isSaving ? "Saving..." : "Add Restaurant"}
               </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
} 