// ShadowGrid AI — NLP News Classifier (Supabase Edge Function)
//
// Classifies news articles into infrastructure risk categories using Google
// Gemini 2.5 Flash-Lite, going beyond simple keyword matching. Returns a
// structured classification per article (category, signal_type, severity,
// confidence, keywords) that the app maps to zones and feeds into scoring.
//
// GEMINI_API_KEY is read from an Edge Function secret (never sent to browser).
//   supabase secrets set GEMINI_API_KEY=your-key
//
// Request (POST JSON):
//   { articles: [{ title: string, description?: string }], city?: string }
//
// Response (JSON):
//   { ok: true, results: ClassifiedArticle[], model: string }
//   { ok: false, error: string }
//
// ClassifiedArticle:
//   { index, relevant, category, signal_type, severity, confidence, keywords[] }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MODEL = "gemini-2.5-flash-lite";
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

interface ArticleIn {
  title: string;
  description?: string;
}

const VALID_CATEGORIES = ["drainage", "road", "water", "power", "traffic", "emergency_access"];
const VALID_SIGNAL_TYPES = [
  "news_flooding",
  "news_road_closure",
  "news_power_outage",
  "news_water_shortage",
  "news_traffic_disruption",
];

function buildPrompt(articles: ArticleIn[], city?: string): string {
  const list = articles
    .map((a, i) => `${i}. TITLE: ${a.title}\n   DESC: ${(a.description ?? "").slice(0, 300)}`)
    .join("\n");

  return `You are classifying news articles for a smart-city infrastructure risk system${
    city ? ` focused on ${city}` : ""
  }.

For EACH article, decide whether it relates to a city infrastructure risk and classify it.

Allowed categories: ${VALID_CATEGORIES.join(", ")}
Allowed signal_type values: ${VALID_SIGNAL_TYPES.join(", ")}
Severity must be one of: critical, high, medium, low
Confidence is a number between 0 and 1.

Mapping guidance:
- flooding / drainage / storm surge → category "drainage", signal_type "news_flooding"
- road closure / damage / collapse → category "road", signal_type "news_road_closure"
- power outage / blackout / grid failure → category "power", signal_type "news_power_outage"
- water shortage / supply / pressure → category "water", signal_type "news_water_shortage"
- traffic jam / congestion / accident → category "traffic", signal_type "news_traffic_disruption"

If an article is NOT about city infrastructure risk, set "relevant": false and use null for category/signal_type.

Articles:
${list}

Respond ONLY with a strict JSON array (no markdown), one object per article in order:
[{"index": 0, "relevant": true, "category": "drainage", "signal_type": "news_flooding", "severity": "high", "confidence": 0.82, "keywords": ["flood","river"]}]`;
}

interface Classified {
  index: number;
  relevant: boolean;
  category: string | null;
  signal_type: string | null;
  severity: string;
  confidence: number;
  keywords: string[];
}

function sanitize(raw: unknown, count: number): Classified[] {
  if (!Array.isArray(raw)) return [];
  const out: Classified[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const index = typeof r.index === "number" ? r.index : -1;
    if (index < 0 || index >= count) continue;

    const relevant = r.relevant === true;
    const category = VALID_CATEGORIES.includes(r.category as string) ? (r.category as string) : null;
    const signal_type = VALID_SIGNAL_TYPES.includes(r.signal_type as string)
      ? (r.signal_type as string)
      : null;
    const severity = ["critical", "high", "medium", "low"].includes(r.severity as string)
      ? (r.severity as string)
      : "low";
    let confidence = typeof r.confidence === "number" ? r.confidence : 0.5;
    confidence = Math.max(0, Math.min(1, confidence));
    const keywords = Array.isArray(r.keywords)
      ? (r.keywords as unknown[]).filter((k) => typeof k === "string").slice(0, 6) as string[]
      : [];

    out.push({
      index,
      relevant: relevant && category !== null && signal_type !== null,
      category,
      signal_type,
      severity,
      confidence,
      keywords,
    });
  }
  return out;
}

function extractJsonArray(text: string): unknown {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return json({ ok: false, error: "GEMINI_API_KEY secret not configured" }, 500);
  }

  let payload: { articles?: ArticleIn[]; city?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const articles = (payload.articles ?? []).filter(
    (a) => a && typeof a.title === "string",
  );
  if (articles.length === 0) {
    return json({ ok: true, results: [], model: MODEL });
  }
  // Cap to keep token usage (and cost) low
  const capped = articles.slice(0, 20);

  const body = {
    contents: [{ parts: [{ text: buildPrompt(capped, payload.city) }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  };

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const errText = await res.text();
      return json({ ok: false, error: `Gemini HTTP ${res.status}: ${errText.slice(0, 200)}` }, 502);
    }

    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = extractJsonArray(text);
    const results = sanitize(parsed, capped.length);

    return json({ ok: true, results, model: MODEL });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gemini request failed";
    return json({ ok: false, error: message }, 502);
  }
});
