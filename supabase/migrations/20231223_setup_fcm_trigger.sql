-- تمكين إضافة pg_net إذا لم تكن موجودة
CREATE EXTENSION IF NOT EXISTS pg_net;

-- وظيفة لإرسال إشعار FCM لكل توكن خاص بالمستخدم
CREATE OR REPLACE FUNCTION public.handle_new_notification_push()
RETURNS TRIGGER AS $$
DECLARE
  token_record RECORD;
  fcm_key TEXT := 'AAAAYlPak84:APA91bG_OPilL2GkMNBec_v9au9cZzgwo7Qtszt12RJV5IHO9CNvErNmAFln7vzCLLipM2wtg8_GgIGZmengbVwcxUwMtJtWI9FGLOz0DPmKMYbDqCkZgTVOQC6R-tNiYAJNil8P8xm';
BEGIN
  -- البحث عن جميع التوكنز الخاصة بالمستخدم المستهدف
  FOR token_record IN (SELECT token FROM public.device_tokens WHERE user_id = NEW.user_id) LOOP
    PERFORM
      net.http_post(
        url := 'https://fcm.googleapis.com/fcm/send',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'key=' || fcm_key
        ),
        body := jsonb_build_object(
          'to', token_record.token,
          'priority', 'high',
          'content_available', true,
          'data', COALESCE(NEW.data, '{}'::jsonb) || jsonb_build_object(
            'notification_id', NEW.id,
            'title', NEW.title,
            'body', NEW.body,
            'group_id', NEW.group_id,
            'type', NEW.type
          )
        )
      );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء الزناد (Trigger) ليعمل عند إضافة إشعار جديد
DROP TRIGGER IF EXISTS on_notification_created_push ON public.notifications;
CREATE TRIGGER on_notification_created_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_notification_push();
