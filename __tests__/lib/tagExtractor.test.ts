import { describe, it, expect } from 'vitest'
import { tagExtractor } from '../../lib/ml/tagExtractor'

describe('TagExtractor', () => {
    describe('extractTags', () => {
        // ... (Existing Tests preserved but slightly updated if needed)
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

        // NEW: Stemming tests
        it('handles stemmed variations', () => {
            // "grilled" -> "grill", "spices" -> "spice"
            // Dictionary: 'smoky': [..., 'grilled', ...]
            // Dictionary: 'spicy': [..., 'pepper', ...]

            // Note: Porter stemmer stems "spices" -> "spice", "spicy" -> "spici"
            // So we need to ensure our inputs trigger the stems in our dictionary

            // "grilled" stems to "grill"
            // "grilling" stems to "grill"
            const notes1 = 'I tried the grilled fish'
            const notes2 = 'I love grilling fish'

            const tags1 = tagExtractor.extractTags(notes1).map(s => s.tag)
            const tags2 = tagExtractor.extractTags(notes2).map(s => s.tag)

            expect(tags1).toContain('smoky') // "grilled" maps to smoky
            expect(tags2).toContain('smoky')
        })

        // NEW: Negation tests
        it('ignores negated terms', () => {
            const notes = 'The food was not spicy at all and no garlic'
            const suggestions = tagExtractor.extractTags(notes)
            const tags = suggestions.map(s => s.tag)

            expect(tags).not.toContain('spicy')
            expect(tags).not.toContain('garlicky')
        })

        it('ignores double negatives or far away negations', () => {
            // "not" only affects next 2 words
            const notes = 'It was not bad, actually it was spicy'
            // "bad" is quality:negative. "not bad" -> should eliminate bad?
            // "spicy" is 4 words away from "not", so it should be tagged.

            const suggestions = tagExtractor.extractTags(notes)
            const tags = suggestions.map(s => s.tag)

            expect(tags).toContain('spicy')
        })
    })

    describe('summarizeNotes', () => {
        it('picks the most relevant sentence', () => {
            const notes = 'The service was slow. However, the steak was absolutely incredible and the best I have ever had. The decor was okay.'
            // The middle sentence has more unique/strong words ("steak", "incredible", "best")

            const summary = tagExtractor.summarizeNotes(notes)
            expect(summary).toContain('steak was absolutely incredible')
        })

        it('returns original text if short', () => {
            const notes = 'Short review.'
            expect(tagExtractor.summarizeNotes(notes)).toBe(notes)
        })
    })

    describe('extractPatterns', () => {
        it('identifies frequent bigrams', () => {
            // Repeat "slow service" multiple times
            const notes = 'The slow service was annoying. I hate slow service. recurrence of slow service.'
            const patterns = tagExtractor.extractPatterns(notes)

            expect(patterns).toContain('slow service')
        })
    })

    describe('predictSentiment', () => {
        it('predicts positive sentiment', () => {
            const notes = 'Amazing food, excellent service, loved everything!'
            expect(tagExtractor.predictSentiment(notes)).toBe('positive')
        })

        // Test negation impact on sentiment
        it('handles negated positive words', () => {
            const notes = 'It was not amazing, it was not good.'
            // If "amazing" and "good" are ignored, score is 0 -> neutral (or negative depending on other words)
            // If naive, would be positive.
            expect(tagExtractor.predictSentiment(notes)).not.toBe('positive')
        })
    })
})
