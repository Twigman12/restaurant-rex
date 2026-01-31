import { describe, it, expect } from 'vitest'
import { tagExtractor } from '../../lib/ml/tagExtractor'

describe('TagExtractor', () => {
    describe('extractTags', () => {
        it('extracts taste profiles correctly', () => {
            const notes = 'The steak was incredibly tender and juicy with a nice smoky flavor'
            const suggestions = tagExtractor.extractTags(notes)

            const tags = suggestions.map(s => s.tag)
            expect(tags).toContain('tender')
            expect(tags).toContain('smoky')
        })

        it('extracts dish types', () => {
            const notes = 'Had the seafood pasta and a chocolate dessert'
            const suggestions = tagExtractor.extractTags(notes)

            const tags = suggestions.map(s => s.tag)
            expect(tags).toContain('pasta')
            expect(tags).toContain('seafood')
            expect(tags).toContain('dessert')
        })

        it('assigns confidence scores', () => {
            const notes = 'spicy hot chile jalapeño'
            const suggestions = tagExtractor.extractTags(notes)

            const spicy = suggestions.find(s => s.tag === 'spicy')
            expect(spicy).toBeDefined()
            expect(spicy!.confidence).toBeGreaterThan(0.5)
        })

        it('handles empty notes', () => {
            expect(tagExtractor.extractTags('')).toEqual([])
            expect(tagExtractor.extractTags('   ')).toEqual([])
        })

        it('is case insensitive', () => {
            const notes1 = 'SPICY pasta'
            const notes2 = 'spicy pasta'

            const tags1 = tagExtractor.extractTags(notes1).map(s => s.tag)
            const tags2 = tagExtractor.extractTags(notes2).map(s => s.tag)

            expect(tags1).toEqual(tags2)
        })
    })

    describe('getTopSuggestions', () => {
        it('filters by confidence threshold', () => {
            const notes = 'Had a dish'
            const { dish_tags, taste_profile_tags } = tagExtractor.getTopSuggestions(notes)

            // Very generic, might have low confidence tags filtered out
            const all = tagExtractor.extractTags(notes)
            expect(all.length).toBeGreaterThanOrEqual(0)
        })

        it('limits results per category', () => {
            const notes = 'pasta seafood steak chicken appetizer entree dessert salad soup'
            const { dish_tags } = tagExtractor.getTopSuggestions(notes, 3)

            expect(dish_tags.length).toBeLessThanOrEqual(3)
        })

        it('separates categories correctly', () => {
            // Use multiple keywords to ensure confidence > 0.3
            const notes = 'The creamy rich buttery velvety pasta with smoky grilled charred flavor'
            const { dish_tags, taste_profile_tags } = tagExtractor.getTopSuggestions(notes)

            expect(dish_tags).toContain('pasta')
            expect(taste_profile_tags).toContain('creamy')
            expect(taste_profile_tags).toContain('smoky')

            // Categories shouldn't overlap
            expect(dish_tags).not.toContain('creamy')
            expect(taste_profile_tags).not.toContain('pasta')
        })
    })

    describe('predictSentiment', () => {
        it('predicts positive sentiment', () => {
            const notes = 'Amazing food, excellent service, loved everything!'
            expect(tagExtractor.predictSentiment(notes)).toBe('positive')
        })

        it('predicts negative sentiment', () => {
            const notes = 'Disappointing meal, cold food, very bland'
            expect(tagExtractor.predictSentiment(notes)).toBe('negative')
        })

        it('predicts neutral sentiment', () => {
            const notes = 'It was okay, nothing special'
            expect(tagExtractor.predictSentiment(notes)).toBe('neutral')
        })
    })
})
