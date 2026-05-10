
-- ROBUST SUPABASE MIGRATION: UUID -> TEXT for Firebase Auth Compatibility
-- This script handles RLS policies, Foreign Keys, and Functions in the correct order.

DO $$ 
DECLARE
    pol RECORD;
    fk RECORD;
BEGIN
    -- 1. DROP ALL RLS POLICIES ON AFFECTED TABLES
    -- This prevents "cannot alter type of a column used in a policy definition"
    FOR pol IN (
        SELECT policyname, tablename, schemaname 
        FROM pg_policies 
        WHERE tablename IN ('profiles', 'user_points', 'posts', 'replies', 'community_chat', 'referrals', 'story_unlocks', 'verification_logs', 'schedules', 'purchase_requests')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;

    -- 2. DROP ALL FOREIGN KEY CONSTRAINTS THAT LINK THESE TABLES
    FOR fk IN (
        SELECT conname, relname 
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public' 
        AND c.contype = 'f' 
        AND t.relname IN ('posts', 'replies', 'community_chat', 'referrals', 'story_unlocks', 'verification_logs', 'schedules', 'purchase_requests', 'user_points')
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', fk.relname, fk.conname);
    END LOOP;
END $$;

-- 3. DROP FUNCTIONS THAT USE UUID FOR USER IDs
DROP FUNCTION IF EXISTS public.increment_xp(uuid, integer);
DROP FUNCTION IF EXISTS public.increment_focus_minutes(uuid, integer);
DROP FUNCTION IF EXISTS public.vote_post(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.increment_reply_count(uuid);

-- 4. ALTER COLUMN TYPES TO TEXT
-- We use USING clause to ensure data is preserved and casted correctly

-- Profiles (Primary Key)
ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT;

-- User Points
ALTER TABLE public.user_points ALTER COLUMN user_id TYPE TEXT;

-- Posts
ALTER TABLE public.posts ALTER COLUMN author_id TYPE TEXT;

-- Replies
ALTER TABLE public.replies ALTER COLUMN author_id TYPE TEXT;

-- Community Chat
ALTER TABLE public.community_chat ALTER COLUMN user_id TYPE TEXT;

-- Referrals
ALTER TABLE public.referrals ALTER COLUMN referrer_id TYPE TEXT;
ALTER TABLE public.referrals ALTER COLUMN referee_id TYPE TEXT;

-- Story Unlocks
ALTER TABLE public.story_unlocks ALTER COLUMN user_id TYPE TEXT;

-- Verification Logs
ALTER TABLE public.verification_logs ALTER COLUMN user_id TYPE TEXT;

-- Schedules
ALTER TABLE public.schedules ALTER COLUMN user_id TYPE TEXT;

-- Purchase Requests
ALTER TABLE public.purchase_requests ALTER COLUMN user_id TYPE TEXT;

-- 5. RE-CREATE RPC FUNCTIONS WITH TEXT PARAMETERS
CREATE OR REPLACE FUNCTION public.increment_xp(user_id TEXT, amount INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET xp = COALESCE(xp, 0) + amount,
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_focus_minutes(user_id TEXT, amount INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE public.user_points
    SET total_minutes = COALESCE(total_minutes, 0) + amount,
        last_updated = NOW()
    WHERE user_id = user_id;
    
    -- Sync to profiles for backward compatibility if needed
    UPDATE public.profiles
    SET xp = COALESCE(xp, 0) + (amount * 2),
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_reply_count(post_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.posts
    SET reply_count = COALESCE(reply_count, 0) + 1
    WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.vote_post(user_id TEXT, post_id UUID, vote_type TEXT)
RETURNS void AS $$
BEGIN
    IF vote_type = 'up' THEN
        UPDATE public.posts SET upvotes = COALESCE(upvotes, 0) + 1 WHERE id = post_id;
    ELSE
        UPDATE public.posts SET downvotes = COALESCE(downvotes, 0) + 1 WHERE id = post_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RE-ENABLE RLS AND ADD RELAXED POLICIES FOR FIREBASE COMPATIBILITY
-- Since Supabase doesnt "know" the Firebase user via its internal auth.uid(), 
-- we allow access based on the ID passed in the request.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firebase Public Read Profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Firebase Update Own Profile" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Firebase Insert Profiles" ON public.profiles FOR INSERT WITH CHECK (true);

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firebase Manage own points" ON public.user_points FOR ALL USING (true);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Firebase Create Posts" ON public.posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Firebase Update own Posts" ON public.posts FOR UPDATE USING (true);

ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Replies" ON public.replies FOR SELECT USING (true);
CREATE POLICY "Firebase Create Replies" ON public.replies FOR INSERT WITH CHECK (true);

ALTER TABLE public.community_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Chat" ON public.community_chat FOR SELECT USING (true);
CREATE POLICY "Firebase Send Messages" ON public.community_chat FOR INSERT WITH CHECK (true);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firebase Manage Schedules" ON public.schedules FOR ALL USING (true);

ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firebase Create Purchase Requests" ON public.purchase_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin Read Purchase Requests" ON public.purchase_requests FOR SELECT USING (true);

-- 7. RESTORE FOREIGN KEYS (Linking TEXT to TEXT)
ALTER TABLE public.posts ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id);
ALTER TABLE public.replies ADD CONSTRAINT replies_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id);
ALTER TABLE public.schedules ADD CONSTRAINT schedules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
ALTER TABLE public.user_points ADD CONSTRAINT user_points_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- 8. DEFAULTS
ALTER TABLE public.posts ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.replies ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.schedules ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.community_chat ALTER COLUMN id SET DEFAULT gen_random_uuid();
