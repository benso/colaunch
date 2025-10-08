-- Migration: Add 'suggested' status to matches table
-- This fixes the mismatch between code and database schema
-- Run this in your Supabase SQL Editor after the initial schema

-- Drop the existing check constraint
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_status_check;

-- Add new check constraint with 'suggested' status
ALTER TABLE public.matches ADD CONSTRAINT matches_status_check 
  CHECK (status IN ('pending', 'suggested', 'contacted', 'accepted', 'declined', 'archived'));

-- Update any existing 'pending' matches to 'suggested' if they haven't been contacted yet
UPDATE public.matches 
SET status = 'suggested' 
WHERE status = 'pending' 
  AND contacted_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.matches.status IS 'Match status: suggested (new AI match), pending (user reviewing), contacted (outreach sent), accepted, declined, archived';
