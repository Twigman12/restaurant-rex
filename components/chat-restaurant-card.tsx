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
    <div className="flex justify-start max-w-[75%] animate-in fade-in slide-in-from-left-5 duration-300">
      <Card 
        className="bg-[beige] border-4 border-black hover:border-[#e53935] transition-all duration-200 w-full overflow-hidden"
        style={{ 
          boxShadow: '6px 6px 0px rgba(0, 0, 0, 1), 0 0 15px rgba(245, 245, 220, 0.3)',
        }}
      >
        <CardContent className="p-4 pb-4">
          <div className="space-y-3">
            {/* Header with name and location */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-[#121212] line-clamp-1 uppercase tracking-wide">
                  {restaurant.name}
                </h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <MapPin className="h-3 w-3 text-[#e53935] flex-shrink-0" />
                  <span className="text-xs text-[#121212]/70 line-clamp-1 font-medium">
                    {formatLocation(restaurant.neighborhood, restaurant.borough)}
                  </span>
                </div>
              </div>
              {restaurant.cuisine_type && 
               !restaurant.cuisine_type.includes('establishment') && 
               !restaurant.cuisine_type.includes('point_of_interest') && (
                <Badge 
                  variant="secondary" 
                  className="bg-[#e53935] text-white border-2 border-black text-xs px-2 py-1 flex-shrink-0 font-bold uppercase"
                  style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
                >
                  {restaurant.cuisine_type}
                </Badge>
              )}
            </div>

            {/* Rating, Price, and Match Score */}
            <div className="flex items-center gap-3 text-xs text-[#121212] font-bold">
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
                  <span className="font-bold">{restaurant.matching_score}%</span>
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="text-xs text-[#121212] leading-relaxed font-normal">
              <p className="line-clamp-3">{restaurant.reason}</p>
            </div>

            {/* Actions */}
            {showActions && (
              <div className="flex gap-2 pt-2">
                <button
                  className="flex-1 bg-[#e53935] hover:scale-105 active:translate-x-[2px] active:translate-y-[2px] text-white border-2 border-black h-8 text-xs px-3 min-w-0 font-bold uppercase tracking-wide transition-all"
                  style={{ boxShadow: '3px 3px 0px rgba(0, 0, 0, 1)' }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.boxShadow = '1px 1px 0px rgba(0, 0, 0, 1)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.boxShadow = '3px 3px 0px rgba(0, 0, 0, 1)';
                  }}
                  onClick={() => window.location.href = `/experiences?restaurant=${restaurant.id}`}
                >
                  Log
                </button>
                <button
                  className="flex-1 bg-[beige] border-2 border-black hover:scale-105 active:translate-x-[2px] active:translate-y-[2px] hover:bg-black/5 h-8 text-xs px-3 min-w-0 font-bold uppercase tracking-wide transition-all text-[#121212]"
                  style={{ boxShadow: '3px 3px 0px rgba(0, 0, 0, 1)' }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.boxShadow = '1px 1px 0px rgba(0, 0, 0, 1)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.boxShadow = '3px 3px 0px rgba(0, 0, 0, 1)';
                  }}
                  onClick={() => window.location.href = `/restaurants/${restaurant.id}`}
                >
                  <span className="flex items-center justify-center gap-1">
                    <Sparkles className="h-3 w-3 flex-shrink-0" />
                    <span>Vibe</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
