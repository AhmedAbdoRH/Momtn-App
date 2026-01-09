import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

async function getAccessToken(serviceAccount: any) {
  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    {
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: "https://oauth2.googleapis.com/token",
      iat: getNumericDate(0),
      exp: getNumericDate(3600),
      scope: "https://www.googleapis.com/auth/cloud-platform",
    },
    await crypto.subtle.importKey(
      "pkcs8",
      Uint8Array.from(
        atob(
          serviceAccount.private_key
            .replace(/-----BEGIN PRIVATE KEY-----/, "")
            .replace(/-----END PRIVATE KEY-----/, "")
            .replace(/\\n/g, "") // تعامل مع \n كنص
            .replace(/\n/g, "")   // تعامل مع سطر جديد حقيقي
            .replace(/\r/g, "")   // تعامل مع سطر جديد في ويندوز
            .replace(/\s/g, "")   // تعامل مع أي مسافات
        ),
        (c) => c.charCodeAt(0)
      ),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    )
  );

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  return data.access_token;
}

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record || payload;
    
    if (!record || (!record.user_id && !record.receiver_id)) {
      return new Response("No user_id", { status: 400 });
    }

    const userId = record.user_id || record.receiver_id;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('token')
      .eq('user_id', userId);

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No tokens found" }), { status: 200 });
    }

    // تجهيز بيانات الإشعار
    const title = record.title || 'إشعار جديد';
    const body = record.body || '';
    const type = String(record.type || 'new_photo');
    const groupId = String(record.group_id || '');

    // محاولة الإرسال عبر FCM v1 (الأحدث)
    const SERVICE_ACCOUNT_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT');
    let v1Success = false;

    if (SERVICE_ACCOUNT_JSON) {
      try {
        const serviceAccount = JSON.parse(SERVICE_ACCOUNT_JSON);
        const accessToken = await getAccessToken(serviceAccount);
        const FCM_V1_URL = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

        for (const t of tokens) {
          const fcmBody = {
            message: {
              token: t.token,
              notification: { title, body },
              data: { title, body, type, group_id: groupId, notification_id: String(record.id || '') },
              android: { priority: 'high', notification: { channelId: 'momtn-notifications' } }
            }
          };

          const res = await fetch(FCM_V1_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
            body: JSON.stringify(fcmBody)
          });
          if (res.status === 200) v1Success = true;
        }
      } catch (e) {
        console.error("FCM v1 failed, trying Legacy...", e.message);
      }
    }

    // إذا فشل v1، نجرب الطريقة القديمة (Legacy) باستخدام Server Key
    if (!v1Success) {
      const SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');
      if (SERVER_KEY) {
        for (const t of tokens) {
          const legacyBody = {
            to: t.token,
            notification: { title, body, sound: "default", badge: "1" },
            data: { title, body, type, group_id: groupId },
            priority: "high"
          };

          await fetch("https://fcm.googleapis.com/fcm/send", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `key=${SERVER_KEY}` },
            body: JSON.stringify(legacyBody)
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
});
