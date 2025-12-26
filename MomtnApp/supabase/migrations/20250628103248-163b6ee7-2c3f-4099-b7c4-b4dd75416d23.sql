
-- حذف السياسات الحالية التي تسبب المشكلة
DROP POLICY IF EXISTS "Users can view group members if they are members themselves" ON public.group_members;
DROP POLICY IF EXISTS "Group admins and members themselves can update membership" ON public.group_members;
DROP POLICY IF EXISTS "Group admins and members themselves can delete membership" ON public.group_members;

-- إنشاء دالة آمنة للتحقق من عضوية المجموعة
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

-- إنشاء دالة آمنة للتحقق من كون المستخدم منشئ المجموعة
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

-- إعادة إنشاء السياسات باستخدام الدوال الآمنة
CREATE POLICY "Users can view group members if they are members themselves" 
  ON public.group_members 
  FOR SELECT 
  USING (
    public.is_group_member(group_id, auth.uid()) OR
    public.is_group_creator(group_id, auth.uid())
  );

CREATE POLICY "Group admins and members themselves can update membership" 
  ON public.group_members 
  FOR UPDATE 
  USING (
    auth.uid() = user_id OR
    public.is_group_creator(group_id, auth.uid())
  );

CREATE POLICY "Group admins and members themselves can delete membership" 
  ON public.group_members 
  FOR DELETE 
  USING (
    auth.uid() = user_id OR
    public.is_group_creator(group_id, auth.uid())
  );
