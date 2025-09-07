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
    <div className="flex justify-start">
      <Card className="bg-white border-rex-red/20 hover:shadow-md transition-shadow duration-200 max-w-[85%] rounded-xl">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header with name and location */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-rex-black line-clamp-1">
                  {restaurant.name}
                </h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <MapPin className="h-3 w-3 text-rex-red flex-shrink-0" />
                  <span className="text-xs text-rex-black/70 line-clamp-1">
                    {formatLocation(restaurant.neighborhood, restaurant.borough)}
                  </span>
                </div>
              </div>
              <Badge variant="secondary" className="bg-rex-red/10 text-rex-red border-rex-red/20 text-xs px-2 py-1 flex-shrink-0">
                {restaurant.cuisine_type}
              </Badge>
            </div>

            {/* Rating and Price */}
            <div className="flex items-center gap-3 text-xs text-rex-black/70">
              {restaurant.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                  <span>{formatRating(restaurant.rating)}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-rex-red" />
                <span>{formatPrice(restaurant.price_range)}</span>
              </div>
            </div>

            {/* Reason */}
            <div className="text-xs text-rex-black/80 leading-relaxed">
              <p className="line-clamp-2">{restaurant.reason}</p>
            </div>

            {/* Actions */}
            {showActions && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  asChild
                  className="flex-1 rex-button rounded-md h-8 text-xs"
                >
                  <Link href={`/experiences?restaurant=${restaurant.id}`}>Log Experience</Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="flex-1 h-8 text-xs"
                >
                  <Link href={`/restaurants/${restaurant.id}`}>
                    <Sparkles className="h-3 w-3 mr-1" />
                    Vibe Check
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
