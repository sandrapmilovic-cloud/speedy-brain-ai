import { getKey } from "./storage";

const URL = "https://openrouter.ai/api/v1/chat/completions";

export interface ORMessage {
  role: "system" | "user" | "assistant";
  content: string | any[];
}

export interface ORModel {
  id: string;
  label: string;
  free: boolean;
}

// Ostavljamo samo modele koji su trenutno besplatni i stabilni
export const OR_MODELS: ORModel[] = [
  { id: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash (besplatno)", free: true },
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (besplatno)", free: true },
  { id: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B (besplatno)", free: true },
  { id: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B (besplatno)", free: true },
];

const FALLBACK_CHAIN = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
];

export function specialistDefault(): string {
  return "google/gemini-2.0-flash-exp:free";
}

export async function openrouterChat(
  model: string,
  messages: ORMessage[],
  opts: { temperature?: number; maxTokens?: number; extraFallbacks?: string[] } = {},
): Promise<string> {
  const key = getKey("openrouter");
  if (!key) throw new Error("Nedostaje OpenRouter ključ");

  // Prisilno koristimo besplatni lanac ako nema kredita
  const chain = [model, ...FALLBACK_CHAIN];
  let lastErr = "";

  for (const m of chain) {
    try {
      const res = await fetch(URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "X-Title": "Andromeda AI",
        },
        body: JSON.stringify({
          model: m,
          messages,
          temperature: 0.6,
          max_tokens: 2000,
        }),
      });

      const data = await res.json();
      if (res.ok && data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content.trim();
      }
      lastErr = data.error?.message || "Nepoznata greška";
    } catch (e: any) {
      lastErr = e.message;
    }
  }
  throw new Error(lastErr);
}

export async function testOpenRouter(): Promise<{ ok: boolean; msg: string }> {
  try {
    const t = await openrouterChat(specialistDefault(), [{ role: "user", content: "Say OK" }]);
    return { ok: true, msg: "OpenRouter radi!" };
  } catch (e: any) {
    return { ok: false, msg: e.message };
  }
}
