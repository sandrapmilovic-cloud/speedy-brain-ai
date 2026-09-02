// OpenRouter klijent — pristup besplatnim i plaćenim modelima preko
// OpenAI-kompatibilnog API-ja. Ugrađen je lanac rezervnih modela i
// robusno vađenje sadržaja (neki modeli vraćaju "reasoning" umjesto "content").
import { getKey } from "./storage";

const URL = "https://openrouter.ai/api/v1/chat/completions";

export interface ORMessage {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
}

export interface ORModel {
  id: string;
  label: string;
  free: boolean;
  specialist?: "predictions" | "reasoning" | "math" | "fast" | "vision" | "code";
  ctx?: string;
  note?: string;
}

// Katalog modela. Ako neki id nije dostupan na tvom računu, klijent
// automatski prelazi na sljedeći iz FALLBACK_CHAIN.
export const OR_MODELS: ORModel[] = [
  { id: "openrouter/auto", label: "OpenRouter Free Auto (besplatno)", free: true, specialist: "reasoning" },
  { id: "nvidia/nemotron-3-ultra-550b:free", label: "Nemotron 3 Ultra 550B — Predikcije PRO (besplatno)", free: true, specialist: "predictions", ctx: "1M" },
  { id: "nvidia/nemotron-3-super-120b:free", label: "Nemotron 3 Super 120B — Analitičar (besplatno)", free: true, specialist: "reasoning" },
  { id: "nvidia/nemotron-3-nano-omni-30b:free", label: "Nemotron 3 Nano Omni 30B — Poisson/EV (besplatno)", free: true, specialist: "reasoning" },
  { id: "nvidia/nemotron-3-nano-30b:free", label: "Nemotron 3 Nano 30B (besplatno)", free: true, specialist: "fast" },
  { id: "nvidia/nemotron-nano-12b-v2-vl:free", label: "Nemotron Nano 12B Vision (besplatno)", free: true, specialist: "vision" },
  { id: "nvidia/nemotron-nano-9b-v2:free", label: "Nemotron Nano 9B v2 (besplatno)", free: true, specialist: "predictions", ctx: "128k" },
  { id: "openai/gpt-oss-120b:free", label: "OpenAI GPT-OSS 120B (besplatno)", free: true, specialist: "reasoning" },
  { id: "openai/gpt-oss-20b:free", label: "OpenAI GPT-OSS 20B (besplatno)", free: true, specialist: "predictions" },
  { id: "cohere/command-a:free", label: "Cohere North Mini Code — Kalkulator (besplatno)", free: true, specialist: "math" },
  { id: "google/gemma-3-27b-it:free", label: "Google Gemma 4 31B (besplatno)", free: true },
  { id: "google/gemma-3-12b-it:free", label: "Google Gemma 4 26B (besplatno)", free: true, specialist: "fast" },
  { id: "inclusionai/ling-1t:free", label: "Ling 3.0 Flash — Brzi skener listića (besplatno)", free: true, specialist: "fast" },
  { id: "deepseek/deepseek-chat-v3.1:free", label: "DeepSeek Chat v3 (0324) (besplatno)", free: true, specialist: "math", ctx: "163k" },
  { id: "deepseek/deepseek-r1-0528:free", label: "DeepSeek R1 — chain of thought (besplatno)", free: true, specialist: "reasoning" },
  { id: "qwen/qwen3-235b-a22b:free", label: "Qwen3 235B — Poisson/EV (besplatno)", free: true, specialist: "reasoning" },
  { id: "z-ai/glm-4.5-air:free", label: "GLM 4.5 Air — kalkulator (besplatno)", free: true, specialist: "math" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B Instruct (besplatno)", free: true, specialist: "predictions" },
  { id: "meta-llama/llama-4-maverick:free", label: "Llama 4 Maverick (besplatno)", free: true, specialist: "reasoning" },
  { id: "moonshotai/kimi-k2:free", label: "Moonshot Kimi K3 (besplatno)", free: true, specialist: "reasoning" },
  { id: "qwen/qwen2.5-vl-72b-instruct:free", label: "Qwen 2.5 VL 72B — vision (besplatno)", free: true, specialist: "vision" },
  { id: "mistralai/mistral-small-3.2-24b-instruct:free", label: "Mistral Small 3.2 24B (besplatno)", free: true },
  { id: "openai/gpt-5.5", label: "OpenAI GPT-5.5 (plaćeno)", free: false },
  { id: "openai/gpt-5.5-pro", label: "OpenAI GPT-5.5 Pro (plaćeno)", free: false },
  { id: "anthropic/claude-sonnet-4.5", label: "Anthropic Claude Fable 5 (plaćeno)", free: false },
  { id: "google/gemini-2.5-pro", label: "Google Gemini 3.1 Pro Preview (plaćeno)", free: false },
];

// Redoslijed rezervnih modela — provjereno najstabilniji besplatni modeli.
const FALLBACK_CHAIN = [
  "deepseek/deepseek-chat-v3.1:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "openai/gpt-oss-20b:free",
  "google/gemma-3-27b-it:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
  "qwen/qwen3-235b-a22b:free",
  "openrouter/auto",
];

export function specialistDefault(): string {
  return "deepseek/deepseek-chat-v3.1:free";
}

interface ORChoice {
  message?: {
    content?: string | Array<{ type?: string; text?: string }> | null;
    reasoning?: string | null;
    reasoning_content?: string | null;
  };
  text?: string;
  finish_reason?: string;
}

function extractText(j: { choices?: ORChoice[]; error?: { message?: string } }): string {
  const c = j.choices?.[0];
  if (!c) return "";
  const m = c.message;
  const raw = m?.content;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw)) {
    const joined = raw.map((p) => p?.text ?? "").join("").trim();
    if (joined) return joined;
  }
  const reason = (m?.reasoning ?? m?.reasoning_content ?? "") as string;
  if (reason && reason.trim()) return reason.trim();
  if (typeof c.text === "string" && c.text.trim()) return c.text.trim();
  return "";
}

class ORError extends Error {
  retryable: boolean;
  constructor(msg: string, retryable: boolean) {
    super(msg);
    this.retryable = retryable;
  }
}

async function callOnce(
  key: string,
  model: string,
  messages: ORMessage[],
  opts: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const res = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://andromeda-ai.app",
      "X-Title": "Andromeda AI",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.6,
      max_tokens: opts.maxTokens ?? 2200,
      // neki reasoning modeli sav output stave u "reasoning" ako ovo nije ugašeno
      reasoning: { exclude: true },
    }),
  });

  const bodyText = await res.text();
  let parsed: { choices?: ORChoice[]; error?: { message?: string; code?: number } } = {};
  try {
    parsed = JSON.parse(bodyText) as typeof parsed;
  } catch {
    /* nije JSON */
  }

  if (!res.ok) {
    const msg = parsed.error?.message || bodyText.slice(0, 200);
    if (res.status === 401) throw new ORError("OpenRouter ključ nije važeći (401). Provjeri u Postavkama.", false);
    if (res.status === 402) throw new ORError(`OpenRouter: model traži kredite (402). Prebacujem na besplatni.`, true);
    if (res.status === 429) throw new ORError("OpenRouter limit zahtjeva (429) — probavam drugi model.", true);
    if (res.status === 404 || res.status === 400)
      throw new ORError(`Model "${model}" nije dostupan (${res.status}).`, true);
    throw new ORError(`OpenRouter ${res.status}: ${msg}`, true);
  }

  if (parsed.error?.message) throw new ORError(`OpenRouter: ${parsed.error.message}`, true);

  const text = extractText(parsed);
  if (!text) throw new ORError(`Model "${model}" je vratio prazan odgovor — probavam drugi.`, true);
  return text;
}

export async function openrouterChat(
  model: string,
  messages: ORMessage[],
  opts: { temperature?: number; maxTokens?: number; extraFallbacks?: string[] } = {},
): Promise<string> {
  const key = getKey("openrouter");
  if (!key) throw new Error("Nedostaje OpenRouter ključ");

  const tried = new Set<string>();
  const chain = [model, ...(opts.extraFallbacks ?? []), ...FALLBACK_CHAIN].filter((m) => {
    if (!m || tried.has(m)) return false;
    tried.add(m);
    return true;
  });

  let lastMsg = "";
  for (const m of chain) {
    try {
      return await callOnce(key, m, messages, opts);
    } catch (e) {
      if (e instanceof ORError && !e.retryable) throw new Error(e.message);
      lastMsg = e instanceof Error ? e.message : String(e);
      console.warn("OpenRouter fallback:", lastMsg);
    }
  }
  throw new Error(`OpenRouter nije uspio ni s jednim modelom. Zadnja greška: ${lastMsg}`);
}

export async function testOpenRouter(): Promise<{ ok: boolean; msg: string }> {
  try {
    const t = await openrouterChat(
      specialistDefault(),
      [
        { role: "system", content: "Odgovaraj isključivo na hrvatskom." },
        { role: "user", content: "Napiši samo riječ: OK" },
      ],
      { maxTokens: 60, temperature: 0 },
    );
    return { ok: true, msg: `OpenRouter radi: ${t.trim().slice(0, 80)}` };
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : String(e) };
  }
}
