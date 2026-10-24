import { handleAdminApi } from "./admin-api.js";

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
    throw new Error(
      `Missing runtime binding: URL=${Boolean(env.SUPABASE_URL)}, SECRET=${Boolean(env.SUPABASE_SECRET_KEY)}`
    );
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

    console.error(
      "Supabase error:",
      response.status,
      details
    );

    throw new Error(
      `Supabase returned ${response.status}: ${details}`
    );
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
        "access-control-allow-headers":
          "authorization, content-type, apikey"
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
    // Health check
    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "performancemedia"
      });
    }

    // Published pages
    if (url.pathname === "/api/pages") {
      const data = await sbGet(
        env,
        "pages?select=id,slug,title,meta_title,meta_description,status,updated_at&status=eq.published&order=slug.asc"
      );

      return json({ data });
    }

    // Individual published page and its sections
    const pageMatch = url.pathname.match(
      /^\/api\/pages\/([a-z0-9-]+)$/i
    );

    if (pageMatch) {
      const slug = pageMatch[1];

      const rows = await sbGet(
        env,
        `pages?select=id,slug,title,meta_title,meta_description,status,updated_at&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`
      );

      if (!Array.isArray(rows) || rows.length === 0) {
        return json(
          { error: "Page not found" },
          404
        );
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

    // Published affiliate networks
    if (url.pathname === "/api/networks") {
      const data = await sbGet(
        env,
        "networks?select=id,name,slug,description,logo_url,website_url,application_url,verticals,geos,traffic_sources,status,sort_order&status=eq.published&order=sort_order.asc"
      );

      return json({ data });
    }

    // Published FAQs
    if (url.pathname === "/api/faqs") {
      const data = await sbGet(
        env,
        "faqs?select=id,question,answer,sort_order&status=eq.published&order=sort_order.asc"
      );

      return json({ data });
    }

    return json(
      { error: "Not found" },
      404
    );

  } catch (error) {
    console.error(
      "API error:",
      error.stack || error.message || String(error)
    );

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

   // Admin API routes
if (url.pathname.startsWith("/api/admin/")) {
  const response = await handleAdminApi(request, env);
  if (response) return response;
}

// Existing public API routes
if (url.pathname.startsWith("/api/")) {
  return api(request, env);
}

    // Redirect /admin to /admin/
    if (url.pathname === "/admin") {
      return Response.redirect(
        new URL("/admin/", url),
        301
      );
    }

    // Serve the existing static website
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response(
      "Static assets binding ASSETS is not configured.",
      {
        status: 500,
        headers: {
          "content-type": "text/plain; charset=utf-8"
        }
      }
    );
  }
};
