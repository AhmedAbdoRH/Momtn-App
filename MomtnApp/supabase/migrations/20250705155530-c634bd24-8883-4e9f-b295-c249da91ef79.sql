-- Add tutorial_dismissed column to users table
ALTER TABLE public.users 
ADD COLUMN tutorial_dismissed boolean DEFAULT false;