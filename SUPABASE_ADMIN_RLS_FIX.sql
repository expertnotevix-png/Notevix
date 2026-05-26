-- SUPABASE ADMINISTRATIVE RLS POLICY FIXES
-- Copy and run this script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- 
-- Why this is needed:
-- The admin panel manages resources, payments, and PDF requests client-side, using Firebase Authentication.
-- Since Supabase is initialized as an anonymous client and does not "know" about your Firebase Auth session internally, 
-- any write or update actions are rejected by row-level security (RLS) under the default JWT policy.
--
-- Running this script grants permissions to update these records, solving the database update issues.

-- ==========================================
-- 1. VERIFIED PAYMENTS POLICIES (FIXED)
-- ==========================================
ALTER TABLE public.verified_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Insert Verified Payments" ON public.verified_payments;
DROP POLICY IF EXISTS "Owner Select Verified Payments" ON public.verified_payments;
DROP POLICY IF EXISTS "Admin All Verified Payments" ON public.verified_payments;
DROP POLICY IF EXISTS "Public Update Verified Payments" ON public.verified_payments;
DROP POLICY IF EXISTS "Public Delete Verified Payments" ON public.verified_payments;

-- Create fully permissive policies for development/production integration
CREATE POLICY "Public Select Verified Payments" ON public.verified_payments FOR SELECT USING (true);
CREATE POLICY "Public Insert Verified Payments" ON public.verified_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Verified Payments" ON public.verified_payments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Verified Payments" ON public.verified_payments FOR DELETE USING (true);

-- ==========================================
-- 2. PDF REQUESTS POLICIES (FIXED)
-- ==========================================
ALTER TABLE public.pdf_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Insert PDF Requests" ON public.pdf_requests;
DROP POLICY IF EXISTS "Admin All PDF Requests" ON public.pdf_requests;
DROP POLICY IF EXISTS "Public Select PDF Requests" ON public.pdf_requests;
DROP POLICY IF EXISTS "Public Update PDF Requests" ON public.pdf_requests;
DROP POLICY IF EXISTS "Public Delete PDF Requests" ON public.pdf_requests;

CREATE POLICY "Public Select PDF Requests" ON public.pdf_requests FOR SELECT USING (true);
CREATE POLICY "Public Insert PDF Requests" ON public.pdf_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update PDF Requests" ON public.pdf_requests FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete PDF Requests" ON public.pdf_requests FOR DELETE USING (true);

-- ==========================================
-- 3. SUBJECT RESOURCES POLICIES (OPTIONAL AUTO-FIX)
-- ==========================================
ALTER TABLE public.subject_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read resources" ON public.subject_resources;
DROP POLICY IF EXISTS "Admin write resources" ON public.subject_resources;
DROP POLICY IF EXISTS "Public write resources" ON public.subject_resources;

CREATE POLICY "Public read resources" ON public.subject_resources FOR SELECT USING (true);
CREATE POLICY "Public write resources" ON public.subject_resources FOR ALL USING (true);

-- ==========================================
-- 4. PROMOTIONAL BANNERS POLICIES (OPTIONAL AUTO-FIX)
-- ==========================================
ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Banners" ON public.promotional_banners;
DROP POLICY IF EXISTS "Admin Write Banners" ON public.promotional_banners;
DROP POLICY IF EXISTS "Public Write Banners" ON public.promotional_banners;

CREATE POLICY "Public Read Banners" ON public.promotional_banners FOR SELECT USING (true);
CREATE POLICY "Public Write Banners" ON public.promotional_banners FOR ALL USING (true);

-- Ensure all necessary grants are restored
GRANT ALL ON public.verified_payments TO anon, authenticated, service_role;
GRANT ALL ON public.pdf_requests TO anon, authenticated, service_role;
GRANT ALL ON public.subject_resources TO anon, authenticated, service_role;
GRANT ALL ON public.promotional_banners TO anon, authenticated, service_role;
