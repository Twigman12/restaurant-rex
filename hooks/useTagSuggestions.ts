'use client'

import { useState, useEffect } from 'react'
import { tagExtractor } from '@/lib/ml/tagExtractor'

export interface TagSuggestions {
    dish_tags: string[]
    taste_profile_tags: string[]
}

/**
 * React hook for real-time tag suggestions
 * Debounces analysis to avoid excessive computations
 */
export function useTagSuggestions(notes: string, debounceMs: number = 500) {
    const [suggestions, setSuggestions] = useState<TagSuggestions>({
        dish_tags: [],
        taste_profile_tags: []
    })

    const [isAnalyzing, setIsAnalyzing] = useState(false)

    useEffect(() => {
        // Reset if notes are too short
        if (!notes || notes.length < 10) {
            setSuggestions({ dish_tags: [], taste_profile_tags: [] })
            setIsAnalyzing(false)
            return
        }

        setIsAnalyzing(true)

        // Debounce analysis
        const timer = setTimeout(() => {
            const extracted = tagExtractor.getTopSuggestions(notes)
            setSuggestions(extracted)
            setIsAnalyzing(false)
        }, debounceMs)

        // Cleanup
        return () => {
            clearTimeout(timer)
        }
    }, [notes, debounceMs])

    return { suggestions, isAnalyzing }
}
