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
  other?: string[]
  followUpQuestion?: string // New field for follow-up questions
}

// Define the structure for the function's response
export interface GetRecommendationsResponse {
  recommendations: RecommendationResult[]
  followUpQuestion?: string
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
): Promise<Place[]> {
  if (!preferences.cuisines?.length && !preferences.other?.length) {
    // Not enough information to search
    return []
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
      return response.data.results as Place[]
    }
    return []
  } catch (error: any) {
    console.error("Google Places API error. Full details below:");
    if (error.response) {
      console.error("Response Status:", error.response.status);
      console.error("Response Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Error Message:", error.message);
    }
    return []
  }
}

// Function to get restaurant recommendations using Gemini
export async function getRecommendations(
  message: string,
  userId: string,
  chatHistory: Array<{ role: "user" | "model"; parts: string }> = [],
  followUpCount: number = 0, // New parameter for follow-up count
): Promise<GetRecommendationsResponse> {
  // Initialize variables
  const supabase = createServerSupabaseClient()
  let extractedPrefs: ExtractedPreferences | null = null
  let restaurants: any[] = []

  // Check if user is asking about neighborhoods
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

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const formattedHistory = chatHistory
      .map((entry) => `${entry.role}: ${entry.parts}`)
      .join("\n")

    const prompt = `
You are REX, a knowledgeable NYC restaurant specialist. 
Your primary goal is to understand the user's dining preferences and provide tailored restaurant recommendations.
Analyze the CURRENT USER REQUEST in the context of CHAT HISTORY and FOLLOW_UP_QUESTION_COUNT.

Chat History:
${formattedHistory ? formattedHistory : "No previous conversation history."}
Follow-up Question Count: ${followUpCount}
Current User request: "${message}"

First, assess if you have enough information to recommend restaurants. You need:
1. Food preference (cuisine type or specific dish)
2. Location preference (borough or neighborhood)

IF the request lacks key information AND followUpQuestionCount < 2:
  Ask ONE concise, conversational follow-up question focused on the MOST important missing information.
  For unclear requests like "I'm hungry" or "find me a restaurant", ask about cuisine preferences first.
  For requests with cuisine but no location, ask specifically about preferred borough or neighborhood.
  For requests with location but no cuisine, ask about food preferences.
  
  Respond ONLY with a JSON object: { "followUpQuestion": "Your specific, friendly question here" }
  
  Examples:
  - For vague requests: { "followUpQuestion": "What kind of food are you craving today?" }
  - With cuisine only: { "followUpQuestion": "Great choice! Which area of NYC would you prefer to dine in?" }
  - With location only: { "followUpQuestion": "What type of cuisine would you like to try in that area?" }

ELSE IF urgent keywords detected (e.g., "quick", "fast", "soon", "now", "immediately", "urgent"):
  Extract ANY available preferences, even if minimal.
  Skip follow-up questions and do your best with limited information.
  Respond with a JSON object containing available preferences.

ELSE (either enough information OR we've already asked enough follow-ups):
  Extract the following specific preferences:
  - cuisines: Array of desired cuisines or dishes.
  - neighborhoods: Array of specific NYC neighborhoods, correctly spelled.
  - boroughs: Array of NYC boroughs (Manhattan, Brooklyn, Queens, Bronx, Staten Island).
  - dietary: Array of dietary restrictions (vegan, vegetarian, gluten-free, dairy-free, nut-free, halal, kosher).
  - scenario: String describing the occasion (e.g., "romantic dinner", "business lunch", "family meal").
  - price: Price range ("$", "$$", "$$$", or "$$$$").
  - other: Other requirements (e.g., "outdoor seating", "view", "quiet").

  Respond ONLY with a valid JSON object containing these fields.

IMPORTANT:
- Normalize neighborhood names to match standard NYC terminology
- Correctly identify cuisines from dish names (e.g., "pizza" → "Italian")
- When a user mentions a borough like "Brooklyn", include it as a borough, not a neighborhood
- When in doubt between cuisine variations (e.g., "Chinese" vs "Sichuan"), include both
- Always prioritize user's explicit preferences over implied ones

Example response for "looking for pasta in Brooklyn for date night":
{
  "cuisines": ["Italian", "Pasta"],
  "boroughs": ["Brooklyn"],
  "scenario": "romantic dinner",
  "price": "$$"
}
`

    const result = await model.generateContent(prompt)
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
    return { recommendations: [] } // Return empty recommendations on error
  }

  if (!extractedPrefs) {
    console.warn("Could not extract preferences or follow-up from message:", message)
    // If Gemini didn't provide a follow-up and parsing failed, ask a generic question.
    return { recommendations: [], followUpQuestion: "I'm sorry, I had a little trouble understanding that. Could you tell me a bit more about what you're looking for, like the type of cuisine or a neighborhood?" };
  }

  // --- NEW: Integrate Google Places Search ---
  const googlePlacesResults = await searchGooglePlaces(extractedPrefs)

  // If we have results from Google, use them to generate recommendations
  if (googlePlacesResults.length > 0) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
      You are REX, an expert NYC restaurant recommender.
      Based on the user's preferences and a list of potential restaurants from Google Maps, your task is to select the top 3-5 best matches and provide a compelling, personalized reason for each recommendation.

      User Preferences:
      - Cuisines: ${extractedPrefs.cuisines?.join(", ") || "Any"}
      - Location: ${[...(extractedPrefs.neighborhoods || []), ...(extractedPrefs.boroughs || [])].join(", ") || "Any"}
      - Price Range: ${extractedPrefs.price || "Any"}
      - Vibe/Scenario: ${extractedPrefs.scenario || "Any"}
      - Dietary Needs: ${extractedPrefs.dietary?.join(", ") || "None"}
      - Other: ${extractedPrefs.other?.join(", ") || "None"}

      Potential Restaurants from Google Places (first 10):
      ${googlePlacesResults.slice(0, 10).map(p => `
        - Name: ${p.name}
        - Address: ${p.vicinity || p.formatted_address}
        - Rating: ${p.rating} (${p.user_ratings_total} reviews)
        - Price Level: ${p.price_level} (1-4 scale)
        - Types: ${p.types?.join(", ")}
      `).join("")}

      Your goal is to return a JSON array of recommended restaurants.
      For each restaurant, include:
      1. All original fields from the Google Places result.
      2. A "reason" field: A 1-2 sentence, friendly, and persuasive explanation of WHY this specific restaurant is a great match for the user's stated preferences. Be specific. For example, mention the rating if it's high, or how the vibe fits their scenario.

      Respond ONLY with a valid JSON array in the following format:
      [
        {
          "name": "Restaurant Name",
          "reason": "This spot is perfect because..."
        },
        ...
      ]
    `

    try {
      const result = await model.generateContent(prompt)
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

      return { recommendations: finalRecommendations }

    } catch (error) {
      console.error("Error calling Gemini for final recommendations:", error)
      // Fallback or error handling
      return { recommendations: [], followUpQuestion: "I found some places but had trouble deciding. Can you tell me more about what's important for you?" }
    }
  }
  
  // What if google returns no results? We can fall back to a message.
  if (!extractedPrefs.followUpQuestion) {
     return { recommendations: [], followUpQuestion: "I couldn't find any spots matching that criteria. Would you like to try a different neighborhood or cuisine?" }
  }

  return { recommendations: [] } // Should be unreachable if logic is correct
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
