// ShadowGrid AI — LLM Explanation Layer (Supabase Edge Function)
//
// Converts structured zone risk data into a clear, human-readable explanation
// using Google Gemini 2.5 Flash-Lite (cheapest model, generous free tier).
//
// The GEMINI_API_KEY is read from an Edge Function secret and never reaches the
// browser. Set it with:  supabase secrets set GEMINI_API_KEY=your-key
//
// Request (POST JSON):
//   {
//     zone: { name, city, overall_score, risk_level, top_category },
//     scores: [{ category, score, risk_level }],
//     signals: [{ source, severity, title }],
//     reports: [{ report_type, severity }],
//     propagation?: string
//   }
//
// Response (JSON):
//   { ok: true, explanation: string, action: string, model: string }
//   { ok: false, error: string }

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

interface ZonePayload {
  zone?: {
    name?: string;
    city?: string;
    overall_score?: number;
    risk_level?: string;
    top_category?: string;
  };
  scores?: Array<{ category: string; score: number; risk_level: string }>;
  signals?: Array<{ source: string; severity: string; title: string }>;
  reports?: Array<{ report_type: string; severity: string }>;
  propagation?: string;
}

function buildPrompt(p: ZonePayload): string {
  const z = p.zone ?? {};
  const scores = (p.scores ?? [])
    .map((s) => `- ${s.category}: ${s.score}/100 (${s.risk_level})`)
    .join("\n");
  const signals = (p.signals ?? [])
    .slice(0, 8)
    .map((s) => `- [${s.source}/${s.severity}] ${s.title}`)
    .join("\n");
  const reports = (p.reports ?? [])
    .slice(0, 8)
    .map((r) => `- ${r.report_type} (${r.severity})`)
    .join("\n");

  return `You are an infrastructure risk analyst for a smart-city operations team.
Explain, in plain language for a city operator, WHY the following zone is at its current risk level and WHAT to do first.

Zone: ${z.name ?? "Unknown"} (${z.city ?? "city"})
Overall risk: ${z.overall_score ?? "?"} / 100 (${z.risk_level ?? "?"})
Top risk category: ${z.top_category ?? "?"}

Category scores:
${scores || "- none"}

Recent external signals:
${signals || "- none"}

Recent citizen reports:
${reports || "- none"}

${p.propagation ? `Adjacent-zone propagation: ${p.propagation}` : ""}

Respond ONLY with a strict JSON object (no markdown) of the form:
{"explanation": "<2-3 sentence explanation of the dominant risk drivers>", "action": "<1 sentence recommended first action>"}
Keep it concise, factual, and specific to the data above. Do not invent data.`;
}

function extractJson(text: string): { explanation: string; action: string } | null {
  // Gemini may wrap JSON in code fences or prose — extract the first {...} block.
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (typeof parsed.explanation === "string" && typeof parsed.action === "string") {
      return { explanation: parsed.explanation, action: parsed.action };
    }
  } catch {
    /* fall through */
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return json({ ok: false, error: "GEMINI_API_KEY secret not configured" }, 500);
  }

  let payload: ZonePayload;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const body = {
    contents: [{ parts: [{ text: buildPrompt(payload) }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 400,
      responseMimeType: "application/json",
    },
  };

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text();
      return json({ ok: false, error: `Gemini HTTP ${res.status}: ${errText.slice(0, 200)}` }, 502);
    }

    const data = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = extractJson(text);
    if (!parsed) {
      return json({ ok: false, error: "Could not parse model output" }, 502);
    }

    return json({ ok: true, explanation: parsed.explanation, action: parsed.action, model: MODEL });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gemini request failed";
    return json({ ok: false, error: message }, 502);
  }
});
