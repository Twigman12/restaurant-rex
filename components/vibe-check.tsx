"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sparkles, Music, Star, Lightbulb, RefreshCw, AlertCircle } from 'lucide-react'
import type { VibeCheckResponse } from '@/lib/types'

interface VibeCheckProps {
  restaurantId: string
  restaurantName: string
}

export function VibeCheck({ restaurantId, restaurantName }: VibeCheckProps) {
  const [vibeCheck, setVibeCheck] = useState<VibeCheckResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGetVibeCheck = async (forceRefresh = false) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/vibe-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          restaurant_id: restaurantId, 
          force_refresh: forceRefresh 
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get vibe check')
      }

      const data = await response.json()
      setVibeCheck(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  if (vibeCheck) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              AI Vibe Check
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleGetVibeCheck(true)}
              disabled={isLoading}
              title="Refresh vibe check"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Music className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">The Vibe</h4>
                <p className="text-sm">{vibeCheck.ambiance}</p>
              </div>
            </div>

            {vibeCheck.must_orders.length > 0 && (
              <div className="flex items-start gap-3">
                <Star className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Must-Try Dishes</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {vibeCheck.must_orders.map((item, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {vibeCheck.watch_outs.length > 0 && (
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Heads-Up</h4>
                  <ul className="space-y-1">
                    {vibeCheck.watch_outs.map((item, index) => (
                      <li key={index} className="text-sm text-muted-foreground">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {vibeCheck.cached && (
            <p className="text-xs text-muted-foreground text-center pt-2 border-t">
              Cached result • Refreshes every 24 hours
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardContent className="p-6 text-center">
        {error ? (
          <div className="space-y-3">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
            <div>
              <p className="text-sm text-red-500 font-medium mb-1">Something went wrong</p>
              <p className="text-xs text-muted-foreground mb-4">{error}</p>
            </div>
            <Button onClick={() => handleGetVibeCheck()} size="sm" variant="outline">
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Sparkles className="h-8 w-8 text-yellow-500 mx-auto" />
            <div>
              <h3 className="font-medium mb-1">Get the AI Vibe Check</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get an instant summary of what people are saying about {restaurantName}
              </p>
            </div>
            <Button 
              onClick={() => handleGetVibeCheck()} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing reviews...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get Vibe Check
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
