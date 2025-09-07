import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, DollarSign, Sparkles, Star, Target } from "lucide-react"
import Link from "next/link"
import type { Restaurant } from "@/lib/types"
import { Badge } from "@/components/ui/badge"

interface RestaurantCardProps {
  restaurant: Restaurant
  reason?: string
  showActions?: boolean
}

export function RestaurantCard({ restaurant, reason, showActions = true }: RestaurantCardProps) {
  return (
    <Card className="rex-card flex flex-col h-full transition-transform duration-200 ease-in-out hover:-translate-y-1 hover:scale-[1.02]">
      <CardHeader className="p-4 sm:p-5">
        <CardTitle className="text-base sm:text-lg font-semibold text-foreground leading-tight">{restaurant.name}</CardTitle>
        <CardDescription className="flex items-center text-xs sm:text-sm text-muted-foreground pt-1">
          <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
          <span className="truncate">{restaurant.neighborhood}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 space-y-4 sm:space-y-5 flex-grow">
        <div className="flex flex-col sm:flex-row sm:items-center text-xs sm:text-sm gap-1 sm:gap-0">
          <span className="font-medium text-muted-foreground sm:w-16">Cuisine:</span>
          <span className="text-foreground break-words">{restaurant.cuisine_type}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center text-xs sm:text-sm gap-1 sm:gap-0">
          <span className="font-medium text-muted-foreground sm:w-16">Price:</span>
          <div className="flex items-center">
            {Array.from({ length: restaurant.price_range || 0 }).map((_, i) => (
              <DollarSign key={i} className="h-3 w-3 sm:h-4 sm:w-4 text-rex-red" />
            ))}
            {Array.from({ length: 4 - (restaurant.price_range || 0) }).map((_, i) => (
              <DollarSign key={i} className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground/50" />
            ))}
          </div>
        </div>

        {/* Rating */}
        {restaurant.rating && (
          <div className="flex flex-col sm:flex-row sm:items-center text-xs sm:text-sm gap-1 sm:gap-0">
            <span className="font-medium text-muted-foreground sm:w-16">Rating:</span>
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 fill-current" />
              <span className="text-foreground">{restaurant.rating.toFixed(1)}</span>
              {restaurant.user_ratings_total && (
                <span className="text-muted-foreground">({restaurant.user_ratings_total})</span>
              )}
            </div>
          </div>
        )}

        {/* Matching Score */}
        {restaurant.matching_score && (
          <div className="flex flex-col sm:flex-row sm:items-center text-xs sm:text-sm gap-1 sm:gap-0">
            <span className="font-medium text-muted-foreground sm:w-16">Match:</span>
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 sm:h-4 sm:w-4 text-rex-red" />
              <span className="text-foreground font-medium">{restaurant.matching_score}%</span>
            </div>
          </div>
        )}

        {restaurant.dietary_options && restaurant.dietary_options.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-2">
            {restaurant.dietary_options.map((option) => (
              <Badge key={option} variant="outline" className="px-2 py-0.5 text-xs rounded-full font-normal">
                {option}
              </Badge>
            ))}
          </div>
        )}

        {reason && (
          <div className="text-xs sm:text-sm pt-3">
            <p className="font-medium text-muted-foreground mb-2">Why REX recommends it:</p>
            <p className="text-foreground leading-relaxed">{reason}</p>
          </div>
        )}
      </CardContent>

      {showActions && (
        <CardFooter className="p-4 sm:p-5 border-t border-border flex flex-col sm:flex-row gap-3 sm:gap-4 mt-auto">
          <Button 
            size="sm" 
            asChild 
            className="flex-1 rex-button rounded-md h-10 sm:h-9"
          >
            <Link href={`/experiences?restaurant=${restaurant.id}`}>Log Experience</Link>
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            asChild 
            className="flex-1 h-10 sm:h-9"
          >
            <Link href={`/restaurants/${restaurant.id}`}>
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Vibe Check
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
