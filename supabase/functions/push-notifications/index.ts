import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

async function getAccessToken(serviceAccount: any) {
  try {
    console.log(`Generating token for project: ${serviceAccount.project_id}`);

    // تنظيف المفتاح الخاص بشكل فائق
    let pKey = serviceAccount.private_key;
    if (!pKey.includes("BEGIN PRIVATE KEY")) {
      // إذا كان المفتاح مخزناً بدون الهيدر، نضيفه
      pKey = `-----BEGIN PRIVATE KEY-----\n${pKey}\n-----END PRIVATE KEY-----`;
    }

    // معالجة الأسطر الجديدة سواء كانت \n نصية أو حقيقية
    const formattedKey = pKey.replace(/\\n/g, "\n");

    const jwt = await create(
      { alg: "RS256", typ: "JWT" },
      {
        iss: serviceAccount.client_email,
        sub: serviceAccount.client_email,
        aud: "https://oauth2.googleapis.com/token",
        iat: getNumericDate(0),
        exp: getNumericDate(3600),
        scope: "https://www.googleapis.com/auth/cloud-platform", // نطاق شامل لضمان القبول
      },
      await crypto.subtle.importKey(
        "pkcs8",
        Uint8Array.from(
          atob(
            formattedKey
              .replace(/-----BEGIN PRIVATE KEY-----/, "")
              .replace(/-----END PRIVATE KEY-----/, "")
              .replace(/\s/g, "")
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
    if (!res.ok) {
      console.error("Google OAuth Error Details:", JSON.stringify(data));
      return null;
    }
    return data.access_token;
  } catch (e) {
    console.error("Critical failure in getAccessToken:", e.message);
    return null;
  }
}

serve(async (req) => {
  try {
    const payload = await req.json();
    console.log("Received notification payload:", JSON.stringify(payload));

    const record = payload.record || payload;

    if (!record) {
      console.error("No record found in payload");
      return new Response("No record", { status: 400 });
    }

    const userId = record.user_id || record.receiver_id;
    if (!userId) {
      console.error("No user_id or receiver_id found in record:", JSON.stringify(record));
      return new Response("No user_id", { status: 400 });
    }

    console.log(`Processing notification for user: ${userId}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: tokens, error: tokenError } = await supabase
      .from('device_tokens')
      .select('token')
      .eq('user_id', userId);

    if (tokenError) {
      console.error("Error fetching tokens:", tokenError);
      return new Response("Token fetch error", { status: 500 });
    }

    if (!tokens || tokens.length === 0) {
      console.log(`No tokens found for user: ${userId}`);
      return new Response(JSON.stringify({ success: true, message: "No tokens found" }), { status: 200 });
    }

    console.log(`Found ${tokens.length} tokens for user: ${userId}`);

    // تجهيز بيانات الإشعار
    const title = record.title || 'إشعار جديد';
    const body = record.body || '';
    const type = String(record.type || 'new_photo');
    const groupId = String(record.group_id || '');
    const notificationId = String(record.id || '');

    // محاولة الإرسال عبر FCM v1 (الأحدث)
    const SERVICE_ACCOUNT_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT');
    const SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');
    let v1Success = false;

    if (SERVICE_ACCOUNT_JSON) {
      try {
        console.log("Attempting FCM v1 delivery...");
        const serviceAccount = JSON.parse(SERVICE_ACCOUNT_JSON);
        const accessToken = await getAccessToken(serviceAccount);

        if (accessToken) {
          const FCM_V1_URL = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;
          console.log(`FCM v1 URL: ${FCM_V1_URL}`);

          for (const t of tokens) {
            try {
              // نستخدم data-only message لمنع الإشعار المكرر
              // التطبيق هو اللي هيتحكم في عرض الإشعار
              const fcmBody = {
                message: {
                  token: t.token,
                  // لا نرسل notification object - فقط data
                  data: {
                    title,
                    body,
                    type,
                    group_id: groupId,
                    notification_id: notificationId
                  },
                  android: {
                    priority: 'high'
                    // لا نضيف notification config هنا
                  }
                }
              };

              const res = await fetch(FCM_V1_URL, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify(fcmBody)
              });

              const resultText = await res.text();
              if (res.status === 200) {
                v1Success = true;
                console.log(`FCM v1 success for token ${t.token.substring(0, 10)}...`);
              } else {
                console.error(`FCM v1 error (Status ${res.status}) for token ${t.token.substring(0, 10)}:`, resultText);
              }
            } catch (tokenErr) {
              console.error(`FCM v1 fetch exception for token ${t.token.substring(0, 10)}:`, tokenErr.message);
            }
          }
        } else {
          console.error("Failed to get FCM v1 access token");
        }
      } catch (e) {
        console.error("FCM v1 process failed:", e.message);
      }
    }

    // إذا لم يتوفر v1 أو فشل، نجرب الطريقة القديمة (Legacy) باستخدام Server Key
    if (!v1Success && SERVER_KEY) {
      console.log("Attempting Legacy FCM delivery fallback...");
      const CLEAN_SERVER_KEY = SERVER_KEY.trim();

      for (const t of tokens) {
        try {
          const legacyBody = {
            to: t.token,
            priority: "high",
            notification: {
              title: title,
              body: body,
              sound: "default",
              badge: "1",
              click_action: "FCM_PLUGIN_ACTIVITY",
              icon: "fcm_push_icon",
              android_channel_id: "momtn-notifications"
            },
            data: {
              title: title,
              body: body,
              type: type,
              group_id: groupId,
              notification_id: notificationId
            }
          };

          // ملاحظة: قد تعود هذه الروابط بـ 404 لأن جوجل أوقفت الـ Legacy API
          const res = await fetch("https://fcm.googleapis.com/fcm/send", {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `key=${CLEAN_SERVER_KEY}`
            },
            body: JSON.stringify(legacyBody)
          });

          const resultText = await res.text();
          if (res.status === 200) {
            console.log(`Legacy FCM success for token ${t.token.substring(0, 10)}...`);
          } else {
            console.error(`Legacy FCM failed (Status ${res.status}) for token ${t.token.substring(0, 10)}:`, resultText);
          }
        } catch (e) {
          console.error(`Legacy FCM fetch exception:`, e.message);
        }
      }
    } else if (!v1Success && !SERVER_KEY && !SERVICE_ACCOUNT_JSON) {
      console.error("No FCM credentials found");
      return new Response(JSON.stringify({ error: "No FCM credentials" }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("Global function error:", err.message);
    return new Response(err.message, { status: 500 });
  }
});
