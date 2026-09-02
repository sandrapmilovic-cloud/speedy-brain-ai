// NVIDIA NIM (build.nvidia.com) — dodatni BESPLATNI mozak, OpenAI-kompatibilan,
// bez limita na broj modela. Isti princip kao OpenRouter: lanac rezervnih modela,
// robusno vađenje sadržaja i jasne poruke o greškama.
import { getKey } from "./storage";

// NVIDIA NIM nema CORS zaglavlja, pa poziv ide kroz naš proxy (/api/public/nvidia).
const URL = "/api/public/nvidia";


export interface NimModel {
  id: string;
  label: string;
  specialist?: "predictions" | "reasoning" | "math" | "fast" | "vision";
}

/** Besplatni modeli NVIDIA NIM-a korisni za nogometne predikcije. */
export const NIM_MODELS: NimModel[] = [
  { id: "deepseek-ai/deepseek-r1", label: "DeepSeek R1 — Poisson/EV chain-of-thought (besplatno)", specialist: "reasoning" },
  { id: "deepseek-ai/deepseek-r1-distill-qwen-32b", label: "R1 Distill Qwen 32B — brzi reasoner (besplatno)", specialist: "reasoning" },
  { id: "deepseek-ai/deepseek-r1-distill-llama-8b", label: "R1 Distill Llama 8B — mikro provjera (besplatno)", specialist: "fast" },
  { id: "meta/llama-3.3-70b-instruct", label: "Llama 3.3 70B — kontekst lige (besplatno)", specialist: "predictions" },
  { id: "meta/llama-3.1-405b-instruct", label: "Llama 3.1 405B — analitičar PRO (besplatno)", specialist: "predictions" },
  { id: "meta/llama-3.1-70b-instruct", label: "Llama 3.1 70B — stabilni analitičar (besplatno)", specialist: "predictions" },
  { id: "nvidia/llama-3.1-nemotron-70b-instruct", label: "Nemotron 70B — kalibracija vjerojatnosti (besplatno)", specialist: "math" },
  { id: "nvidia/llama-3.3-nemotron-super-49b-v1", label: "Nemotron Super 49B — BTTS/OU specijalist (besplatno)", specialist: "predictions" },
  { id: "nvidia/llama-3.1-nemotron-nano-8b-v1", label: "Nemotron Nano 8B — brzi skener (besplatno)", specialist: "fast" },
  { id: "qwen/qwen2.5-72b-instruct", label: "Qwen 2.5 72B — matrica rezultata (besplatno)", specialist: "reasoning" },
  { id: "qwen/qwq-32b-preview", label: "QwQ 32B — eksplicitni kalkulator (besplatno)", specialist: "math" },
  { id: "qwen/qwen2.5-coder-32b-instruct", label: "Qwen 2.5 Coder 32B — numerika (besplatno)", specialist: "math" },
  { id: "mistralai/mixtral-8x22b-instruct-v0.1", label: "Mixtral 8x22B — ansambl član (besplatno)", specialist: "reasoning" },
  { id: "mistralai/mistral-large-2-instruct", label: "Mistral Large 2 — revizor tipa (besplatno)", specialist: "reasoning" },
  { id: "google/gemma-2-27b-it", label: "Gemma 2 27B — trend kontrolor (besplatno)", specialist: "fast" },
  { id: "microsoft/phi-3.5-moe-instruct", label: "Phi 3.5 MoE — aritmetika poluvremena (besplatno)", specialist: "math" },
  { id: "01-ai/yi-large", label: "Yi Large — dugi kontekst (besplatno)", specialist: "reasoning" },
  { id: "meta/llama-3.2-90b-vision-instruct", label: "Llama 3.2 90B Vision — listići i screenshotovi (besplatno)", specialist: "vision" },
];

/** Modeli koje OMNI motor i ansambl koriste za gol tržišta (BTTS / OU 2.5). */
export const NIM_GOAL_MODELS = [
  "deepseek-ai/deepseek-r1",
  "nvidia/llama-3.3-nemotron-super-49b-v1",
  "qwen/qwq-32b-preview",
  "meta/llama-3.3-70b-instruct",
  "mistralai/mixtral-8x22b-instruct-v0.1",
  "nvidia/llama-3.1-nemotron-70b-instruct",
];

const FALLBACK_CHAIN = [
  "meta/llama-3.3-70b-instruct",
  "qwen/qwen2.5-72b-instruct",
  "mistralai/mixtral-8x22b-instruct-v0.1",
  "nvidia/llama-3.1-nemotron-nano-8b-v1",
];

export interface NimMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

class NimError extends Error {
  retryable: boolean;
  constructor(msg: string, retryable: boolean) {
    super(msg);
    this.retryable = retryable;
  }
}

interface NimChoice {
  message?: { content?: string | null; reasoning_content?: string | null };
  text?: string;
}

function extract(j: { choices?: NimChoice[] }): string {
  const c = j.choices?.[0];
  const t = c?.message?.content ?? c?.message?.reasoning_content ?? c?.text ?? "";
  return (t || "").trim();
}

async function callOnce(
  key: string,
  model: string,
  messages: NimMessage[],
  opts: { temperature?: number; maxTokens?: number },
): Promise<string> {
  let res: Response | null = null;
  let netErr = "";
  // Mrežni pokušaji: proxy/upstream zna povremeno prekinuti vezu, zato 3 pokušaja.
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 90000);
    try {
      res = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Nim-Key": key },
        signal: ctrl.signal,
        body: JSON.stringify({
          model,
          messages,
          temperature: opts.temperature ?? 0.6,
          top_p: 0.95,
          max_tokens: opts.maxTokens ?? 2000,
          stream: false,
        }),
      });
      break;
    } catch (e) {
      netErr = e instanceof Error ? e.message : String(e);
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  if (!res) throw new NimError(`Nema mreže prema NVIDIA NIM proxyju (${netErr || "prekid veze"}).`, true);


  const bodyText = await res.text();
  let parsed: { choices?: NimChoice[]; detail?: string; error?: { message?: string } } = {};
  try {
    parsed = JSON.parse(bodyText) as typeof parsed;
  } catch {
    /* nije JSON */
  }
  const errMsg = parsed.error?.message || parsed.detail || bodyText.slice(0, 200);

  if (!res.ok) {
    if (res.status === 401 || res.status === 403)
      throw new NimError("NVIDIA NIM ključ nije važeći (oblik nvapi-…). Provjeri u Postavkama.", false);
    if (res.status === 429) throw new NimError("NVIDIA NIM rate limit (429) — probavam drugi model.", true);
    if (res.status === 400 || res.status === 404)
      throw new NimError(`Model "${model}" nije dostupan (${res.status}): ${errMsg}`, true);
    throw new NimError(`NVIDIA NIM ${res.status}: ${errMsg}`, true);
  }

  const text = extract(parsed);
  if (!text) throw new NimError(`Model "${model}" je vratio prazan odgovor.`, true);
  return text;
}

export async function nvidiaChat(
  model: string,
  messages: NimMessage[],
  opts: { temperature?: number; maxTokens?: number; extraFallbacks?: string[] } = {},
): Promise<string> {
  const key = getKey("nvidia");
  if (!key) throw new Error("Nedostaje NVIDIA NIM ključ");
  const seen = new Set<string>();
  const chain = [model, ...(opts.extraFallbacks ?? []), ...FALLBACK_CHAIN].filter((m) => {
    if (!m || seen.has(m)) return false;
    seen.add(m);
    return true;
  });
  let last = "";
  for (const m of chain) {
    try {
      return await callOnce(key, m, messages, opts);
    } catch (e) {
      if (e instanceof NimError && !e.retryable) throw new Error(e.message);
      last = e instanceof Error ? e.message : String(e);
      console.warn("NVIDIA NIM fallback:", last);
    }
  }
  throw new Error(`NVIDIA NIM nije uspio ni s jednim modelom. Zadnja greška: ${last}`);
}

export async function testNvidia(): Promise<{ ok: boolean; msg: string }> {
  try {
    const t = await nvidiaChat(
      "meta/llama-3.3-70b-instruct",
      [
        { role: "system", content: "Odgovaraj isključivo na hrvatskom." },
        { role: "user", content: "Napiši samo riječ: OK" },
      ],
      { maxTokens: 40, temperature: 0 },
    );
    return { ok: true, msg: `NVIDIA NIM radi: ${t.trim().slice(0, 80)}` };
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : String(e) };
  }
}
