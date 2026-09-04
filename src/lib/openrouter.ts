import { getKey } from "./storage";

const URL = "https://openrouter.ai/api/v1/chat/completions";

export interface ORMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ORModel {
  id: string;
  label: string;
  free: boolean;
}

// Modeli koji su trenutno dostupni i besplatni na OpenRouteru
export const OR_MODELS: ORModel[] = [
  { id: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B (Besplatno)", free: true },
  { id: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash (Besplatno)", free: true },
  { id: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B (Besplatno)", free: true },
];

const FALLBACK_CHAIN = [
  "meta-llama/llama-3.1-8b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
  "mistralai/mistral-7b-instruct:free"
];

export function specialistDefault(): string {
  return "meta-llama/llama-3.1-8b-instruct:free";
}

async function callOnce(key: string, model: string, messages: ORMessage[]): Promise<string> {
  const res = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "X-Title": "Andromeda AI",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      max_tokens: 2000,
    }),
  });

  const data = await res.json();
  if (res.ok && data.choices?.[0]?.message?.content) {
    return data.choices[0].message.content.trim();
  }
  throw new Error(data.error?.message || "Greška modela");
}

export async function openrouterChat(
  model: string,
  messages: ORMessage[],
  opts: { extraFallbacks?: string[] } = {}
): Promise<string> {
  const key = getKey("openrouter");
  if (!key) throw new Error("Nedostaje OpenRouter ključ");

  const chain = [model, ...(opts.extraFallbacks ?? []), ...FALLBACK_CHAIN];
  let lastErr = "";

  for (const m of chain) {
    try {
      return await callOnce(key, m, messages);
    } catch (e: any) {
      lastErr = e.message;
      console.warn(`OpenRouter promašaj za ${m}: ${lastErr}`);
    }
  }
  throw new Error(lastErr);
}

// OVA FUNKCIJA JE FALILA I UZROKOVALA BUILD ERROR:
export async function testOpenRouter(): Promise<{ ok: boolean; msg: string }> {
  try {
    const t = await openrouterChat(specialistDefault(), [
      { role: "user", content: "Say OK" }
    ]);
    return { ok: true, msg: `OpenRouter radi: ${t}` };
  } catch (e: any) {
    return { ok: false, msg: e.message };
  }
}
