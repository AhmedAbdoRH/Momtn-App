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
    const SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');
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
          
          if (res.status === 200) {
            v1Success = true;
            console.log(`Successfully sent FCM v1 notification to token: ${t.token.substring(0, 10)}...`);
          } else {
            const errorText = await res.text();
            console.error(`FCM v1 error for token ${t.token.substring(0, 10)}...:`, errorText);
          }
        }
      } catch (e) {
        console.error("FCM v1 process failed:", e.message);
      }
    }

    // إذا لم يتوفر v1 أو فشل، نجرب الطريقة القديمة (Legacy) باستخدام Server Key
    if (!v1Success && SERVER_KEY) {
      console.log("Attempting Legacy FCM delivery...");
      for (const t of tokens) {
        try {
          const legacyBody = {
            to: t.token,
            notification: { title, body, sound: "default", badge: "1" },
            data: { title, body, type, group_id: groupId, notification_id: String(record.id || '') },
            priority: "high"
          };

          const res = await fetch("https://fcm.googleapis.com/fcm/send", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `key=${SERVER_KEY}` },
            body: JSON.stringify(legacyBody)
          });

          if (res.status === 200) {
            console.log(`Successfully sent Legacy FCM notification to token: ${t.token.substring(0, 10)}...`);
          } else {
            const errorText = await res.text();
            console.error(`Legacy FCM error for token ${t.token.substring(0, 10)}...:`, errorText);
          }
        } catch (e) {
          console.error(`Legacy FCM fetch failed for token ${t.token.substring(0, 10)}...:`, e.message);
        }
      }
    } else if (!v1Success && !SERVER_KEY && !SERVICE_ACCOUNT_JSON) {
      console.error("No FCM credentials found (neither FCM_SERVICE_ACCOUNT nor FCM_SERVER_KEY)");
      return new Response(JSON.stringify({ error: "No FCM credentials" }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
});
