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
 * Supabase Table Schema Recommendations (Run this in Supabase SQL Editor):
 * 
 * -- 1. Purchase Requests Table
 * CREATE TABLE purchase_requests (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   email TEXT NOT NULL,
 *   whatsapp TEXT NOT NULL,
 *   userId TEXT,
 *   transactionId TEXT UNIQUE,
 *   planId TEXT,
 *   planName TEXT,
 *   subject TEXT,
 *   class TEXT,
 *   amount NUMERIC,
 *   status TEXT DEFAULT 'pending',
 *   isGuest BOOLEAN DEFAULT true,
 *   driveLink TEXT,
 *   timestamp TIMESTAMPTZ DEFAULT NOW(),
 *   note TEXT
 * );
 * 
 * -- 2. Transaction Registry (for double-spend prevention)
 * CREATE TABLE transaction_registry (
 *   id TEXT PRIMARY KEY,
 *   redeemed_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 3. Subject Resources (Fall-back for resource viewing)
 * CREATE TABLE subject_resources (
 *   id TEXT PRIMARY KEY,
 *   subject TEXT,
 *   class TEXT,
 *   title TEXT,
 *   description TEXT,
 *   price NUMERIC DEFAULT 0,
 *   drive_link TEXT,
 *   cover_url TEXT,
 *   features TEXT, -- JSON string or JSONB
 *   is_free BOOLEAN DEFAULT false,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 */
