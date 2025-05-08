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
    console.log("No restaurants found matching criteria.")
    
    // Try a fallback query with relaxed constraints
    let fallbackQuery = supabase.from("restaurants").select("*")
    
    // If we know user's borough, prioritize location
    if (extractedPrefs.boroughs && extractedPrefs.boroughs.length > 0) {
      const borough = extractedPrefs.boroughs[0];
      fallbackQuery = fallbackQuery.or(`neighborhood.ilike.%${borough}%,address.ilike.%${borough}%,borough.ilike.%${borough}%`);
      
      // Check if we got results with just location constraint
      const { data: locationOnlyResults } = await fallbackQuery.limit(3);
      
      // If we found location-based results, use them
      if (locationOnlyResults && locationOnlyResults.length > 0) {
        const mappedLocationResults = locationOnlyResults.map(restaurant => {
          let locationInfo = restaurant.neighborhood;
          if (restaurant.borough) locationInfo = `${restaurant.neighborhood}, ${restaurant.borough}`;
          
          let reason = `I found ${restaurant.name}, a ${restaurant.cuisine_type} restaurant in ${locationInfo}`;
          
          // Add cuisine context if user specified cuisine
          if (extractedPrefs?.cuisines && extractedPrefs.cuisines.length > 0) {
            reason += ` that might have ${extractedPrefs.cuisines[0]} options`;
          }
          
          // Add menu item if available
          if (restaurant.popular_items && restaurant.popular_items.length > 0) {
            const recommendedItem = restaurant.popular_items[Math.floor(Math.random() * restaurant.popular_items.length)];
            reason += `. Try their "${recommendedItem}"!`;
          } else {
            reason += ".";
          }
          
          return {
            ...restaurant,
            reason
          };
        });
        return { recommendations: mappedLocationResults };
      }
    }
    
    // Keep just cuisine type if specified
    if (extractedPrefs.cuisines && extractedPrefs.cuisines.length > 0) {
      const cuisineFilters = extractedPrefs.cuisines
        .map((c) => `cuisine_type.ilike.%${c}%`)
        .join(",")
      fallbackQuery = fallbackQuery.or(cuisineFilters)
    }
    
    // Emergency fallbacks - hardcoded options for common searches
    const emergencyFallbacks: Record<string, any[]> = {
      "Pizza+Lower Manhattan": [
        {
          id: "fallback-4",
          name: "Joe's Pizza",
          cuisine_type: "Pizza",
          address: "7 Carmine St, New York, NY 10014",
          neighborhood: "Greenwich Village",
          borough: "Manhattan",
          price_range: 1,
          popular_items: ["Classic Slice", "Fresh Mozzarella Slice", "Sicilian Square"],
          description: "Iconic cash-only pizza joint serving thin-crust slices & pies in a no-frills setting since 1975.",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      "Pizza+Queens": [
        {
          id: "fallback-8",
          name: "Lucia Pizza",
          cuisine_type: "Pizza",
          address: "136-55 Roosevelt Ave, Flushing, NY 11354",
          neighborhood: "Flushing",
          borough: "Queens",
          price_range: 1,
          popular_items: ["Classic NY Slice", "Grandma Pie", "Buffalo Chicken Pizza"],
          description: "Classic Queens pizzeria serving authentic New York slices since 1959.",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    };
    
    // Try to match emergency fallbacks
    let fallbackKey = "";
    if (extractedPrefs.cuisines?.includes("pizza") && 
        (extractedPrefs.neighborhoods?.some(n => n.toLowerCase().includes("lower manhattan")))) {
      fallbackKey = "Pizza+Lower Manhattan";
    } else if (extractedPrefs.cuisines?.includes("pizza") && 
              extractedPrefs.boroughs?.includes("Queens")) {
      fallbackKey = "Pizza+Queens";
    }
    
    if (fallbackKey && emergencyFallbacks[fallbackKey]) {
      const mappedEmergencyResults = emergencyFallbacks[fallbackKey].map(restaurant => {
        return {
          ...restaurant,
          reason: `${restaurant.name} is a great ${restaurant.cuisine_type} spot in ${restaurant.neighborhood}. ${restaurant.description} Try their ${restaurant.popular_items[0]}!`
        };
      });
      return { recommendations: mappedEmergencyResults };
    }
    
    const { data: fallbackResults } = await fallbackQuery.limit(3)
    
    if (fallbackResults && fallbackResults.length > 0) {
      const mappedFallback = fallbackResults.map(restaurant => {
        let locationInfo = restaurant.neighborhood;
        if (restaurant.borough) locationInfo += `, ${restaurant.borough}`;
        
        let reason = `While I couldn't find an exact match for your request, ${restaurant.name} is a ${restaurant.cuisine_type} restaurant in ${locationInfo}`;
        
        // Add menu item if available
        if (restaurant.popular_items && restaurant.popular_items.length > 0) {
          const recommendedItem = restaurant.popular_items[Math.floor(Math.random() * restaurant.popular_items.length)];
          reason += `. Try their "${recommendedItem}"!`;
        } else {
          reason += " that might interest you.";
        }
        
        return {
          ...restaurant,
          reason
        };
      });
      return { recommendations: mappedFallback };
    }
    
    // If even fallback fails
    if (followUpCount >= 3) {
      return { 
        recommendations: [], 
        followUpQuestion: "I've asked a few questions, but I'm still having trouble finding exactly what you're looking for. Could you try starting a new search with more specific details, like the type of cuisine and a neighborhood?" 
      };
    }

    // Existing logic for generating noResultsFollowUp based on partial prefs
    let noResultsFollowUp = "Hmm, I couldn't find anything for that specific combination. ";
    if (extractedPrefs.cuisines && extractedPrefs.cuisines.length > 0 && (!extractedPrefs.neighborhoods && !extractedPrefs.boroughs)) {
      noResultsFollowUp += `Perhaps try specifying a neighborhood or borough for ${extractedPrefs.cuisines.join(" or ")} food?`;
    } else if ((extractedPrefs.neighborhoods || extractedPrefs.boroughs) && (!extractedPrefs.cuisines || extractedPrefs.cuisines.length === 0 )) {
      noResultsFollowUp += `What kind of cuisine are you looking for in ${extractedPrefs.neighborhoods?.join(" or ") || extractedPrefs.boroughs?.join(" or ")}?`;
    } else {
      noResultsFollowUp += "Would you like to try different criteria?";
    }
    return { recommendations: [], followUpQuestion: noResultsFollowUp };
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
