-- Core Tables for NoteVix Migration

-- 1. Profiles Table (Keep in sync with Firebase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    email TEXT UNIQUE,
    class_level TEXT,
    xp INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    focus_minutes INTEGER DEFAULT 0,
    is_premium BOOLEAN DEFAULT FALSE,
    plan_type TEXT,
    role TEXT DEFAULT 'student',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    study_mode BOOLEAN DEFAULT FALSE,
    instagram TEXT,
    saved_notes JSONB DEFAULT '[]',
    unlocked_resources JSONB DEFAULT '[]',
    unlocked_classes JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile." ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 2. Community Posts
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    subject TEXT,
    class_level TEXT,
    image_url TEXT,
    upvotes_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    tags JSONB DEFAULT '[]',
    status TEXT DEFAULT 'approved',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Posts Policies
CREATE POLICY "Posts viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update posts" ON public.posts FOR UPDATE USING (auth.uid() = author_id);

-- 3. Replies
CREATE TABLE IF NOT EXISTS public.replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    is_ai BOOLEAN DEFAULT FALSE,
    upvotes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Replies viewable by everyone" ON public.replies FOR SELECT USING (true);
CREATE POLICY "Users can reply" ON public.replies FOR INSERT WITH CHECK (auth.uid() = author_id);

-- 4. Transactions (Purchase Tracking)
CREATE TABLE IF NOT EXISTS public.purchase_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT, -- Can be UUID or 'GUEST'
    email TEXT,
    whatsapp TEXT,
    transaction_id TEXT UNIQUE NOT NULL,
    amount NUMERIC NOT NULL,
    plan_id TEXT,
    plan_name TEXT,
    resource_id TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4.1 Verified Payments (Strict Schema)
CREATE TABLE IF NOT EXISTS public.verified_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  amount NUMERIC,
  product_name TEXT,
  password_unlocked TEXT,
  resource_id TEXT,
  plan_id TEXT,
  status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  verified BOOLEAN DEFAULT false,
  user_id TEXT,
  payment_app TEXT,
  verification_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for Payments
-- 4.1 Verified Payments (Simple Schema)
CREATE TABLE IF NOT EXISTS public.verified_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT,
  amount NUMERIC,
  transaction_id TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  verified BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending',
  password_unlocked TEXT,
  user_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.verified_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Insert Verified Payments" ON public.verified_payments;
CREATE POLICY "Public Insert Verified Payments" ON public.verified_payments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Owner Select Verified Payments" ON public.verified_payments;
CREATE POLICY "Owner Select Verified Payments" ON public.verified_payments FOR SELECT USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Admin All Verified Payments" ON public.verified_payments;
CREATE POLICY "Admin All Verified Payments" ON public.verified_payments FOR ALL USING (auth.jwt() ->> 'email' IN ('expertraj8@gmail.com', 'expertnotevix@gmail.com'));

ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Insert Purchase Requests" ON public.purchase_requests;
CREATE POLICY "Public Insert Purchase Requests" ON public.purchase_requests FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin All Purchase Requests" ON public.purchase_requests;
CREATE POLICY "Admin All Purchase Requests" ON public.purchase_requests FOR ALL USING (auth.jwt() ->> 'email' IN ('expertraj8@gmail.com', 'expertnotevix@gmail.com'));

-- 5. Schedules (Study Plans)
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    subject TEXT,
    date DATE NOT NULL,
    time TEXT,
    type TEXT DEFAULT 'task',
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own schedules" ON public.schedules
    FOR ALL USING (auth.uid() = user_id);

-- RPC Functions

-- Increment XP (Main points handler)
CREATE OR REPLACE FUNCTION increment_xp(user_id UUID, amount INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET xp = xp + amount,
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment Focus Minutes
CREATE OR REPLACE FUNCTION increment_focus_minutes(user_id UUID, amount INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET focus_minutes = focus_minutes + amount,
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment Reply Count
CREATE OR REPLACE FUNCTION increment_reply_count(post_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.posts
    SET reply_count = reply_count + 1
    WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vote Post (Simplified)
CREATE OR REPLACE FUNCTION vote_post(user_id UUID, post_id UUID, vote_type TEXT)
RETURNS void AS $$
BEGIN
    IF vote_type = 'up' THEN
        UPDATE public.posts SET upvotes_count = upvotes_count + 1 WHERE id = post_id;
    ELSE
        UPDATE public.posts SET upvotes_count = upvotes_count - 1 WHERE id = post_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Community Chat Table
CREATE TABLE public.community_chat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

ALTER TABLE public.community_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read chat" ON public.community_chat FOR SELECT USING (true);
CREATE POLICY "Authenticated users can send messages" ON public.community_chat FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Community Stats
CREATE TABLE public.community_stats (
    key TEXT PRIMARY KEY,
    value JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.community_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read stats" ON public.community_stats FOR SELECT USING (true);

-- 11. Subject Resources
CREATE TABLE IF NOT EXISTS public.subject_resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject TEXT NOT NULL,
    class_level TEXT NOT NULL,
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

-- 12. PDF Requests (Manual Flow)
CREATE TABLE IF NOT EXISTS public.pdf_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT,
    class_level TEXT,
    email TEXT,
    phone_number TEXT,
    social_handle TEXT,
    resource_id TEXT,
    resource_name TEXT,
    user_id TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.pdf_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Insert PDF Requests" ON public.pdf_requests;
CREATE POLICY "Public Insert PDF Requests" ON public.pdf_requests FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin All PDF Requests" ON public.pdf_requests;
CREATE POLICY "Admin All PDF Requests" ON public.pdf_requests FOR ALL USING (auth.jwt() ->> 'email' IN ('expertraj8@gmail.com', 'expertnotevix@gmail.com'));

-- Grant Permissions
GRANT ALL ON public.verified_payments TO anon, authenticated, service_role;
GRANT ALL ON public.purchase_requests TO anon, authenticated, service_role;
GRANT ALL ON public.pdf_requests TO anon, authenticated, service_role;
GRANT ALL ON public.subject_resources TO anon, authenticated, service_role;
GRANT ALL ON public.promo_banners TO anon, authenticated, service_role;
GRANT ALL ON public.profiles TO anon, authenticated, service_role;
