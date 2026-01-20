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
        scope: "https://www.googleapis.com/auth/firebase.messaging",
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
    const photoId = String(record.photo_id || record.data?.photo_id || '');

    // FCM v1 فقط - تم إيقاف Legacy API من قبل Google نهائياً في يونيو 2024
    const SERVICE_ACCOUNT_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT');

    if (!SERVICE_ACCOUNT_JSON) {
      console.error("FCM_SERVICE_ACCOUNT not configured");
      return new Response(JSON.stringify({ error: "FCM credentials missing" }), { status: 500 });
    }

    let successCount = 0;
    let failCount = 0;
    const invalidTokens: string[] = [];

    try {
      console.log("Using FCM v1 API...");
      const serviceAccount = JSON.parse(SERVICE_ACCOUNT_JSON);
      const accessToken = await getAccessToken(serviceAccount);

      if (!accessToken) {
        console.error("Failed to get FCM v1 access token");
        return new Response(JSON.stringify({ error: "Failed to get access token" }), { status: 500 });
      }

      const FCM_V1_URL = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;
      console.log(`FCM v1 URL: ${FCM_V1_URL}`);

      for (const t of tokens) {
        try {
          // Generate unique dedupe key to prevent duplicate notifications
          const dedupeKey = `${type}_${notificationId || photoId || Date.now()}`;

          const fcmBody = {
            message: {
              token: t.token,
              data: {
                title,
                body,
                type,
                group_id: groupId,
                notification_id: notificationId,
                photo_id: photoId,
                dedupe_key: dedupeKey,
              },
              android: {
                priority: 'high',
                notification: {
                  title,
                  body,
                  sound: 'default',
                  channel_id: 'momtn-notifications',
                  icon: 'ic_launcher',
                  tag: dedupeKey, // يمنع التكرار على مستوى النظام
                }
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
            successCount++;
            console.log(`FCM v1 success for token ${t.token.substring(0, 10)}...`);
          } else {
            failCount++;
            console.error(`FCM v1 error (Status ${res.status}) for token ${t.token.substring(0, 10)}:`, resultText);

            // التعامل مع التوكنات المنتهية أو غير الصالحة
            if (resultText.includes('UNREGISTERED') || resultText.includes('INVALID_ARGUMENT') || resultText.includes('NOT_FOUND')) {
              console.log(`Marking token as invalid: ${t.token.substring(0, 10)}...`);
              invalidTokens.push(t.token);
            }
          }
        } catch (tokenErr) {
          failCount++;
          console.error(`FCM v1 fetch exception for token ${t.token.substring(0, 10)}:`, tokenErr.message);
        }
      }

      // حذف التوكنات غير الصالحة من قاعدة البيانات
      if (invalidTokens.length > 0) {
        console.log(`Removing ${invalidTokens.length} invalid tokens...`);
        const { error: deleteError } = await supabase
          .from('device_tokens')
          .delete()
          .in('token', invalidTokens);

        if (deleteError) {
          console.error("Error deleting invalid tokens:", deleteError);
        } else {
          console.log(`Successfully removed ${invalidTokens.length} invalid tokens`);
        }
      }

    } catch (e) {
      console.error("FCM v1 process failed:", e.message);
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }

    console.log(`Notification summary: ${successCount} success, ${failCount} failed, ${invalidTokens.length} tokens removed`);
    return new Response(JSON.stringify({
      success: true,
      sent: successCount,
      failed: failCount,
      tokensRemoved: invalidTokens.length
    }), { status: 200 });

  } catch (err) {
    console.error("Global function error:", err.message);
    return new Response(err.message, { status: 500 });
  }
});
