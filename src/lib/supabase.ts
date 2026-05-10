/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Basic URL validation to prevent Supabase SDK from throwing errors
const isValidUrl = (url: string) => {
  try {
    return url && (url.startsWith('https://') || url.startsWith('http://'));
  } catch {
    return false;
  }
};

if (!supabaseUrl || !supabaseAnonKey || !isValidUrl(supabaseUrl)) {
  console.warn("Supabase configuration is missing or invalid. Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Settings.");
  console.log("DEBUG - Supabase URL found:", supabaseUrl ? "YES (masked)" : "NO");
  console.log("DEBUG - Supabase Anon Key found:", supabaseAnonKey ? "YES (masked)" : "NO");
  
  if (supabaseUrl && !isValidUrl(supabaseUrl)) {
    console.error("Invalid Supabase URL format. It should start with https:// - Found:", supabaseUrl);
  }
} else {
  console.log("Supabase client initialized successfully at", supabaseUrl);
}

export const supabase = (supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl)) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Supabase Table Schema - FULL MIGRATION (Run this in Supabase SQL Editor):
 * 
 * -- 0. Helper for timestamps
 * CREATE OR REPLACE FUNCTION trigger_set_timestamp()
 * RETURNS TRIGGER AS $$
 * BEGIN
 *   NEW.updated_at = NOW();
 *   RETURN NEW;
 * END;
 * $$ LANGUAGE plpgsql;
 * 
 * -- 1. Profiles Table (Uses TEXT for Firebase UIDs)
 * CREATE TABLE IF NOT EXISTS public.profiles (
 *   id TEXT PRIMARY KEY, -- Firebase UID
 *   full_name TEXT,
 *   email TEXT,
 *   avatar_url TEXT,
 *   class_level TEXT DEFAULT '10',
 *   xp INTEGER DEFAULT 0,
 *   streak INTEGER DEFAULT 0,
 *   is_premium BOOLEAN DEFAULT false,
 *   plan_type TEXT,
 *   unlocked_resources TEXT[] DEFAULT '{}',
 *   unlocked_classes TEXT[] DEFAULT '{}',
 *   saved_notes TEXT[] DEFAULT '{}',
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 2. User Points Table (user_id is TEXT)
 * CREATE TABLE IF NOT EXISTS public.user_points (
 *   user_id TEXT PRIMARY KEY, -- Firebase UID
 *   total_points INTEGER DEFAULT 0,
 *   total_minutes INTEGER DEFAULT 0,
 *   streak_days INTEGER DEFAULT 0,
 *   last_visit_date BIGINT, 
 *   last_updated TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 3. Posts (author_id is TEXT)
 * CREATE TABLE IF NOT EXISTS public.posts (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   author_id TEXT NOT NULL,
 *   title TEXT,
 *   content TEXT,
 *   subject TEXT,
 *   upvotes INTEGER DEFAULT 0,
 *   downvotes INTEGER DEFAULT 0,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 4. Replies (author_id is TEXT)
 * CREATE TABLE IF NOT EXISTS public.replies (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   post_id UUID REFERENCES public.posts(id),
 *   author_id TEXT NOT NULL,
 *   content TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 5. Community Chat (user_id is TEXT)
 * CREATE TABLE IF NOT EXISTS public.community_chat (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id TEXT NOT NULL,
 *   user_name TEXT,
 *   message TEXT NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 6. Story Unlocks (user_id is TEXT)
 * CREATE TABLE IF NOT EXISTS public.story_unlocks (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id TEXT NOT NULL,
 *   resource_id TEXT,
 *   template_id UUID,
 *   status TEXT DEFAULT 'pending',
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 7. Schedules (user_id is TEXT)
 * CREATE TABLE IF NOT EXISTS public.schedules (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id TEXT NOT NULL,
 *   title TEXT,
 *   subject TEXT,
 *   date TEXT,
 *   time TEXT,
 *   completed BOOLEAN DEFAULT false,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 8. RPC Functions (Updated for TEXT uids)
 * CREATE OR REPLACE FUNCTION increment_xp(user_id TEXT, amount INT)
 * RETURNS void AS $$
 * BEGIN
 *   UPDATE public.profiles
 *   SET xp = COALESCE(xp, 0) + amount,
 *       updated_at = NOW()
 *   WHERE id = user_id;
 * END;
 * $$ LANGUAGE plpgsql;
 * 
 * CREATE OR REPLACE FUNCTION increment_focus_minutes(user_id TEXT, amount INT)
 * RETURNS void AS $$
 * BEGIN
 *   UPDATE public.user_points
 *   SET total_minutes = COALESCE(total_minutes, 0) + amount,
 *       last_updated = NOW()
 *   WHERE user_id = user_id;
 * END;
 * $$ LANGUAGE plpgsql;
 */
