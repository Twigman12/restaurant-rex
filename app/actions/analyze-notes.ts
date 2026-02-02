'use server'

import { tagExtractor } from '@/lib/ml/tagExtractor'
import type { TagSuggestion } from '@/lib/types'

export interface AnalysisResult {
    dish_tags: string[]
    taste_profile_tags: string[]
    patterns: string[]
    summary: string
}

export async function analyzeNotes(notes: string): Promise<AnalysisResult> {
    if (!notes || notes.length < 10) {
        return {
            dish_tags: [],
            taste_profile_tags: [],
            patterns: [],
            summary: ''
        }
    }

    try {
        return tagExtractor.getAnalysis(notes)
    } catch (error) {
        console.error('Error analyzing notes:', error)
        return {
            dish_tags: [],
            taste_profile_tags: [],
            patterns: [],
            summary: ''
        }
    }
}
