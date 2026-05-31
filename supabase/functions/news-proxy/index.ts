// ShadowGrid AI — NewsAPI CORS proxy (Supabase Edge Function)
//
// Why this exists:
//   NewsAPI's free tier blocks direct browser requests on public domains.
//   This function runs server-side, where NewsAPI accepts the request, and
//   forwards the result back to the browser with permissive CORS headers.
//
// The NewsAPI key is read from the `NEWS_API_KEY` Edge Function secret and is
// NEVER exposed to the browser. Set it once with:
//   supabase secrets set NEWS_API_KEY=your-key
// (or via Dashboard → Edge Functions → Manage secrets).
//
// Client contract (see src/services/newsService.ts):
//   GET <function-url>?q=<query>&pageSize=<n>&sortBy=<field>
//   → returns the raw NewsAPI /v2/everything JSON body.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "GET") {
    return json({ status: "error", message: "Method not allowed" }, 405);
  }

  const apiKey = Deno.env.get("NEWS_API_KEY");
  if (!apiKey) {
    return json(
      { status: "error", message: "NEWS_API_KEY secret not configured on the Edge Function" },
      500,
    );
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "infrastructure";
  const pageSize = url.searchParams.get("pageSize") ?? "10";
  const sortBy = url.searchParams.get("sortBy") ?? "publishedAt";

  const upstream = new URL("https://newsapi.org/v2/everything");
  upstream.searchParams.set("q", q);
  upstream.searchParams.set("pageSize", pageSize);
  upstream.searchParams.set("sortBy", sortBy);
  upstream.searchParams.set("apiKey", apiKey);

  try {
    const res = await fetch(upstream.toString(), {
      signal: AbortSignal.timeout(8000),
      headers: {
        // NewsAPI recommends sending the key via header too; also sets a UA.
        "X-Api-Key": apiKey,
        "User-Agent": "ShadowGridAI/1.0 (Supabase Edge Function)",
      },
    });

    const body = await res.json();
    // Pass NewsAPI's body through, cache successful responses at the edge.
    const cache = res.ok ? { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } : {};
    return json(body, res.ok ? 200 : res.status, cache);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream NewsAPI request failed";
    return json({ status: "error", message }, 502);
  }
});
