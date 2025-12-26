-- Add welcome_message column to groups table
ALTER TABLE public.groups 
ADD COLUMN welcome_message TEXT DEFAULT 'مرحباً بكم في مجموعتنا';

-- Update RLS policies to include welcome_message
DROP POLICY IF EXISTS "Users can view their groups" ON public.groups;
CREATE POLICY "Users can view their groups" 
  ON public.groups 
  FOR SELECT 
  TO authenticated
  USING (
    auth.uid() = created_by OR 
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_id = groups.id AND user_id = auth.uid()
    )
  );

-- Update the update policy to include welcome_message
DROP POLICY IF EXISTS "Group creators can update their groups" ON public.groups;
CREATE POLICY "Group creators can update their groups" 
  ON public.groups 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);
