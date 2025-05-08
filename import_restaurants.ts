import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Construct the absolute path to .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath }); // Load environment variables from .env.local

// Define the structure from code.txt (simplified)
interface CodeTxtRestaurant {
  bio?: string;
  name?: string;
  address?: string;
  borough?: string;
  popular_items?: string[];
  vibe?: string;
  scenario_tags?: string[];
  geospatial_data?: {
    latitude?: number | null;
    longitude?: number | null;
  };
  // Fields not directly in Restaurant type but might be in source
  cuisine?: string; // Example if cuisine was a top-level field
}

interface CodeTxtData {
  restaurants: CodeTxtRestaurant[];
}

// Define the target Restaurant type (mirroring lib/types.ts)
export type RestaurantDbInsert = {
  name: string;
  cuisine_type?: string | null;
  address: string;
  neighborhood?: string | null;
  borough?: string | null;
  price_range?: number | null;
  dietary_options?: string[] | null;
  description?: string | null;
  image_url?: string | null;
  popular_items?: string[] | null;
  vibe?: string | null;
  scenario_tags?: string[] | null;
  latitude?: number | null;
  longitude?: number | null;
  // id, created_at, updated_at are typically handled by Supabase
};

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase URL or Anon Key is missing. Please check your .env file.',
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Helper functions for inference ---

function inferCuisine(bio: string | undefined): string | null {
  if (!bio) return 'Not specified';
  const lowerBio = bio.toLowerCase();
  // Simple keyword matching - can be expanded
  if (lowerBio.includes('bengali')) return 'Bengali';
  if (lowerBio.includes('colombian')) return 'Colombian';
  if (lowerBio.includes('kosher deli')) return 'Kosher Deli';
  if (lowerBio.includes('italian')) return 'Italian';
  if (lowerBio.includes('thai')) return 'Thai';
  if (lowerBio.includes('israeli')) return 'Israeli';
  if (lowerBio.includes('fried chicken')) return 'Fried Chicken'; // Could be 'American'
  if (lowerBio.includes('greek')) return 'Greek';
  if (lowerBio.includes('korean barbecue') || lowerBio.includes('kbbq')) return 'Korean BBQ';
  if (lowerBio.includes('korean')) return 'Korean';
  if (lowerBio.includes('french')) return 'French';
  if (lowerBio.includes('japanese')) return 'Japanese';
  if (lowerBio.includes('dominican')) return 'Dominican';
  if (lowerBio.includes('venezuelan')) return 'Venezuelan';
  if (lowerBio.includes('nepali') || lowerBio.includes('kathmandu')) return 'Nepali';
  if (lowerBio.includes('ecuadorian')) return 'Ecuadorian';
  if (lowerBio.includes('mexican') || lowerBio.includes('taqueria') || lowerBio.includes('tlayudas') || lowerBio.includes('birria')) return 'Mexican';
  if (lowerBio.includes('sushi')) return 'Sushi';
  if (lowerBio.includes('seafood')) return 'Seafood';
  if (lowerBio.includes('american')) return 'American';
  if (lowerBio.includes('pizza')) return 'Pizza';
  // Add more sophisticated logic or NLP if needed
  return 'Not specified'; // Default
}

function inferNeighborhood(address: string | undefined, borough: string | undefined): string | null {
  if (!address) return borough || null;
  // Basic parsing: assumes format "Street Address, Neighborhood, NY ZIP" or "Neighborhood, NY"
  const parts = address.split(',');
  if (parts.length > 1) {
    const potentialNeighborhood = parts[parts.length - 2]?.trim();
    if (potentialNeighborhood && !potentialNeighborhood.match(/^NY\s*\d{5}$/i) && potentialNeighborhood.toLowerCase() !== 'ny') {
        // Check if it's a known borough, if so, maybe the part before it is the neighborhood if address is more complex
        const knownBoroughs = ["manhattan", "brooklyn", "queens", "the bronx", "staten island"];
        if (knownBoroughs.includes(potentialNeighborhood.toLowerCase()) && parts.length > 2) {
            const beforeBorough = parts[parts.length - 3]?.trim();
            if (beforeBorough && !beforeBorough.match(/^NY\s*\d{5}$/i) && beforeBorough.toLowerCase() !== 'ny') {
                return beforeBorough;
            }
        }
        return potentialNeighborhood;
    }
  }
  // Fallback for simpler addresses like "Jackson Heights, NY"
  if (parts.length === 2 && parts[1].trim().toLowerCase().startsWith('ny')) {
    return parts[0].trim();
  }
  return borough || null; // Fallback to borough or null
}

function inferDietaryOptions(bio: string | undefined): string[] | null {
  if (!bio) return null;
  const options: string[] = [];
  const lowerBio = bio.toLowerCase();
  if (lowerBio.includes('vegetarian')) options.push('vegetarian');
  if (lowerBio.includes('vegan')) options.push('vegan');
  if (lowerBio.includes('gluten-free') || lowerBio.includes('gluten free')) options.push('gluten-free');
  // Add more common dietary terms
  return options.length > 0 ? options : null;
}

async function importData() {
  const filePath = '/Users/pursuit/Desktop/code.txt'; // Using the absolute path provided
  let jsonData: CodeTxtData;

  try {
    const fileContents = fs.readFileSync(filePath, 'utf-8');
    // The provided text file is a JSON array, not an object with a "restaurants" key.
    // Adjusting parsing accordingly. Assuming the root is the array of restaurants.
    const parsedArray = JSON.parse(fileContents);
    if (Array.isArray(parsedArray) && parsedArray.length > 0 && parsedArray[0].restaurants && Array.isArray(parsedArray[0].restaurants)) {
        // This structure matches the example `[{"restaurants": [...]}]`
        jsonData = parsedArray[0] as CodeTxtData;
    } else if (Array.isArray(parsedArray)) {
        // This handles if code.txt is directly an array of restaurant objects
         jsonData = { restaurants: parsedArray as CodeTxtRestaurant[] };
    }
    else {
        console.error("Parsed JSON from code.txt is not in the expected format (array of restaurants or object containing a restaurants array). Found:", parsedArray);
        return;
    }

  } catch (error) {
    console.error(`Error reading or parsing ${filePath}:`, error);
    return;
  }

  if (!jsonData || !jsonData.restaurants || !Array.isArray(jsonData.restaurants)) {
    console.error('No restaurants data found or data is not an array in the JSON file.');
    return;
  }
  
  const restaurantsToUpsert: RestaurantDbInsert[] = [];

  for (const r of jsonData.restaurants) {
    if (!r.name || !r.address) {
      console.warn('Skipping restaurant due to missing name or address:', r);
      continue;
    }

    const inferredCuisine = r.cuisine || inferCuisine(r.bio); // Prioritize explicit cuisine if it existed
    const inferredNeighborhood = inferNeighborhood(r.address, r.borough);
    const inferredDietary = inferDietaryOptions(r.bio);

    const restaurant: RestaurantDbInsert = {
      name: r.name,
      cuisine_type: inferredCuisine,
      address: r.address,
      neighborhood: inferredNeighborhood,
      borough: r.borough || null,
      price_range: null, // Not in source data
      dietary_options: inferredDietary,
      description: r.bio || null,
      image_url: null, // Not in source data
      popular_items: r.popular_items || null,
      vibe: r.vibe || null,
      scenario_tags: r.scenario_tags || null,
      latitude: r.geospatial_data?.latitude !== undefined ? r.geospatial_data.latitude : null,
      longitude: r.geospatial_data?.longitude !== undefined ? r.geospatial_data.longitude : null,
    };
    restaurantsToUpsert.push(restaurant);
  }

  if (restaurantsToUpsert.length === 0) {
    console.log("No restaurants to upsert.");
    return;
  }

  console.log(`Attempting to upsert ${restaurantsToUpsert.length} restaurants...`);

  // Upsert based on name and address as a pseudo-unique key.
  // For a more robust solution, consider a dedicated source_id or hash.
  // Supabase upsert needs a constraint name or columns for conflict resolution.
  // Let's assume you might create a unique constraint on (name, address)
  // e.g., ALTER TABLE restaurants ADD CONSTRAINT restaurants_name_address_unique UNIQUE (name, address);
  // If not, upsert might behave like insert or fail depending on PK.
  // We will use `onConflict: 'name,address'` if such a constraint exists.
  // Otherwise, it will try to insert and rely on primary key for conflicts if `id` was part of insert.
  // Since `id` is auto-generated, we'll just insert and let PK handle true newness if no constraint.
  // For this script, to perform an "update on conflict", you NEED a unique constraint
  // on the columns used for conflict resolution (e.g., name and address).

  // const { data, error } = await supabase
  //   .from('restaurants')
  //   .upsert(restaurantsToUpsert, {
  //     // onConflict: 'name,address', // UNCOMMENT if you have a UNIQUE constraint on (name, address)
  //     // ignoreDuplicates: false, // Set to true if you'd rather skip duplicates than update
  //   });

  // Due to potential issues with upsert without a predefined unique constraint on business keys,
  // let's do a simpler insert for now. You can refine this with a proper upsert strategy.
  // This means if you run it multiple times without clearing the table, you'll get duplicates
  // UNLESS your primary key (id) is somehow derived and included in the insert object,
  // OR you manually ensure `name`+`address` is unique before running.

  // For a safer batch insert that won't create duplicates if run multiple times,
  // you'd typically fetch existing name+address combinations first, or use a proper upsert
  // with a defined conflict target.

  // Simple insert approach (will create duplicates if run multiple times on existing data):
  console.log("Using simple insert. If you have a unique constraint on name & address, consider uncommenting and using the upsert logic.");
  const { data, error } = await supabase
    .from('restaurants')
    .insert(restaurantsToUpsert);


  if (error) {
    console.error('Error upserting/inserting data into Supabase:', error);
  } else {
    console.log('Successfully upserted/inserted data:', data);
    console.log(`${restaurantsToUpsert.length} restaurants processed.`);
  }
}

importData().catch(console.error); 