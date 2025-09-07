# Database Setup Instructions

## Quick Setup Steps:

### 1. Go to Supabase Dashboard
- Open: https://supabase.com/dashboard
- Sign in to your account
- Select your project (vycxxgpjuezlpxpvonkg)

### 2. Open SQL Editor
- Click "SQL Editor" in the left sidebar
- Click "New Query"

### 3. Copy and Paste This SQL Code:

```sql
-- Restaurant-REX Database Setup
-- Run this in your Supabase SQL Editor

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  borough TEXT,
  address TEXT,
  cuisine_type TEXT NOT NULL,
  description TEXT,
  price_range INTEGER CHECK (price_range >= 1 AND price_range <= 4),
  dietary_options TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scenarios table
CREATE TABLE IF NOT EXISTS scenarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create experiences table
CREATE TABLE IF NOT EXISTS experiences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
  scenario_id UUID REFERENCES scenarios(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  visited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
  scenario_id UUID REFERENCES scenarios(id),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Anyone can view restaurants" ON restaurants FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert restaurants" ON restaurants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update restaurants" ON restaurants FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view scenarios" ON scenarios FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert scenarios" ON scenarios FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view own experiences" ON experiences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own experiences" ON experiences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own experiences" ON experiences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own experiences" ON experiences FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own recommendations" ON recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recommendations" ON recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert default scenarios
INSERT INTO scenarios (name, description) VALUES
  ('Date Night', 'Romantic dinner for two'),
  ('Business Meeting', 'Professional dining experience'),
  ('Family Dinner', 'Casual family gathering'),
  ('Birthday Celebration', 'Special birthday dinner'),
  ('Anniversary', 'Celebrating an anniversary'),
  ('Casual Lunch', 'Quick lunch with friends'),
  ('Fine Dining', 'Upscale dining experience'),
  ('Group Dinner', 'Large group gathering')
ON CONFLICT (name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_experiences_user_id ON experiences(user_id);
CREATE INDEX IF NOT EXISTS idx_experiences_restaurant_id ON experiences(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_experiences_visited_at ON experiences(visited_at);
CREATE INDEX IF NOT EXISTS idx_restaurants_neighborhood ON restaurants(neighborhood);
CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine_type ON restaurants(cuisine_type);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
```

### 4. Run the Script
- Click the "Run" button in the SQL Editor
- Wait for it to complete (should show "Success" message)

### 5. Test Your Application
- Go back to: http://localhost:3001/experiences
- Refresh the page
- Try adding an experience

## What This Creates:
✅ 5 database tables (restaurants, experiences, scenarios, profiles, recommendations)
✅ Security policies to protect your data
✅ 8 default scenarios (Date Night, Business Meeting, etc.)
✅ Database indexes for better performance

## If You Get Errors:
- Make sure you're in the correct Supabase project
- Check that you copied the entire SQL script
- Try running it in smaller chunks if needed
