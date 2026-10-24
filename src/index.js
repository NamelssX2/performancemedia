const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  // Replace with the exact production origin once the custom domain is connected.
  // For now, permit same-origin requests and the current workers.dev host only.
  const allowed = origin && (
    origin.endsWith(".workers.dev") ||
    origin.endsWith(".pages.dev")
  );
  return {
    "access-control-allow-origin": allowed ? origin : "null",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, apikey",
    "vary": "Origin",
  };
}

async function supabaseGet(env, path) {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Supabase URL/publishable key is not configured");
  }
  const base = env.SUPABASE_URL.replace(/\/+$/, "");
  const response = await fetch(`${base}/rest/v1/${path}`, {
    method: "GET",
    headers: {
      "apikey": env.SUPABASE_PUBLISHABLE_KEY,
      "authorization": `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`,
      "accept": "application/json",
    },
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase read failed (${response.status}): ${details.slice(0, 300)}`);
  }
  return response.json();
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405, { ...cors, allow: "GET, OPTIONS" });
    }

    try {
      if (url.pathname === "/api/health") {
        return json({ ok: true, service: "performancemedia-api-staging" }, 200, cors);
      }

      if (url.pathname === "/api/pages") {
        const rows = await supabaseGet(
          env,
          "pages?select=id,slug,title,meta_title,meta_description,status,updated_at&status=eq.published&order=slug.asc"
        );
        return json({ data: rows }, 200, cors);
      }

      const pageMatch = url.pathname.match(/^\/api\/pages\/([a-z0-9-]+)$/i);
      if (pageMatch) {
        const slug = pageMatch[1];
        const pages = await supabaseGet(
          env,
          `pages?select=id,slug,title,meta_title,meta_description,status,updated_at&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`
        );
        if (!pages.length) return json({ error: "Page not found" }, 404, cors);
        const page = pages[0];
        const sections = await supabaseGet(
          env,
          `page_sections?select=id,section_key,heading,body,image_url,cta_text,cta_url,sort_order,is_visible,content&page_id=eq.${page.id}&is_visible=eq.true&order=sort_order.asc`
        );
        return json({ data: { ...page, sections } }, 200, cors);
      }

      if (url.pathname === "/api/networks") {
        const rows = await supabaseGet(
          env,
          "networks?select=id,name,slug,description,logo_url,website_url,application_url,verticals,geos,traffic_sources,status,sort_order&status=eq.published&order=sort_order.asc"
        );
        return json({ data: rows }, 200, cors);
      }

      if (url.pathname === "/api/faqs") {
        const rows = await supabaseGet(
          env,
          "faqs?select=id,question,answer,sort_order&status=eq.published&order=sort_order.asc"
        );
        return json({ data: rows }, 200, cors);
      }

      return json({ error: "Not found" }, 404, cors);
    } catch (error) {
      // Avoid returning credentials or full upstream responses to clients.
      console.error("API request failed", error.message);
      return json({ error: "Backend request failed. Check Worker logs and Supabase configuration." }, 502, cors);
    }
  },
};
