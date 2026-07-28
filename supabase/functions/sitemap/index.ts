import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE_DOMAIN = "https://recorramosmexico.com.mx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc: string, lastmod?: string, changefreq = "weekly", priority = "0.7"): string {
  let entry = "  <url>\n";
  entry += `    <loc>${escapeXml(loc)}</loc>\n`;
  if (lastmod) entry += `    <lastmod>${lastmod}</lastmod>\n`;
  entry += `    <changefreq>${changefreq}</changefreq>\n`;
  entry += `    <priority>${priority}</priority>\n`;
  entry += "  </url>";
  return entry;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const [toursResult, blogResult] = await Promise.all([
      supabase.from("tours").select("slug, created_at").eq("is_active", true),
      supabase.from("blog_posts").select("slug, created_at").eq("is_published", true),
    ]);

    const staticUrls = [
      urlEntry(`${SITE_DOMAIN}/`, undefined, "weekly", "1.0"),
      urlEntry(`${SITE_DOMAIN}/tours`, undefined, "daily", "0.9"),
      urlEntry(`${SITE_DOMAIN}/paquetes`, undefined, "weekly", "0.8"),
      urlEntry(`${SITE_DOMAIN}/nosotros`, undefined, "monthly", "0.6"),
      urlEntry(`${SITE_DOMAIN}/servicios`, undefined, "monthly", "0.7"),
      urlEntry(`${SITE_DOMAIN}/blog`, undefined, "daily", "0.8"),
      urlEntry(`${SITE_DOMAIN}/contacto`, undefined, "monthly", "0.6"),
    ];

    const tourUrls = (toursResult.data ?? []).map((t: { slug: string; created_at: string }) =>
      urlEntry(`${SITE_DOMAIN}/tours/${t.slug}`, t.created_at?.split("T")[0], "weekly", "0.8")
    );

    const blogUrls = (blogResult.data ?? []).map((p: { slug: string; created_at: string }) =>
      urlEntry(`${SITE_DOMAIN}/blog/${p.slug}`, p.created_at?.split("T")[0], "weekly", "0.7")
    );

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticUrls, ...tourUrls, ...blogUrls].join("\n")}\n</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        ...corsHeaders,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
