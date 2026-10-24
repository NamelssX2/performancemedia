const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...headers }
  });
}

async function sbGet(env, path) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    throw new Error("Supabase runtime variables are not configured");
  }

  const baseUrl = env.SUPABASE_URL.replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    method: "GET",
    headers: {
      apikey: env.SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("Supabase error:", response.status, details);
    throw new Error(`Supabase returned ${response.status}`);
  }

  return response.json();
}

async function api(request, env) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-methods": "GET, OPTIONS",
        "access-control-allow-headers": "authorization, content-type, apikey"
      }
    });
  }

  if (request.method !== "GET") {
    return json(
      { error: "Method not allowed" },
      405,
      { allow: "GET, OPTIONS" }
    );
  }

  try {
    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "performancemedia"
      });
    }

    if (url.pathname === "/api/pages") {
      const data = await sbGet(
        env,
        "pages?select=id,slug,title,meta_title,meta_description,status,updated_at&status=eq.published&order=slug.asc"
      );

      return json({ data });
    }

    const pageMatch = url.pathname.match(
      /^\/api\/pages\/([a-z0-9-]+)$/i
    );

    if (pageMatch) {
      const slug = pageMatch[1];

      const rows = await sbGet(
        env,
        `pages?select=id,slug,title,meta_title,meta_description,status,updated_at&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`
      );

      if (!rows.length) {
        return json({ error: "Page not found" }, 404);
      }

      const sections = await sbGet(
        env,
        `page_sections?select=id,section_key,heading,body,image_url,cta_text,cta_url,sort_order,is_visible,content&page_id=eq.${encodeURIComponent(rows[0].id)}&is_visible=eq.true&order=sort_order.asc`
      );

      return json({
        data: {
          ...rows[0],
          sections
        }
      });
    }

    if (url.pathname === "/api/networks") {
      const data = await sbGet(
        env,
        "networks?select=id,name,slug,description,logo_url,website_url,application_url,verticals,geos,traffic_sources,status,sort_order&status=eq.published&order=sort_order.asc"
      );

      return json({ data });
    }

    if (url.pathname === "/api/faqs") {
      const data = await sbGet(
        env,
        "faqs?select=id,question,answer,sort_order&status=eq.published&order=sort_order.asc"
      );

      return json({ data });
    }

    return json({ error: "Not found" }, 404);

} catch (error) {
  console.error("API error:", error.stack || error.message || String(error));

  return json(
    {
      error: error.message || "Unknown backend error"
    },
    502
  );
}
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return api(request, env);
    }

    if (url.pathname === "/admin") {
      return Response.redirect(
        new URL("/admin/", url),
        301
      );
    }

    return env.ASSETS.fetch(request);
  }
};
