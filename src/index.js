const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" };
function json(data, status = 200, headers = {}) { return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } }); }
async function sbGet(env, path) {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) throw new Error("Supabase runtime variables are not configured");
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${path}`, { headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`, accept: "application/json" } });
  if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
  return response.json();
}
async function api(request, env) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "access-control-allow-methods": "GET, OPTIONS", "access-control-allow-headers": "authorization, content-type, apikey" } });
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, { allow: "GET, OPTIONS" });
  try {
    if (url.pathname === "/api/health") return json({ ok: true, service: "performancemedia" });
    if (url.pathname === "/api/pages") return json({ data: await sbGet(env, "pages?select=id,slug,title,meta_title,meta_description,status,updated_at&status=eq.published&order=slug.asc") });
    const m = url.pathname.match(/^\/api\/pages\/([a-z0-9-]+)$/i);
    if (m) {
      const rows = await sbGet(env, `pages?select=id,slug,title,meta_title,meta_description,status,updated_at&slug=eq.${encodeURIComponent(m[1])}&status=eq.published&limit=1`);
      if (!rows.length) return json({ error: "Page not found" }, 404);
      const sections = await sbGet(env, `page_sections?select=id,section_key,heading,body,image_url,cta_text,cta_url,sort_order,is_visible,content&page_id=eq.${rows[0].id}&is_visible=eq.true&order=sort_order.asc`);
      return json({ data: { ...rows[0], sections } });
    }
    if (url.pathname === "/api/networks") return json({ data: await sbGet(env, "networks?select=id,name,slug,description,logo_url,website_url,application_url,verticals,geos,traffic_sources,status,sort_order&status=eq.published&order=sort_order.asc") });
    if (url.pathname === "/api/faqs") return json({ data: await sbGet(env, "faqs?select=id,question,answer,sort_order&status=eq.published&order=sort_order.asc") });
    return json({ error: "Not found" }, 404);
  } catch (e) { console.error("API error", e.message); return json({ error: "Backend request failed. Check Worker logs and Supabase configuration." }, 502); }
}
export default { async fetch(request, env) {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return api(request, env);
  // Admin UI is a static shell for now; privileged write endpoints are intentionally not enabled
  // until Supabase Auth JWT validation and admin-role checks are implemented and tested.
  if (url.pathname === "/admin") return Response.redirect(new URL("/admin/", url), 301);
  return env.ASSETS.fetch(request);
} };
