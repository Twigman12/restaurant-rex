"use client"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Star, DollarSign, Sparkles, Target } from "lucide-react"
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
    <div className="flex justify-start max-w-[75%]">
      <Card className="bg-[beige] border-4 border-black hover:border-[#e53935] transition-colors duration-200 w-full overflow-hidden">
        <CardContent className="p-4 pb-4">
          <div className="space-y-3">
            {/* Header with name and location */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-[#121212] line-clamp-1">
                  {restaurant.name}
                </h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <MapPin className="h-3 w-3 text-[#e53935] flex-shrink-0" />
                  <span className="text-xs text-[#121212]/70 line-clamp-1">
                    {formatLocation(restaurant.neighborhood, restaurant.borough)}
                  </span>
                </div>
              </div>
              {restaurant.cuisine_type && 
               !restaurant.cuisine_type.includes('establishment') && 
               !restaurant.cuisine_type.includes('point_of_interest') && (
                <Badge variant="secondary" className="bg-[#e53935]/10 text-[#e53935] border-[#e53935]/20 text-xs px-2 py-1 flex-shrink-0">
                  {restaurant.cuisine_type}
                </Badge>
              )}
            </div>

            {/* Rating, Price, and Match Score */}
            <div className="flex items-center gap-3 text-xs text-[#121212]/70">
              {restaurant.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                  <span>{formatRating(restaurant.rating)}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-[#e53935]" />
                <span>{formatPrice(restaurant.price_range)}</span>
              </div>
              {restaurant.matching_score && (
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3 text-[#e53935]" />
                  <span className="font-medium">{restaurant.matching_score}%</span>
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="text-xs text-[#121212]/80 leading-relaxed">
              <p className="line-clamp-3">{restaurant.reason}</p>
            </div>

            {/* Actions */}
            {showActions && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  asChild
                  className="flex-1 bg-[#e53935] hover:bg-[#e53935]/90 text-white border-2 border-black h-8 text-xs px-3 min-w-0"
                >
                  <Link href={`/experiences?restaurant=${restaurant.id}`} className="truncate">
                    Log Experience
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="flex-1 border-2 border-black hover:bg-black/10 h-8 text-xs px-3 min-w-0"
                >
                  <Link href={`/restaurants/${restaurant.id}`} className="truncate">
                    <Sparkles className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate">Vibe Check</span>
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
