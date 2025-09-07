import { NextRequest, NextResponse } from 'next/server'
import { VibeCheckService } from '@/lib/services/vibe-check-service'
import type { VibeCheckRequest } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body: VibeCheckRequest = await request.json()
    const { restaurant_id, force_refresh = false } = body
    
    if (!restaurant_id) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' }, 
        { status: 400 }
      )
    }

    const vibeCheckService = new VibeCheckService()
    const result = await vibeCheckService.generateVibeCheck(restaurant_id, force_refresh)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Vibe check error:', error)
    
    // Return a more specific error message
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate vibe check'
    
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    )
  }
}

// Optional: Add a GET endpoint to check if a vibe check exists
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurant_id = searchParams.get('restaurant_id')
    
    if (!restaurant_id) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' }, 
        { status: 400 }
      )
    }

    const vibeCheckService = new VibeCheckService()
    const cached = await vibeCheckService.getCachedVibeCheck(restaurant_id)
    
    return NextResponse.json({
      exists: !!cached,
      expires_at: cached?.expires_at
    })
  } catch (error) {
    console.error('Vibe check status error:', error)
    return NextResponse.json(
      { error: 'Failed to check vibe check status' }, 
      { status: 500 }
    )
  }
}
