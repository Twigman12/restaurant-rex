"use client"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Star, DollarSign, Sparkles } from "lucide-react"
import Link from "next/link"
import type { RecommendationResult } from "@/app/chat/actions"

interface ChatRestaurantCardProps {
  restaurant: RecommendationResult
  showActions?: boolean
}

export function ChatRestaurantCard({ restaurant, showActions = true }: ChatRestaurantCardProps) {
  const formatPrice = (priceLevel: number | null) => {
    if (!priceLevel) return "Price not available"
    return Array(priceLevel).fill("$").join("")
  }

  const formatRating = (rating: number | null) => {
    if (!rating) return "No rating"
    return `${rating.toFixed(1)}`
  }

  const formatLocation = (neighborhood: string, borough: string) => {
    if (neighborhood === 'Unknown' && borough === 'Unknown') {
      return 'Location not available'
    }
    if (neighborhood === 'Unknown') {
      return borough
    }
    if (borough === 'Unknown') {
      return neighborhood
    }
    return `${neighborhood}, ${borough}`
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-white border-rex-red/20 hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold text-rex-black line-clamp-2">
              {restaurant.name}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <MapPin className="h-4 w-4 text-rex-red flex-shrink-0" />
              <span className="text-sm text-rex-black/70 line-clamp-1">
                {formatLocation(restaurant.neighborhood, restaurant.borough)}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-3">
        <div className="space-y-3">
          {/* Cuisine Type */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-rex-red/10 text-rex-red border-rex-red/20">
              {restaurant.cuisine_type}
            </Badge>
          </div>

          {/* Rating and Price */}
          <div className="flex items-center gap-4 text-sm text-rex-black/70">
            <div className="flex items-center gap-1">
              {restaurant.rating && (
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
              )}
              <span>{formatRating(restaurant.rating)}</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-rex-red" />
              <span>{formatPrice(restaurant.price_range)}</span>
            </div>
          </div>

          {/* Reason */}
          <div className="text-sm text-rex-black/80 leading-relaxed">
            <p className="line-clamp-3">{restaurant.reason}</p>
          </div>
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="p-4 border-t border-border flex gap-3 mt-auto">
          <Button
            size="sm"
            asChild
            className="flex-1 rex-button rounded-md"
          >
            <Link href={`/experiences?restaurant=${restaurant.id}`}>Log Experience</Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            asChild
            className="flex-1"
          >
            <Link href={`/restaurants/${restaurant.id}`}>
              <Sparkles className="h-4 w-4 mr-2" />
              Vibe Check
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
