
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

// CORS headers for browser access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendVerificationEmailRequest {
  email: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code }: SendVerificationEmailRequest = await req.json();
    
    if (!email || !code) {
      throw new Error("Email and verification code are required");
    }

    // Hardcoded Resend API key (you provided in the message)
    const RESEND_API_KEY = "re_63WtZPFt_J5m7rm4mjRvMwdYJJxFERKdV";
    
    console.log("Using Resend API key:", RESEND_API_KEY.substring(0, 5) + '...');
    const resend = new Resend(RESEND_API_KEY);

    console.log("Attempting to send email to:", email, "with code:", code);

    // Send email via Resend API
    const response = await resend.emails.send({
      from: "تطبيقك <onboarding@resend.dev>",
      to: [email],
      subject: "رمز التحقق من البريد الإلكتروني",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl; text-align: right;">
          <h2 style="color: #4A5568;">مرحباً!</h2>
          <p>شكراً على تسجيلك في تطبيقنا. فيما يلي رمز التحقق الخاص بك:</p>
          <div style="background-color: #F7FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
            <span style="font-size: 24px; font-weight: bold; letter-spacing: 8px; color: #4A5568;">${code}</span>
          </div>
          <p>يرجى إدخال هذا الرمز في صفحة التحقق لإكمال عملية التسجيل.</p>
          <p>إذا لم تقم بطلب هذا الرمز، يرجى تجاهل هذا البريد الإلكتروني.</p>
          <p>مع التحية،<br>فريق التطبيق</p>
        </div>
      `
    });

    console.log("Email sent successfully:", response);

    return new Response(JSON.stringify({ success: true, message: "Verification email sent" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error in send-verification-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

serve(handler);
