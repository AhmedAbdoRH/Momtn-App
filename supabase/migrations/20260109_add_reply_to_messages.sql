-- إضافة عمود reply_to_message_id لجدول group_messages
-- لدعم ميزة الرد على الرسائل

-- إضافة العمود
ALTER TABLE group_messages 
ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES group_messages(id) ON DELETE SET NULL;

-- إنشاء index لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_group_messages_reply_to 
ON group_messages(reply_to_message_id) 
WHERE reply_to_message_id IS NOT NULL;

-- تعليق توضيحي
COMMENT ON COLUMN group_messages.reply_to_message_id IS 'معرف الرسالة التي يتم الرد عليها';
