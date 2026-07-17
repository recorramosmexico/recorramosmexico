import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BroadcastPayload {
  subject: string;
  html_content: string;
  sent_by?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload: BroadcastPayload = await req.json();

    if (!payload.subject || !payload.html_content) {
      return new Response(JSON.stringify({ error: "Faltan campos requeridos: subject, html_content" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch SMTP2GO settings
    const { data: settingsRows } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["smtp2go_api_key", "from_email", "from_name", "logo_url"]);

    const settings: Record<string, string> = {};
    for (const row of settingsRows ?? []) {
      settings[row.key] = row.value;
    }

    const apiKey = settings["smtp2go_api_key"];
    const fromEmail = settings["from_email"] || "contacto@recorramosmexico.com.mx";
    const fromName = settings["from_name"] || "Recorramos México";
    const logoUrl = settings["logo_url"] || "";

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "SMTP2GO API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all registered user emails from auth.users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      return new Response(JSON.stringify({ error: "Error fetching users", detail: usersError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipients = (users.users || [])
      .map(u => u.email)
      .filter((e): e is string => !!e && e.trim().length > 0);

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "No hay usuarios registrados para enviar el comunicado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build branded HTML wrapper around the admin-provided content
    const brandHeader = `
      <div style="background:#1A1A1A;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center;">
        ${logoUrl ? `<img src="${logoUrl}" alt="Recorramos México" style="height:64px;width:64px;object-fit:cover;border-radius:12px;margin-bottom:10px;display:block;margin-left:auto;margin-right:auto;" />` : ''}
        <p style="color:#E8670A;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 2px;">Recorramos México</p>
        <p style="color:#9ca3af;font-size:12px;margin:0;">Descubre la magia de México</p>
      </div>`;

    const brandFooter = `
      <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 32px;text-align:center;border-radius:0 0 12px 12px;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">© ${new Date().getFullYear()} Recorramos México · <a href="mailto:contacto@recorramosmexico.com.mx" style="color:#9ca3af;">contacto@recorramosmexico.com.mx</a></p>
      </div>`;

    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:20px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
          ${brandHeader}
          <div style="padding:32px;">
            ${payload.html_content}
          </div>
          ${brandFooter}
        </div>
      </body></html>`;

    // Send via SMTP2GO (single API call with all recipients as BCC)
    const smtpRes = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Smtp2go-Api-Key": apiKey,
      },
      body: JSON.stringify({
        sender: `${fromName} <${fromEmail}>`,
        to: [fromEmail],
        bcc: recipients,
        subject: payload.subject,
        html_body: fullHtml,
        text_body: payload.subject,
      }),
    });

    const result = await smtpRes.json();

    if (!smtpRes.ok || result.data?.failures?.length > 0) {
      console.error("SMTP2GO broadcast error:", JSON.stringify(result));

      // Log failed broadcast
      await supabase.from("broadcasts").insert({
        subject: payload.subject,
        html_content: payload.html_content,
        recipients_count: recipients.length,
        status: "failed",
        sent_by: payload.sent_by || null,
      });

      return new Response(JSON.stringify({ error: "Email delivery failed", detail: result }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log successful broadcast
    await supabase.from("broadcasts").insert({
      subject: payload.subject,
      html_content: payload.html_content,
      recipients_count: recipients.length,
      status: "sent",
      sent_by: payload.sent_by || null,
    });

    return new Response(JSON.stringify({ success: true, recipients_count: recipients.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-broadcast error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
