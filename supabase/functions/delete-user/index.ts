import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function errMsg(e: unknown): string {
  if (!e) return "unknown error";
  if (typeof e === "string") return e;
  if (typeof e === "object") {
    const o = e as Record<string, unknown>;
    return String(o["message"] ?? o["msg"] ?? o["error_description"] ?? o["error"] ?? JSON.stringify(e));
  }
  return String(e);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller identity
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await adminClient.auth.getUser(token);

    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "No autorizado", detail: errMsg(authError) }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = userData.user.id;

    // Check caller is admin
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("is_admin")
      .eq("id", callerId)
      .maybeSingle();

    if (profileError || !profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Acceso denegado", detail: errMsg(profileError) }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const user_id: string = body?.user_id;

    if (!user_id || typeof user_id !== "string") {
      return new Response(JSON.stringify({ error: "user_id es requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (user_id === callerId) {
      return new Response(JSON.stringify({ error: "No puedes eliminar tu propia cuenta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Admin ${callerId} deleting user ${user_id}`);

    // Clean up all public tables with FKs to auth.users BEFORE deleting the user
    // to avoid FK constraint violations.
    const cleanupTables: Array<{ table: string; column: string }> = [
      { table: "reviews", column: "user_id" },
      { table: "reservations", column: "user_id" },
      { table: "broadcasts", column: "sent_by" },
      { table: "stripe_customers", column: "user_id" },
      { table: "profiles", column: "id" },
    ];

    for (const { table, column } of cleanupTables) {
      const { error: delErr } = await adminClient
        .from(table)
        .delete()
        .eq(column, user_id);
      if (delErr) {
        console.warn(`Cleanup ${table}.${column} failed (non-fatal):`, errMsg(delErr));
      }
    }

    // Now delete the auth user via the Auth admin API
    const deleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user_id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
        "Content-Type": "application/json",
      },
    });

    console.log(`Delete response status: ${deleteRes.status}`);

    if (!deleteRes.ok) {
      const errText = await deleteRes.text();
      console.error("Delete failed:", deleteRes.status, errText);
      return new Response(
        JSON.stringify({
          error: "Error al eliminar el usuario",
          detail: `HTTP ${deleteRes.status}: ${errText}`,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${user_id} deleted successfully`);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: errMsg(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
