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
 * -- 1. Subject Resources Table
 * CREATE TABLE IF NOT EXISTS public.subject_resources (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   subject TEXT NOT NULL,
 *   class TEXT NOT NULL,
 *   description TEXT,
 *   drive_link TEXT,
 *   cover_image TEXT,
 *   price FLOAT DEFAULT 0,
 *   pdf_password TEXT,
 *   is_premium BOOLEAN DEFAULT false,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 2. Promotional Banners Table
 * CREATE TABLE IF NOT EXISTS public.promotional_banners (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   title TEXT,
 *   banner_image TEXT NOT NULL,
 *   redirect_link TEXT,
 *   location TEXT,
 *   is_active BOOLEAN DEFAULT true,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 3. Verified Payments Table
 * CREATE TABLE IF NOT EXISTS public.verified_payments (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   phone_number TEXT NOT NULL,
 *   transaction_id TEXT NOT NULL,
 *   amount FLOAT NOT NULL,
 *   product_name TEXT,
 *   status TEXT DEFAULT 'pending',
 *   unlock_password TEXT,
 *   rejection_reason TEXT,
 *   approved BOOLEAN DEFAULT false,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 4. PDF Requests Table
 * CREATE TABLE IF NOT EXISTS public.pdf_requests (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   student_name TEXT NOT NULL,
 *   class_name TEXT NOT NULL,
 *   email TEXT,
 *   phone_number TEXT,
 *   instagram_username TEXT,
 *   requested_pdf TEXT,
 *   status TEXT DEFAULT 'pending',
 *   approved BOOLEAN DEFAULT false,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 */
