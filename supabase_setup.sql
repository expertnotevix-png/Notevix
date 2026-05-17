-- Core Tables for NoteVix Migration

-- 1. Subject Resources (REBUILT)
CREATE TABLE IF NOT EXISTS public.subject_resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject TEXT NOT NULL,
    class TEXT NOT NULL,
    description TEXT,
    drive_link TEXT,
    cover_image TEXT,
    price NUMERIC DEFAULT 0,
    pdf_password TEXT,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.subject_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read resources" ON public.subject_resources FOR SELECT USING (true);
CREATE POLICY "Admin write resources" ON public.subject_resources FOR ALL USING (auth.jwt() ->> 'email' IN ('expertraj8@gmail.com', 'expertnotevix@gmail.com'));

-- 2. Verified Payments (REBUILT)
CREATE TABLE IF NOT EXISTS public.verified_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    transaction_id TEXT UNIQUE NOT NULL,
    amount NUMERIC NOT NULL,
    product_name TEXT,
    status TEXT DEFAULT 'pending',
    unlock_password TEXT,
    rejection_reason TEXT,
    approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.verified_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Insert Verified Payments" ON public.verified_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Owner Select Verified Payments" ON public.verified_payments FOR SELECT USING (true); -- Relaxed for development
CREATE POLICY "Admin All Verified Payments" ON public.verified_payments FOR ALL USING (auth.jwt() ->> 'email' IN ('expertraj8@gmail.com', 'expertnotevix@gmail.com'));

-- 3. PDF Requests (REBUILT)
CREATE TABLE IF NOT EXISTS public.pdf_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    email TEXT,
    phone_number TEXT,
    instagram_username TEXT,
    requested_pdf TEXT,
    status TEXT DEFAULT 'pending',
    approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.pdf_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Insert PDF Requests" ON public.pdf_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin All PDF Requests" ON public.pdf_requests FOR ALL USING (auth.jwt() ->> 'email' IN ('expertraj8@gmail.com', 'expertnotevix@gmail.com'));

-- 4. Promotional Banners (REBUILT)
CREATE TABLE IF NOT EXISTS public.promotional_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    banner_image TEXT NOT NULL,
    redirect_link TEXT,
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Banners" ON public.promotional_banners FOR SELECT USING (true);
CREATE POLICY "Admin Write Banners" ON public.promotional_banners FOR ALL USING (auth.jwt() ->> 'email' IN ('expertraj8@gmail.com', 'expertnotevix@gmail.com'));

-- Grant Permissions
GRANT ALL ON public.verified_payments TO anon, authenticated, service_role;
GRANT ALL ON public.pdf_requests TO anon, authenticated, service_role;
GRANT ALL ON public.subject_resources TO anon, authenticated, service_role;
GRANT ALL ON public.promotional_banners TO anon, authenticated, service_role;

