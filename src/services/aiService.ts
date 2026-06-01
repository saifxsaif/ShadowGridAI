// ShadowGrid AI — Gemini-backed AI services (via Supabase Edge Functions)
//
// Two capabilities, both routed through server-side Edge Functions so the
// Gemini API key never reaches the browser:
//   1. explainZoneRisk()    → LLM explanation layer  (llm-explain function)
//   2. classifyArticles()   → NLP news classifier    (news-classify function)
//
// Both gracefully no-op (return null / []) when AI is not configured, so the
// rest of the app keeps working with its deterministic engine output.

import { FUNCTIONS_BASE_URL, AI_ENABLED, SUPABASE_ANON_KEY } from '@/lib/appConfig';
import type {
  Zone, RiskScore, ExternalSignal, CitizenReport, ZoneRiskSummary,
  RiskCategory, Severity, SignalType,
} from '@/types/types';

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    apikey: SUPABASE_ANON_KEY,
  };
}

// ─── 1. LLM Explanation Layer ───────────────────────────────────────────────

export interface AiZoneExplanation {
  explanation: string;
  action: string;
  model: string;
}

export interface ExplainZoneInput {
  zone: Zone;
  summary: ZoneRiskSummary | undefined;
  scores: RiskScore[];
  signals: ExternalSignal[];
  reports: CitizenReport[];
  propagation?: string;
}

/**
 * Sends structured zone risk data to the LLM and returns a concise,
 * human-readable explanation + recommended action. Returns null if AI is
 * disabled or the request fails (callers fall back to the deterministic engine
 * explanation).
 */
export async function explainZoneRisk(input: ExplainZoneInput): Promise<AiZoneExplanation | null> {
  if (!AI_ENABLED) return null;

  const payload = {
    zone: {
      name: input.zone.name,
      city: input.zone.city,
      overall_score: input.summary?.overall_score,
      risk_level: input.summary?.risk_level,
      top_category: input.summary?.top_category,
    },
    scores: input.scores.map(s => ({
      category: s.category, score: s.score, risk_level: s.risk_level,
    })),
    signals: input.signals.slice(0, 8).map(s => ({
      source: s.source, severity: s.severity, title: s.title,
    })),
    reports: input.reports.slice(0, 8).map(r => ({
      report_type: r.report_type, severity: r.severity,
    })),
    propagation: input.propagation,
  };

  try {
    const res = await fetch(`${FUNCTIONS_BASE_URL}/llm-explain`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(18000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.ok) return null;
    return { explanation: data.explanation, action: data.action, model: data.model };
  } catch {
    return null;
  }
}

// ─── 2. NLP News Classifier ─────────────────────────────────────────────────

export interface ArticleToClassify {
  title: string;
  description?: string | null;
}

export interface ClassifiedArticle {
  index: number;
  relevant: boolean;
  category: RiskCategory | null;
  signal_type: SignalType | null;
  severity: Severity;
  confidence: number;
  keywords: string[];
}

/**
 * Classifies a batch of news articles into infrastructure risk categories via
 * the LLM. Returns [] if AI is disabled or the request fails (callers fall back
 * to keyword matching).
 */
export async function classifyArticles(
  articles: ArticleToClassify[],
  city?: string,
): Promise<ClassifiedArticle[]> {
  if (!AI_ENABLED || articles.length === 0) return [];

  try {
    const res = await fetch(`${FUNCTIONS_BASE_URL}/news-classify`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ articles, city }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.results)) return [];
    return data.results as ClassifiedArticle[];
  } catch {
    return [];
  }
}
