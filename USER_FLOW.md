# Restaurant Rex - User Flow Documentation

## Overview
Restaurant Rex is an AI-powered conversational restaurant discovery platform for NYC. This document outlines the complete user journey and interaction flows within the application.

## Main User Flows

### 1. First-Time Visitor Flow (Unauthenticated)

```
Landing Page (/)
    ↓
[Search Input] OR [Get Recommendations Button]
    ↓
Redirect to Login (/login)
    ↓
[Sign Up Link] → Sign Up Page (/signup)
    ↓
Email/Password/Full Name Input
    ↓
Account Created → Redirect to Home
    ↓
Welcome to Chat Interface (/chat)
```

### 2. Returning User Flow (Authenticated)

```
Home Page (/)
    ↓
[Search Input with Query] → Store in Session Storage
    ↓
Chat Page (/chat) with Pre-filled Query
    ↓
AI Processes Query → Returns Recommendations
    ↓
User Reviews Recommendations
    ↓
[Log Experience] → Experiences Page (/experiences)
    ↓
[View Restaurant Details] → Restaurant Detail Page (/restaurants/[id])
```

### 3. Core Chat Interaction Flow

```
Chat Page (/chat)
    ↓
User Input: "Italian restaurant in SoHo"
    ↓
AI Processing (Gemini)
    ↓
Database Query (Supabase)
    ↓
Results Processing
    ↓
Response Options:
    ├─ Follow-up Question → User Responds → Loop
    ├─ Recommendations → Display Cards → User Actions
    └─ No Results → Suggest Alternatives
    ↓
User Actions:
    ├─ Ask for More Details
    ├─ Request Different Options
    ├─ Click "Log Experience"
    └─ Click "View Details"
```

### 4. Restaurant Discovery Flow

```
Restaurant Cards Display
    ↓
User Clicks Restaurant Card
    ↓
Restaurant Detail Page (/restaurants/[id])
    ↓
Two Tabs:
    ├─ Overview Tab:
    │   ├─ Restaurant Info
    │   ├─ Details (Address, Price, Rating)
    │   ├─ Popular Items
    │   └─ Actions (Log Experience)
    └─ AI Vibe Check Tab:
        ├─ "Get Vibe Check" Button
        ├─ AI Processes Reviews
        ├─ Generates Summary:
        │   ├─ Atmosphere
        │   ├─ Must-Try Dishes
        │   └─ Tips
        └─ 24-hour Cache
```

### 5. Experience Logging Flow

```
From Restaurant Detail OR Chat
    ↓
Experiences Page (/experiences)
    ↓
Form Options:
    ├─ Select Existing Restaurant (Dropdown)
    └─ OR Add New Restaurant:
        ├─ Restaurant Name
        ├─ Cuisine Type
        ├─ Neighborhood
        ├─ Address
        ├─ Price Range
        └─ Description
    ↓
Experience Details:
    ├─ Date of Visit
    ├─ Occasion (Optional)
    ├─ Rating (1-5 stars)
    └─ Notes
    ↓
Submit → Save to Database
    ↓
Success Message → Form Reset
    ↓
View Recent Experiences (Optional)
```

### 6. Navigation & Sidebar Flow

```
App Sidebar (Authenticated Users)
    ├─ Home (/)
    ├─ Chat (/chat) - Main Feature
    ├─ Experiences (/experiences)
    ├─ Profile (/profile)
    └─ Sign Out
```

## Key Features & Interactions

### AI Chat Features
- **Natural Language Processing**: Users can type queries like "cozy date spot under $50"
- **Context Retention**: AI remembers conversation history
- **Follow-up Questions**: AI asks clarifying questions when needed
- **Smart Fallbacks**: Provides alternatives when exact matches aren't found
- **Progressive Enhancement**: Conversation gets more refined with each interaction

### Restaurant Data Sources
1. **Local Database**: Curated NYC restaurants
2. **Google Places API**: Real-time data for Google Places IDs
3. **AI Vibe Check**: Processes Google reviews for insights

### User Actions
- **Quick Suggestions**: Pre-built prompts for common queries
- **Restaurant Cards**: Interactive cards with actions
- **Experience Logging**: Track personal dining history
- **Vibe Check**: AI-generated restaurant insights

## Error Handling & Edge Cases

### Authentication Errors
```
Invalid Token → Auto Logout → Redirect to Login
Session Expired → Clear State → Login Required
```

### Search Errors
```
No Results Found → Suggest Alternatives
API Errors → Graceful Fallback Message
Network Issues → Retry Options
```

### Data Validation
```
Missing Required Fields → Form Validation
Invalid Restaurant Data → Error Messages
Database Errors → User-Friendly Messages
```

## Mobile Responsiveness

All flows are optimized for mobile devices with:
- Responsive navigation (hamburger menu on mobile)
- Touch-friendly interface elements
- Optimized chat interface for mobile keyboards
- Mobile-first design patterns

## Performance Considerations

- **Lazy Loading**: Components load as needed
- **Caching**: AI Vibe Check results cached for 24 hours
- **Real-time Updates**: Supabase real-time subscriptions
- **Optimistic UI**: Immediate feedback for user actions

## Security & Privacy

- **Row Level Security**: Users only see their own data
- **JWT Authentication**: Secure session management
- **Environment Variables**: API keys protected
- **Input Sanitization**: All user inputs validated

## Analytics & Tracking

- **Recommendation Logging**: All AI suggestions tracked
- **User Preferences**: Learning from user interactions
- **Experience History**: Personal dining timeline
- **Chat Analytics**: Conversation patterns analyzed

---

This user flow documentation provides a comprehensive overview of how users interact with Restaurant Rex, from initial discovery through detailed restaurant exploration and personal experience tracking.
