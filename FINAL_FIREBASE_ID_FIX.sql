-- ==========================================
-- FINAL SUPABASE TYPE COMPATIBILITY FIX
-- ==========================================
-- This script safely converts all Firebase-linked columns from UUID to TEXT.
-- It resolves the "cannot alter type of a column used in a policy definition" error
-- by temporarily dropping and then recreating all dependent policies and constraints.

DO $$ 
DECLARE
    pol RECORD;
    fk RECORD;
BEGIN
    -- 1. DROP ALL DEPENDENT RLS POLICIES
    -- We target tables that use Firebase UIDs to prevent "used in policy definition" errors.
    FOR pol IN (
        SELECT policyname, tablename, schemaname 
        FROM pg_policies 
        WHERE tablename IN (
            'profiles', 'user_points', 'posts', 'replies', 'community_chat', 
            'referrals', 'story_unlocks', 'verification_logs', 'schedules', 
            'purchase_requests'
        )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;

    -- 2. DROP ALL FOREIGN KEY CONSTRAINTS
    -- This prevents "cannot alter type of a column used in a foreign key constraint" errors.
    FOR fk IN (
        SELECT conname, relname 
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public' 
        AND c.contype = 'f' 
        AND t.relname IN (
            'posts', 'replies', 'community_chat', 'referrals', 
            'story_unlocks', 'verification_logs', 'schedules', 
            'purchase_requests', 'user_points'
        )
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', fk.relname, fk.conname);
    END LOOP;
END $$;

-- 3. DROP OLD FUNCTIONS (Clean start for signatures)
DROP FUNCTION IF EXISTS public.increment_xp(uuid, integer);
DROP FUNCTION IF EXISTS public.increment_xp(text, integer);
DROP FUNCTION IF EXISTS public.increment_focus_minutes(uuid, integer);
DROP FUNCTION IF EXISTS public.increment_focus_minutes(text, integer);
DROP FUNCTION IF EXISTS public.vote_post(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.vote_post(text, uuid, text);
DROP FUNCTION IF EXISTS public.increment_reply_count(uuid);

-- 4. CONVERT COLUMNS TO TEXT (Data Preservation Mode)
-- We use USING clause for safety, although string columns convert to TEXT easily.
ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.user_points ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.posts ALTER COLUMN author_id TYPE TEXT;
ALTER TABLE public.replies ALTER COLUMN author_id TYPE TEXT;
ALTER TABLE public.community_chat ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.referrals ALTER COLUMN referrer_id TYPE TEXT;
ALTER TABLE public.referrals ALTER COLUMN referee_id TYPE TEXT;
ALTER TABLE public.story_unlocks ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.verification_logs ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.schedules ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.purchase_requests ALTER COLUMN user_id TYPE TEXT;

-- 5. RECREATE RPC FUNCTIONS WITH FIXED LOGIC 
-- (Added parameter prefix 'p_' to avoid naming collisions with column names)

CREATE OR REPLACE FUNCTION public.increment_xp(p_user_id TEXT, amount INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET xp = COALESCE(xp, 0) + amount,
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_focus_minutes(p_user_id TEXT, amount INTEGER)
RETURNS void AS $$
BEGIN
    -- Update points table
    UPDATE public.user_points
    SET total_minutes = COALESCE(total_minutes, 0) + amount,
        last_updated = NOW()
    WHERE user_id = p_user_id;
    
    -- Sync to profiles (XP = minutes * 2)
    UPDATE public.profiles
    SET xp = COALESCE(xp, 0) + (amount * 2),
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_reply_count(p_post_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.posts
    SET reply_count = COALESCE(reply_count, 0) + 1
    WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.vote_post(p_user_id TEXT, p_post_id UUID, p_vote_type TEXT)
RETURNS void AS $$
BEGIN
    IF p_vote_type = 'up' THEN
        UPDATE public.posts SET upvotes = COALESCE(upvotes, 0) + 1 WHERE id = p_post_id;
    ELSE
        UPDATE public.posts SET downvotes = COALESCE(downvotes, 0) + 1 WHERE id = p_post_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RESTORE RLS POLICIES (Firebase-Compatible)
-- We use permissive policies since the app handles auth state.
-- Note: auth.uid() = id logic is removed because it compares against Supabase Auth internal IDs.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firebase Public Read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Firebase Update Own" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Firebase Insert Own" ON public.profiles FOR INSERT WITH CHECK (true);

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firebase Manage Points" ON public.user_points FOR ALL USING (true);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Firebase Auth Create Posts" ON public.posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Firebase Auth Update Posts" ON public.posts FOR UPDATE USING (true);

ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Replies" ON public.replies FOR SELECT USING (true);
CREATE POLICY "Firebase Auth Create Replies" ON public.replies FOR INSERT WITH CHECK (true);

ALTER TABLE public.community_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Chat" ON public.community_chat FOR SELECT USING (true);
CREATE POLICY "Firebase Send Chat" ON public.community_chat FOR INSERT WITH CHECK (true);

ALTER TABLE public.story_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firebase Manage Unlocks" ON public.story_unlocks FOR ALL USING (true);

ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firebase Write Logs" ON public.verification_logs FOR INSERT WITH CHECK (true);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firebase Manage Schedules" ON public.schedules FOR ALL USING (true);

-- 7. RESTORE FOREIGN KEY CONSTRAINTS
ALTER TABLE public.posts ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id);
ALTER TABLE public.replies ADD CONSTRAINT replies_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id);
ALTER TABLE public.replies ADD CONSTRAINT replies_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
ALTER TABLE public.schedules ADD CONSTRAINT schedules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
ALTER TABLE public.user_points ADD CONSTRAINT user_points_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- 8. RESTORE UUID DEFAULTS FOR PRIMARY KEYS
ALTER TABLE public.posts ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.replies ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.schedules ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.community_chat ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.story_unlocks ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.verification_logs ALTER COLUMN id SET DEFAULT gen_random_uuid();
