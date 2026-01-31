import type { TagSuggestion } from '../types'

/**
 * Tag Extractor Service
 * Analyzes user notes and suggests relevant tags using keyword matching
 */
export class TagExtractor {
    // Taste descriptor dictionaries
    private readonly TASTE_DESCRIPTORS: Record<string, string[]> = {
        // Spice & Heat
        spicy: ['spicy', 'hot', 'heat', 'chile', 'jalapeño', 'sriracha', 'fire', 'capsaicin'],
        mild: ['mild', 'gentle', 'subtle'],

        // Sweet & Savory
        sweet: ['sweet', 'sugary', 'dessert', 'candy', 'honey', 'maple', 'caramel'],
        savory: ['savory', 'umami', 'rich', 'meaty', 'brothy', 'salty'],
        sour: ['sour', 'tart', 'acidic', 'citrus', 'lemon', 'vinegar', 'tangy'],
        bitter: ['bitter', 'dark', 'coffee', 'cocoa', 'hoppy'],

        // Flavor Intensity
        fresh: ['fresh', 'crisp', 'light', 'clean', 'bright', 'zesty'],
        bold: ['bold', 'intense', 'strong', 'robust', 'powerful'],

        // Texture
        creamy: ['creamy', 'smooth', 'rich', 'buttery', 'velvety', 'silky'],
        crunchy: ['crunchy', 'crispy', 'crisp', 'fried', 'crackling', 'brittle'],
        tender: ['tender', 'soft', 'melt', 'fall-off-bone', 'juicy', 'succulent'],
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
        dessert: ['dessert', 'sweet', 'cake', 'ice cream', 'pie', 'pastry', 'pudding'],
        beverage: ['drink', 'cocktail', 'wine', 'beer', 'juice', 'soda', 'beverage'],
        side: ['side', 'side dish', 'accompaniment'],

        // Specific Dishes
        salad: ['salad', 'greens', 'bowl', 'slaw'],
        soup: ['soup', 'stew', 'broth', 'chili', 'bisque', 'chowder'],
        pasta: ['pasta', 'noodle', 'spaghetti', 'ramen', 'linguine', 'penne'],
        pizza: ['pizza', 'pie', 'flatbread'],
        burger: ['burger', 'hamburger', 'cheeseburger'],
        sandwich: ['sandwich', 'sub', 'hoagie', 'panini', 'wrap'],
        taco: ['taco', 'burrito', 'quesadilla', 'enchilada'],
        rice: ['rice', 'risotto', 'fried rice', 'paella'],
        bread: ['bread', 'roll', 'baguette', 'toast'],

        // Proteins
        seafood: ['fish', 'seafood', 'shrimp', 'salmon', 'tuna', 'cod', 'shellfish', 'lobster', 'crab', 'oyster'],
        meat: ['steak', 'chicken', 'pork', 'beef', 'lamb', 'veal', 'duck'],
        steak: ['steak', 'ribeye', 'filet', 'sirloin', 't-bone'],
        chicken: ['chicken', 'poultry', 'fowl', 'hen'],
        pork: ['pork', 'bacon', 'ham', 'sausage', 'prosciutto'],
        vegetarian: ['vegetarian', 'vegan', 'plant-based', 'veggie', 'meatless'],
    }

    // Quality indicators 
    private readonly QUALITY_INDICATORS: Record<string, string[]> = {
        positive: [
            'amazing', 'excellent', 'perfect', 'delicious', 'incredible', 'outstanding',
            'fantastic', 'wonderful', 'loved', 'favorite', 'best', 'phenomenal', 'exceptional', 'superb'
        ],
        negative: [
            'disappointing', 'bland', 'overcooked', 'cold', 'dry', 'soggy',
            'burnt', 'undercooked', 'stale', 'mediocre', 'bad', 'terrible', 'awful', 'horrible'
        ],
    }

    /**
     * Extract tags from user notes using keyword matching
     */
    extractTags(notes: string): TagSuggestion[] {
        if (!notes || notes.trim().length === 0) return []

        const normalizedNotes = notes.toLowerCase()
        const suggestions: TagSuggestion[] = []

        // Extract taste profile tags
        Object.entries(this.TASTE_DESCRIPTORS).forEach(([tag, keywords]) => {
            const matches = keywords.filter(keyword => normalizedNotes.includes(keyword))
            if (matches.length > 0) {
                suggestions.push({
                    tag,
                    confidence: Math.min(matches.length * 0.3, 1),
                    category: 'taste_profile'
                })
            }
        })

        // Extract dish type tags
        Object.entries(this.DISH_TYPES).forEach(([tag, keywords]) => {
            const matches = keywords.filter(keyword => normalizedNotes.includes(keyword))
            if (matches.length > 0) {
                suggestions.push({
                    tag,
                    confidence: Math.min(matches.length * 0.4, 1),
                    category: 'dish'
                })
            }
        })

        // Extract quality indicators
        Object.entries(this.QUALITY_INDICATORS).forEach(([sentiment, keywords]) => {
            const matches = keywords.filter(keyword => normalizedNotes.includes(keyword))
            if (matches.length > 0) {
                suggestions.push({
                    tag: sentiment,
                    confidence: Math.min(matches.length * 0.5, 1),
                    category: 'quality'
                })
            }
        })

        // Sort by confidence (highest first)
        return suggestions.sort((a, b) => b.confidence - a.confidence)
    }

    /**
     * Get top N suggestions for each category
     */
    getTopSuggestions(notes: string, limit: number = 5): {
        dish_tags: string[]
        taste_profile_tags: string[]
    } {
        const allSuggestions = this.extractTags(notes)

        // Filter by confidence threshold (0.3) and limit
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
            taste_profile_tags: tasteTags
        }
    }

    /**
     * Predict sentiment from notes
     */
    predictSentiment(notes: string): 'positive' | 'neutral' | 'negative' {
        const normalizedNotes = notes.toLowerCase()

        let positiveScore = 0
        let negativeScore = 0

        this.QUALITY_INDICATORS.positive.forEach(word => {
            if (normalizedNotes.includes(word)) positiveScore++
        })

        this.QUALITY_INDICATORS.negative.forEach(word => {
            if (normalizedNotes.includes(word)) negativeScore++
        })

        if (positiveScore > negativeScore + 1) return 'positive'
        if (negativeScore > positiveScore + 1) return 'negative'
        return 'neutral'
    }
}

// Export singleton instance
export const tagExtractor = new TagExtractor()
