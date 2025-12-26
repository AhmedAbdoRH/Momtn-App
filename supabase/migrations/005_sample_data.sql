-- إدراج بيانات تجريبية (اختياري)
-- Sample Data (Optional)

-- إنشاء مستخدم تجريبي (يجب أن يكون موجود في auth.users أولاً)
-- INSERT INTO public.users (id, email, full_name) VALUES 
-- ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'مستخدم تجريبي');

-- إنشاء مجموعة تجريبية
-- INSERT INTO public.groups (name, description, created_by, is_private) VALUES 
-- ('مجموعة تجريبية', 'هذه مجموعة تجريبية للاختبار', '00000000-0000-0000-0000-000000000001', false);

-- إنشاء صورة تجريبية
-- INSERT INTO public.photos (user_id, group_id, content, caption, hashtags) VALUES 
-- ('00000000-0000-0000-0000-000000000001', 
--  (SELECT id FROM public.groups WHERE name = 'مجموعة تجريبية' LIMIT 1),
--  'صورة تجريبية', 
--  'هذه صورة تجريبية #تجربة #اختبار', 
--  ARRAY['تجربة', 'اختبار']);

-- ملاحظة: البيانات التجريبية معطلة حالياً
-- يمكن تفعيلها لاحقاً عند الحاجة للاختبار










