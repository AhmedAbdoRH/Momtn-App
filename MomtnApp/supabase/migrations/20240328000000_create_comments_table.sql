-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Create policies for comments
CREATE POLICY "Enable read access for all users" 
ON public.comments 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Enable insert for authenticated users only" 
ON public.comments 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update for comment owners" 
ON public.comments 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for comment owners" 
ON public.comments 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS comments_photo_id_idx ON public.comments(photo_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON public.comments(user_id);

-- Create a function to get the display name
CREATE OR REPLACE FUNCTION public.get_user_display_name(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  display_name TEXT;
BEGIN
  SELECT COALESCE(
    (SELECT full_name FROM public.users WHERE id = user_id),
    (SELECT split_part(email, '@', 1) FROM auth.users WHERE id = user_id),
    'مستخدم'
  ) INTO display_name;
  RETURN display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
