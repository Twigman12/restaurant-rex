import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Debugging: Log the environment variables
// console.log('--- DEBUG --- ');
// console.log('Supabase URL from env:', supabaseUrl);
// console.log('Supabase Key from env (length):', supabaseKey ? supabaseKey.length : 'undefined');
// console.log('--- END DEBUG --- ');

const supabase = createClient(supabaseUrl, supabaseKey)

// Read the JSON file
console.log('Reading restaurant data file...')
const rawData = fs.readFileSync('./restaurant-data.json', 'utf8')
const data = JSON.parse(rawData)

// Function to extract cuisine type from bio
function extractCuisineType(bio) {
  const cuisineKeywords = {
    'Italian': ['italian', 'pasta', 'pizza', 'risotto'],
    'Mexican': ['mexican', 'taco', 'burrito', 'quesadilla', 'enchilada'],
    'Chinese': ['chinese', 'dim sum', 'dumpling', 'szechuan', 'cantonese'],
    'Japanese': ['japanese', 'sushi', 'ramen', 'tempura', 'sashimi'],
    'Thai': ['thai', 'pad thai', 'curry'],
    'Indian': ['indian', 'curry', 'tandoori', 'masala', 'naan'],
    'French': ['french', 'bistro', 'brasserie', 'croissant'],
    'Korean': ['korean', 'bibimbap', 'bulgogi', 'kimchi'],
    'Vietnamese': ['vietnamese', 'pho', 'banh mi'],
    'Mediterranean': ['mediterranean', 'hummus', 'falafel', 'kebab'],
    'Greek': ['greek', 'gyro', 'souvlaki', 'tzatziki'],
    'Spanish': ['spanish', 'tapas', 'paella'],
    'American': ['american', 'burger', 'steak', 'bbq', 'barbecue'],
    'Seafood': ['seafood', 'fish', 'oyster', 'lobster', 'crab', 'shrimp'],
    'Vegetarian': ['vegetarian', 'vegan', 'plant-based'],
    'Bakery': ['bakery', 'pastry', 'bread', 'croissant', 'bagel'],
    'Deli': ['deli', 'sandwich', 'pastrami', 'corned beef'],
    'Breakfast': ['breakfast', 'brunch', 'pancake', 'waffle', 'egg'],
    'Ethiopian': ['ethiopian', 'injera'],
    'Caribbean': ['caribbean', 'jamaican', 'cuban'],
    'Middle Eastern': ['middle eastern', 'falafel', 'shawarma', 'kebab'],
    'African': ['african', 'nigerian', 'moroccan', 'ethiopian'],
    'Latin American': ['latin', 'colombian', 'peruvian', 'argentinian', 'brazilian'],
    'Fusion': ['fusion']
  }

  if (!bio) return 'American'
  
  const bioLower = bio.toLowerCase()
  
  for (const [cuisine, keywords] of Object.entries(cuisineKeywords)) {
    for (const keyword of keywords) {
      if (bioLower.includes(keyword)) {
        return cuisine
      }
    }
  }
  
  return 'American'
}

// Function to extract neighborhood from address
function extractNeighborhood(address) {
  if (!address) return 'NYC'
  
  // Common NYC neighborhoods to look for
  const neighborhoods = [
    'Astoria', 'Williamsburg', 'Park Slope', 'East Village', 'West Village', 
    'Upper East Side', 'Upper West Side', 'Lower East Side', 'Harlem', 
    'Chelsea', 'Midtown', 'SoHo', 'Tribeca', 'Financial District', 'Chinatown',
    'Brooklyn Heights', 'Dumbo', 'Bushwick', 'Greenpoint', 'Flushing',
    'Jackson Heights', 'Washington Heights', 'Hell\'s Kitchen', 'Gramercy',
    'Murray Hill', 'Flatiron', 'NoMad', 'NoHo', 'Greenwich Village',
    'Battery Park', 'Morningside Heights', 'Inwood', 'Kips Bay', 'Nolita',
    'Little Italy', 'Koreatown', 'Bedford-Stuyvesant', 'Crown Heights',
    'Prospect Heights', 'Fort Greene', 'Boerum Hill', 'Cobble Hill',
    'Carroll Gardens', 'Red Hook', 'Sunset Park', 'Bay Ridge', 'Flatbush',
    'Ridgewood', 'Sunnyside', 'Long Island City', 'Forest Hills', 'Rego Park',
    'Bronx', 'Queens', 'Brooklyn', 'Manhattan', 'Staten Island'
  ]
  
  // Check if any neighborhood is in the address
  for (const neighborhood of neighborhoods) {
    if (address.includes(neighborhood)) {
      return neighborhood
    }
  }
  
  // Extract from address format
  const parts = address.split(',')
  if (parts.length > 1) {
    const potentialNeighborhood = parts[parts.length - 2].trim()
    // Check if it's a NY neighborhood
    if (potentialNeighborhood.includes('NY') || potentialNeighborhood.includes('New York')) {
      return parts.length > 2 ? parts[parts.length - 3].trim() : 'NYC'
    }
    return potentialNeighborhood
  }
  
  return 'NYC'
}

// Function to extract dietary options from bio
function extractDietaryOptions(bio, scenarioTags) {
  const dietaryOptions = []
  
  if (!bio) return dietaryOptions
  
  const bioLower = bio.toLowerCase()
  
  // Check for dietary keywords in bio
  if (bioLower.includes('vegan')) dietaryOptions.push('vegan')
  if (bioLower.includes('vegetarian')) dietaryOptions.push('vegetarian')
  if (bioLower.includes('gluten-free') || bioLower.includes('gluten free')) dietaryOptions.push('gluten-free')
  if (bioLower.includes('halal')) dietaryOptions.push('halal')
  if (bioLower.includes('kosher')) dietaryOptions.push('kosher')
  
  // Check scenario tags for dietary hints
  if (scenarioTags && Array.isArray(scenarioTags)) {
    if (scenarioTags.includes('vegetarians') && !dietaryOptions.includes('vegetarian')) {
      dietaryOptions.push('vegetarian')
    }
    if (scenarioTags.includes('vegans') && !dietaryOptions.includes('vegan')) {
      dietaryOptions.push('vegan')
    }
    if (scenarioTags.includes('gluten-free options') && !dietaryOptions.includes('gluten-free')) {
      dietaryOptions.push('gluten-free')
    }
    if (scenarioTags.includes('halal') && !dietaryOptions.includes('halal')) {
      dietaryOptions.push('halal')
    }
  }
  
  return dietaryOptions
}

// Function to estimate price range from bio and scenario tags
function estimatePriceRange(bio, scenarioTags) {
  if (!bio) return 2
  
  const bioLower = bio.toLowerCase()
  
  // Check for price indicators in bio
  if (bioLower.includes('expensive') || bioLower.includes('high-end') || bioLower.includes('luxury')) {
    return 4
  }
  if (bioLower.includes('affordable') || bioLower.includes('reasonable') || bioLower.includes('mid-range')) {
    return 2
  }
  if (bioLower.includes('cheap') || bioLower.includes('budget') || bioLower.includes('inexpensive')) {
    return 1
  }
  
  // Check scenario tags for price hints
  if (scenarioTags && Array.isArray(scenarioTags)) {
    if (scenarioTags.includes('fine dining') || scenarioTags.includes('special occasions') || 
        scenarioTags.includes('corporate cards')) {
      return 4
    }
    if (scenarioTags.includes('cheap eats')) {
      return 1
    }
  }
  
  // Default to mid-range
  return 2
}

async function processRestaurants() {
  console.log('Processing restaurant data...')
  
  // Extract restaurants from the JSON structure
  const restaurants = data[0].restaurants
  console.log(`Found ${restaurants.length} restaurants to process`)
  
  // Track scenarios to avoid duplicates
  const processedScenarios = new Set()
  
  // First, process all unique scenarios
  console.log('Processing scenarios...')
  const allScenarioTags = new Set()
  
  restaurants.forEach(restaurant => {
    if (restaurant.scenario_tags && Array.isArray(restaurant.scenario_tags)) {
      restaurant.scenario_tags.forEach(tag => allScenarioTags.add(tag))
    }
  })
  
  for (const tag of allScenarioTags) {
    if (!tag || processedScenarios.has(tag)) continue
    
    const { data: existingScenario } = await supabase
      .from('scenarios')
      .select('id')
      .eq('name', tag)
      .maybeSingle()
    
    if (!existingScenario) {
      const { error } = await supabase
        .from('scenarios')
        .insert({ 
          name: tag, 
          description: `Restaurants suitable for ${tag}` 
        })
      
      if (error) {
        console.error(`Error creating scenario ${tag}:`, error)
      } else {
        console.log(`Created scenario: ${tag}`)
        processedScenarios.add(tag)
      }
    } else {
      processedScenarios.add(tag)
    }
  }
  
  // Now process restaurants
  console.log('Processing restaurants...')
  let successCount = 0
  let errorCount = 0
  
  const defaultUserId = '32fea64d-1bbf-4d2a-a4d8-07c5d011640e'; // Define the default user ID

  for (let i = 0; i < restaurants.length; i++) {
    const restaurant = restaurants[i]
    
    // Skip if no name
    if (!restaurant.name) {
      console.log(`Skipping restaurant at index ${i} - no name provided`)
      continue
    }
    
    // Check if restaurant already exists
    const { data: existingRestaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('name', restaurant.name)
      .maybeSingle()
    
    if (existingRestaurant) {
      console.log(`Restaurant already exists: ${restaurant.name}`)
      continue
    }
    
    // Extract data
    const cuisineType = extractCuisineType(restaurant.bio)
    const neighborhood = extractNeighborhood(restaurant.address)
    const dietaryOptions = extractDietaryOptions(restaurant.bio, restaurant.scenario_tags)
    const priceRange = estimatePriceRange(restaurant.bio, restaurant.scenario_tags)
    
    // Create restaurant record
    const { data: newRestaurant, error } = await supabase
      .from('restaurants')
      .insert({
        name: restaurant.name,
        cuisine_type: cuisineType,
        address: restaurant.address || 'New York, NY',
        neighborhood: neighborhood,
        price_range: priceRange,
        dietary_options: dietaryOptions,
        description: restaurant.bio || null,
        image_url: null // You can add image URLs later
      })
      .select()
    
    if (error) {
      console.error(`Error inserting restaurant ${restaurant.name}:`, error)
      errorCount++
    } else {
      console.log(`Added restaurant: ${restaurant.name} (${i+1}/${restaurants.length})`)
      successCount++
      
      // Process scenario tags if available
      if (restaurant.scenario_tags && restaurant.scenario_tags.length > 0) {
        for (const tag of restaurant.scenario_tags) {
          if (!tag) continue
          
          // Get the scenario ID
          const { data: scenarioData } = await supabase
            .from('scenarios')
            .select('id')
            .eq('name', tag)
            .maybeSingle()
          
          if (scenarioData) {
            // Create a recommendation
            const { error: recError } = await supabase
              .from('recommendations')
              .insert({
                restaurant_id: newRestaurant[0].id,
                scenario_id: scenarioData.id,
                user_id: defaultUserId,
                reason: `${restaurant.name} is great for ${tag}.`
              })
            
            if (recError) {
              console.error(`Error creating recommendation for ${restaurant.name} with scenario ${tag}:`, recError)
            }
          }
        }
      }
    }
  }
  
  console.log(`Processing complete! Added ${successCount} restaurants with ${errorCount} errors.`)
}

processRestaurants().catch(console.error) 