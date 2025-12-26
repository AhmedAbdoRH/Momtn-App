-- إعداد قاعدة البيانات الكامل
-- Complete Database Setup for MomtnApp

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- 1. إنشاء الجداول الأساسية
-- ==============================================

-- Create users table for user profiles
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create groups table for shared gratitude spaces
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_private BOOLEAN NOT NULL DEFAULT false,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'base64')
);

-- Create group_members table to track group membership
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'moderator', 'member'
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create photos table for gratitude photos
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  image_url TEXT,
  content TEXT NOT NULL,
  caption TEXT,
  hashtags TEXT[],
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create comments table for photo comments
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID REFERENCES public.photos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create photo_likes table for tracking likes
CREATE TABLE IF NOT EXISTS public.photo_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID REFERENCES public.photos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(photo_id, user_id)
);

-- Create comment_likes table for tracking comment likes
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- ==============================================
-- 2. تفعيل Row Level Security
-- ==============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 3. إنشاء الوظائف المساعدة
-- ==============================================

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

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Function to auto-add group creator as admin
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

-- Function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to update photo likes count
CREATE OR REPLACE FUNCTION public.update_photo_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.photos 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.photo_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.photos 
    SET likes_count = likes_count - 1 
    WHERE id = OLD.photo_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Function to update comment likes count
CREATE OR REPLACE FUNCTION public.update_comment_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.comments 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.comments 
    SET likes_count = likes_count - 1 
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- ==============================================
-- 4. إنشاء Triggers
-- ==============================================

-- Create triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_group_created ON public.groups;
CREATE TRIGGER on_group_created
  AFTER INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_group();

-- Add updated_at triggers
DROP TRIGGER IF EXISTS handle_updated_at ON public.users;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.groups;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.photos;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.comments;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add likes count triggers
DROP TRIGGER IF EXISTS update_photo_likes_count_trigger ON public.photo_likes;
CREATE TRIGGER update_photo_likes_count_trigger
  AFTER INSERT OR DELETE ON public.photo_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_photo_likes_count();

DROP TRIGGER IF EXISTS update_comment_likes_count_trigger ON public.comment_likes;
CREATE TRIGGER update_comment_likes_count_trigger
  AFTER INSERT OR DELETE ON public.comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_comment_likes_count();

-- ==============================================
-- 5. إنشاء سياسات الأمان
-- ==============================================

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

-- ==============================================
-- 6. إنشاء الفهارس لتحسين الأداء
-- ==============================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

-- Groups table indexes
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON public.groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON public.groups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_groups_is_private ON public.groups(is_private);

-- Group members table indexes
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON public.group_members(role);
CREATE INDEX IF NOT EXISTS idx_group_members_joined_at ON public.group_members(joined_at DESC);

-- Photos table indexes
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON public.photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_group_id ON public.photos(group_id);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON public.photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_likes_count ON public.photos(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_photos_hashtags ON public.photos USING GIN(hashtags);

-- Comments table indexes
CREATE INDEX IF NOT EXISTS idx_comments_photo_id ON public.comments(photo_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_likes_count ON public.comments(likes_count DESC);

-- Photo likes table indexes
CREATE INDEX IF NOT EXISTS idx_photo_likes_photo_id ON public.photo_likes(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_likes_user_id ON public.photo_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_likes_created_at ON public.photo_likes(created_at DESC);

-- Comment likes table indexes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.comment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_created_at ON public.comment_likes(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_photos_user_created ON public.photos(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_group_created ON public.photos(group_id, created_at DESC) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_photo_created ON public.comments(photo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_members_user_group ON public.group_members(user_id, group_id);

-- ==============================================
-- تم الانتهاء من إعداد قاعدة البيانات
-- ==============================================

-- رسالة تأكيد
DO $$
BEGIN
  RAISE NOTICE 'تم إنشاء قاعدة البيانات بنجاح!';
  RAISE NOTICE 'تم إنشاء % جداول', (
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('users', 'groups', 'group_members', 'photos', 'comments', 'photo_likes', 'comment_likes')
  );
END $$;









