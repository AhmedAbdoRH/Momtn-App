-- إنشاء سياسات الأمان (Row Level Security Policies)
-- Security Policies Setup

-- Helper functions for access control
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = _group_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_creator(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = _group_id AND created_by = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = _group_id AND user_id = _user_id AND role = 'admin'
  );
$$;

-- Users table policies
CREATE POLICY "Users can view all user profiles"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Groups table policies
CREATE POLICY "Users can view public groups or groups they are members of" 
  ON public.groups 
  FOR SELECT 
  TO authenticated
  USING (
    is_private = false OR 
    auth.uid() = created_by OR
    public.is_group_member(id, auth.uid())
  );

CREATE POLICY "Users can create groups" 
  ON public.groups 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators and admins can update groups" 
  ON public.groups 
  FOR UPDATE 
  TO authenticated
  USING (
    auth.uid() = created_by OR
    public.is_group_admin(id, auth.uid())
  );

CREATE POLICY "Group creators can delete groups" 
  ON public.groups 
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = created_by);

-- Group members table policies
CREATE POLICY "Users can view group members if they are members themselves" 
  ON public.group_members 
  FOR SELECT 
  TO authenticated
  USING (
    public.is_group_member(group_id, auth.uid()) OR
    public.is_group_creator(group_id, auth.uid())
  );

CREATE POLICY "Users can join groups" 
  ON public.group_members 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Group admins and members themselves can update membership" 
  ON public.group_members 
  FOR UPDATE 
  TO authenticated
  USING (
    auth.uid() = user_id OR
    public.is_group_creator(group_id, auth.uid()) OR
    public.is_group_admin(group_id, auth.uid())
  );

CREATE POLICY "Group admins and members themselves can delete membership" 
  ON public.group_members 
  FOR DELETE 
  TO authenticated
  USING (
    auth.uid() = user_id OR
    public.is_group_creator(group_id, auth.uid()) OR
    public.is_group_admin(group_id, auth.uid())
  );

-- Photos table policies
CREATE POLICY "Users can view their own photos or group photos they have access to" 
  ON public.photos 
  FOR SELECT 
  TO authenticated
  USING (
    auth.uid() = user_id OR
    (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
  );

CREATE POLICY "Users can create their own photos or group photos" 
  ON public.photos 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      group_id IS NULL OR
      public.is_group_member(group_id, auth.uid())
    )
  );

CREATE POLICY "Users can update their own photos" 
  ON public.photos 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos" 
  ON public.photos 
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Comments table policies
CREATE POLICY "Users can view comments on photos they can see" 
  ON public.comments 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.photos 
      WHERE id = photo_id AND (
        user_id = auth.uid() OR
        (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
      )
    )
  );

CREATE POLICY "Users can create comments on photos they can see" 
  ON public.comments 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.photos 
      WHERE id = photo_id AND (
        user_id = auth.uid() OR
        (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
      )
    )
  );

CREATE POLICY "Users can update their own comments" 
  ON public.comments 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
  ON public.comments 
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Photo likes table policies
CREATE POLICY "Users can view likes on photos they can see" 
  ON public.photo_likes 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.photos 
      WHERE id = photo_id AND (
        user_id = auth.uid() OR
        (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
      )
    )
  );

CREATE POLICY "Users can like photos they can see" 
  ON public.photo_likes 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.photos 
      WHERE id = photo_id AND (
        user_id = auth.uid() OR
        (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
      )
    )
  );

CREATE POLICY "Users can unlike their own likes" 
  ON public.photo_likes 
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Comment likes table policies
CREATE POLICY "Users can view likes on comments they can see" 
  ON public.comment_likes 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.comments c
      JOIN public.photos p ON c.photo_id = p.id
      WHERE c.id = comment_id AND (
        p.user_id = auth.uid() OR
        (p.group_id IS NOT NULL AND public.is_group_member(p.group_id, auth.uid()))
      )
    )
  );

CREATE POLICY "Users can like comments they can see" 
  ON public.comment_likes 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.comments c
      JOIN public.photos p ON c.photo_id = p.id
      WHERE c.id = comment_id AND (
        p.user_id = auth.uid() OR
        (p.group_id IS NOT NULL AND public.is_group_member(p.group_id, auth.uid()))
      )
    )
  );

CREATE POLICY "Users can unlike their own comment likes" 
  ON public.comment_likes 
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);










