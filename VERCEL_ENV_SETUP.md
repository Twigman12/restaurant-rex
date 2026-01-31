# Vercel Environment Variables Setup

## Issue
The deployed application is failing because Supabase environment variables are not configured in Vercel. This causes `ERR_NAME_NOT_RESOLVED` errors when trying to connect to Supabase.

## Required Environment Variables

You need to set the following environment variables in your Vercel project:

### Client-Side Variables (NEXT_PUBLIC_*)
These are exposed to the browser and are required for client-side Supabase operations:

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Your Supabase project URL
   - Format: `https://[project-ref].supabase.co`
   - Example: `https://vycxxgpjuezlpxpvonkg.supabase.co`

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Your Supabase anonymous/public key
   - Found in: Supabase Dashboard → Settings → API → anon/public key

### Server-Side Variables
These are only used on the server and are not exposed to the browser:

3. **SUPABASE_URL**
   - Same as NEXT_PUBLIC_SUPABASE_URL
   - Format: `https://[project-ref].supabase.co`

4. **SUPABASE_SERVICE_ROLE_KEY**
   - Your Supabase service role key (⚠️ Keep this secret!)
   - Found in: Supabase Dashboard → Settings → API → service_role key
   - This key bypasses Row Level Security (RLS) - use with caution

## How to Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to: **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: The variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value**: The actual value from your Supabase project
   - **Environment**: Select all environments (Production, Preview, Development)
4. Click **Save**
5. **Redeploy** your application for changes to take effect

## Finding Your Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. You'll find:
   - **Project URL** → Use for `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`
   - **anon public** key → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → Use for `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

## Verification

After setting the variables and redeploying:
1. Check the Vercel deployment logs for any errors
2. Try logging in at `/login`
3. Check browser console - should no longer see `ERR_NAME_NOT_RESOLVED` errors

## Troubleshooting

- **ERR_NAME_NOT_RESOLVED**: Environment variables not set or incorrect Supabase URL
- **401 Unauthorized**: Incorrect API keys
- **React Error #418**: Usually caused by missing env vars causing hydration issues

## Security Notes

- Never commit `.env.local` or `.env` files to git
- The `NEXT_PUBLIC_*` variables are exposed to the browser - only use safe keys
- The `SUPABASE_SERVICE_ROLE_KEY` should NEVER be exposed to the client
- Use RLS (Row Level Security) policies in Supabase to protect your data



