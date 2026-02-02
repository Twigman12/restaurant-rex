'use client'

import { useState, useEffect } from 'react'
import { analyzeNotes, AnalysisResult } from '@/app/actions/analyze-notes'

export type TagSuggestions = AnalysisResult

/**
 * React hook for real-time tag suggestions
 * Debounces analysis to avoid excessive computations
 */
export function useTagSuggestions(notes: string, debounceMs: number = 500) {
    const [suggestions, setSuggestions] = useState<TagSuggestions>({
        dish_tags: [],
        taste_profile_tags: [],
        patterns: [],
        summary: ''
    })

    const [isAnalyzing, setIsAnalyzing] = useState(false)

    useEffect(() => {
        // Reset if notes are too short
        if (!notes || notes.length < 10) {
            setSuggestions({
                dish_tags: [],
                taste_profile_tags: [],
                patterns: [],
                summary: ''
            })
            setIsAnalyzing(false)
            return
        }

        setIsAnalyzing(true)

        // Debounce analysis
        const timer = setTimeout(async () => {
            try {
                const result = await analyzeNotes(notes)
                setSuggestions(result)
            } catch (err) {
                console.error("Failed to analyze notes:", err)
            } finally {
                setIsAnalyzing(false)
            }
        }, debounceMs)

        // Cleanup
        return () => {
            clearTimeout(timer)
        }
    }, [notes, debounceMs])

    return { suggestions, isAnalyzing }
}
