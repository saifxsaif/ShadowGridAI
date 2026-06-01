// ShadowGrid AI — Zone name generator (Supabase Edge Function)
// Asks Gemini 2.5 Flash-Lite for 7 plausible district names for a given city.
// Returns a JSON array of strings. GEMINI_API_KEY is read from a secret.
//   supabase secrets set GEMINI_API_KEY=your-key

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MODEL = "gemini-2.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ ok: false, error: "GEMINI_API_KEY secret not configured" }, 500);

  let payload: { city?: string };
  try { payload = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON body" }, 400); }

  const city = (payload.city ?? "").trim();
  if (!city) return json({ ok: false, error: "city is required" }, 400);

  const prompt = `List exactly 7 plausible district or neighbourhood names for the city of ${city}. ` +
    `Return ONLY a JSON array of 7 strings, no markdown, no explanation. ` +
    `Make the names sound like real local districts (not generic directions). ` +
    `Example format: ["Central ${city}","${city} Riverside","${city} Heights","Old Town","East Quarter","West End","Harbour District"]`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 256, responseMimeType: "application/json" },
  };

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      const errText = await res.text();
      return json({ ok: false, error: `Gemini HTTP ${res.status}: ${errText.slice(0, 200)}` }, 502);
    }
    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return json({ ok: false, error: "Could not parse model output" }, 502);
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed) || parsed.length < 7 || !parsed.every((n: unknown) => typeof n === "string")) {
      return json({ ok: false, error: "Unexpected model output format" }, 502);
    }
    return json({ ok: true, names: parsed.slice(0, 7), model: MODEL });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gemini request failed";
    return json({ ok: false, error: message }, 502);
  }
});
