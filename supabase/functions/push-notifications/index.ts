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
    const SERVICE_ACCOUNT_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT');
    if (!SERVICE_ACCOUNT_JSON) {
      console.error("--- ERROR: FCM_SERVICE_ACCOUNT MISSING ---");
      return new Response("FCM_SERVICE_ACCOUNT is missing", { status: 500 });
    }

    const serviceAccount = JSON.parse(SERVICE_ACCOUNT_JSON);
    const accessToken = await getAccessToken(serviceAccount);
    const FCM_V1_URL = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

    const payload = await req.json();
    // الـ Webhook يرسل البيانات في record، والـ Trigger يرسلها مباشرة أو في record
    const record = payload.record || payload;
    
    if (!record || (!record.user_id && !record.receiver_id)) {
        console.error("--- ERROR: NO USER_ID IN PAYLOAD ---", JSON.stringify(payload));
        return new Response("No user_id", { status: 400 });
    }

    const userId = record.user_id || record.receiver_id;
    console.log(`--- PROCESSING NOTIFICATION (V1) FOR USER: ${userId} ---`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: tokens, error: tokenError } = await supabase
      .from('device_tokens')
      .select('token')
      .eq('user_id', userId);

    if (tokenError || !tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No tokens found" }), { status: 200 });
    }

    const results = [];
    for (const t of tokens) {
      try {
        const title = record.title || 'إشعار جديد';
        const body = record.body || '';
        const type = String(record.type || 'new_photo');
        const groupId = String(record.group_id || '');

        const baseData: Record<string, string> = {
          title: String(title),
          body: String(body),
          type,
          group_id: groupId,
          notification_id: String(record.id || ''),
        };

        const extraData = Object.keys(record.data || {}).reduce((acc, key) => {
          acc[key] = String(record.data[key]);
          return acc;
        }, {} as Record<string, string>);

        const fcmBody = {
          message: {
            token: t.token,
            notification: {
              title: String(title),
              body: String(body),
            },
            data: {
              ...baseData,
              ...extraData,
            },
            android: {
              priority: 'high',
              notification: {
                channelId: 'momtn-notifications',
                priority: 'high',
                defaultSound: true,
                defaultVibrateTimings: true,
              }
            },
          }
        };

        const fcmRes = await fetch(FCM_V1_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(fcmBody),
        });
        
        const resText = await fcmRes.text();
        console.log(`--- FCM V1 STATUS FOR TOKEN ${t.token.substring(0, 10)}...: ${fcmRes.status} ---`);
        
        if (fcmRes.status === 404 || fcmRes.status === 410) {
          console.log(`--- REMOVING INVALID TOKEN: ${t.token.substring(0, 10)}... ---`);
          await supabase
            .from('device_tokens')
            .delete()
            .eq('token', t.token);
        } else if (fcmRes.status !== 200) {
          console.error(`--- FCM V1 ERROR: ${resText} ---`);
        }

        results.push({ token: t.token.substring(0, 10), status: fcmRes.status });
      } catch (tokenErr) {
        console.error(`--- ERROR SENDING (V1): ${tokenErr.message} ---`);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error(`--- CRITICAL ERROR (V1): ${err.message} ---`);
    return new Response(err.message, { status: 500 });
  }
});
