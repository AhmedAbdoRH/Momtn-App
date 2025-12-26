-- إنشاء الفهارس لتحسين الأداء
-- Performance Indexes

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










