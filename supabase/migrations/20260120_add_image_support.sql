-- إضافة عمود image_url لجدول group_messages لدعم إرسال الصور
ALTER TABLE group_messages 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- إنشاء bucket للدردشة إذا لم يكن موجوداً
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- إنشاء bucket للصور الشخصية إذا لم يكن موجوداً
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- سياسات الوصول لصور الدردشة
-- السماح لجميع المستخدمين المسجلين بعرض الصور
CREATE POLICY "Public Access" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chat-images');

-- السماح للمستخدمين برفع الصور
CREATE POLICY "Authenticated users can upload chat images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-images');

-- السماح للمستخدمين بحذف صورهم الخاصة
CREATE POLICY "Users can delete own chat images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chat-images' AND auth.uid() = owner);

-- سياسات الوصول للصور الشخصية (avatars)
-- السماح للجميع بعرض الصور الشخصية
CREATE POLICY "Public Avatar Access" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');

-- السماح للمستخدمين برفع صورهم الشخصية
CREATE POLICY "Users can upload own avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

-- السماح للمستخدمين بتحديث صورهم الشخصية
CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');

-- السماح للمستخدمين بحذف صورهم الشخصية
CREATE POLICY "Users can delete own avatars" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');
