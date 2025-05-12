"use server"

import { createServerSupabaseClient } from "@/lib/supabase"
import type { Restaurant, Scenario } from "@/lib/types"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Define the structure for the returned recommendations
export interface RecommendationResult extends Restaurant {
  reason: string
}

// Ensure GOOGLE_API_KEY is loaded
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" })

    const formattedHistory = chatHistory
      .map((entry) => `${entry.role}: ${entry.parts}`)
      .join("\n")

    const prompt = `
You are a helpful assistant for finding restaurants in New York City.
Your primary goal is to understand the user's evolving preferences.
Analyze the CURRENT USER REQUEST in the context of CHAT HISTORY and FOLLOW_UP_QUESTION_COUNT.

Chat History:
${formattedHistory ? formattedHistory : "No previous conversation history."}
Follow-up Question Count (how many times you've already asked a follow-up for the current line of inquiry): ${followUpCount}
Current User request: "${message}"

First, assess if the Current User Request, in light of Chat History, provides enough information to make concrete recommendations.
Key information includes at least one of:
  - Specific cuisine(s) or dish type(s).
  - A specific NYC neighborhood or borough.

IF the request is too vague (e.g., missing both cuisine/dish and location, or is ambiguous like "food") AND followUpQuestionCount < 3:
  Your task is to ask a clarifying follow-up question.
  Respond ONLY with a JSON object: { "followUpQuestion": "Your helpful question here." }
  Example for "I'm hungry" (followUpQuestionCount = 0):
  {
    "followUpQuestion": "I can help with that! What kind of food are you in the mood for, or is there a particular neighborhood you're thinking of?"
  }

ELSE IF (the request is still vague AND followUpQuestionCount >= 3):
  DO NOT ask another followUpQuestion.
  Instead, try your best to extract preferences based on ANY partial information available from the history or current vague request. If some preferences can be extracted (even if very broad, like just a borough or a general cuisine category like 'food'), return those.
  If absolutely no preferences can be extracted that would be useful for a search, return an empty preference object: {}

ELSE (there IS enough information OR (it is still vague BUT followUpQuestionCount >=3 and you are attempting to extract broad preferences)):
  Extract the following for database querying:
  - cuisines: Array of desired cuisines. Infer from specific dishes.
  - neighborhoods: Array of specific NYC neighborhoods.
  - boroughs: Array of desired NYC boroughs (only if no specific neighborhood).
  - dietary: Array of dietary restrictions (vegan, gluten-free, etc.).
  - scenario: A single string describing the occasion (e.g., "romantic dinner", "business lunch").
  - price: Price range ("$", "$$", "$$$", or "$$$$").
  - other: Other specific requirements (e.g., "outdoor seating", "good cocktails").

Respond ONLY with a valid JSON object.
Example for "cheap vegetarian in Brooklyn" (enough info):
{
  "dietary": ["vegetarian"],
  "boroughs": ["Brooklyn"],
  "price": "$"
}

IMPORTANT: Prioritize asking a followUpQuestion if the request is too vague for a good database search. Otherwise, provide the extracted preferences.
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

  // Query for restaurants based on extracted preferences
  let query = supabase.from("restaurants").select("*")

  // Filter by cuisines if any (using ilike for broader matching)
  if (extractedPrefs.cuisines && extractedPrefs.cuisines.length > 0) {
    // Create an OR condition for multiple cuisines
    const cuisineFilters = extractedPrefs.cuisines
      .map((c) => `cuisine_type.ilike.%${c}%`)
      .join(",")
    query = query.or(cuisineFilters)
  }

  // Filter by dietary preferences if any
  if (extractedPrefs.dietary && extractedPrefs.dietary.length > 0) {
    // Ensure dietary options match the standard terms used in the prompt/DB
    const validDietary = extractedPrefs.dietary.filter((d) =>
      ["vegan", "vegetarian", "gluten-free", "dairy-free", "nut-free", "halal", "kosher"].includes(d.toLowerCase()),
    )
    if (validDietary.length > 0) {
      query = query.contains("dietary_options", validDietary)
    }
  }

  // Filter by NEIGHBORHOODS if any (prefer specific neighborhoods)
  if (extractedPrefs.neighborhoods && extractedPrefs.neighborhoods.length > 0) {
    // Normalize neighborhood names
    const normalizedNeighborhoods = extractedPrefs.neighborhoods.map(n => 
      n === "Richmond Hills" ? "Richmond Hill" : n
    );
    
    // Fix query syntax - use commas not parentheses
    const neighborhoodFilters = normalizedNeighborhoods
      .map((n) => `neighborhood.ilike.%${n}%,address.ilike.%${n}%`)
      .join(",")
    query = query.or(neighborhoodFilters)
  }
  // ELSE IF no specific neighborhood, filter by BOROUGHS if any
  else if (extractedPrefs.boroughs && extractedPrefs.boroughs.length > 0) {
    const borough = extractedPrefs.boroughs[0];
    const locationFilter = `neighborhood.ilike.%${borough}%,address.ilike.%${borough}%,borough.ilike.%${borough}%`;
    query = query.or(locationFilter);
    console.log(`Applying borough filter: ${locationFilter}`);
  }

  // Filter by price range if any
  if (extractedPrefs.price && ["$", "$$", "$$$", "$$$$"].includes(extractedPrefs.price)) {
    const priceMap: Record<string, number> = { $: 1, $$: 2, $$$: 3, $$$$: 4 }
    query = query.eq("price_range", priceMap[extractedPrefs.price])
  }

  // --- Add Scenario/Other Filtering (using description column) ---
  const keywords: string[] = [];
  if (extractedPrefs.scenario) {
    let scenarioText = "";
    // Check if scenario is an array and take the first element, otherwise use as string
    if (Array.isArray(extractedPrefs.scenario) && extractedPrefs.scenario.length > 0) {
      scenarioText = extractedPrefs.scenario[0];
    } else if (typeof extractedPrefs.scenario === 'string') {
      scenarioText = extractedPrefs.scenario;
    }

    if (scenarioText) {
      // Simple keyword extraction from scenario text
      keywords.push(...scenarioText.toLowerCase().split(" "));
    }
  }
  if (extractedPrefs.other) {
    keywords.push(...extractedPrefs.other.map(o => o.toLowerCase()));
  }

  // Add basic keyword filters on description (if keywords exist)
  if (keywords.length > 0) {
      // Remove common words or very short words if necessary
      const relevantKeywords = keywords.filter(k => k.length > 2 && !["a", "an", "the", "for", "with", "good"].includes(k));
      if (relevantKeywords.length > 0) {
          const descriptionFilters = relevantKeywords.map(k => `description.ilike.%${k}%`).join(",");
          query = query.or(descriptionFilters);
          console.log("Applying description filters:", descriptionFilters);
      }
  }

  // Get restaurants
  let { data: restaurantsData, error } = await query.limit(10);

  if (error) {
    console.error("Error fetching restaurants from Supabase:", error);
    return { recommendations: [] };
  }

  if (restaurantsData) {
    restaurants = restaurantsData;
  }

  if (!restaurants || restaurants.length === 0) {
    console.log("No exact matches found for search criteria");
    
    // Check if we can use any of our emergency fallbacks
    let fallbackKey = "";
    
    // Match burger searches in Brooklyn
    if ((extractedPrefs.cuisines?.some(c => 
        c.toLowerCase().includes("burger") || 
        c.toLowerCase() === "hamburger") || 
        message.toLowerCase().includes("burger")) && 
        (extractedPrefs.boroughs?.some(b => b.toLowerCase().includes("brooklyn")) || 
         extractedPrefs.neighborhoods?.some(n => n.toLowerCase().includes("brooklyn")) ||
         message.toLowerCase().includes("brooklyn"))) {
      fallbackKey = "Burger+Brooklyn";
    }
    
    // If we have matching fallbacks, use them
    if (fallbackKey && emergencyFallbacks[fallbackKey]) {
      console.log(`Using emergency fallback for ${fallbackKey}`);
      
      const mappedFallbacks = emergencyFallbacks[fallbackKey].map(restaurant => {
        return {
          ...restaurant,
          reason: `${restaurant.name} is a ${restaurant.cuisine_type} restaurant in ${restaurant.neighborhood}, ${restaurant.borough}. ${restaurant.description} Their popular item is the "${restaurant.popular_items[0]}".`
        };
      });
      
      return { recommendations: mappedFallbacks };
    }
    
    // If no emergency fallbacks are available, let the user know we couldn't find matches
    // but don't suggest unrelated cuisines
    return { 
      recommendations: [], 
      followUpQuestion: `I couldn't find any good ${extractedPrefs.cuisines?.join(" or ")} restaurants in ${extractedPrefs.neighborhoods?.join(" or ") || extractedPrefs.boroughs?.join(" or ") || "your area"}. Would you like to try a different cuisine or location?` 
    };
  }

  // Select 2-3 random restaurants from the results
  const selectedRestaurants: Restaurant[] = []
  const restaurantsCopy = [...restaurants]

  // Determine how many restaurants to recommend (up to 3)
  const numToRecommend = Math.min(3, restaurantsCopy.length)

  for (let i = 0; i < numToRecommend; i++) {
    const randomIndex = Math.floor(Math.random() * restaurantsCopy.length)
    selectedRestaurants.push(restaurantsCopy[randomIndex])
    restaurantsCopy.splice(randomIndex, 1)
  }

  // Generate reasons for recommendations, enhanced by Gemini context
  const finalRecommendations: RecommendationResult[] = selectedRestaurants.map((restaurant) => {
    // Start with location context
    let locationContext = "";
    if (extractedPrefs?.boroughs && extractedPrefs.boroughs.length > 0) {
      const requestedBorough = extractedPrefs.boroughs[0];
      const restaurantBorough = restaurant.borough || "";
      
      if (restaurantBorough && restaurantBorough.toLowerCase() !== requestedBorough.toLowerCase()) {
        locationContext = ` While it's not in ${requestedBorough}, it's located in ${restaurant.neighborhood}`;
        if (restaurantBorough) locationContext += ` (${restaurantBorough})`;
        locationContext += `.`;
      } else {
        locationContext = ` Located in ${restaurant.neighborhood}`;
        if (restaurantBorough) locationContext += ` (${restaurantBorough})`;
        locationContext += `,`;
      }
    } else {
      locationContext = ` Located in ${restaurant.neighborhood}`;
      if (restaurant.borough) locationContext += ` (${restaurant.borough})`;
      locationContext += `,`;
    }
    
    // Start with a more varied introductory phrase
    const intros = [
      `${restaurant.name} is a fantastic choice for`,
      `You might love ${restaurant.name} for`,
      `I'd recommend ${restaurant.name} for`,
      `${restaurant.name} stands out as a great option for`,
    ];
    const intro = intros[Math.floor(Math.random() * intros.length)];
    
    // More varied ways to refer to the user's goal
    const mealPhrases = [
      "your dining experience",
      "your upcoming meal",
      "a great meal out",
      "what you're looking for"
    ];
    const mealContext = mealPhrases[Math.floor(Math.random() * mealPhrases.length)];
    
    // Build a more natural-sounding reason that focuses on what matters to the user
    let reason = `${intro} ${extractedPrefs?.scenario || mealContext}.${locationContext}`;
    
    // Add specifics that match user's request
    const highlights = [];
    
    // If user specified cuisine, highlight that as a match
    if (extractedPrefs?.cuisines?.some(c => 
        restaurant.cuisine_type.toLowerCase().includes(c.toLowerCase()))) {
      highlights.push(`serves authentic ${restaurant.cuisine_type} cuisine`);
    }
    
    // If dietary preferences were mentioned, highlight those matches
    if (extractedPrefs?.dietary && extractedPrefs.dietary.length > 0) {
      const applicableDietary = restaurant.dietary_options?.filter((opt) => 
        extractedPrefs?.dietary?.includes(opt));
      if (applicableDietary && applicableDietary.length > 0) {
        highlights.push(`offers ${applicableDietary.join(", ")} options`);
      }
    }
    
    // Add the highlights to the reason
    if (highlights.length > 0) {
      reason += ` it ${highlights.join(" and ")}`;
    }
    
    // Add a relevant feature from the description if available
    if (restaurant.description) {
      // Extract a key feature from the description
      const features = restaurant.description.split('.')[0]; // Just use first sentence
      reason += `. ${features}`;
    }
    
    // Add a recommended menu item if available
    if (restaurant.popular_items && restaurant.popular_items.length > 0) {
      const recommendedItem = restaurant.popular_items[Math.floor(Math.random() * restaurant.popular_items.length)];
      reason += `. Don't miss their "${recommendedItem}"!`;
    }
    
    return {
      ...restaurant,
      reason,
    }
  })

  // Save recommendations to database
  try {
    await Promise.all(
      finalRecommendations.map((recommendation) =>
        supabase.from("recommendations").insert({
          user_id: userId,
          restaurant_id: recommendation.id,
          reason: recommendation.reason,
          triggering_message: message,
        }),
      ),
    )
  } catch (dbError) {
    console.error("Error saving recommendations:", dbError)
    // Don't fail the whole request, just log the error
  }

  return { recommendations: finalRecommendations } // Ensure this matches the new return type
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
