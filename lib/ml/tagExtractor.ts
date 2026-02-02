import { PorterStemmer, TfIdf, NGrams, WordTokenizer } from 'natural'
import type { TagSuggestion } from '../types'

/**
 * Tag Extractor Service
 * Analyzes user notes and suggests relevant tags using NLP techniques
 */
export class TagExtractor {
    // Taste descriptor dictionaries (values should be un-stemmed, we stem them at runtime)
    private readonly TASTE_DESCRIPTORS: Record<string, string[]> = {
        // Spice & Heat
        spicy: ['spicy', 'hot', 'heat', 'chile', 'jalapeno', 'sriracha', 'fire', 'capsaicin', 'pepper'],
        mild: ['mild', 'gentle', 'subtle'],

        // Sweet & Savory
        sweet: ['sweet', 'sugary', 'dessert', 'candy', 'honey', 'maple', 'caramel'],
        savory: ['savory', 'umami', 'rich', 'meaty', 'brothy', 'salty'],
        sour: ['sour', 'tart', 'acidic', 'citrus', 'lemon', 'vinegar', 'tangy'],
        bitter: ['bitter', 'dark', 'coffee', 'cocoa', 'hoppy'],

        // Flavor Intensity
        fresh: ['fresh', 'crisp', 'light', 'clean', 'bright', 'zesty'],
        bold: ['bold', 'intense', 'strong', 'robust', 'powerful', 'punchy'],

        // Texture
        creamy: ['creamy', 'smooth', 'rich', 'buttery', 'velvety', 'silky'],
        crunchy: ['crunchy', 'crispy', 'crisp', 'fried', 'crackling', 'brittle'],
        tender: ['tender', 'soft', 'melt', 'juicy', 'succulent'],
        chewy: ['chewy', 'tough', 'rubbery', 'dense'],
        flaky: ['flaky', 'layered', 'delicate', 'crumbly'],

        // Cooking Methods
        smoky: ['smoky', 'grilled', 'charred', 'barbecue', 'smoked', 'bbq'],
        garlicky: ['garlicky', 'garlic', 'garliced'],
        herby: ['herby', 'herbaceous', 'herb', 'herbs', 'basil', 'oregano', 'thyme'],
        earthy: ['earthy', 'rustic', 'mushroom', 'truffle'],
        nutty: ['nutty', 'toasted', 'roasted', 'almond'],
    }

    // Dish type dictionaries
    private readonly DISH_TYPES: Record<string, string[]> = {
        // Course Types
        appetizer: ['appetizer', 'starter', 'app', 'small plate', 'tapas', 'amuse-bouche'],
        entree: ['entree', 'main', 'entrée', 'dinner', 'plate', 'main course'],
        dessert: ['dessert', 'sweet', 'cake', 'ice cream', 'pie', 'pastry', 'pudding', 'chocolate'],
        beverage: ['drink', 'cocktail', 'wine', 'beer', 'juice', 'soda', 'beverage'],
        side: ['side', 'side dish', 'accompaniment'],

        // Specific Dishes
        salad: ['salad', 'greens', 'bowl', 'slaw'],
        soup: ['soup', 'stew', 'broth', 'chili', 'bisque', 'chowder'],
        pasta: ['pasta', 'noodle', 'spaghetti', 'ramen', 'linguine', 'penne'],
        pizza: ['pizza', 'pie', 'flatbread', 'slice'],
        burger: ['burger', 'hamburger', 'cheeseburger', 'slider'],
        sandwich: ['sandwich', 'sub', 'hoagie', 'panini', 'wrap'],
        taco: ['taco', 'burrito', 'quesadilla', 'enchilada'],
        rice: ['rice', 'risotto', 'fried rice', 'paella'],
        bread: ['bread', 'roll', 'baguette', 'toast', 'bun'],

        // Proteins
        seafood: ['fish', 'seafood', 'shrimp', 'salmon', 'tuna', 'cod', 'shellfish', 'lobster', 'crab', 'oyster', 'sushi'],
        meat: ['steak', 'chicken', 'pork', 'beef', 'lamb', 'veal', 'duck', 'ribs'],
        steak: ['steak', 'ribeye', 'filet', 'sirloin', 't-bone'],
        chicken: ['chicken', 'poultry', 'fowl', 'hen'],
        pork: ['pork', 'bacon', 'ham', 'sausage', 'prosciutto'],
        vegetarian: ['vegetarian', 'vegan', 'plant-based', 'veggie', 'meatless'],
    }

    // Quality indicators 
    private readonly QUALITY_INDICATORS: Record<string, string[]> = {
        positive: [
            'amazing', 'excellent', 'perfect', 'delicious', 'incredible', 'outstanding',
            'fantastic', 'wonderful', 'loved', 'favorite', 'best', 'phenomenal', 'exceptional', 'superb',
            'great', 'good', 'nice', 'tasty', 'yummy'
        ],
        negative: [
            'disappointing', 'bland', 'overcooked', 'cold', 'dry', 'soggy',
            'burnt', 'undercooked', 'stale', 'mediocre', 'bad', 'terrible', 'awful', 'horrible',
            'worst', 'poor', 'gross'
        ],
    }

    private stemmedTasteDescriptors: Record<string, string[]> = {}
    private stemmedDishTypes: Record<string, string[]> = {}
    private stemmedQualityIndicators: Record<string, string[]> = {}

    constructor() {
        this.precomputeStems()
    }

    /**
     * Pre-compute stemmed versions of all dictionary words for faster lookup
     */
    private precomputeStems() {
        const stemDictionary = (source: Record<string, string[]>) => {
            const stemmed: Record<string, string[]> = {}
            Object.entries(source).forEach(([key, words]) => {
                stemmed[key] = words.map(word => PorterStemmer.stem(word)).filter(Boolean) as string[]
            })
            return stemmed
        }

        this.stemmedTasteDescriptors = stemDictionary(this.TASTE_DESCRIPTORS)
        this.stemmedDishTypes = stemDictionary(this.DISH_TYPES)
        this.stemmedQualityIndicators = stemDictionary(this.QUALITY_INDICATORS)
    }

    /**
     * Extract tags from user notes using stemmed keyword matching and negation handling
     */
    extractTags(notes: string): TagSuggestion[] {
        if (!notes || notes.trim().length === 0) return []

        // Tokenize and stem input
        const tokenizer = new WordTokenizer()
        const tokens = tokenizer.tokenize(notes.toLowerCase())
        if (!tokens || tokens.length === 0) return []

        const stemmedTokens = tokens.map(t => PorterStemmer.stem(t))

        // simple negation detection: check if previous token is a negator
        // We use the original tokens for negation check to capture "not", "no" etc.
        const negators = ['not', 'no', 'never', 'neither', 'nor', 'without', 'lacked']

        const suggestions: TagSuggestion[] = []

        const checkMatches = (
            stemmedDict: Record<string, string[]>,
            category: 'dish' | 'taste_profile' | 'quality',
            multiplier: number
        ) => {
            Object.entries(stemmedDict).forEach(([tag, stems]) => {
                let matchCount = 0

                stems.forEach(stem => {
                    const idx = stemmedTokens.indexOf(stem)
                    if (idx !== -1) {
                        // Check for negation in the 2 words preceding the match
                        const prev1 = idx > 0 ? tokens[idx - 1] : ''
                        const prev2 = idx > 1 ? tokens[idx - 2] : ''

                        const isNegated = negators.includes(prev1) || negators.includes(prev2)

                        if (!isNegated) {
                            matchCount++
                        }
                    }
                })

                if (matchCount > 0) {
                    suggestions.push({
                        tag,
                        confidence: Math.min(matchCount * multiplier, 1),
                        category
                    })
                }
            })
        }

        checkMatches(this.stemmedTasteDescriptors, 'taste_profile', 0.35)
        checkMatches(this.stemmedDishTypes, 'dish', 0.45)
        checkMatches(this.stemmedQualityIndicators, 'quality', 0.55)

        return suggestions.sort((a, b) => b.confidence - a.confidence)
    }

    /**
     * Get top N tags + patterns + summary
     */
    getAnalysis(notes: string, limit: number = 5): {
        dish_tags: string[]
        taste_profile_tags: string[]
        patterns: string[]
        summary: string
    } {
        const allSuggestions = this.extractTags(notes)

        const dishTags = allSuggestions
            .filter(s => s.category === 'dish' && s.confidence > 0.3)
            .slice(0, limit)
            .map(s => s.tag)

        const tasteTags = allSuggestions
            .filter(s => s.category === 'taste_profile' && s.confidence > 0.3)
            .slice(0, limit)
            .map(s => s.tag)

        return {
            dish_tags: dishTags,
            taste_profile_tags: tasteTags,
            patterns: this.extractPatterns(notes),
            summary: this.summarizeNotes(notes)
        }
    }

    /**
     * Legacy support method for the hook
     */
    getTopSuggestions(notes: string, limit: number = 5) {
        return this.getAnalysis(notes, limit)
    }

    /**
     * Extract frequent or significant bigrams (2-word phrases)
     * e.g. "slow service", "outdoor seating"
     */
    extractPatterns(notes: string): string[] {
        if (!notes || notes.length < 20) return []

        const tokenizer = new WordTokenizer()
        const tokens = tokenizer.tokenize(notes.toLowerCase())

        // Get bigrams
        const bigrams = NGrams.bigrams(tokens)

        // Filter out bigrams containing stop words
        // We do a simple check: both words must be > 2 chars
        const stopWords = ['the', 'and', 'but', 'for', 'was', 'with', 'this', 'that', 'have', 'had', 'not', 'are', 'were']

        const meaningfulBigrams = bigrams.filter(gram => {
            const [w1, w2] = gram
            if (w1.length < 3 || w2.length < 3) return false
            if (stopWords.includes(w1) || stopWords.includes(w2)) return false
            return true
        })

        // Count frequency
        const counts: Record<string, number> = {}
        meaningfulBigrams.forEach(gram => {
            const key = gram.join(' ')
            counts[key] = (counts[key] || 0) + 1
        })

        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1]) // Sort by frequency
            .slice(0, 3) // Top 3 patterns
            .map(([gram]) => gram)
    }

    /**
     * Summarize notes by finding the most "information dense" sentence using TF-IDF
     */
    summarizeNotes(notes: string): string {
        if (!notes) return ''

        // 1. Split into sentences (simple regex split)
        const sentences = notes.match(/[^.!?]+[.!?]+/g) || [notes]

        if (sentences.length <= 1) return notes

        // 2. Compute TF-IDF
        const tfidf = new TfIdf()
        sentences.forEach(sentence => tfidf.addDocument(sentence))

        // 3. Score sentences
        // We sum the TF-IDF score of the top 5 terms in each sentence
        const scores = sentences.map((sentence, index) => {
            let score = 0
            tfidf.listTerms(index).slice(0, 5).forEach(item => {
                score += item.tfidf
            })
            return {
                sentence: sentence.trim(),
                score
            }
        })

        // 4. Return top scoring sentence
        scores.sort((a, b) => b.score - a.score)
        return scores[0].sentence
    }

    /**
     * Predict sentiment from notes
     */
    predictSentiment(notes: string): 'positive' | 'neutral' | 'negative' {
        // Reuse extraction logic which already handles negation and stemming
        const suggestions = this.extractTags(notes)
        const qualityTags = suggestions.filter(s => s.category === 'quality')

        let positiveScore = 0
        let negativeScore = 0

        qualityTags.forEach(tag => {
            if (tag.tag === 'positive') positiveScore += tag.confidence
            if (tag.tag === 'negative') negativeScore += tag.confidence
        })

        if (positiveScore > negativeScore + 0.2) return 'positive'
        if (negativeScore > positiveScore + 0.2) return 'negative'
        return 'neutral'
    }
}

// Export singleton instance
export const tagExtractor = new TagExtractor()
