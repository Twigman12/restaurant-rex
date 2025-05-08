"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import type { Restaurant } from "@/lib/types"
import { RestaurantCard } from "@/components/restaurant-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Loader2, Search, MapPin, Filter } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"

// NYC neighborhoods for filtering
const nycNeighborhoods = [
  "All Neighborhoods",
  "Manhattan",
  "Brooklyn",
  "Queens",
  "Bronx",
  "Staten Island",
  "Midtown",
  "Downtown",
  "Upper East Side",
  "Upper West Side",
  "East Village",
  "West Village",
  "SoHo",
  "Tribeca",
  "Chelsea",
  "Williamsburg",
  "Astoria",
  "Long Island City",
  "Harlem",
]

// Cuisine types for filtering
const cuisineTypes = [
  "All Cuisines",
  "Italian",
  "Chinese",
  "Japanese",
  "Mexican",
  "American",
  "Indian",
  "Thai",
  "French",
  "Mediterranean",
  "Korean",
  "Vietnamese",
  "Greek",
  "Spanish",
  "Middle Eastern",
]

// Dietary options for filtering
const dietaryOptions = [
  { id: "vegan", label: "Vegan" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "gluten-free", label: "Gluten-Free" },
  { id: "dairy-free", label: "Dairy-Free" },
  { id: "nut-free", label: "Nut-Free" },
  { id: "halal", label: "Halal" },
  { id: "kosher", label: "Kosher" },
]

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [neighborhood, setNeighborhood] = useState("All Neighborhoods")
  const [cuisine, setCuisine] = useState("All Cuisines")
  const [priceRange, setPriceRange] = useState("0")
  const [selectedDietary, setSelectedDietary] = useState<string[]>([])
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const fetchRestaurants = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase.from("restaurants").select("*").order("name")

        if (error) throw error

        setRestaurants((data as Restaurant[]) || [])
        setFilteredRestaurants((data as Restaurant[]) || [])
      } catch (error) {
        console.error("Error fetching restaurants:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRestaurants()
  }, [supabase])

  // Apply filters whenever filter criteria change
  useEffect(() => {
    let results = [...restaurants]

    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      results = results.filter(
        (restaurant) =>
          restaurant.name.toLowerCase().includes(query) ||
          restaurant.cuisine_type.toLowerCase().includes(query) ||
          restaurant.description?.toLowerCase().includes(query),
      )
    }

    // Apply neighborhood filter
    if (neighborhood !== "All Neighborhoods") {
      results = results.filter((restaurant) =>
        restaurant.neighborhood.toLowerCase().includes(neighborhood.toLowerCase()),
      )
    }

    // Apply cuisine filter
    if (cuisine !== "All Cuisines") {
      results = results.filter((restaurant) => restaurant.cuisine_type.toLowerCase().includes(cuisine.toLowerCase()))
    }

    // Apply price range filter
    if (priceRange !== "0") {
      const price = Number.parseInt(priceRange)
      results = results.filter((restaurant) => restaurant.price_range === price)
    }

    // Apply dietary options filter
    if (selectedDietary.length > 0) {
      results = results.filter((restaurant) => {
        if (!restaurant.dietary_options) return false
        return selectedDietary.every((option) => restaurant.dietary_options?.includes(option))
      })
    }

    setFilteredRestaurants(results)
  }, [restaurants, searchQuery, neighborhood, cuisine, priceRange, selectedDietary])

  const handleDietaryChange = (option: string, checked: boolean) => {
    if (checked) {
      setSelectedDietary((prev) => [...prev, option])
    } else {
      setSelectedDietary((prev) => prev.filter((item) => item !== option))
    }
  }

  const clearFilters = () => {
    setSearchQuery("")
    setNeighborhood("All Neighborhoods")
    setCuisine("All Cuisines")
    setPriceRange("0")
    setSelectedDietary([])
  }

  return (
    <>
      <div className="bg-rex-cream min-h-screen">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-rex-black">NYC Restaurants</h1>

            <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search restaurants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-md"
                />
              </div>

              <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="border-rex-red text-rex-red hover:bg-rex-red/10 hover:text-rex-red focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md px-4 py-2 flex items-center gap-2 transition-colors"
                  >
                    <Filter className="h-4 w-4" />
                    <span>Filters</span>
                    {(neighborhood !== "All Neighborhoods" ||
                      cuisine !== "All Cuisines" ||
                      priceRange !== "0" ||
                      selectedDietary.length > 0) && (
                      <Badge variant="destructive" className="ml-2">
                        {[neighborhood !== "All Neighborhoods", cuisine !== "All Cuisines", priceRange !== "0", selectedDietary.length > 0].filter(Boolean).length}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-card border-border text-card-foreground">
                  <SheetHeader className="border-b border-border pb-4 mb-4">
                    <SheetTitle>Filter Restaurants</SheetTitle>
                  </SheetHeader>

                  <div className="py-4 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="neighborhood">Neighborhood</Label>
                      <Select value={neighborhood} onValueChange={setNeighborhood}>
                        <SelectTrigger className="rounded-md">
                          <SelectValue placeholder="Select neighborhood" />
                        </SelectTrigger>
                        <SelectContent>
                          {nycNeighborhoods.map((n) => (
                            <SelectItem key={n} value={n}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cuisine">Cuisine Type</Label>
                      <Select value={cuisine} onValueChange={setCuisine}>
                        <SelectTrigger className="rounded-md">
                          <SelectValue placeholder="Select cuisine" />
                        </SelectTrigger>
                        <SelectContent>
                          {cuisineTypes.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price">Price Range</Label>
                      <Select value={priceRange} onValueChange={setPriceRange}>
                        <SelectTrigger className="rounded-md">
                          <SelectValue placeholder="Select price range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Any Price</SelectItem>
                          <SelectItem value="1">$ (Inexpensive)</SelectItem>
                          <SelectItem value="2">$$ (Moderate)</SelectItem>
                          <SelectItem value="3">$$$ (Expensive)</SelectItem>
                          <SelectItem value="4">$$$$ (Very Expensive)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label>Dietary Options</Label>
                      <div className="space-y-2">
                        {dietaryOptions.map((option) => (
                          <div key={option.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={option.id}
                              checked={selectedDietary.includes(option.id)}
                              onCheckedChange={(checked) => handleDietaryChange(option.id, checked as boolean)}
                            />
                            <Label htmlFor={option.id} className="font-normal">
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-border mt-6">
                      <Button
                        variant="outline"
                        onClick={clearFilters}
                      >
                        Clear Filters
                      </Button>
                      <Button onClick={() => setIsFilterOpen(false)} className="rex-button">
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {(neighborhood !== "All Neighborhoods" ||
            cuisine !== "All Cuisines" ||
            priceRange !== "0" ||
            selectedDietary.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {neighborhood !== "All Neighborhoods" && (
                <Badge
                  variant="secondary"
                  className="pl-2.5 pr-1 py-1 rounded-full cursor-pointer bg-rex-red/15 text-rex-black hover:bg-rex-red/25 flex items-center gap-1 group"
                  onClick={() => setNeighborhood("All Neighborhoods")}
                  title={`Remove filter: ${neighborhood}`}
                >
                  <MapPin className="h-3 w-3 mr-0.5" />
                  {neighborhood}
                  <span className="ml-1 font-bold text-rex-red/80 group-hover:text-rex-red transition-colors">×</span>
                </Badge>
              )}
              {cuisine !== "All Cuisines" && (
                <Badge
                  variant="secondary"
                  className="pl-2.5 pr-1 py-1 rounded-full cursor-pointer bg-rex-red/15 text-rex-black hover:bg-rex-red/25 flex items-center gap-1 group"
                  onClick={() => setCuisine("All Cuisines")}
                  title={`Remove filter: ${cuisine}`}
                >
                  {cuisine}
                  <span className="ml-1 font-bold text-rex-red/80 group-hover:text-rex-red transition-colors">×</span>
                </Badge>
              )}
              {priceRange !== "0" && (
                <Badge
                  variant="secondary"
                  className="pl-2.5 pr-1 py-1 rounded-full cursor-pointer bg-rex-red/15 text-rex-black hover:bg-rex-red/25 flex items-center gap-1 group"
                  onClick={() => setPriceRange("0")}
                  title={`Remove filter: Price ${Array(Number.parseInt(priceRange)).fill("$").join("")}`}
                >
                  {Array(Number.parseInt(priceRange)).fill("$").join("")}
                  <span className="ml-1 font-bold text-rex-red/80 group-hover:text-rex-red transition-colors">×</span>
                </Badge>
              )}
              {selectedDietary.map((option) => {
                const label = dietaryOptions.find((o) => o.id === option)?.label
                return (
                  <Badge
                    key={option}
                    variant="secondary"
                    className="pl-2.5 pr-1 py-1 rounded-full cursor-pointer bg-rex-red/15 text-rex-black hover:bg-rex-red/25 flex items-center gap-1 group"
                    onClick={() => handleDietaryChange(option, false)}
                    title={`Remove filter: ${label}`}
                  >
                    {label}
                    <span className="ml-1 font-bold text-rex-red/80 group-hover:text-rex-red transition-colors">×</span>
                  </Badge>
                )
              })}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-rex-red hover:bg-rex-red/10 hover:text-rex-red h-auto px-2 py-1 rounded-full transition-colors"
              >
                Clear all
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-rex-red" />
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-xl font-medium text-rex-black mb-2">No restaurants match your criteria</p>
              <p className="text-muted-foreground mb-4">Try adjusting your filters or search query.</p>
              <Button
                variant="outline"
                onClick={clearFilters}
                className="border-rex-red text-rex-red hover:bg-rex-red/10 hover:text-rex-red rounded-md transition-colors focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredRestaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
