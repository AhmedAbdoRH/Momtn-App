
-- Create groups table for shared gratitude spaces
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_private BOOLEAN NOT NULL DEFAULT false,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'base64')
);

-- Create group_members table to track group membership
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'moderator', 'member'
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Update photos table to support group photos
ALTER TABLE public.photos ADD COLUMN group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;

-- Add Row Level Security (RLS) to groups table
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Create policies for groups
CREATE POLICY "Users can view public groups or groups they are members of" 
  ON public.groups 
  FOR SELECT 
  USING (
    is_private = false OR 
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups" 
  ON public.groups 
  FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators and admins can update groups" 
  ON public.groups 
  FOR UPDATE 
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_id = id AND user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Group creators can delete groups" 
  ON public.groups 
  FOR DELETE 
  USING (auth.uid() = created_by);

-- Add RLS to group_members table
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Create policies for group_members
CREATE POLICY "Users can view group members if they are members themselves" 
  ON public.group_members 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.groups g 
      WHERE g.id = group_id AND g.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can join groups" 
  ON public.group_members 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Group admins and members themselves can update membership" 
  ON public.group_members 
  FOR UPDATE 
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Group admins and members themselves can delete membership" 
  ON public.group_members 
  FOR DELETE 
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.role IN ('admin', 'moderator')
    )
  );

-- Update photos RLS policies to include group access
DROP POLICY IF EXISTS "Users can view their own photos" ON public.photos;
DROP POLICY IF EXISTS "Users can create their own photos" ON public.photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON public.photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON public.photos;

CREATE POLICY "Users can view their own photos or group photos they have access to" 
  ON public.photos 
  FOR SELECT 
  USING (
    auth.uid() = user_id OR
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE gm.group_id = photos.group_id AND gm.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create their own photos or group photos" 
  ON public.photos 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND (
      group_id IS NULL OR
      EXISTS (
        SELECT 1 FROM public.group_members gm 
        WHERE gm.group_id = photos.group_id AND gm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own photos" 
  ON public.photos 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos" 
  ON public.photos 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create function to auto-add group creator as admin
CREATE OR REPLACE FUNCTION public.handle_new_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$;

-- Create trigger to auto-add group creator as admin
CREATE TRIGGER on_group_created
  AFTER INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_group();
