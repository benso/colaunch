-- =============================================================================
-- CoLaunch Database Schema
-- =============================================================================
-- This file contains the complete database schema for the CoLaunch MVP.
-- Run this in your Supabase SQL Editor to set up all tables, indexes, and 
-- Row Level Security (RLS) policies.
--
-- Prerequisites:
-- 1. A Supabase project (https://supabase.com)
-- 2. Access to the SQL Editor in your project dashboard
--
-- Instructions:
-- 1. Copy this entire file
-- 2. Paste into Supabase SQL Editor
-- 3. Click "Run" to execute
-- 4. Verify all tables appear in the Table Editor
-- =============================================================================

-- Enable UUID extension (required for id generation)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- AUTO-CREATE USER ROWS ON SIGNUP
-- =============================================================================
-- This trigger automatically creates a row in public.users whenever someone
-- signs up via Supabase Auth. This ensures the users table stays in sync.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- USERS TABLE
-- =============================================================================
-- Stores core user information. User IDs come from Supabase Auth.
-- This table extends auth.users with application-specific fields.

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  is_verified BOOLEAN DEFAULT FALSE,
  referral_count INTEGER DEFAULT 0,
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON public.users(referred_by);

-- RLS Policies for users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own record
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own record
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own record (during signup)
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================================================
-- PROFILES TABLE
-- =============================================================================
-- Stores detailed profile information collected during onboarding.
-- Each user has one profile (one-to-one relationship).

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL CHECK (product_type IN ('app', 'saas', 'marketplace', 'content', 'other')),
  product_name TEXT NOT NULL,
  product_description TEXT NOT NULL,
  website_url TEXT,
  audience_size TEXT NOT NULL CHECK (audience_size IN ('0-1k', '1k-10k', '10k-100k', '100k-1m', '1m+')),
  partner_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  industry_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  what_i_offer TEXT[] DEFAULT ARRAY[]::TEXT[],
  what_i_want TEXT[] DEFAULT ARRAY[]::TEXT[],
  bio TEXT,
  social_links JSONB DEFAULT '{}'::JSONB,
  embedding_id TEXT,
  ai_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_embedding_id ON public.profiles(embedding_id);
CREATE INDEX IF NOT EXISTS idx_profiles_industry_tags ON public.profiles USING GIN(industry_tags);
CREATE INDEX IF NOT EXISTS idx_profiles_partner_types ON public.profiles USING GIN(partner_types);

-- RLS Policies for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can read other users' profiles (needed for matching)
CREATE POLICY "Users can view other profiles" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================================================
-- MATCHES TABLE
-- =============================================================================
-- Stores partnership matches between users.
-- Matches are directional (user_id -> partner_id).

CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_score NUMERIC(5,2) CHECK (match_score >= 0 AND match_score <= 100),
  match_reasons JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'accepted', 'declined', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_interaction TIMESTAMPTZ,
  contacted_at TIMESTAMPTZ,
  UNIQUE(user_id, partner_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_matches_user_id ON public.matches(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_partner_id ON public.matches(partner_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON public.matches(created_at DESC);

-- RLS Policies for matches table
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Users can view matches where they are either user or partner
CREATE POLICY "Users can view own matches" ON public.matches
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = partner_id);

-- Users can insert matches where they are the user
CREATE POLICY "Users can create matches" ON public.matches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update matches where they are the user
CREATE POLICY "Users can update own matches" ON public.matches
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete matches where they are the user
CREATE POLICY "Users can delete own matches" ON public.matches
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- MESSAGES TABLE
-- =============================================================================
-- Stores messages between matched users.
-- Supports both manual and AI-generated messages.

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_match_id ON public.messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON public.messages(sent_at DESC);

-- RLS Policies for messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages where they are sender or recipient
CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can insert messages where they are the sender
CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Users can update their own messages
CREATE POLICY "Users can update own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- =============================================================================
-- INVITATIONS TABLE
-- =============================================================================
-- Tracks email invitations sent by users to potential new members.
-- Supports referral tracking and invitation analytics.

CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inviter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'joined', 'declined')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  joined_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_inviter_id ON public.invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invitee_email ON public.invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_sent_at ON public.invitations(sent_at DESC);

-- RLS Policies for invitations table
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Users can view their own sent invitations
CREATE POLICY "Users can view own invitations" ON public.invitations
  FOR SELECT USING (auth.uid() = inviter_id);

-- Users can send invitations
CREATE POLICY "Users can send invitations" ON public.invitations
  FOR INSERT WITH CHECK (auth.uid() = inviter_id);

-- Users can update their own invitations
CREATE POLICY "Users can update own invitations" ON public.invitations
  FOR UPDATE USING (auth.uid() = inviter_id);

-- =============================================================================
-- PARTNERSHIPS TABLE
-- =============================================================================
-- Stores formalized partnerships that have been agreed upon.
-- Tracks partnership lifecycle and metrics.

CREATE TABLE IF NOT EXISTS public.partnerships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  user_a UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  partnership_type TEXT CHECK (partnership_type IN ('affiliate', 'co-marketing', 'integration', 'content', 'bundle', 'other')),
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'active', 'paused', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  terms JSONB,
  metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_partnerships_user_a ON public.partnerships(user_a);
CREATE INDEX IF NOT EXISTS idx_partnerships_user_b ON public.partnerships(user_b);
CREATE INDEX IF NOT EXISTS idx_partnerships_status ON public.partnerships(status);
CREATE INDEX IF NOT EXISTS idx_partnerships_match_id ON public.partnerships(match_id);

-- RLS Policies for partnerships table
ALTER TABLE public.partnerships ENABLE ROW LEVEL SECURITY;

-- Users can view partnerships where they are either user_a or user_b
CREATE POLICY "Users can view own partnerships" ON public.partnerships
  FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Users can insert partnerships where they are user_a or user_b
CREATE POLICY "Users can create partnerships" ON public.partnerships
  FOR INSERT WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- Users can update partnerships where they are user_a or user_b
CREATE POLICY "Users can update own partnerships" ON public.partnerships
  FOR UPDATE USING (auth.uid() = user_a OR auth.uid() = user_b);

-- =============================================================================
-- TRIGGERS & FUNCTIONS
-- =============================================================================

-- Trigger to update updated_at timestamp on profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique referral codes
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate referral code on user creation
CREATE OR REPLACE FUNCTION set_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_referral_code
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION set_referral_code();

-- Function to increment referral count when someone signs up with a referral
CREATE OR REPLACE FUNCTION increment_referrer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referred_by IS NOT NULL THEN
    UPDATE public.users
    SET referral_count = referral_count + 1
    WHERE id = NEW.referred_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_referral_count
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION increment_referrer_count();

-- =============================================================================
-- INITIAL DATA SETUP (OPTIONAL)
-- =============================================================================
-- You can add seed data here if needed for testing

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- Run these queries to verify the schema was created successfully:
-- 
-- 1. List all tables:
--    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
--
-- 2. Check RLS is enabled:
--    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
--
-- 3. List all policies:
--    SELECT * FROM pg_policies WHERE schemaname = 'public';
--
-- =============================================================================

-- Success! Schema created.
-- Next steps:
-- 1. Verify tables exist in Supabase Table Editor
-- 2. Test inserting a user record
-- 3. Verify RLS policies by trying to read/write as authenticated user

