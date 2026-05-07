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
    referral_code TEXT,
    referral_count INTEGER DEFAULT 0,
    referred_by TEXT,
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
    class TEXT NOT NULL,
    price NUMERIC DEFAULT 0,
    description TEXT,
    cover_url TEXT,
    drive_link TEXT,
    is_free BOOLEAN DEFAULT FALSE,
    features JSONB DEFAULT '["Chapter-wise Notes", "PYQs Included", "AI Doubt Support"]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.subject_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read resources" ON public.subject_resources FOR SELECT USING (true);
CREATE POLICY "Admin write resources" ON public.subject_resources FOR ALL USING (auth.jwt() ->> 'email' = 'expertraj8@gmail.com');
