/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase configuration is missing in environment variables. Payments will fall back to limited mode.");
} else {
  console.log("Supabase client initialized successfully with URL:", supabaseUrl.substring(0, 15) + "...");
}

export const supabase = (supabaseUrl && supabaseAnonKey) 
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
 *   driveLink TEXT,
 *   coverUrl TEXT,
 *   createdAt TIMESTAMPTZ DEFAULT NOW()
 * );
 */
