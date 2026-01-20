-- إضافة عمود image_url لجدول group_messages لدعم إرسال الصور
ALTER TABLE group_messages 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- إنشاء bucket للدردشة إذا لم يكن موجوداً
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- سياسات الوصول لصور الدردشة
-- السماح لجميع المستخدمين المسجلين بعرض الصور
CREATE POLICY "Public Access" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chat-images');

-- السماح للمستخدمين برفع الصور
CREATE POLICY "Authenticated users can upload chat images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-images');

-- السماح للمستخدمين بحذف صورهم الخاصة
CREATE POLICY "Users can delete own chat images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chat-images' AND auth.uid() = owner);
