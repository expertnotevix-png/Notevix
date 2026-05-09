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
 * -- Ensure columns exist if table already exists
 * ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_level TEXT DEFAULT '10';
 * ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;
 * ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unlocked_resources TEXT[] DEFAULT '{}';
 * ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unlocked_classes TEXT[] DEFAULT '{}';
 * ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS saved_notes TEXT[] DEFAULT '{}';
 * 
 * -- 2. User Points Table
 * CREATE TABLE IF NOT EXISTS public.user_points (
 *   user_id TEXT PRIMARY KEY, -- Firebase UID
 *   total_points INTEGER DEFAULT 0,
 *   total_minutes INTEGER DEFAULT 0,
 *   streak_days INTEGER DEFAULT 0,
 *   last_visit_date BIGINT, 
 *   last_updated TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 3. Referrals Table
 * CREATE TABLE IF NOT EXISTS public.referrals (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   referrer_id TEXT NOT NULL, 
 *   referred_user_id TEXT NOT NULL UNIQUE,
 *   is_verified BOOLEAN DEFAULT TRUE,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 4. Free Resources
 * CREATE TABLE IF NOT EXISTS public.free_resources (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   subject TEXT NOT NULL,
 *   class_level TEXT NOT NULL,
 *   description TEXT,
 *   drive_link TEXT NOT NULL,
 *   cover_url TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 5. Subject Resources (Premium)
 * CREATE TABLE IF NOT EXISTS public.subject_resources (
 *   id TEXT PRIMARY KEY,
 *   subject TEXT NOT NULL,
 *   class TEXT NOT NULL,
 *   title TEXT,
 *   description TEXT,
 *   price NUMERIC DEFAULT 0,
 *   drive_link TEXT,
 *   cover_url TEXT,
 *   features JSONB DEFAULT '[]',
 *   is_free BOOLEAN DEFAULT false,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 6. Verified Payments Table
 * CREATE TABLE IF NOT EXISTS public.verified_payments (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   transaction_id TEXT UNIQUE NOT NULL,
 *   phone_number TEXT,
 *   amount NUMERIC,
 *   subject TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 7. Purchase Requests
 * CREATE TABLE IF NOT EXISTS public.purchase_requests (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id TEXT, 
 *   email TEXT,
 *   whatsapp TEXT,
 *   transaction_id TEXT UNIQUE NOT NULL,
 *   amount NUMERIC,
 *   plan_id TEXT,
 *   plan_name TEXT,
 *   resource_id TEXT,
 *   status TEXT DEFAULT 'pending',
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 8. Promo Banners
 * CREATE TABLE IF NOT EXISTS public.promo_banners (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   image_url TEXT NOT NULL,
 *   link TEXT,
 *   location TEXT DEFAULT 'home',
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 9. RPC Functions
 * CREATE OR REPLACE FUNCTION increment_xp(user_id text, amount int)
 * RETURNS void AS $$
 * BEGIN
 *   UPDATE public.profiles
 *   SET xp = COALESCE(xp, 0) + amount,
 *       updated_at = NOW()
 *   WHERE id = user_id;
 * END;
 * $$ LANGUAGE plpgsql;
 * 
 * CREATE OR REPLACE FUNCTION increment_focus_minutes(user_id text, amount int)
 * RETURNS void AS $$
 * BEGIN
 *   UPDATE public.user_points
 *   SET total_minutes = COALESCE(total_minutes, 0) + amount,
 *       last_updated = NOW()
 *   WHERE user_id = user_id;
 * END;
 * $$ LANGUAGE plpgsql;
 */
