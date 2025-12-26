# إعداد قاعدة البيانات - Database Setup

هذا المجلد يحتوي على ملفات SQL لإنشاء وإعداد قاعدة البيانات.

## الملفات المتوفرة:

### 1. `001_initial_schema.sql`
- إنشاء الجداول الأساسية
- جداول: users, groups, group_members, photos, comments, photo_likes, comment_likes
- تفعيل Row Level Security

### 2. `002_security_policies.sql`
- إنشاء سياسات الأمان (RLS Policies)
- وظائف مساعدة للتحكم في الوصول
- حماية البيانات حسب الأدوار

### 3. `003_triggers_and_functions.sql`
- إنشاء Triggers تلقائية
- تحديث timestamps تلقائياً
- تحديث عداد الإعجابات تلقائياً
- إضافة المنشئ كمدير للمجموعة

### 4. `004_indexes.sql`
- إنشاء فهارس لتحسين الأداء
- فهارس للاستعلامات الشائعة
- فهارس مركبة للاستعلامات المعقدة

### 5. `005_sample_data.sql`
- بيانات تجريبية (معطلة حالياً)
- يمكن تفعيلها للاختبار

## كيفية التطبيق:

### الطريقة الأولى: عبر Supabase Dashboard
1. افتح [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروعك
3. اذهب إلى SQL Editor
4. انسخ والصق محتوى كل ملف بالترتيب
5. اضغط Run

### الطريقة الثانية: عبر Supabase CLI
```bash
# تثبيت Supabase CLI
npm install -g supabase

# تسجيل الدخول
supabase login

# ربط المشروع
supabase link --project-ref serxfeouhcotmgmsctgs

# تطبيق الـ migrations
supabase db push
```

### الطريقة الثالثة: تطبيق يدوي
1. افتح SQL Editor في Supabase Dashboard
2. طبق الملفات بالترتيب:
   - `001_initial_schema.sql`
   - `002_security_policies.sql`
   - `003_triggers_and_functions.sql`
   - `004_indexes.sql`
   - `005_sample_data.sql` (اختياري)

## هيكل قاعدة البيانات:

```
users (المستخدمون)
├── id (UUID, Primary Key)
├── email (Text, Unique)
├── full_name (Text)
├── avatar_url (Text)
├── created_at (Timestamp)
└── updated_at (Timestamp)

groups (المجموعات)
├── id (UUID, Primary Key)
├── name (Text)
├── description (Text)
├── created_by (UUID, Foreign Key)
├── is_private (Boolean)
├── invite_code (Text, Unique)
├── created_at (Timestamp)
└── updated_at (Timestamp)

group_members (أعضاء المجموعات)
├── id (UUID, Primary Key)
├── group_id (UUID, Foreign Key)
├── user_id (UUID, Foreign Key)
├── role (Text: admin, moderator, member)
└── joined_at (Timestamp)

photos (الصور)
├── id (UUID, Primary Key)
├── user_id (UUID, Foreign Key)
├── group_id (UUID, Foreign Key, Nullable)
├── image_url (Text)
├── content (Text)
├── caption (Text)
├── hashtags (Text Array)
├── likes_count (Integer)
├── created_at (Timestamp)
└── updated_at (Timestamp)

comments (التعليقات)
├── id (UUID, Primary Key)
├── photo_id (UUID, Foreign Key)
├── user_id (UUID, Foreign Key)
├── content (Text)
├── likes_count (Integer)
├── created_at (Timestamp)
└── updated_at (Timestamp)

photo_likes (إعجابات الصور)
├── id (UUID, Primary Key)
├── photo_id (UUID, Foreign Key)
├── user_id (UUID, Foreign Key)
└── created_at (Timestamp)

comment_likes (إعجابات التعليقات)
├── id (UUID, Primary Key)
├── comment_id (UUID, Foreign Key)
├── user_id (UUID, Foreign Key)
└── created_at (Timestamp)
```

## الأمان:

- جميع الجداول محمية بـ Row Level Security (RLS)
- سياسات أمان شاملة للتحكم في الوصول
- حماية البيانات حسب الأدوار والصلاحيات
- منع الوصول غير المصرح به

## الأداء:

- فهارس محسّنة للاستعلامات الشائعة
- فهارس مركبة للاستعلامات المعقدة
- تحديث تلقائي للعدادات
- تحسين استعلامات البحث

## ملاحظات مهمة:

1. تأكد من تطبيق الملفات بالترتيب الصحيح
2. تحقق من نجاح كل migration قبل الانتقال للتالي
3. احتفظ بنسخة احتياطية قبل التطبيق
4. اختبر الوظائف بعد التطبيق










