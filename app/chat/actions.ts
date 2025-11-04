"use server"

import { createServerSupabaseClient } from "@/lib/supabase"
import type { Restaurant, Scenario } from "@/lib/types"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { Client, Place, TextSearchRequest } from "@googlemaps/google-maps-services-js"

// Define the structure for the returned recommendations
export interface RecommendationResult extends Restaurant {
  reason: string
}

// Ensure the correct API keys are loaded
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

// Initialize Google Maps Client
const googleMapsClient = new Client({})

interface ExtractedPreferences {
  cuisines?: string[]
  neighborhoods?: string[]
  boroughs?: string[]
  dietary?: string[]
  scenario?: string
  price?: string // e.g., "$", "$$", "$$$", "$$$$"
  mood?: string // NEW: User's current mood (e.g., "adventurous", "comfort", "celebratory")
  vibe?: string // NEW: Desired restaurant vibe (e.g., "lively", "intimate", "chill", "fancy")
  other?: string[]
  followUpQuestion?: string // New field for follow-up questions
}

// Define the structure for the function's response
export interface GetRecommendationsResponse {
  recommendations: RecommendationResult[]
  followUpQuestion?: string
  extractedPreferences?: ExtractedPreferences // Return preferences so they can be reused
}

// Helper function to safely parse JSON
function safeJsonParse(str: string): ExtractedPreferences | null {
  try {
    // Sometimes the model might return the JSON within triple backticks
    const match = str.match(/```json\n?(\{[\s\S]*?\})\n?```/)
    const jsonStr = match ? match[1] : str
    return JSON.parse(jsonStr) as ExtractedPreferences
  } catch (e) {
    console.error("Failed to parse JSON from Gemini:", e)
    console.error("Original string:", str)
    return null
  }
}

// Try multiple Gemini model identifiers to avoid regional/access 404s
async function generateWithGeminiFallback(prompt: string) {
  const candidateModels = [
    // Prefer stable 2.x models returned by ListModels for this key
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-flash-latest",
    "gemini-pro-latest",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
  ]

  let lastError: unknown = null
  for (const modelName of candidateModels) {
    try {
      console.log("Attempting Gemini model:", modelName)
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent(prompt)
      return result
    } catch (error: any) {
      lastError = error
      const message: string = error?.message || ""
      const status: number | undefined = error?.status
      // Continue to next candidate only on 404 model-not-found errors
      if (status === 404 || message.includes("404") || message.includes("was not found")) {
        console.warn(`Model not found or unsupported (${modelName}). Trying next…`)
        continue
      }
      // For other errors (401/429/etc.), stop early
      throw error
    }
  }
  throw lastError
}

// Function to get Manhattan neighborhoods
function getManhattanNeighborhoods(): string[] {
  return [
    "Lower Manhattan", "Financial District", "Tribeca", "Chinatown", 
    "SoHo", "Greenwich Village", "East Village", "Chelsea", 
    "Midtown", "Upper East Side", "Upper West Side", "Harlem"
  ];
}

// Function to get Brooklyn neighborhoods
function getBrooklynNeighborhoods(): string[] {
  return [
    "Williamsburg", "DUMBO", "Brooklyn Heights", "Park Slope",
    "Bushwick", "Bed-Stuy", "Greenpoint", "Crown Heights"
  ];
}

// Function to get Queens neighborhoods
function getQueensNeighborhoods(): string[] {
  return [
    "Astoria", "Long Island City", "Jackson Heights", "Flushing",
    "Forest Hills", "Jamaica", "Elmhurst", "Woodside", "Richmond Hill"
  ];
}

// New Function: Search Google Places API
async function searchGooglePlaces(
  preferences: ExtractedPreferences,
): Promise<{ results: Place[]; hadError: boolean }> {
  if (!preferences.cuisines?.length && !preferences.other?.length) {
    // Not enough information to search
    return { results: [], hadError: false }
  }

  // Build a query from user preferences
  const queryParts = [
    ...(preferences.cuisines || []),
    ...(preferences.other || []),
    "restaurant",
  ]
  if (preferences.neighborhoods?.length) {
    queryParts.push(`in ${preferences.neighborhoods.join(" or ")}`)
  } else if (preferences.boroughs?.length) {
    queryParts.push(`in ${preferences.boroughs.join(" or ")}`)
  } else {
    queryParts.push("in NYC")
  }

  const query = queryParts.join(" ")
  console.log("Constructed Google Places Query:", query)

  const searchParams: TextSearchRequest["params"] = {
    query,
    key: process.env.GOOGLE_MAPS_API_KEY!,
    // Add more parameters like 'type', 'region' for better results
  }

  try {
    const response = await googleMapsClient.textSearch({ params: searchParams })
    if (response.data.results) {
      return { results: response.data.results as Place[], hadError: false }
    }
    return { results: [], hadError: false }
  } catch (error: any) {
    console.error("Google Places API error. Full details below:");
    if (error.response) {
      console.error("Response Status:", error.response.status);
      console.error("Response Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Error Message:", error.message);
    }
    return { results: [], hadError: true }
  }
}

// Function to get restaurant recommendations using Gemini
export async function getRecommendations(
  message: string,
  userId: string,
  chatHistory: Array<{ role: "user" | "model"; parts: string }> = [],
  followUpCount: number = 0, // New parameter for follow-up count
  storedPreferences?: ExtractedPreferences, // For "more options" requests
  resultOffset: number = 0, // For pagination
): Promise<GetRecommendationsResponse> {
  // Initialize variables
  const supabase = createServerSupabaseClient()
  let extractedPrefs: ExtractedPreferences | null = null
  let restaurants: any[] = []

  // Check if user is asking for more options/details
  const isAskingForMore = 
    message.toLowerCase().includes("more option") || 
    message.toLowerCase().includes("more detail") ||
    message.toLowerCase().includes("show me more") ||
    message.toLowerCase().includes("what else") ||
    message.toLowerCase().includes("other option") ||
    message.toLowerCase().includes("more suggestion") ||
    message.toLowerCase().includes("something else");

  // If asking for more and we have stored preferences, use them
  if (isAskingForMore && storedPreferences) {
    extractedPrefs = storedPreferences;
    // Skip to the search section without re-extracting preferences
  }
  // Check if user is asking about neighborhoods (only if not asking for more)
  else {
    const isAskingAboutNeighborhoods = 
      message.toLowerCase().includes("neighborhood") || 
      message.toLowerCase().includes("areas") || 
      message.toLowerCase().includes("district") || 
      message.toLowerCase().includes("where in");
    
    // Check if a borough is mentioned
    const mentionsManhattan = message.toLowerCase().includes("manhattan");
    const mentionsBrooklyn = message.toLowerCase().includes("brooklyn");
    const mentionsQueens = message.toLowerCase().includes("queens");
    
    // If asking about neighborhoods, provide appropriate information
    if (isAskingAboutNeighborhoods) {
      if (mentionsManhattan) {
        const neighborhoods = getManhattanNeighborhoods();
        return {
          recommendations: [],
          followUpQuestion: `Popular neighborhoods in Manhattan include: ${neighborhoods.join(", ")}. Which one interests you?`
        };
      } 
      else if (mentionsBrooklyn) {
        const neighborhoods = getBrooklynNeighborhoods();
        return {
          recommendations: [],
          followUpQuestion: `Popular neighborhoods in Brooklyn include: ${neighborhoods.join(", ")}. Which one interests you?`
        };
      }
      else if (mentionsQueens) {
        const neighborhoods = getQueensNeighborhoods();
        return {
          recommendations: [],
          followUpQuestion: `Popular neighborhoods in Queens include: ${neighborhoods.join(", ")}. Which one interests you?`
        };
      }
    }
  }

  // Only extract preferences if we don't already have them (from "more options" request)
  if (!extractedPrefs) {
    try {
      const formattedHistory = chatHistory
        .map((entry) => `${entry.role}: ${entry.parts}`)
        .join("\n")

      const prompt = `
You are REX, a witty, slightly snarky NYC restaurant expert with impeccable taste and zero patience for boring food.
Your personality: Sharp-tongued but helpful. You throw shade before you throw recommendations. Think of yourself as the lovechild of a food critic and your sassiest friend.

Analyze the CURRENT USER REQUEST in the context of CHAT HISTORY and FOLLOW_UP_QUESTION_COUNT.

Chat History:
${formattedHistory ? formattedHistory : "No previous conversation history."}
Follow-up Question Count: ${followUpCount}
Current User request: "${message}"

First, assess if you have enough information to recommend restaurants. You need:
1. Food preference (cuisine type or specific dish)
2. Location preference (borough or neighborhood)
3. OPTIONAL but valuable: Mood/vibe they're going for

MOOD INDICATORS to watch for:
- "feeling adventurous", "want to try something new" → adventurous
- "need comfort food", "had a rough day", "treating myself" → comfort
- "celebrating", "special occasion", "date night" → celebratory
- "don't care", "whatever", "hungry" → indifferent
- "classy", "upscale", "impress someone" → sophisticated
- "casual", "low-key", "chill" → relaxed

VIBE INDICATORS to watch for:
- "lively", "energetic", "buzzing", "scene" → lively
- "quiet", "intimate", "romantic", "cozy" → intimate
- "trendy", "Instagram-worthy", "hip" → trendy
- "authentic", "traditional", "old-school" → classic
- "fun", "casual", "no-frills" → casual

IF the request lacks key information AND followUpQuestionCount < 2:
  Ask ONE snarky but helpful follow-up question focused on the MOST important missing information.
  Add personality - be playful, witty, maybe slightly judgy but never mean.
  
  Respond ONLY with a JSON object: { "followUpQuestion": "Your snarky, specific question here" }
  
  Snarky Examples:
  - For vague "I'm hungry": { "followUpQuestion": "Okay, 'hungry' isn't exactly a cuisine type last time I checked. What kind of food are we talking about here? Pizza? Sushi? Something with truffle oil to feel fancy?" }
  - For cuisine with no location: { "followUpQuestion": "Italian food in NYC? That's like asking for a bagel in New York—you gotta be more specific. What neighborhood, genius?" }
  - For location with no cuisine: { "followUpQuestion": "Brooklyn's got like 2.7 million people and probably 10,000 restaurants. Help me out here—what kind of food actually sounds good?" }
  - For "find me a restaurant": { "followUpQuestion": "Oh sure, let me just pick *any* random place in an 8-million-person city. 🙄 Give me something to work with—cuisine? Vibe? Price range? Literally anything?" }

ELSE IF urgent keywords detected (e.g., "quick", "fast", "soon", "now", "immediately", "urgent"):
  Extract ANY available preferences, even if minimal. Be snarky about the urgency.
  Respond with a JSON object containing available preferences and add a snarky note.

ELSE (either enough information OR we've already asked enough follow-ups):
  Extract the following specific preferences:
  - cuisines: Array of desired cuisines or dishes
  - neighborhoods: Array of specific NYC neighborhoods, correctly spelled
  - boroughs: Array of NYC boroughs (Manhattan, Brooklyn, Queens, Bronx, Staten Island)
  - dietary: Array of dietary restrictions (vegan, vegetarian, gluten-free, dairy-free, nut-free, halal, kosher)
  - scenario: String describing the occasion (e.g., "romantic dinner", "business lunch", "family meal")
  - price: Price range ("$", "$$", "$$$", or "$$$$")
  - mood: User's current mood (adventurous, comfort, celebratory, indifferent, sophisticated, relaxed)
  - vibe: Desired restaurant atmosphere (lively, intimate, trendy, classic, casual, upscale)
  - other: Other requirements (e.g., "outdoor seating", "view", "quiet")

  Respond ONLY with a valid JSON object containing these fields.

IMPORTANT:
- Capture emotional context and mood from the user's language
- Note words like "rough day", "celebrating", "impress", "whatever" - these indicate mood
- Always prioritize user's explicit preferences over implied ones
- When extracting mood/vibe, be specific and confident

Example response for "Had a rough day, need comfort food, thinking pasta in Brooklyn":
{
  "cuisines": ["Italian", "Pasta"],
  "boroughs": ["Brooklyn"],
  "mood": "comfort",
  "vibe": "cozy",
  "scenario": "comfort meal",
  "price": "$$"
}

Example response for "Want to impress a date, somewhere fancy in Manhattan":
{
  "boroughs": ["Manhattan"],
  "mood": "sophisticated",
  "vibe": "upscale",
  "scenario": "romantic dinner",
  "price": "$$$"
}
`

    const result = await generateWithGeminiFallback(prompt)
    const response = result.response
    const text = response.text()
    console.log("Gemini Raw Response for preferences/follow-up:", text)
    extractedPrefs = safeJsonParse(text)
    console.log("Parsed Prefs/Follow-up:", extractedPrefs)

    if (extractedPrefs?.followUpQuestion) {
      return { recommendations: [], followUpQuestion: extractedPrefs.followUpQuestion };
    }

    } catch (error) {
      console.error("Error calling Gemini API for preference extraction:", error)
      // Friendly fallback when the LLM is unavailable
      return { 
        recommendations: [], 
        followUpQuestion: "Rex isn't feeling the vibe right now—check back later." 
      }
    }

    if (!extractedPrefs) {
      console.warn("Could not extract preferences or follow-up from message:", message)
      // If Gemini didn't provide a follow-up and parsing failed, ask a generic question.
      return { recommendations: [], followUpQuestion: "I'm sorry, I had a little trouble understanding that. Could you tell me a bit more about what you're looking for, like the type of cuisine or a neighborhood?" };
    }
  }

  // --- NEW: Integrate Google Places Search ---
  const { results: googlePlacesResults, hadError: placesHadError } = await searchGooglePlaces(extractedPrefs)

  if (placesHadError) {
    return { recommendations: [], followUpQuestion: "Rex isn’t feeling the vibe right now—check back later." }
  }

  // If we have results from Google, use them to generate recommendations
  if (googlePlacesResults.length > 0) {
    // For "more options" requests, add a snarky reiteration message
    let preferenceSummary = "";
    if (isAskingForMore) {
      const prefParts = [];
      if (extractedPrefs.cuisines && extractedPrefs.cuisines.length > 0) {
        prefParts.push(extractedPrefs.cuisines.join(" or "));
      }
      if (extractedPrefs.neighborhoods && extractedPrefs.neighborhoods.length > 0) {
        prefParts.push(`in ${extractedPrefs.neighborhoods.join(" or ")}`);
      } else if (extractedPrefs.boroughs && extractedPrefs.boroughs.length > 0) {
        prefParts.push(`in ${extractedPrefs.boroughs.join(" or ")}`);
      }
      if (extractedPrefs.mood) {
        prefParts.push(`${extractedPrefs.mood} vibes`);
      }
      if (extractedPrefs.price) {
        prefParts.push(`${extractedPrefs.price} price range`);
      }
      preferenceSummary = prefParts.join(", ");
    }

    // Slice results based on offset to get different restaurants for "more options"
    const startIdx = resultOffset;
    const endIdx = Math.min(startIdx + 10, googlePlacesResults.length);
    const resultsToUse = googlePlacesResults.slice(startIdx, endIdx);

    const prompt = `
You are REX, a snarky, witty NYC restaurant expert who's seen it all and isn't afraid to share opinions.
Based on the user's preferences and a list of potential restaurants from Google Maps, select the top 3 best matches.

${isAskingForMore ? `IMPORTANT: The user asked for MORE OPTIONS for their search: "${preferenceSummary}". 
For the FIRST restaurant in your array, start the "reason" field with a snarky line like:
"Okay okay, still looking for ${preferenceSummary}? Here are 3 MORE options for you..."
OR
"Alright, more ${preferenceSummary} coming right up. You're really making me work today..."
OR
"So the first batch wasn't enough? Fine, here are 3 more ${preferenceSummary} spots..."

Then continue with normal snarky recommendations for all 3 restaurants.` : ""}

User Preferences:
- Cuisines: ${extractedPrefs.cuisines?.join(", ") || "Any"}
- Location: ${[...(extractedPrefs.neighborhoods || []), ...(extractedPrefs.boroughs || [])].join(", ") || "Any"}
- Price Range: ${extractedPrefs.price || "Any"}
- Vibe/Scenario: ${extractedPrefs.scenario || "Any"}
- Mood: ${extractedPrefs.mood || "Not specified"}
- Desired Vibe: ${extractedPrefs.vibe || "Not specified"}
- Dietary Needs: ${extractedPrefs.dietary?.join(", ") || "None"}
- Other: ${extractedPrefs.other?.join(", ") || "None"}

Potential Restaurants from Google Places:
${resultsToUse.map(p => `
  - Name: ${p.name}
  - Address: ${p.vicinity || p.formatted_address}
  - Rating: ${p.rating} (${p.user_ratings_total} reviews)
  - Price Level: ${p.price_level} (1-4 scale)
  - Types: ${p.types?.join(", ")}
`).join("")}

Your task:
1. Select 3-5 restaurants that BEST match the user's preferences, paying special attention to mood and vibe
2. For EACH restaurant, provide a "reason" field with TWO parts:
   a) SNARKY OPENING (1 sentence): A witty, playful, slightly sarcastic comment that shows personality
   b) GENUINE RECOMMENDATION (1-2 sentences): Why this place actually matches their needs

TONE GUIDELINES:
- Be playful and sassy, not mean
- Reference the user's mood or situation if it was mentioned
- Make pop culture references, use humor, be conversational
- Show you actually know NYC food culture
- End on a genuinely helpful note

Example format for reasons:
- "Listen, if you're having a rough day, the last thing you need is pretentious small plates. This cozy Italian spot does pasta the way your nonna would—if she actually knew what she was doing. Perfect for drowning your sorrows in carbs and red wine."
- "Oh, you want to impress someone? Bold move going to [Restaurant Name]. The 4.5-star rating and that swanky cocktail menu should do the trick—unless you spill something, which, no pressure. Great ambiance for acting like you've got your life together."
- "I see you're going with [Restaurant Name]. Interesting choice for someone who just said 'whatever'. But honestly? Their ramen will slap you out of your apathy. Trust me on this one."

Respond ONLY with a valid JSON array:
[
  {
    "name": "Restaurant Name",
    "reason": "[SNARKY OPENING] [GENUINE RECOMMENDATION]"
  },
  ...
]

Match the mood:
- Comfort mood → emphasize warmth, familiar favorites, generous portions
- Adventurous mood → highlight unique dishes, fusion concepts, bold flavors
- Celebratory mood → focus on special atmosphere, standout experiences
- Sophisticated mood → emphasize elegance, refined service, impressive details

${isAskingForMore ? "Return exactly 3 recommendations since this is a 'more options' request." : "Return 3-5 recommendations."}
    `

    try {
      const result = await generateWithGeminiFallback(prompt)
      const response = result.response
      const text = response.text()
      console.log("Gemini Raw Response for recommendations:", text)
      
      const match = text.match(/```json\n?([\s\S]*?)\n?```/)
      const jsonStr = match ? match[1] : text;
      const geminiRecs = JSON.parse(jsonStr) as Array<{name: string, reason: string}>

      // Map Gemini recommendations back to the full Google Places data
      const finalRecommendations: RecommendationResult[] = geminiRecs.map(rec => {
        const placeData = googlePlacesResults.find(p => p.name === rec.name)
        return {
          // Mapping Google Place data to your Restaurant type
          id: placeData?.place_id || new Date().toISOString(), // Use place_id as a unique ID
          name: placeData?.name || 'N/A',
          cuisine_type: formatCuisineType(placeData?.types || []),
          address: placeData?.vicinity || placeData?.formatted_address || 'N/A',
          neighborhood: parseNeighborhood(placeData?.vicinity || placeData?.formatted_address || ''),
          borough: parseBorough(placeData?.vicinity || placeData?.formatted_address || ''),
          price_range: placeData?.price_level || null,
          rating: placeData?.rating || null, // Add the missing rating field
          user_ratings_total: (placeData as any)?.user_ratings_total ?? null,
          dietary_options: null, // Google Places API doesn't provide this directly
          description: null, // Not directly available, could be fetched
          image_url: placeData?.photos?.[0]?.photo_reference || null, // Need another API call for full URL
          popular_items: null,
          vibe: null,
          scenario_tags: null,
          latitude: placeData?.geometry?.location.lat || null,
          longitude: placeData?.geometry?.location.lng || null,
          opening_hours: (placeData as any)?.opening_hours?.weekday_text ?? null,
          matching_score: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          reason: rec.reason, // The reason from Gemini
        }
      })

      return { 
        recommendations: finalRecommendations,
        extractedPreferences: extractedPrefs // Return preferences for "more options" functionality
      }

    } catch (error) {
      console.error("Error calling Gemini for final recommendations:", error)
      // Fallback or error handling
      return { 
        recommendations: [], 
        followUpQuestion: "I found some places but had trouble deciding. Can you tell me more about what's important for you?",
        extractedPreferences: extractedPrefs
      }
    }
  }
  
  // What if google returns no results? We can fall back to a message.
  if (!extractedPrefs.followUpQuestion) {
     return { 
       recommendations: [], 
       followUpQuestion: "I couldn't find any spots matching that criteria. Would you like to try a different neighborhood or cuisine?",
       extractedPreferences: extractedPrefs
     }
  }

  return { recommendations: [], extractedPreferences: extractedPrefs } // Should be unreachable if logic is correct
}

// Helper function to map price symbols ("$", "$$", etc.) to numeric values (1-4)
// Assumes your database stores price range as an integer 1, 2, 3, or 4.
function mapPriceSymbolToValue(symbol: string): number | null {
  const priceMap: Record<string, number> = {
    $: 1,
    $$: 2,
    $$$: 3,
    $$$$: 4,
  }
  return priceMap[symbol] || null
}

// Helper function to format cuisine type from Google Places types
function formatCuisineType(types: string[]): string {
  // Filter out generic types and focus on cuisine-specific ones
  const cuisineTypes = types.filter(type => 
    !['restaurant', 'food', 'point_of_interest', 'establishment', 'store'].includes(type)
  )
  
  if (cuisineTypes.length === 0) {
    return 'Restaurant'
  }
  
  // Capitalize and format the cuisine type
  return cuisineTypes[0].split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

// Helper function to parse neighborhood from address
function parseNeighborhood(address: string): string {
  if (!address) return 'Unknown'
  
  const parts = address.split(',')
  if (parts.length >= 2) {
    return parts[1].trim()
  }
  return 'Unknown'
}

// Helper function to parse borough from address
function parseBorough(address: string): string {
  if (!address) return 'Unknown'
  
  const parts = address.split(',')
  if (parts.length >= 3) {
    const boroughPart = parts[2].trim()
    // Extract just the borough name (e.g., "Brooklyn, NY" -> "Brooklyn")
    return boroughPart.split(',')[0].trim()
  }
  return 'Unknown'
}

// Make a more comprehensive fix to the fallback mechanism

// 1. First, add honest explanations and real burger places
const emergencyFallbacks = {
  "Burger+Brooklyn": [
    {
      id: "burger-bk-1",
      name: "Bare Burger",
      cuisine_type: "Burgers",
      address: "170 7th Ave, Brooklyn, NY 11215",
      neighborhood: "Park Slope",
      borough: "Brooklyn",
      price_range: 2,
      popular_items: ["Classic Burger", "Impossible Burger", "Turkey Burger"],
      description: "Organic burger chain offering various patty options including beef, turkey, and vegetarian alternatives.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: "burger-bk-2",
      name: "Two8Two Bar & Burger",
      cuisine_type: "Burgers",
      address: "282 Atlantic Ave, Brooklyn, NY 11201",
      neighborhood: "Cobble Hill",
      borough: "Brooklyn",
      price_range: 2,
      popular_items: ["Classic Burger", "BBQ Burger", "Bacon Blue Burger"],
      description: "Neighborhood spot serving up quality burgers made from freshly ground Pat LaFrieda beef.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
};

// Improved recommendation generation with better context and personalization
function generateReasonForRestaurant(restaurant: Restaurant, extractedPrefs: ExtractedPreferences): string {
  // Base location context
  let locationContext = restaurant.neighborhood;
  if (restaurant.borough && restaurant.neighborhood !== restaurant.borough) {
    locationContext += ` in ${restaurant.borough}`;
  }
  
  // Start with diverse, natural-sounding intros
  const intros = [
    `${restaurant.name} is a perfect match for`,
    `You'll love ${restaurant.name} for`,
    `${restaurant.name} is ideal for`,
    `For ${extractedPrefs?.scenario || "your dining experience"}, ${restaurant.name} stands out`
  ];
  const intro = intros[Math.floor(Math.random() * intros.length)];
  
  // Build a tailored reason that focuses on user's specific needs
  let reason = `${intro} ${extractedPrefs?.scenario || "your meal"}. Located in ${locationContext}, `;
  
  // Add specific matching elements that matter to the user
  const highlights = [];
  
  // Cuisine match
  if (extractedPrefs?.cuisines?.some(c => 
      restaurant.cuisine_type.toLowerCase().includes(c.toLowerCase()))) {
    highlights.push(`it offers excellent ${restaurant.cuisine_type} cuisine`);
  }
  
  // Dietary accommodation
  if (extractedPrefs?.dietary && extractedPrefs.dietary.length > 0) {
    const applicableDietary = restaurant.dietary_options?.filter((opt) => 
      extractedPrefs?.dietary?.includes(opt));
    if (applicableDietary && applicableDietary.length > 0) {
      highlights.push(`accommodates ${applicableDietary.join(", ")} diets`);
    }
  }
  
  // Scenario-specific highlights
  if (extractedPrefs?.scenario) {
    const scenario = extractedPrefs.scenario.toLowerCase();
    if (scenario.includes("romantic") || scenario.includes("date")) {
      highlights.push(`provides an intimate atmosphere`);
    } else if (scenario.includes("business")) {
      highlights.push(`offers a professional setting`);
    } else if (scenario.includes("family") || scenario.includes("kids")) {
      highlights.push(`welcomes families`);
    } else if (scenario.includes("group") || scenario.includes("friends")) {
      highlights.push(`can accommodate groups`);
    }
  }
  
  // Add the highlights
  if (highlights.length > 0) {
    reason += highlights.join(" and ");
  }
  
  // Add description highlight
  if (restaurant.description) {
    // Extract the most relevant sentence from description
    const sentences = restaurant.description.split('.');
    const relevantSentence = sentences[0]; // Just use first sentence
    reason += `. ${relevantSentence}.`;
  }
  
  // Always include a specific menu recommendation if available
  if (restaurant.popular_items && restaurant.popular_items.length > 0) {
    const recommendedItem = restaurant.popular_items[Math.floor(Math.random() * restaurant.popular_items.length)];
    reason += ` Their "${recommendedItem}" is highly recommended!`;
  }
  
  return reason;
}
